# P1-C · Products: catalogue, categories, reordering rules, stock per location

**Person 1 · branch `p1/features` · target 12:45–15:00**

Read `AGENTS.md` and `docs/CONTRACT.md` (especially §3, §5.2 `applyMoves` / `getStockSummary` / `getVirtualLocation`, and §6.7) before starting.

**You own only:** `server/src/modules/products/`, `client/src/features/products/`.

## Server

**`modules/products/routes.ts`** (+ `service.ts`, `schemas.ts`)

**`GET /` — list**
- Query: pagination, `search` (name or SKU, case-insensitive), `categoryId?`, `warehouseId?`, `stockStatus?` (OK | LOW | OUT), `includeInactive?` (default false).
- Get on-hand and status from `getStockSummary(prisma, { warehouseId, categoryId, includeInactive })`. Never compute them yourself. Then apply search and stockStatus, sort by name, and paginate in memory (the catalogue is small).
- Item shape: `{ id, name, sku, uom, category: { id, name } | null, isActive, onHand, status }`.

**`GET /:id` — detail**
Returns `{ id, name, sku, uom, isActive, createdAt, updatedAt, category, onHand, status, stockByLocation, reorderRules, recentMoves }`:
- `stockByLocation`: `[{ locationId, fullName, warehouseId, warehouseCode, quantity }]`, INTERNAL quants with quantity ≠ 0, sorted by full name;
- `reorderRules`: `[{ id, warehouseId, warehouseCode, warehouseName, minQty, maxQty, onHand, status }]`, where `onHand` and `status` come from that warehouse's entry in `getStockSummary`;
- `recentMoves`: the last 10 `StockMove`s for this product, `[{ id, createdAt, reference, type, quantity, fromName, toName, operationId }]`.

**`POST /` — create (any user)**
- Body: `{ name (2–120), sku, uom (1–20, default "Units"), categoryId?, initialStock?: { locationId, quantity > 0 } }`.
- SKU: trimmed, uppercased, 2–40 chars of `[A-Z0-9-_]`, unique → 409 CONFLICT "SKU already exists".
- In ONE transaction:
  1. Create the product.
  2. If `initialStock` is given, the location must be an active INTERNAL one (else 400). Call `applyMoves(tx, [{ from: Inventory Adjustment (getVirtualLocation), to: locationId, quantity }], { type: "ADJUSTMENT", reference: "INIT/" + sku, userId })`.
- Returns 201 with the detail shape. The initial stock therefore appears in the ledger like any other movement.

**`PUT /:id` — update (any user)**
- Body: `{ name, sku, uom, categoryId: number | null, isActive }`.
- Deactivating a product with pending operation lines (status DRAFT, WAITING or READY) → 409 INVALID_STATE "This product is used in pending operations".

**`DELETE /:id` — delete (MANAGER)**
- Only if the product has no quants, moves or operation lines. Otherwise → 409 IN_USE "This product has stock history. Deactivate it instead."

**`modules/products/categories.routes.ts`**
- `GET /` → `{ id, name, productCount }[]`
- `POST`, `PUT /:id` (MANAGER): `{ name (2–60) }`, unique → 409
- `DELETE /:id` (MANAGER): allowed; its products become uncategorised (the schema uses SetNull)

**`modules/products/reorder-rules.routes.ts`**
- `GET /?productId&warehouseId` → rules with product `{ id, name, sku, uom }`, warehouse `{ id, code, name }`, `onHand` and `status`.
- `POST` (MANAGER): `{ productId, warehouseId, minQty ≥ 0, maxQty ≥ minQty }` (a Zod `refine` with the message "Max must be at least min"). Duplicate (product, warehouse) → 409 CONFLICT.
- `PUT /:id` (MANAGER): `{ minQty, maxQty }`. `DELETE /:id` (MANAGER).

## Client

**`ProductListPage.tsx`**
- Filters synced to the URL with `useQueryParams`, exactly as in CONTRACT §6.7:
  - search (debounced),
  - category select,
  - warehouse select (scopes on-hand),
  - stock status segmented control (All / In stock / Low / Out),
  - a "Show inactive" toggle.
- DataTable columns: SKU (monospace), name, category, on hand (`formatQty` + uom, right-aligned), `StockStatusBadge`, and an inactive badge when relevant. Clicking a row → detail.
- Pagination, and a "New product" button.

**`ProductFormPage.tsx`** (`/products/new` and `/products/:id/edit`)
- Fields: name; SKU (uppercased as you type); category (with "None"); unit of measure (a select with Units, kg, g, m, L, Box, Pack, plus "Other…" → free text).
- **Create only:** an optional "Initial stock" section with an INTERNAL location select (from `useLookupLocations({ type: "INTERNAL" })`) and a quantity.
- On create, call `invalidateStockQueries()`, then navigate to the detail page.
- In edit mode, show an "Active" checkbox. If the product has stock and the UoM is changed, warn: "Changing the unit does not convert existing quantities".

**`ProductDetailPage.tsx`**
- Header: name, SKU, category and status badges.
- Actions: Edit, Activate/Deactivate, Delete (manager only, via ConfirmDialog; toast the 409 message).
- Quick-action buttons that link through the URL contract:
  - Receive → `/operations/receipts/new?productId=<id>`
  - Deliver → `/operations/deliveries/new?productId=<id>`
  - Count stock → `/operations/adjustments/new?productId=<id>`
- Content:
  - a total on-hand stat card;
  - a "Stock by location" table (empty state: "No stock yet");
  - a "Reordering rules" table (warehouse, min, max, on hand, status) with add/edit/delete dialogs for managers. The warehouse select excludes warehouses that already have a rule.
  - a "Recent movements" table (date, reference, from → to, quantity with a + or − sign relative to the product's internal stock). Add a "View full history" link → `/moves?productId=<id>`, and link each reference to its operation when `operationId` is set (`/operations/<kind>/<operationId>`, using `TYPE_TO_KIND`).

**`CategoriesPage.tsx`**
- A table of name and product count, with create/edit dialogs and a delete ConfirmDialog ("Products in this category will become uncategorised").

After mutations, invalidate `products` / `categories` / `reorder-rules` and `lookups`. Call `invalidateStockQueries()` whenever stock can change (initial stock).

## Verify

1. `npm run check` passes.
2. Run these API calls:
   - list with `stockStatus=LOW` returns exactly the seed's LOW products; with `warehouseId` for WH2, on-hand values change accordingly;
   - create a product with initial stock 25 at `WH/Rack A` → the detail shows 25 at `WH/Rack A`, and `recentMoves` has an `INIT/<SKU>` move;
   - duplicate SKU → 409;
   - reorder rule with max < min → 400; duplicate rule → 409;
   - delete a product with history → 409; delete a brand-new product without stock → OK;
   - as staff, delete a product → 403.
3. In the browser (desktop and 375px):
   - filter the list by Low, then open a product and add a reordering rule that makes it LOW → the list reflects it;
   - the quick-action links open `/operations/...` URLs with the correct query params (the pages may still be placeholders on your branch; that's expected).
4. `git status` shows changes only in your folders. Then commit `products: catalogue, categories, reorder rules` and report.
