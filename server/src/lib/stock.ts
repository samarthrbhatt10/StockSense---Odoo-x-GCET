import type { Location, OperationType, Prisma, StockMove } from "@prisma/client";
import { AppError, notFound } from "./http";
import { locationFullName, locationSelect } from "./format";
import type { Db } from "./prisma";

export type StockStatus = "OK" | "LOW" | "OUT";

export type MoveInput = { productId: number; fromLocationId: number; toLocationId: number; quantity: number };

export type MoveContext = {
  type: OperationType;
  reference: string;
  userId: number;
  operationId?: number;
  at?: Date;
};

export type WarehouseStock = {
  warehouseId: number;
  warehouseCode: string;
  warehouseName: string;
  onHand: number;
  minQty: number | null;
  maxQty: number | null;
  status: StockStatus;
};

export type StockSummaryRow = {
  productId: number;
  name: string;
  sku: string;
  uom: string;
  categoryId: number | null;
  categoryName: string | null;
  isActive: boolean;
  onHand: number;
  status: StockStatus;
  warehouses: WarehouseStock[];
};

export type StockAlert = {
  productId: number;
  name: string;
  sku: string;
  uom: string;
  warehouseId: number | null;
  warehouseCode: string | null;
  warehouseName: string | null;
  onHand: number;
  minQty: number | null;
  maxQty: number | null;
  status: "LOW" | "OUT";
  suggestedQty: number | null;
};

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

// ---------------------------------------------------------------------------
// Moves
// ---------------------------------------------------------------------------

function normalizeMoves(moves: MoveInput[]): MoveInput[] {
  return moves.map((move) => {
    const quantity = round3(move.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new AppError(400, "VALIDATION_ERROR", "Move quantity must be greater than 0");
    }
    if (move.fromLocationId === move.toLocationId) {
      throw new AppError(400, "VALIDATION_ERROR", "Source and destination locations must be different");
    }
    return { ...move, quantity };
  });
}

async function loadMoveRefs(tx: Prisma.TransactionClient, moves: MoveInput[]) {
  const locationIds = [...new Set(moves.flatMap((m) => [m.fromLocationId, m.toLocationId]))];
  const productIds = [...new Set(moves.map((m) => m.productId))];

  const [locations, products] = await Promise.all([
    tx.location.findMany({ where: { id: { in: locationIds } }, select: locationSelect }),
    tx.product.findMany({ where: { id: { in: productIds } }, select: { id: true, sku: true } }),
  ]);

  const locationById = new Map(locations.map((l) => [l.id, l]));
  const skuById = new Map(products.map((p) => [p.id, p.sku]));
  if (locationIds.some((id) => !locationById.has(id))) throw notFound("Location");
  if (productIds.some((id) => !skuById.has(id))) throw notFound("Product");

  return { locationById, skuById };
}

/** Keeps stored quantities at 3 decimals so float drift never blocks a later `gte` check. */
async function roundQuant(tx: Prisma.TransactionClient, productId: number, locationId: number): Promise<void> {
  const quant = await tx.stockQuant.findUnique({
    where: { productId_locationId: { productId, locationId } },
    select: { id: true, quantity: true },
  });
  if (quant && round3(quant.quantity) !== quant.quantity) {
    await tx.stockQuant.update({ where: { id: quant.id }, data: { quantity: round3(quant.quantity) } });
  }
}

