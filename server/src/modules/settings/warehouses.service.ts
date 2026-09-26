import { Prisma } from "@prisma/client";
import { locationFullName, locationSelect } from "../../lib/format";
import { AppError, notFound } from "../../lib/http";
import { prisma } from "../../lib/prisma";
import type { CreateWarehouseInput, UpdateWarehouseInput } from "./warehouses.schemas";

/** Every new warehouse gets one INTERNAL location so stock has somewhere to land. */
const DEFAULT_LOCATION_NAME = "Stock";

const CODE_TAKEN = "A warehouse with this code already exists";
const HAS_HISTORY = "This warehouse has stock or history and cannot be deleted.";

const warehouseSelect = {
  id: true,
  name: true,
  code: true,
  address: true,
} satisfies Prisma.WarehouseSelect;

export type WarehouseItem = {
  id: number;
  name: string;
  code: string;
  address: string | null;
  locationCount: number;
  onHand: number;
};

export type WarehouseDetail = {
  id: number;
  name: string;
  code: string;
  address: string | null;
  locations: { id: number; name: string; fullName: string; isActive: boolean; onHand: number }[];
};

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

/** Total quantity per warehouse, summed over its INTERNAL locations only. */
async function onHandByWarehouse(warehouseIds: number[]): Promise<Map<number, number>> {
  const totals = new Map<number, number>();
  if (warehouseIds.length === 0) return totals;

  const locations = await prisma.location.findMany({
    where: { warehouseId: { in: warehouseIds }, type: "INTERNAL" },
    select: { id: true, warehouseId: true },
  });
  if (locations.length === 0) return totals;

  const warehouseOfLocation = new Map<number, number>();
  for (const location of locations) {
    if (location.warehouseId !== null) warehouseOfLocation.set(location.id, location.warehouseId);
  }

  const sums = await prisma.stockQuant.groupBy({
    by: ["locationId"],
    where: { locationId: { in: locations.map((location) => location.id) } },
    _sum: { quantity: true },
  });

  for (const row of sums) {
    const warehouseId = warehouseOfLocation.get(row.locationId);
    if (warehouseId === undefined) continue;
    totals.set(warehouseId, (totals.get(warehouseId) ?? 0) + (row._sum.quantity ?? 0));
  }
  return totals;
}

export async function listWarehouses(params: {
  skip: number;
  take: number;
  search?: string;
}): Promise<{ items: WarehouseItem[]; total: number }> {
  const { skip, take, search } = params;
  const where: Prisma.WarehouseWhereInput = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { code: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};

  const [total, warehouses] = await Promise.all([
    prisma.warehouse.count({ where }),
    prisma.warehouse.findMany({
      where,
      orderBy: { code: "asc" },
      skip,
      take,
      select: {
        ...warehouseSelect,
        _count: { select: { locations: { where: { type: "INTERNAL" } } } },
      },
    }),
  ]);
  const onHand = await onHandByWarehouse(warehouses.map((warehouse) => warehouse.id));

  return {
    total,
    items: warehouses.map((warehouse) => ({
      id: warehouse.id,
      name: warehouse.name,
      code: warehouse.code,
      address: warehouse.address,
      locationCount: warehouse._count.locations,
      onHand: onHand.get(warehouse.id) ?? 0,
    })),
  };
}

export async function getWarehouse(id: number): Promise<WarehouseDetail> {
  const warehouse = await prisma.warehouse.findUnique({
    where: { id },
    select: { ...warehouseSelect, locations: { select: { ...locationSelect, isActive: true } } },
  });
  if (!warehouse) throw notFound("Warehouse");

  const sums = await prisma.stockQuant.groupBy({
    by: ["locationId"],
    where: { locationId: { in: warehouse.locations.map((location) => location.id) } },
    _sum: { quantity: true },
  });
  const onHand = new Map(sums.map((row) => [row.locationId, row._sum.quantity ?? 0]));

  return {
    id: warehouse.id,
    name: warehouse.name,
    code: warehouse.code,
    address: warehouse.address,
    locations: warehouse.locations.map((location) => ({
      id: location.id,
      name: location.name,
      fullName: locationFullName(location),
      isActive: location.isActive,
      onHand: onHand.get(location.id) ?? 0,
    })),
  };
}

export async function createWarehouse(input: CreateWarehouseInput): Promise<WarehouseDetail> {
  try {
    const created = await prisma.$transaction(async (tx) => {
      const warehouse = await tx.warehouse.create({
        data: { name: input.name, code: input.code, address: input.address },
        select: warehouseSelect,
      });
      await tx.location.create({
        data: { name: DEFAULT_LOCATION_NAME, type: "INTERNAL", warehouseId: warehouse.id },
      });
      return warehouse;
    });
    return getWarehouse(created.id);
  } catch (err) {
    if (isUniqueViolation(err)) throw new AppError(409, "CONFLICT", CODE_TAKEN);
    throw err;
  }
}

export async function updateWarehouse(
  id: number,
  input: UpdateWarehouseInput,
): Promise<WarehouseDetail> {
  try {
    const updated = await prisma.warehouse.update({
      where: { id },
      data: { name: input.name, address: input.address },
      select: warehouseSelect,
    });
    return getWarehouse(updated.id);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      throw notFound("Warehouse");
    }
    throw err;
  }
}

export async function deleteWarehouse(id: number): Promise<void> {
  const warehouse = await prisma.warehouse.findUnique({ where: { id }, select: { id: true } });
  if (!warehouse) throw notFound("Warehouse");

  const locations = await prisma.location.findMany({
    where: { warehouseId: id },
    select: { id: true },
  });
  const locationIds = locations.map((location) => location.id);

  const [heldStock, moveCount, operationCount] = await Promise.all([
    prisma.stockQuant.count({ where: { locationId: { in: locationIds }, quantity: { gt: 0 } } }),
    prisma.stockMove.count({
      where: { OR: [{ fromLocationId: { in: locationIds } }, { toLocationId: { in: locationIds } }] },
    }),
    prisma.operation.count({
      where: {
        OR: [{ sourceLocationId: { in: locationIds } }, { destLocationId: { in: locationIds } }],
      },
    }),
  ]);
  if (heldStock > 0 || moveCount > 0 || operationCount > 0) {
    throw new AppError(409, "IN_USE", HAS_HISTORY);
  }

  await prisma.$transaction(async (tx) => {
    // Empty quant rows would still block the delete, and they carry no information.
    await tx.stockQuant.deleteMany({ where: { locationId: { in: locationIds }, quantity: { lte: 0 } } });
    await tx.location.deleteMany({ where: { id: { in: locationIds } } });
    await tx.warehouse.delete({ where: { id } });
  });
}
