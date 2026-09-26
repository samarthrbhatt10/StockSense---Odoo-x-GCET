# P3-A · Dashboard: KPIs, dynamic filters, activity chart

**Person 3 · branch `p3/features` · target 10:00–11:30**

Read `AGENTS.md` and `docs/CONTRACT.md` (§3 stock status, §4 pending/late, §5.2 `getStockSummary` / `getStockAlerts`, §6.7) before starting.

**You own only:** `server/src/modules/dashboard/`, `client/src/features/dashboard/`.

The dashboard is the landing page and the first thing judges see. It must be accurate, fast and clearly linked to the rest of the app. It reads the database directly; it does not depend on other developers' endpoints.

## Server: `modules/dashboard/` (`routes.ts`, `service.ts`, `schemas.ts`)

**`GET /summary?warehouseId&categoryId`** returns:
```
{
  kpis: {
    productsInStock,      // active products (in category scope) with onHand > 0 in warehouse scope
    totalProducts,        // active products in category scope
    lowStock, outOfStock, // product-level status counts from getStockSummary (same scope)
    pendingReceipts,      // RECEIPT with status in PENDING (DRAFT, WAITING, READY)
    pendingDeliveries,    // DELIVERY pending
    scheduledTransfers,   // INTERNAL pending
    lateOperations        // any pending operation with scheduledDate < start of today
  },
  activity: [{ date: "YYYY-MM-DD", receipts, deliveries, transfers, adjustments }],
                          // count of DONE operations per doneAt day, last 14 days incl. today, every day present (zeros included)
  lowStockPreview: StockAlert[]   // first 5 of getStockAlerts(same scope)
}
```

Scoping rules for operation counts:
- **warehouse:** the source or destination location belongs to `warehouseId`;
- **category:** the operation has at least one line whose product is in `categoryId` (`lines: { some: { product: { categoryId } } }`).

Activity counts operations, not quantities, on purpose: summing kg and Units together would be meaningless.

**`GET /operations?type&status&warehouseId&categoryId&page&pageSize`**
- A paginated list across all types.
- Items: `{ id, reference, type, status, partnerName, scheduledDate, isLate, sourceName, destName, lineCount }`.
- `status` is a comma list (`enumList`). Same scoping rules as above. Sort by `scheduledDate` desc.

Run the independent queries in parallel (`Promise.all`).

## Client: `features/dashboard/`

`pages/DashboardPage.tsx` plus components in `components/` and hooks in `hooks.ts` (query keys under `['dashboard', …]`, with `refetchInterval: 30_000` on the summary so the numbers stay live).

**Header:** "Good morning/afternoon/evening, <first name>", today's date, and quick buttons "New receipt" (`/operations/receipts/new`) and "New delivery" (`/operations/deliveries/new`).

**Filter bar** (synced to the URL: `type`, `status`, `warehouseId`, `categoryId`, per CONTRACT §6.7):
- Document type: All · Receipts · Deliveries · Internal · Adjustments
- Status: All · Pending · Draft · Waiting · Ready · Done · Canceled
- Warehouse and category selects (from the lookups hooks)
- A "Clear" button

Warehouse and category scope the KPIs and the chart. All four filters scope the operations table.

**KPI cards** (responsive grid: 2 columns on mobile, 3–4 on desktop). Each card is a link that carries the current warehouse/category into the target URL:

| Card | Shows | Links to |
|---|---|---|
| Products in stock | "`productsInStock` of `totalProducts`" | `/products?warehouseId&categoryId` |
| Low stock | `lowStock` (amber) | `/products?stockStatus=LOW&…` |
| Out of stock | `outOfStock` (red) | `/products?stockStatus=OUT&…` |
| Pending receipts | `pendingReceipts` | `/operations/receipts?status=DRAFT,WAITING,READY&warehouseId` |
| Pending deliveries | `pendingDeliveries` | `/operations/deliveries?status=DRAFT,WAITING,READY&warehouseId` |
| Internal transfers scheduled | `scheduledTransfers` | `/operations/transfers?status=DRAFT,WAITING,READY&warehouseId` |

If `lateOperations > 0`, show a slim amber banner above the table: "N operations are past their scheduled date". Clicking it filters the table to Pending.

**Activity chart:** a Recharts bar chart titled "Completed operations, last 14 days", with stacked bars for receipts, deliveries, transfers and adjustments, a legend, a tooltip, and short date labels. Use theme-consistent colours and put it in a `ResponsiveContainer`.

**Low stock card:** the 5 `lowStockPreview` rows (product, warehouse, on hand / min, StockStatusBadge) with a "View all" link → `/alerts`.

**Operations table:** reference, type, partner, From → To, scheduled (Late badge), status. Clicking a row → `/operations/<TYPE_TO_KIND[type]>/<id>`. Paginated, with an empty state such as "No operations match these filters".

The whole page needs loading skeletons shaped like the final layout, and ErrorState with Retry.

## Verify

1. `npm run check` passes.
2. On a freshly seeded database, compare `GET /api/dashboard/summary` with direct counts:
   - `lowStock`/`outOfStock` equal the number of LOW/OUT rows from `getStockSummary` (write a throwaway script, and delete it afterwards);
   - the pending counts equal `GET /api/dashboard/operations?type=RECEIPT&status=DRAFT,WAITING,READY` → `meta.total`;
   - `warehouseId=<WH2>` changes the counts sensibly;
   - `activity` has exactly 14 entries.
3. In the browser (desktop and 375px):
   - every KPI link lands on the right URL (target pages may still be placeholders on your branch; check the URL itself);
   - the filters survive a page reload (they are in the URL);
   - the chart renders with seeded data.
4. `git status` shows changes only in your folders. Then commit `dashboard: kpis, filters, activity` and report.