export async function applyMoves(
  tx: Prisma.TransactionClient,
  moves: MoveInput[],
  ctx: MoveContext,
): Promise<StockMove[]> {
  if (moves.length === 0) return [];
  const normalized = normalizeMoves(moves);
  const { locationById, skuById } = await loadMoveRefs(tx, normalized);

  for (const move of normalized) {
    const from = locationById.get(move.fromLocationId)!;
    const to = locationById.get(move.toLocationId)!;

    if (from.type === "INTERNAL") {
      const result = await tx.stockQuant.updateMany({
        where: { productId: move.productId, locationId: from.id, quantity: { gte: move.quantity } },
        data: { quantity: { decrement: move.quantity } },
      });
      if (result.count === 0) {
        const available = round3(await getQuantity(tx, move.productId, from.id));
        throw new AppError(
          409,
          "INSUFFICIENT_STOCK",
          `Not enough ${skuById.get(move.productId)} at ${locationFullName(from)}: available ${available}, requested ${move.quantity}`,
          { productId: move.productId, locationId: from.id, available, requested: move.quantity },
        );
      }
      await roundQuant(tx, move.productId, from.id);
    }

    if (to.type === "INTERNAL") {
      const quant = await tx.stockQuant.upsert({
        where: { productId_locationId: { productId: move.productId, locationId: to.id } },
        create: { productId: move.productId, locationId: to.id, quantity: move.quantity },
        update: { quantity: { increment: move.quantity } },
        select: { id: true, quantity: true },
      });
      if (round3(quant.quantity) !== quant.quantity) {
        await tx.stockQuant.update({ where: { id: quant.id }, data: { quantity: round3(quant.quantity) } });
      }
    }
  }

  const createdAt = ctx.at ?? new Date();
  return tx.stockMove.createManyAndReturn({
    data: normalized.map((move) => ({
      productId: move.productId,
      fromLocationId: move.fromLocationId,
      toLocationId: move.toLocationId,
      quantity: move.quantity,
      type: ctx.type,
      reference: ctx.reference,
      operationId: ctx.operationId ?? null,
      createdById: ctx.userId,
      createdAt,
    })),
  });
}

export async function getQuantity(db: Db, productId: number, locationId: number): Promise<number> {
  const quant = await db.stockQuant.findUnique({
    where: { productId_locationId: { productId, locationId } },
    select: { quantity: true },
  });
  return quant?.quantity ?? 0;
}

export async function getVirtualLocation(db: Db, type: "VENDOR" | "CUSTOMER" | "ADJUSTMENT"): Promise<Location> {
  const location = await db.location.findFirst({ where: { type }, orderBy: { id: "asc" } });
  if (!location) {
    throw new AppError(500, "INTERNAL", `The ${type} virtual location is missing. Run npm run db:setup.`);
  }
  return location;
}

// ---------------------------------------------------------------------------
// Stock status
// ---------------------------------------------------------------------------

type SummaryOptions = {
  warehouseId?: number;
  categoryId?: number;
  productIds?: number[];
  includeInactive?: boolean;
};

type WarehouseAccumulator = { onHand: number; minQty: number | null; maxQty: number | null };

function warehouseStatus(onHand: number, minQty: number | null): StockStatus {
  if (onHand <= 0) return "OUT";
  if (minQty !== null && onHand < minQty) return "LOW";
  return "OK";
}

function productStatus(onHand: number, warehouses: WarehouseStock[]): StockStatus {
  if (onHand <= 0) return "OUT";
  const low = warehouses.some((w) => w.minQty !== null && w.onHand < w.minQty);
  return low ? "LOW" : "OK";
}

