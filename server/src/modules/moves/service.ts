import type { LocationType, OperationType, Prisma } from "@prisma/client";
import { locationFullName } from "../../lib/format";
import type { ListMeta } from "../../lib/http";
import { prisma } from "../../lib/prisma";
import { toDateRange, toSkipTake } from "../../lib/validate";
import type { MovesQuery } from "./schemas";

export type MoveDirection = "IN" | "OUT" | "INTERNAL";

type MoveLocation = { id: number; fullName: string; type: LocationType };

export type MoveRow = {
  id: number;
  createdAt: Date;
  reference: string;
  type: OperationType;
  operationId: number | null;
  product: { id: number; name: string; sku: string; uom: string };
  from: MoveLocation;
  to: MoveLocation;
  quantity: number;
  direction: MoveDirection;
  createdBy: { id: number; name: string };
};

const moveLocationSelect = {
  id: true,
  name: true,
  type: true,
  warehouse: { select: { code: true } },
} satisfies Prisma.LocationSelect;

/** Virtual → INTERNAL is IN, INTERNAL → virtual is OUT, INTERNAL → INTERNAL is INTERNAL. */
function directionOf(from: LocationType, to: LocationType): MoveDirection {
  if (from === "INTERNAL" && to === "INTERNAL") return "INTERNAL";
  return to === "INTERNAL" ? "IN" : "OUT";
}

function buildWhere(query: MovesQuery): Prisma.StockMoveWhereInput {
  const conditions: Prisma.StockMoveWhereInput[] = [];
  if (query.search) {
    const contains = { contains: query.search, mode: "insensitive" as const };
    conditions.push({
      OR: [{ reference: contains }, { product: { name: contains } }, { product: { sku: contains } }],
    });
  }
  if (query.productId !== undefined) conditions.push({ productId: query.productId });
  if (query.locationId !== undefined) {
    conditions.push({ OR: [{ fromLocationId: query.locationId }, { toLocationId: query.locationId }] });
  }
  if (query.warehouseId !== undefined) {
    const warehouseId = query.warehouseId;
    conditions.push({ OR: [{ fromLocation: { warehouseId } }, { toLocation: { warehouseId } }] });
  }
  if (query.type) conditions.push({ type: query.type });
  const createdAt = toDateRange(query.dateFrom, query.dateTo);
  if (createdAt) conditions.push({ createdAt });
  return { AND: conditions };
}

export async function listMoves(query: MovesQuery): Promise<{ items: MoveRow[]; meta: ListMeta }> {
  const where = buildWhere(query);
  const [total, rows] = await Promise.all([
    prisma.stockMove.count({ where }),
    prisma.stockMove.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...toSkipTake(query),
      select: {
        id: true,
        createdAt: true,
        reference: true,
        type: true,
        operationId: true,
        quantity: true,
        product: { select: { id: true, name: true, sku: true, uom: true } },
        fromLocation: { select: moveLocationSelect },
        toLocation: { select: moveLocationSelect },
        createdBy: { select: { id: true, name: true } },
      },
    }),
  ]);

  const items = rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt,
    reference: row.reference,
    type: row.type,
    operationId: row.operationId,
    product: row.product,
    from: { id: row.fromLocation.id, fullName: locationFullName(row.fromLocation), type: row.fromLocation.type },
    to: { id: row.toLocation.id, fullName: locationFullName(row.toLocation), type: row.toLocation.type },
    quantity: row.quantity,
    direction: directionOf(row.fromLocation.type, row.toLocation.type),
    createdBy: row.createdBy,
  }));

  return { items, meta: { total, page: query.page, pageSize: query.pageSize } };
}
