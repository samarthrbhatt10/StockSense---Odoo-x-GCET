# P3-B · Move history, low-stock alerts, SKU search

**Person 3 · branch `p3/features` · target 11:30–15:00 (with Checkpoint 1 in between)**

Read `AGENTS.md` and `docs/CONTRACT.md` (§3, §5.2 `getStockAlerts` / `locationSelect`, §6.2 slots, §6.7) before starting.

**You own only:**
- server: `modules/moves/`, `modules/alerts/`, `modules/search/`
- client: `features/moves/`, `features/alerts/`, `features/search/`

Features never import each other. Where you need a product picker, build a small one in your own folder with `useLookupProducts`.

## 1. Move history: the stock ledger

**Server `GET /api/moves`**
- Query: pagination; `search` (reference, product name or SKU; case-insensitive); `productId?`; `locationId?` (either side); `warehouseId?` (either side's warehouse); `type?` (OperationType); `dateFrom?` / `dateTo?` (on `createdAt`, via `toDateRange`).
- Sort by `createdAt` desc, then `id` desc.
- Item shape:
  ```
  { id, createdAt, reference, type, operationId,
    product: { id, name, sku, uom },
    from: { id, fullName, type }, to: { id, fullName, type },
    quantity, direction, createdBy: { id, name } }
  ```
  `direction` is `"IN"` when `to` is INTERNAL and `from` is not, `"OUT"` when `from` is INTERNAL and `to` is not, and `"INTERNAL"` when both are.

**Client `features/moves/pages/MoveHistoryPage.tsx`** (`/moves`)
- Title "Move History", with the subtitle "Every stock movement, in order. Nothing is edited or deleted."
- **Filters**, all synced to the URL per CONTRACT §6.7:
  - search (debounced);
  - product (your own small Popover+Command picker from `useLookupProducts`);
  - warehouse;
  - location (options filtered by the chosen warehouse);
  - type;
  - date from/to;
  - "Clear".
  Other pages link here with `?productId=` and `?search=<reference>`, so both must work on first load.
- **Table columns:**
  - date/time;
  - reference: a link to `/operations/<TYPE_TO_KIND[type]>/<operationId>` when `operationId` exists; plain text for `INIT/…`;
  - product (a link to `/products/<id>`, with the SKU underneath);
  - From → To;
  - quantity: `+qty` in green for IN, `−qty` in red for OUT, `↔ qty` muted for INTERNAL, always with the uom;
  - type badge;
  - user.
- Pagination.
- An **"Export CSV"** button: fetch the filtered results page by page (`pageSize` 100, at most 20 pages), build the CSV in the browser (escape quotes and commas), and download it as `stock-moves-YYYY-MM-DD.csv` through a Blob link.

## 2. Low-stock alerts

**Server `GET /api/alerts/low-stock?warehouseId&categoryId`**
→ `{ items: StockAlert[], counts: { low, out } }`, using `getStockAlerts` exactly (never recompute).

**Client `features/alerts/pages/LowStockPage.tsx`** (`/alerts`)
- Title "Low Stock"; a warehouse filter (URL `warehouseId`); summary chips for Out and Low counts.
- **Table:** product (link), SKU, warehouse (or "All warehouses" when null), on hand, min, max, StockStatusBadge, suggested quantity.
- **Row action "Create receipt"** links to `/operations/receipts/new?productId=<id>&quantity=<suggestedQty or 1>&locationId=<id>`. The `locationId` is that warehouse's location named "Stock" (from `useLookupLocations({ warehouseId, type: "INTERNAL" })`), falling back to its first INTERNAL location; omit it when the warehouse is null.
- Empty state: "All products are above their reorder levels."

**Client `features/alerts/LowStockBell.tsx`** (top-bar slot; default export, no props)
- A bell icon button with a red count badge (low + out; hidden when 0). Poll with `refetchInterval: 60_000`.
- It opens a Popover listing up to 5 alerts (product, warehouse, on hand/min, badge), each linking to the product, with a "View all" link → `/alerts`.
- Accessible label: "Low stock alerts".

## 3. Global SKU search

**Server `GET /api/search?q=`** (`q` trimmed, 1–60 chars) → `{ products, operations }`:
- `products`: up to 6 active products matching name or SKU. An exact SKU match comes first. Each `{ id, name, sku, uom }`.
- `operations`: up to 6 operations whose reference or partner contains `q`, newest first. Each `{ id, reference, type, status, partnerName }`.

**Client `features/search/GlobalSearch.tsx`** (top-bar slot; default export, no props)
- **Desktop:** a button styled like an input, "Search SKU, product or reference…", with a `⌘K` / `Ctrl K` hint. **Mobile:** an icon button.
- It opens shadcn's `CommandDialog` with `shouldFilter={false}`; results come from the server with a 250ms debounced query (key `['search', q]`, enabled when `q` has at least 1 character).
- Results are grouped into "Products" (SKU · name) and "Operations" (reference · StatusBadge · partner).
- Enter/click navigates to `/products/<id>` or `/operations/<TYPE_TO_KIND[type]>/<id>` and closes the dialog.
- Register the Cmd/Ctrl+K shortcut globally (and clean it up on unmount).
- Show loading and "No results" states.

## Verify

1. `npm run check` passes.
2. Run these API calls on a freshly seeded database:
   - `/api/moves?search=STL-KG` returns the Steel ledger;
   - the net IN − OUT for Steel at `WH/Production Floor` equals 77;
   - the `direction` field is correct for a receipt, a delivery and a transfer;
   - `/api/alerts/low-stock` counts equal those from `getStockAlerts`;
   - `/api/search?q=stl` returns steel products; `q=WH/OUT` returns deliveries; an empty `q` → 400.
3. In the browser (desktop and 375px):
   - `/moves?productId=<steel id>` loads pre-filtered;
   - CSV export opens correctly in a spreadsheet;
   - the bell shows the count, and the popover links work;
   - Ctrl+K search navigates correctly;
   - "Create receipt" from `/alerts` produces the right URL.
4. `git status` shows changes only in your folders. Then commit `history, alerts, search` and report.