async function loadSummaryData(db: Db, opts: SummaryOptions) {
  const productWhere: Prisma.ProductWhereInput = {
    ...(opts.includeInactive ? {} : { isActive: true }),
    ...(opts.categoryId !== undefined ? { categoryId: opts.categoryId } : {}),
    ...(opts.productIds !== undefined ? { id: { in: opts.productIds } } : {}),
  };
  const warehouseFilter = opts.warehouseId !== undefined ? { warehouseId: opts.warehouseId } : {};

  const [products, warehouses, quants, rules] = await Promise.all([
    db.product.findMany({
      where: productWhere,
      select: {
        id: true,
        name: true,
        sku: true,
        uom: true,
        categoryId: true,
        isActive: true,
        category: { select: { name: true } },
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    }),
    db.warehouse.findMany({
      where: opts.warehouseId !== undefined ? { id: opts.warehouseId } : {},
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
    db.stockQuant.findMany({
      where: {
        product: productWhere,
        location: { type: "INTERNAL", warehouseId: opts.warehouseId ?? { not: null } },
      },
      select: {
        productId: true,
        quantity: true,
        location: { select: { warehouse: { select: { id: true, code: true, name: true } } } },
      },
    }),
    db.reorderRule.findMany({
      where: { product: productWhere, ...warehouseFilter },
      select: { productId: true, warehouseId: true, minQty: true, maxQty: true },
    }),
  ]);

  return { products, warehouses, quants, rules };
}

export async function getStockSummary(db: Db, opts: SummaryOptions = {}): Promise<StockSummaryRow[]> {
  const { products, warehouses, quants, rules } = await loadSummaryData(db, opts);

  // productId → warehouseId → accumulated on hand and reorder rule
  const byProduct = new Map<number, Map<number, WarehouseAccumulator>>();
  const slot = (productId: number, warehouseId: number): WarehouseAccumulator => {
    let perWarehouse = byProduct.get(productId);
    if (!perWarehouse) {
      perWarehouse = new Map();
      byProduct.set(productId, perWarehouse);
    }
    let acc = perWarehouse.get(warehouseId);
    if (!acc) {
      acc = { onHand: 0, minQty: null, maxQty: null };
      perWarehouse.set(warehouseId, acc);
    }
    return acc;
  };

  for (const quant of quants) {
    const warehouse = quant.location.warehouse;
    if (!warehouse) continue;
    slot(quant.productId, warehouse.id).onHand += quant.quantity;
  }
  for (const rule of rules) {
    const acc = slot(rule.productId, rule.warehouseId);
    acc.minQty = rule.minQty;
    acc.maxQty = rule.maxQty;
  }

  return products.map((product) => {
    const perWarehouse = byProduct.get(product.id);
    const warehouseRows: WarehouseStock[] = [];
    for (const warehouse of warehouses) {
      const acc = perWarehouse?.get(warehouse.id);
      if (!acc) continue;
      const onHand = round3(acc.onHand);
      warehouseRows.push({
        warehouseId: warehouse.id,
        warehouseCode: warehouse.code,
        warehouseName: warehouse.name,
        onHand,
        minQty: acc.minQty,
        maxQty: acc.maxQty,
        status: warehouseStatus(onHand, acc.minQty),
      });
    }
    const onHand = round3(warehouseRows.reduce((sum, w) => sum + w.onHand, 0));
    return {
      productId: product.id,
      name: product.name,
      sku: product.sku,
      uom: product.uom,
      categoryId: product.categoryId,
      categoryName: product.category?.name ?? null,
      isActive: product.isActive,
      onHand,
      status: productStatus(onHand, warehouseRows),
      warehouses: warehouseRows,
    };
  });
}

export async function getStockAlerts(
  db: Db,
  opts: { warehouseId?: number; categoryId?: number } = {},
): Promise<StockAlert[]> {
  const summary = await getStockSummary(db, { warehouseId: opts.warehouseId, categoryId: opts.categoryId });
  const alerts: StockAlert[] = [];

  for (const row of summary) {
    const base = { productId: row.productId, name: row.name, sku: row.sku, uom: row.uom };
    const ruled = row.warehouses.filter((w) => w.minQty !== null);

    for (const w of ruled) {
      if (w.onHand >= w.minQty!) continue;
      alerts.push({
        ...base,
        warehouseId: w.warehouseId,
        warehouseCode: w.warehouseCode,
        warehouseName: w.warehouseName,
        onHand: w.onHand,
        minQty: w.minQty,
        maxQty: w.maxQty,
        status: w.onHand <= 0 ? "OUT" : "LOW",
        suggestedQty: round3(w.maxQty! - w.onHand),
      });
    }

    if (ruled.length === 0 && row.onHand <= 0) {
      alerts.push({
        ...base,
        warehouseId: null,
        warehouseCode: null,
        warehouseName: null,
        onHand: row.onHand,
        minQty: null,
        maxQty: null,
        status: "OUT",
        suggestedQty: null,
      });
    }
  }

  return alerts.sort(
    (a, b) =>
      Number(b.status === "OUT") - Number(a.status === "OUT") ||
      a.name.localeCompare(b.name) ||
      (a.warehouseCode ?? "").localeCompare(b.warehouseCode ?? ""),
  );
}
