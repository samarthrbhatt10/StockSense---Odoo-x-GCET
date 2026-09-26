import { Prisma } from "@prisma/client";
import { AppError, notFound } from "../../lib/http";
import { prisma } from "../../lib/prisma";
import { getStockSummary, type StockStatus, type WarehouseStock } from "../../lib/stock";
import type {
  CreateReorderRuleInput,
  ReorderRuleListQuery,
  UpdateReorderRuleInput,
} from "./schemas";

export type ReorderRuleListItem = {
  id: number;
  minQty: number;
  maxQty: number;
  product: { id: number; name: string; sku: string; uom: string };
  warehouse: { id: number; code: string; name: string };
  onHand: number;
  status: StockStatus;
};

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

function notFoundOrThrow(err: unknown, entity: string): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
    throw notFound(entity);
  }
  throw err;
}

/** Attaches each rule's on-hand and status from the shared stock summary. */
async function withStock(
  rules: {
    id: number;
    minQty: number;
    maxQty: number;
    product: { id: number; name: string; sku: string; uom: string };
    warehouse: { id: number; code: string; name: string };
  }[],
): Promise<ReorderRuleListItem[]> {
  if (rules.length === 0) return [];
  const productIds = [...new Set(rules.map((rule) => rule.product.id))];
  const summary = await getStockSummary(prisma, { productIds, includeInactive: true });

  const byProduct = new Map<number, Map<number, WarehouseStock>>();
  for (const row of summary) {
    byProduct.set(row.productId, new Map(row.warehouses.map((w) => [w.warehouseId, w])));
  }

  return rules.map((rule) => {
    const stock = byProduct.get(rule.product.id)?.get(rule.warehouse.id);
    return {
      id: rule.id,
      minQty: rule.minQty,
      maxQty: rule.maxQty,
      product: rule.product,
      warehouse: rule.warehouse,
      onHand: stock?.onHand ?? 0,
      status: stock?.status ?? "OUT",
    };
  });
}

const ruleSelect = {
  id: true,
  minQty: true,
  maxQty: true,
  product: { select: { id: true, name: true, sku: true, uom: true } },
  warehouse: { select: { id: true, code: true, name: true } },
} as const;

export async function listReorderRules(query: ReorderRuleListQuery): Promise<ReorderRuleListItem[]> {
  const rules = await prisma.reorderRule.findMany({
    where: {
      ...(query.productId !== undefined ? { productId: query.productId } : {}),
      ...(query.warehouseId !== undefined ? { warehouseId: query.warehouseId } : {}),
    },
    select: ruleSelect,
    orderBy: [{ warehouse: { code: "asc" } }, { product: { name: "asc" } }],
  });
  return withStock(rules);
}

export async function createReorderRule(input: CreateReorderRuleInput): Promise<ReorderRuleListItem> {
  const [product, warehouse] = await Promise.all([
    prisma.product.findUnique({ where: { id: input.productId }, select: { id: true } }),
    prisma.warehouse.findUnique({ where: { id: input.warehouseId }, select: { id: true } }),
  ]);
  if (!product) throw notFound("Product");
  if (!warehouse) throw notFound("Warehouse");

  try {
    const created = await prisma.reorderRule.create({
      data: {
        productId: input.productId,
        warehouseId: input.warehouseId,
        minQty: input.minQty,
        maxQty: input.maxQty,
      },
      select: ruleSelect,
    });
    const [item] = await withStock([created]);
    return item;
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new AppError(409, "CONFLICT", "This product already has a reorder rule for that warehouse");
    }
    throw err;
  }
}

export async function updateReorderRule(
  id: number,
  input: UpdateReorderRuleInput,
): Promise<ReorderRuleListItem> {
  try {
    const updated = await prisma.reorderRule.update({
      where: { id },
      data: { minQty: input.minQty, maxQty: input.maxQty },
      select: ruleSelect,
    });
    const [item] = await withStock([updated]);
    return item;
  } catch (err) {
    notFoundOrThrow(err, "Reorder rule");
  }
}

export async function deleteReorderRule(id: number): Promise<void> {
  const existing = await prisma.reorderRule.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound("Reorder rule");
  await prisma.reorderRule.delete({ where: { id } });
}
