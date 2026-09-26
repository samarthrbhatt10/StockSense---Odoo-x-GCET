import { prisma } from "../../lib/prisma";
import { getStockAlerts, type StockAlert } from "../../lib/stock";
import type { LowStockQuery } from "./schemas";

export type LowStockResult = { items: StockAlert[]; counts: { low: number; out: number } };

export async function getLowStock(query: LowStockQuery): Promise<LowStockResult> {
  const items = await getStockAlerts(prisma, query);
  return {
    items,
    counts: {
      low: items.filter((alert) => alert.status === "LOW").length,
      out: items.filter((alert) => alert.status === "OUT").length,
    },
  };
}
