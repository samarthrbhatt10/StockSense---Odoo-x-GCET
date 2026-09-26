import { Prisma, type LocationType } from "@prisma/client";
import { locationFullName, locationSelect } from "../../lib/format";
import { AppError, invalidState, notFound } from "../../lib/http";
import { prisma } from "../../lib/prisma";
import type {
  CreateLocationInput,
  LocationListParams,
  UpdateLocationInput,
} from "./locations.schemas";

const NAME_TAKEN = "A location with this name already exists in this warehouse";
const SYSTEM_LOCATION = "System locations cannot be changed";
const HOLDS_STOCK = "Move the stock out before deactivating this location";
const HAS_HISTORY = "This location has stock or history and cannot be deleted.";

export type LocationItem = {
  id: number;
  name: string;
  fullName: string;
  type: LocationType;
  isActive: boolean;
  warehouse: { id: number; code: string; name: string } | null;
  onHand: number;
  productCount: number;
};

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

/**
 * INTERNAL locations come first ordered by warehouse code then name; the virtual
 * ones trail behind. Postgres orders the enum by its declaration order, which is
 * exactly INTERNAL, VENDOR, CUSTOMER, ADJUSTMENT — so this sorts in the database
 * and pagination stays correct.
 */
const listOrderBy = [
  { type: "asc" as const },
  { warehouse: { code: "asc" as const } },
  { name: "asc" as const },
];

/** One grouped query gives both the quantity held and how many products sit there. */
async function stockStats(
  locationIds: number[],
): Promise<Map<number, { onHand: number; productCount: number }>> {
  const stats = new Map<number, { onHand: number; productCount: number }>();
  if (locationIds.length === 0) return stats;

  const rows = await prisma.stockQuant.groupBy({
    by: ["locationId"],
    where: { locationId: { in: locationIds }, quantity: { gt: 0 } },
    _sum: { quantity: true },
    _count: { productId: true },
  });
  for (const row of rows) {
    stats.set(row.locationId, {
      onHand: row._sum.quantity ?? 0,
      productCount: row._count.productId,
    });
  }
  return stats;
}

type LocationWithStock = {
  id: number;
  name: string;
  fullName: string;
  type: LocationType;
  isActive: boolean;
  warehouse: { id: number; code: string; name: string } | null;
  onHand: number;
  productCount: number;
};

function toItem(
  location: {
    id: number;
    name: string;
    type: LocationType;
    warehouse: { id: number; code: string; name: string } | null;
  },
  isActive: boolean,
  stats: Map<number, { onHand: number; productCount: number }>,
): LocationItem {
  const stat = stats.get(location.id);
  return {
    id: location.id,
    name: location.name,
    fullName: locationFullName(location),
    type: location.type,
    isActive,
    warehouse: location.warehouse,
    onHand: stat?.onHand ?? 0,
    productCount: stat?.productCount ?? 0,
  };
}

export async function listLocations(
  query: LocationListParams,
): Promise<{ items: LocationItem[]; total: number }> {
  const { skip, take, search, warehouseId, type, includeInactive } = query;

  const where: Prisma.LocationWhereInput = {
    ...(warehouseId !== undefined ? { warehouseId } : {}),
    ...(type !== undefined ? { type } : {}),
    ...(includeInactive ? {} : { isActive: true }),
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const [total, locations] = await Promise.all([
    prisma.location.count({ where }),
    prisma.location.findMany({
      where,
      orderBy: listOrderBy,
      skip,
      take,
      select: { ...locationSelect, isActive: true },
    }),
  ]);
  const stats = await stockStats(locations.map((location) => location.id));

  return {
    total,
    items: locations.map((location) => toItem(location, location.isActive, stats)),
  };
}

export async function createLocation(input: CreateLocationInput): Promise<LocationItem> {
  const warehouse = await prisma.warehouse.findUnique({
    where: { id: input.warehouseId },
    select: { id: true },
  });
  if (!warehouse) throw notFound("Warehouse");

  try {
    const created = await prisma.location.create({
      data: { name: input.name, type: "INTERNAL", warehouseId: input.warehouseId },
      select: { ...locationSelect, isActive: true },
    });
    return toItem(created, created.isActive, new Map());
  } catch (err) {
    if (isUniqueViolation(err)) throw new AppError(409, "CONFLICT", NAME_TAKEN);
    throw err;
  }
}

export async function updateLocation(
  id: number,
  input: UpdateLocationInput,
): Promise<LocationItem> {
  const existing = await prisma.location.findUnique({
    where: { id },
    select: { id: true, type: true, warehouseId: true },
  });
  if (!existing) throw notFound("Location");
  if (existing.type !== "INTERNAL") throw invalidState(SYSTEM_LOCATION);

  const deactivating = input.isActive === false;
  if (deactivating) {
    const heldStock = await prisma.stockQuant.count({
      where: { locationId: id, quantity: { gt: 0 } },
    });
    if (heldStock > 0) throw invalidState(HOLDS_STOCK);
  }

  try {
    const updated = await prisma.location.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
      select: { ...locationSelect, isActive: true },
    });
    const stats = await stockStats([id]);
    return toItem(updated, updated.isActive, stats);
  } catch (err) {
    if (isUniqueViolation(err)) throw new AppError(409, "CONFLICT", NAME_TAKEN);
    throw err;
  }
}

export async function deleteLocation(id: number): Promise<void> {
  const existing = await prisma.location.findUnique({
    where: { id },
    select: { id: true, type: true },
  });
  if (!existing) throw notFound("Location");
  if (existing.type !== "INTERNAL") throw invalidState(SYSTEM_LOCATION);

  const [heldStock, moveCount, operationCount] = await Promise.all([
    prisma.stockQuant.count({ where: { locationId: id, quantity: { gt: 0 } } }),
    prisma.stockMove.count({ where: { OR: [{ fromLocationId: id }, { toLocationId: id }] } }),
    prisma.operation.count({
      where: { OR: [{ sourceLocationId: id }, { destLocationId: id }] },
    }),
  ]);
  if (heldStock > 0 || moveCount > 0 || operationCount > 0) {
    throw new AppError(409, "IN_USE", HAS_HISTORY);
  }

  try {
    // Empty quant rows would still block the delete, and they carry no information.
    await prisma.$transaction(async (tx) => {
      await tx.stockQuant.deleteMany({ where: { locationId: id, quantity: { lte: 0 } } });
      await tx.location.delete({ where: { id } });
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      throw new AppError(409, "IN_USE", HAS_HISTORY);
    }
    throw err;
  }
}
