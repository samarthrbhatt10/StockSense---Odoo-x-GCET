import type { OperationStatus, OperationType, Prisma } from "@prisma/client";
import { locationFullName } from "../../lib/format";
import type { ListMeta } from "../../lib/http";
import { prisma } from "../../lib/prisma";
import { getStockAlerts, getStockSummary, type StockAlert } from "../../lib/stock";
import { toSkipTake } from "../../lib/validate";
import type { OperationsQuery, SummaryQuery } from "./schemas";

const PENDING_STATUSES: OperationStatus[] = ["DRAFT", "WAITING", "READY"];
const ACTIVITY_DAYS = 14;
const LOW_STOCK_PREVIEW = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

type Scope = { warehouseId?: number; categoryId?: number };

export type DashboardKpis = {
  productsInStock: number;
  totalProducts: number;
  lowStock: number;
  outOfStock: number;
  pendingReceipts: number;
  pendingDeliveries: number;
  scheduledTransfers: number;
  lateOperations: number;
};

export type ActivityDay = { date: string; receipts: number; deliveries: number; transfers: number; adjustments: number };

export type DashboardSummary = { kpis: DashboardKpis; activity: ActivityDay[]; lowStockPreview: StockAlert[] };

export type DashboardOperation = {
  id: number;
  reference: string;
  type: OperationType;
  status: OperationStatus;
  partnerName: string | null;
  scheduledDate: Date;
  isLate: boolean;
  sourceName: string;
  destName: string;
  lineCount: number;
};

const ACTIVITY_FIELD: Record<OperationType, keyof Omit<ActivityDay, "date">> = {
  RECEIPT: "receipts",
  DELIVERY: "deliveries",
  INTERNAL: "transfers",
  ADJUSTMENT: "adjustments",
};

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Local calendar day as YYYY-MM-DD (the same clock that decides "late"). */
function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Warehouse: either side of the operation. Category: at least one line's product. */
function operationScope({ warehouseId, categoryId }: Scope): Prisma.OperationWhereInput[] {
  const conditions: Prisma.OperationWhereInput[] = [];
  if (warehouseId !== undefined) {
    conditions.push({ OR: [{ sourceLocation: { warehouseId } }, { destLocation: { warehouseId } }] });
  }
  if (categoryId !== undefined) {
    conditions.push({ lines: { some: { product: { categoryId } } } });
  }
  return conditions;
}

function emptyActivity(from: Date): ActivityDay[] {
  return Array.from({ length: ACTIVITY_DAYS }, (_, index) => {
    const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + index);
    return { date: dayKey(date), receipts: 0, deliveries: 0, transfers: 0, adjustments: 0 };
  });
}

export async function getSummary(scope: SummaryQuery): Promise<DashboardSummary> {
  const today = startOfToday();
  const activityFrom = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (ACTIVITY_DAYS - 1));
  const scoped = operationScope(scope);
  const pending: Prisma.OperationWhereInput = { AND: [...scoped, { status: { in: PENDING_STATUSES } }] };

  const [stock, alerts, pendingByType, lateOperations, doneOperations] = await Promise.all([
    getStockSummary(prisma, scope),
    getStockAlerts(prisma, scope),
    prisma.operation.groupBy({ by: ["type"], where: pending, _count: { _all: true } }),
    prisma.operation.count({ where: { AND: [pending, { scheduledDate: { lt: today } }] } }),
    prisma.operation.findMany({
      where: { AND: [...scoped, { status: "DONE" }, { doneAt: { gte: activityFrom, lt: new Date(today.getTime() + DAY_MS) } }] },
      select: { type: true, doneAt: true },
    }),
  ]);

  const pendingCount = (type: OperationType) => pendingByType.find((row) => row.type === type)?._count._all ?? 0;

  const activity = emptyActivity(activityFrom);
  const byDay = new Map(activity.map((day) => [day.date, day]));
  for (const operation of doneOperations) {
    const day = operation.doneAt ? byDay.get(dayKey(operation.doneAt)) : undefined;
    if (day) day[ACTIVITY_FIELD[operation.type]] += 1;
  }

  return {
    kpis: {
      productsInStock: stock.filter((row) => row.onHand > 0).length,
      totalProducts: stock.length,
      lowStock: stock.filter((row) => row.status === "LOW").length,
      outOfStock: stock.filter((row) => row.status === "OUT").length,
      pendingReceipts: pendingCount("RECEIPT"),
      pendingDeliveries: pendingCount("DELIVERY"),
      scheduledTransfers: pendingCount("INTERNAL"),
      lateOperations,
    },
    activity,
    lowStockPreview: alerts.slice(0, LOW_STOCK_PREVIEW),
  };
}

const locationNameSelect = {
  name: true,
  type: true,
  warehouse: { select: { code: true } },
} satisfies Prisma.LocationSelect;

export async function listOperations(
  query: OperationsQuery,
): Promise<{ items: DashboardOperation[]; meta: ListMeta }> {
  const where: Prisma.OperationWhereInput = {
    AND: [
      ...operationScope(query),
      ...(query.type ? [{ type: query.type }] : []),
      ...(query.status ? [{ status: { in: query.status } }] : []),
    ],
  };
  const today = startOfToday();

  const [total, rows] = await Promise.all([
    prisma.operation.count({ where }),
    prisma.operation.findMany({
      where,
      orderBy: [{ scheduledDate: "desc" }, { id: "desc" }],
      ...toSkipTake(query),
      select: {
        id: true,
        reference: true,
        type: true,
        status: true,
        partnerName: true,
        scheduledDate: true,
        sourceLocation: { select: locationNameSelect },
        destLocation: { select: locationNameSelect },
        _count: { select: { lines: true } },
      },
    }),
  ]);

  const items = rows.map((row) => ({
    id: row.id,
    reference: row.reference,
    type: row.type,
    status: row.status,
    partnerName: row.partnerName,
    scheduledDate: row.scheduledDate,
    isLate: PENDING_STATUSES.includes(row.status) && row.scheduledDate < today,
    sourceName: locationFullName(row.sourceLocation),
    destName: locationFullName(row.destLocation),
    lineCount: row._count.lines,
  }));

  return { items, meta: { total, page: query.page, pageSize: query.pageSize } };
}
