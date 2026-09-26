import { Prisma } from "@prisma/client";
import { locationFullName } from "../../lib/format";
import { AppError, invalidState, notFound } from "../../lib/http";
import { prisma } from "../../lib/prisma";
import {
  applyMoves,
  getStockSummary,
  getVirtualLocation,
  type StockStatus,
  type WarehouseStock,
} from "../../lib/stock";
import type { CreateProductInput, ProductListQuery, UpdateProductInput } from "./schemas";

const SKU_TAKEN = "SKU already exists";
const PENDING_OPERATIONS = "This product is used in pending operations";
const HAS_HISTORY = "This product has stock history. Deactivate it instead.";
const INITIAL_LOCATION = "Initial stock must go into an active internal location";
const RECENT_MOVES = 10;

export type ProductListItem = {
  id: number;
  name: string;
  sku: string;
  uom: string;
  category: { id: number; name: string } | null;
  isActive: boolean;
  onHand: number;
  status: StockStatus;
};

export type ProductDetail = {
  id: number;
  name: string;
  sku: string;
  uom: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  category: { id: number; name: string } | null;
  onHand: number;
  status: StockStatus;
  stockByLocation: {
    locationId: number;
    fullName: string;
    warehouseId: number | null;
    warehouseCode: string | null;
    quantity: number;
  }[];
  reorderRules: {
    id: number;
    warehouseId: number;
    warehouseCode: string;
    warehouseName: string;
    minQty: number;
    maxQty: number;
    onHand: number;
    status: StockStatus;
  }[];
  recentMoves: {
    id: number;
    createdAt: Date;
    reference: string;
    type: string;
    quantity: number;
    fromName: string;
    toName: string;
    operationId: number | null;
  }[];
};

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

/** productId → warehouseId → that warehouse's stock row from the shared summary. */
function indexSummary(
  rows: Awaited<ReturnType<typeof getStockSummary>>,
): Map<number, Map<number, WarehouseStock>> {
  const index = new Map<number, Map<number, WarehouseStock>>();
  for (const row of rows) {
    const perWarehouse = new Map(row.warehouses.map((w) => [w.warehouseId, w]));
    index.set(row.productId, perWarehouse);
  }
  return index;
}

function toListItem(row: {
  productId: number;
  name: string;
  sku: string;
  uom: string;
  categoryId: number | null;
  categoryName: string | null;
  isActive: boolean;
  onHand: number;
  status: StockStatus;
}): ProductListItem {
  return {
    id: row.productId,
    name: row.name,
    sku: row.sku,
    uom: row.uom,
    category: row.categoryId !== null && row.categoryName !== null
      ? { id: row.categoryId, name: row.categoryName }
      : null,
    isActive: row.isActive,
    onHand: row.onHand,
    status: row.status,
  };
}

