# P1-B · Settings: warehouses and locations

**Person 1 · branch `p1/features` · target 11:00–12:15**

Read `AGENTS.md` and `docs/CONTRACT.md` (especially §3 Locations, §5.1 manager-only rule, §5.2 `lib/format.ts`) before starting.

**You own only:** `server/src/modules/settings/`, `client/src/features/settings/`.

Multi-warehouse support is a judged feature. Make this area solid and simple.

## Server

**`modules/settings/warehouses.routes.ts`** (+ `warehouses.service.ts`, `warehouses.schemas.ts`)

| Endpoint | Role | Behaviour |
|---|---|---|
| `GET /` | any | `{ id, name, code, address, locationCount, onHand }[]` (onHand = total quantity across its INTERNAL locations), sorted by code. Use `list()` with standard pagination. |
| `GET /:id` | any | The warehouse plus its locations (`id, name, fullName, isActive, onHand`). |
| `POST /` | MANAGER | `{ name (2–80), code, address? }`. `code` is trimmed and uppercased, 2–5 chars `[A-Z0-9]`, unique (409 CONFLICT). In ONE transaction, also create its INTERNAL location "Stock". 201. |
| `PUT /:id` | MANAGER | `{ name, address? }`. **`code` is immutable** (references already use it). Say so in the UI. |
| `DELETE /:id` | MANAGER | Allowed only if none of its locations has quants > 0, moves or operations. Otherwise 409 IN_USE "This warehouse has stock or history and cannot be deleted." When allowed, delete its locations and the warehouse in one transaction. |

**`modules/settings/locations.routes.ts`** (+ `locations.service.ts`, `locations.schemas.ts`)

| Endpoint | Role | Behaviour |
|---|---|---|
| `GET /` | any | Query: `warehouseId?`, `type?`, `includeInactive?` (default false), `search?` + pagination. Items: `{ id, name, fullName, type, isActive, warehouse: { id, code, name } \| null, onHand, productCount }` (productCount = quants with quantity > 0). INTERNAL locations first, sorted by warehouse code then name; virtual ones last. |
| `POST /` | MANAGER | `{ name (1–60), warehouseId }`. Always creates `type: INTERNAL`. Duplicate name in the same warehouse → 409 CONFLICT "A location with this name already exists in this warehouse". 201. |
| `PUT /:id` | MANAGER | `{ name?, isActive? }`. Virtual location → 409 INVALID_STATE "System locations cannot be changed". Deactivating a location that holds stock → 409 INVALID_STATE "Move the stock out before deactivating this location". |
| `DELETE /:id` | MANAGER | Virtual → 409 INVALID_STATE. Has stock or history → 409 IN_USE (the error handler maps Prisma P2003; check quants yourself first for a clearer message). |

Use `locationSelect` and `locationFullName` from `lib/format`. Use `requireRole('MANAGER')` on every mutation.

## Client

**`features/settings/pages/WarehousesPage.tsx`**
- A responsive card grid. Each card shows the name, code badge, address, location count and total on hand, with a "View locations" link to `/settings/locations?warehouseId=<id>`.
- "New warehouse" button → a dialog with name, code (auto-uppercased as you type) and address.
- The edit dialog shows the code read-only, with the helper text "Codes can't change because document references use them."
- Delete goes through ConfirmDialog; on 409, toast the server message.

**`features/settings/pages/LocationsPage.tsx`**
- Filters: warehouse select (synced to the `warehouseId` URL param via `useQueryParams`), search, and a "Show inactive" toggle.
- DataTable columns: full name, warehouse, on hand, products stored, status (Active/Inactive), and row actions (Edit, Activate/Deactivate, Delete).
- "New location" dialog: warehouse select (defaulting to the filtered warehouse) and name, with a live preview of the full name, e.g. `WH/Rack C`.
- A separate small "System locations" card lists the virtual locations (Vendors, Customers, Inventory Adjustment), read-only, with a one-line explanation of what each is for.

**Role handling:** for STAFF users (`useAuth().isManager === false`), hide the create/edit/delete controls and show a subtle "View only: ask a manager to change settings" note. The server enforces this anyway.

After any mutation, invalidate your own keys (`warehouses`, `locations`) and `lookups`.

## Verify

1. `npm run check` passes.
2. Run these API calls as the manager:
   - create warehouse `WH3` → its `WH3/Stock` location exists;
   - duplicate code → 409;
   - rename it;
   - add location "Rack C" → duplicate name → 409;
   - deactivate an empty location → OK;
   - deactivate `WH/Production Floor` (holds stock) → 409;
   - delete `WH` → 409 IN_USE;
   - delete `WH3` → OK.
   As staff: `POST /api/warehouses` → 403.
3. In the browser (desktop and 375px):
   - create a warehouse, then add a location through the UI;
   - the new location appears in the location dropdowns other pages use (lookups invalidated);
   - staff sees the view-only mode.
4. `git status` shows changes only in your folders. Then commit `settings: warehouses and locations` and report.