export async function listProducts(query: ProductListQuery): Promise<{
  items: ProductListItem[];
  total: number;
  page: number;
  pageSize: number;
}> {
  // On-hand and status always come from the shared summary, never recomputed here.
  const summary = await getStockSummary(prisma, {
    warehouseId: query.warehouseId,
    categoryId: query.categoryId,
    includeInactive: query.includeInactive,
  });

  let rows = summary;
  if (query.search) {
    const needle = query.search.toLowerCase();
    rows = rows.filter(
      (row) => row.name.toLowerCase().includes(needle) || row.sku.toLowerCase().includes(needle),
    );
  }
  if (query.stockStatus) rows = rows.filter((row) => row.status === query.stockStatus);

  const start = (query.page - 1) * query.pageSize;
  return {
    items: rows.slice(start, start + query.pageSize).map(toListItem),
    total: rows.length,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function getProduct(id: number): Promise<ProductDetail> {
  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      sku: true,
      uom: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      category: { select: { id: true, name: true } },
    },
  });
  if (!product) throw notFound("Product");

  const [summary, quants, rules, moves] = await Promise.all([
    getStockSummary(prisma, { productIds: [id], includeInactive: true }),
    prisma.stockQuant.findMany({
      where: { productId: id, quantity: { not: 0 }, location: { type: "INTERNAL" } },
      select: {
        locationId: true,
        quantity: true,
        location: { select: { name: true, type: true, warehouse: { select: { id: true, code: true } } } },
      },
    }),
    prisma.reorderRule.findMany({
      where: { productId: id },
      select: {
        id: true,
        warehouseId: true,
        minQty: true,
        maxQty: true,
        warehouse: { select: { id: true, code: true, name: true } },
      },
    }),
    prisma.stockMove.findMany({
      where: { productId: id },
      orderBy: { createdAt: "desc" },
      take: RECENT_MOVES,
      select: {
        id: true,
        createdAt: true,
        reference: true,
        type: true,
        quantity: true,
        operationId: true,
        fromLocation: {
          select: { name: true, type: true, warehouse: { select: { code: true } } },
        },
        toLocation: {
          select: { name: true, type: true, warehouse: { select: { code: true } } },
        },
      },
    }),
  ]);

  const perWarehouse = indexSummary(summary).get(id) ?? new Map<number, WarehouseStock>();

  const stockByLocation = quants
    .map((quant) => ({
      locationId: quant.locationId,
      fullName: locationFullName(quant.location),
      warehouseId: quant.location.warehouse?.id ?? null,
      warehouseCode: quant.location.warehouse?.code ?? null,
      quantity: quant.quantity,
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    uom: product.uom,
    isActive: product.isActive,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    category: product.category,
    onHand: summary[0]?.onHand ?? 0,
    status: summary[0]?.status ?? "OUT",
    stockByLocation,
    reorderRules: rules
      .map((rule) => {
        const stock = perWarehouse.get(rule.warehouseId);
        return {
          id: rule.id,
          warehouseId: rule.warehouseId,
          warehouseCode: rule.warehouse.code,
          warehouseName: rule.warehouse.name,
          minQty: rule.minQty,
          maxQty: rule.maxQty,
          onHand: stock?.onHand ?? 0,
          status: stock?.status ?? "OUT",
        };
      })
      .sort((a, b) => a.warehouseCode.localeCompare(b.warehouseCode)),
    recentMoves: moves.map((move) => ({
      id: move.id,
      createdAt: move.createdAt,
      reference: move.reference,
      type: move.type,
      quantity: move.quantity,
      fromName: locationFullName(move.fromLocation),
      toName: locationFullName(move.toLocation),
      operationId: move.operationId,
    })),
  };
}

export async function createProduct(
  input: CreateProductInput,
  userId: number,
): Promise<ProductDetail> {
  if (input.initialStock) {
    const location = await prisma.location.findUnique({
      where: { id: input.initialStock.locationId },
      select: { id: true, type: true, isActive: true },
    });
    if (!location || location.type !== "INTERNAL" || !location.isActive) {
      throw new AppError(400, "VALIDATION_ERROR", INITIAL_LOCATION);
    }
  }

  let productId: number;
  try {
    productId = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: input.name,
          sku: input.sku,
          uom: input.uom,
          categoryId: input.categoryId ?? null,
        },
        select: { id: true },
      });

      // Initial stock is a real ADJUSTMENT move, so it shows up in the ledger.
      if (input.initialStock) {
        const adjustment = await getVirtualLocation(tx, "ADJUSTMENT");
        await applyMoves(
          tx,
          [
            {
              productId: product.id,
              fromLocationId: adjustment.id,
              toLocationId: input.initialStock.locationId,
              quantity: input.initialStock.quantity,
            },
          ],
          { type: "ADJUSTMENT", reference: `INIT/${input.sku}`, userId },
        );
      }
      return product.id;
    });
  } catch (err) {
    if (isUniqueViolation(err)) throw new AppError(409, "CONFLICT", SKU_TAKEN);
    throw err;
  }

  return getProduct(productId);
}

export async function updateProduct(
  id: number,
  input: UpdateProductInput,
): Promise<ProductDetail> {
  const existing = await prisma.product.findUnique({
    where: { id },
    select: { id: true, isActive: true },
  });
  if (!existing) throw notFound("Product");

  if (existing.isActive && input.isActive === false) {
    const pendingLines = await prisma.operationLine.count({
      where: { productId: id, operation: { status: { in: ["DRAFT", "WAITING", "READY"] } } },
    });
    if (pendingLines > 0) throw invalidState(PENDING_OPERATIONS);
  }

  try {
    await prisma.product.update({
      where: { id },
      data: {
        name: input.name,
        sku: input.sku,
        uom: input.uom,
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
        isActive: input.isActive,
      },
    });
  } catch (err) {
    if (isUniqueViolation(err)) throw new AppError(409, "CONFLICT", SKU_TAKEN);
    throw err;
  }

  return getProduct(id);
}

export async function deleteProduct(id: number): Promise<void> {
  const existing = await prisma.product.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound("Product");

  const [quants, moves, lines] = await Promise.all([
    prisma.stockQuant.count({ where: { productId: id } }),
    prisma.stockMove.count({ where: { productId: id } }),
    prisma.operationLine.count({ where: { productId: id } }),
  ]);
  if (quants > 0 || moves > 0 || lines > 0) throw new AppError(409, "IN_USE", HAS_HISTORY);

  await prisma.product.delete({ where: { id } });
}
