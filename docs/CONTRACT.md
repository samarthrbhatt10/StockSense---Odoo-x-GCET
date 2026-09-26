# StockSense — Shared Contract

This is the single source of truth for all three developers and their AI agents. If a task prompt and this file disagree, this file wins.

It is frozen after Checkpoint 0. Changes happen only through "contract change requests": the foundation author applies them on `main` at a checkpoint, then everyone merges `main`.

---

## 1. Team and ownership

| Owner | Server (`server/src/modules/…`) | Client (`client/src/features/…`) | Other |
|---|---|---|---|
| **Person 1**: Auth, Settings, Products | `auth/`, `products/`, `settings/` | `auth/`, `profile/`, `settings/`, `products/` | — |
| **Person 2**: Operations | `operations/` | `operations/` | — |
| **Person 3**: Dashboard, History, Alerts, Search, Docs | `dashboard/`, `moves/`, `alerts/`, `search/` | `dashboard/`, `moves/`, `alerts/`, `search/` | `README.md`, `docs/DEMO.md` |
| **Frozen** (foundation) | everything else in `server/` (incl. `modules/lookups/`) | everything else in `client/` | repo-root files, `AGENTS.md`, `CLAUDE.md`, `docs/CONTRACT.md`, `docs/prompts/` |

Foundation authors: **Person 3** built the server foundation, **Person 1** built the client foundation. They are the only people who apply approved contract change requests, and only on `main` at a checkpoint.

---

## 2. Environment, commands, demo logins

- **Tools:** Node.js 24 LTS (22 works), PostgreSQL 16+, npm, Git.
- **Ports:** the API runs on `http://localhost:4000` with every route under `/api`. The client runs on `http://localhost:5173`, and Vite proxies `/api` to port 4000, so there is no CORS setup.
- **`server/.env`** (copy from `server/.env.example`): `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`. SMTP is optional.

**Root scripts**

| Command | Does |
|---|---|
| `npm run setup` | Installs root, server and client dependencies, then resets the database, migrates and seeds. Safe to re-run, but **wipes data**. |
| `npm run dev` | Runs server and client together. |
| `npm run check` | Server typecheck, client typecheck, client build. **Must pass before every commit.** |
| `npm run db:reset` | Resets and reseeds the database only. |

**Server scripts:** `dev` (`tsx watch src/index.ts`), `start` (`tsx src/index.ts`), `typecheck` (`tsc --noEmit`), `db:setup` (`prisma migrate reset --force`, which migrates, seeds and generates), `db:migrate`, `db:seed`, `db:studio`, `postinstall` (`prisma generate`).

**Client scripts:** `dev`, `build` (`tsc -b && vite build`), `typecheck` (`tsc -b`), `preview`.

**Demo logins**

| Email | Password | Role |
|---|---|---|
| `manager@stocksense.local` | `Manager@123` | MANAGER |
| `staff@stocksense.local` | `Staff@123` | STAFF |

**Pinned major versions:** express 5, prisma and @prisma/client 6, zod 3 (server and client), react-router 7, tailwindcss 4, typescript 6 or lower.

---

## 3. Data model semantics

The schema is `server/prisma/schema.prisma` and is final. This section explains how to interpret it.

**Locations**
- `INTERNAL` locations are real places that hold stock and belong to a warehouse.
- `VENDOR`, `CUSTOMER` and `ADJUSTMENT` locations are virtual. They have `warehouseId = null`, never hold stock, and are seeded once as "Vendors", "Customers" and "Inventory Adjustment". Users cannot create or edit them.
- **Full name:** an INTERNAL location is shown as `${warehouse.code}/${name}` (for example `WH/Rack A`); a virtual location is shown as its name. Server code uses `locationFullName()`; lookups return it as `fullName`.

**Stock**
- `StockQuant` is the current quantity of a product at an INTERNAL location. Only `applyMoves()` writes it.
- `StockMove` is an immutable ledger row. `quantity` is always > 0, and the direction comes from `from`/`to`. Only `applyMoves()` writes it.
- **On hand** for a product within a scope (all warehouses, or one) = the sum of its `StockQuant.quantity` over the INTERNAL locations in that scope.
- Quantities are floats (kg, metres…). Display them with at most 2 decimals, followed by the product's `uom`.

**Reordering and stock status**
- `ReorderRule` is per (product, warehouse), with `0 ≤ minQty ≤ maxQty`.
- **Stock status** comes only from `getStockSummary` / `getStockAlerts`:
  - product level: **OUT** if on hand ≤ 0; otherwise **LOW** if any in-scope warehouse has a rule and that warehouse's on hand < `minQty`; otherwise **OK**.

**Products and categories**
- Once a product has operation lines, moves or quants, it cannot be deleted (the database returns 409 IN_USE). Deactivate it instead (`isActive = false`). Inactive products are hidden from lookups and new operations.

**Operation locations by type**

| type | `sourceLocationId` | `destLocationId` |
|---|---|---|
| RECEIPT | Vendors (virtual, set by server) | INTERNAL, required from client |
| DELIVERY | INTERNAL, required from client | Customers (virtual, set by server) |
| INTERNAL | INTERNAL, required | INTERNAL, required, ≠ source |
| ADJUSTMENT | Inventory Adjustment (virtual, set by server) | INTERNAL counted location, required |

- **The operation's warehouse** (used for references and filters) is the warehouse of its INTERNAL location: the source for DELIVERY and INTERNAL, the destination for RECEIPT and ADJUSTMENT. For INTERNAL transfers, a warehouse filter matches either side.

**Operation lines**
- RECEIPT, DELIVERY and INTERNAL lines use `quantity` (> 0).
- ADJUSTMENT lines: the client sends `countedQuantity` (≥ 0). `quantity` stays 0 until validation, when it is set to the recorded (system) quantity at that moment, so the document keeps recorded vs. counted.
- A product appears at most once per operation (enforced by a unique index).

**References**
- Format: `${warehouseCode}/${PREFIX}/${0001}`, where PREFIX is `IN` (receipt), `OUT` (delivery), `INT` (internal) or `ADJ` (adjustment).
- Generated only by `nextReference()`.

---

## 4. Operation workflow

```
DRAFT ──confirm──▶ READY ──validate──▶ DONE
  │                 ▲ │
  │  (not enough    │ │ check-availability
  │   stock)        │ ▼
  └──confirm──────▶ WAITING
DRAFT / WAITING / READY ──cancel──▶ CANCELED
```

- Only **DRAFT** operations can be edited (lines are replaced as a whole) or deleted.
- **confirm** (DRAFT only):
  - RECEIPT and ADJUSTMENT → READY.
  - DELIVERY and INTERNAL → READY if, for every product, the quantity available at the source ≥ the line quantity; otherwise → WAITING.
- **check-availability** (WAITING or READY): recomputes the same test and sets READY or WAITING.
- **validate** (READY only), in ONE transaction:
  1. For ADJUSTMENT, write each line's recorded quantity.
  2. `applyMoves` for all lines.
  3. Set status DONE and `doneAt = now`.
  - If `INSUFFICIENT_STOCK` is thrown, everything rolls back, the operation stays READY, and the API returns 409.
- **Moves written on validate:**
  - RECEIPT: vendor → destination.
  - DELIVERY: source → customer.
  - INTERNAL: source → destination.
  - ADJUSTMENT: `diff = counted − recorded`. If `diff > 0`: Inventory Adjustment → location. If `diff < 0`: location → Inventory Adjustment. If `diff = 0`: no move.
- **cancel:** DRAFT, WAITING or READY → CANCELED. DONE or CANCELED → 409 INVALID_STATE.
- READY does not reserve stock. Validation is the only moment stock changes.
- **Pending** = status in {DRAFT, WAITING, READY}. **Late** = pending and `scheduledDate` < start of today.
- **Deliveries** show a Pick → Pack → Validate checklist in the UI. It is UI-only state; there are no extra statuses.

---

## 5. Backend

### 5.1 API conventions and error codes

- **Success:** `{ "data": … }`. Lists add `"meta": { "total", "page", "pageSize" }`. Creating a record returns 201.
- **Error:** `{ "error": { "code", "message", "details"? } }`. `message` is always human-readable, because the client shows it in toasts.
- **Dates:** ISO strings in JSON. Query date filters use `dateFrom` / `dateTo` as `YYYY-MM-DD`, both inclusive.
- **Multi-value query params:** comma-separated, e.g. `status=DRAFT,READY`.
- **Manager-only:** creating, updating or deleting warehouses, locations, categories and reorder rules, and deleting products, requires `requireRole('MANAGER')`. Everything else needs only a logged-in user.
- **Module isolation:** modules never import other modules. Reading any table through `prisma` is allowed. Writing `StockQuant` / `StockMove` happens only through `applyMoves`.

| code | HTTP | when |
|---|---|---|
| VALIDATION_ERROR | 400 | Zod failure (`details.fieldErrors`), malformed JSON, business-rule input errors |
| OTP_INVALID / OTP_EXPIRED | 400 | password reset |
| UNAUTHORIZED | 401 | missing/invalid token, wrong login credentials |
| FORBIDDEN | 403 | role not allowed |
| NOT_FOUND | 404 | missing record or route |
| CONFLICT | 409 | unique violation (`details.fields`) |
| IN_USE | 409 | foreign-key violation on delete |
| INSUFFICIENT_STOCK | 409 | `applyMoves` would take an INTERNAL location below 0 |
| INVALID_STATE | 409 | action not allowed in the current status |
| NOT_IMPLEMENTED | 501 | placeholder router |
| INTERNAL | 500 | anything unexpected (logged on the server) |

A wrong *current* password on change-password is **400 VALIDATION_ERROR**, not 401. A 401 logs the user out on the client.

### 5.2 Frozen server library (`server/src/lib`, `server/src/middleware`, `server/src/types`)

```ts
// lib/prisma.ts
export const prisma: PrismaClient;                       // singleton
export type Db = PrismaClient | Prisma.TransactionClient;

// lib/http.ts
export class AppError extends Error { status: number; code: string; details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) }
export type ListMeta = { total: number; page: number; pageSize: number };
export function ok<T>(res: Response, data: T, status?: number): void;          // → { data }
export function list<T>(res: Response, items: T[], meta: ListMeta): void;       // → { data: items, meta }
export function notFound(entity: string): AppError;                             // 404 NOT_FOUND "<entity> not found"
export function invalidState(message: string): AppError;                       // 409 INVALID_STATE

// lib/validate.ts
export function parse<S extends z.ZodTypeAny>(schema: S, input: unknown): z.output<S>; // throws 400 VALIDATION_ERROR, details { fieldErrors, formErrors }
export const idParamSchema;        // z.object({ id: positive int (coerced) })
export const paginationSchema;     // { page (≥1, default 1), pageSize (1–100, default 20), search?: trimmed string }
export function toSkipTake(p: { page: number; pageSize: number }): { skip: number; take: number };
export const optionalId;           // query value → positive int | undefined ('' → undefined)
export function enumList<T extends [string, ...string[]]>(values: T); // "A,B" → T[number][] | undefined ('' → undefined)
export const optionalDate;         // "YYYY-MM-DD" → Date (UTC midnight) | undefined
export function toDateRange(from?: Date, to?: Date): { gte?: Date; lt?: Date } | undefined; // `to` inclusive (lt = to + 1 day)

// lib/auth.ts
export type AuthUser = { id: number; name: string; email: string; role: Role };
export type PublicUser = AuthUser & { createdAt: Date };
export function signToken(userId: number): string;                 // JWT { sub: String(userId) }, expires JWT_EXPIRES_IN (default "7d")
export function verifyToken(token: string): number;                // userId; throws 401 UNAUTHORIZED
export function hashPassword(plain: string): Promise<string>;      // bcryptjs, 10 rounds
export function verifyPassword(plain: string, hash: string): Promise<boolean>;
export function toPublicUser(u: User): PublicUser;
export const passwordSchema;  // z.string(): 8–72 chars, ≥1 letter, ≥1 digit, readable messages

// lib/format.ts
export function locationFullName(loc: { name: string; type: LocationType; warehouse?: { code: string } | null }): string;
export const locationSelect;  // Prisma select: { id, name, type, warehouseId, warehouse: { select: { id, code, name } } }

// lib/sequence.ts
export const REFERENCE_PREFIX: Record<OperationType, string>;      // IN, OUT, INT, ADJ
export function nextReference(tx: Prisma.TransactionClient, type: OperationType, warehouseCode: string): Promise<string>;
// atomic upsert on Sequence(key = `${code}/${PREFIX}`) → `${key}/${n padded to 4}`

// lib/stock.ts
export type StockStatus = 'OK' | 'LOW' | 'OUT';
export type MoveInput = { productId: number; fromLocationId: number; toLocationId: number; quantity: number };
export type MoveContext = { type: OperationType; reference: string; userId: number; operationId?: number; at?: Date };
export function applyMoves(tx: Prisma.TransactionClient, moves: MoveInput[], ctx: MoveContext): Promise<StockMove[]>;
export function getQuantity(db: Db, productId: number, locationId: number): Promise<number>;   // 0 if no quant
export function getVirtualLocation(db: Db, type: 'VENDOR' | 'CUSTOMER' | 'ADJUSTMENT'): Promise<Location>;
export type WarehouseStock = { warehouseId: number; warehouseCode: string; warehouseName: string;
  onHand: number; minQty: number | null; maxQty: number | null; status: StockStatus };
export type StockSummaryRow = { productId: number; name: string; sku: string; uom: string;
  categoryId: number | null; categoryName: string | null; isActive: boolean;
  onHand: number; status: StockStatus; warehouses: WarehouseStock[] };
export function getStockSummary(db: Db, opts?: { warehouseId?: number; categoryId?: number;
  productIds?: number[]; includeInactive?: boolean }): Promise<StockSummaryRow[]>;
export type StockAlert = { productId: number; name: string; sku: string; uom: string;
  warehouseId: number | null; warehouseCode: string | null; warehouseName: string | null;
  onHand: number; minQty: number | null; maxQty: number | null;
  status: 'LOW' | 'OUT'; suggestedQty: number | null };
export function getStockAlerts(db: Db, opts?: { warehouseId?: number; categoryId?: number }): Promise<StockAlert[]>;

// lib/mailer.ts
export function sendMail(msg: { to: string; subject: string; text: string }): Promise<void>;
// Always logs a clearly marked block to the console. If SMTP_HOST is set, also sends via nodemailer.
// Never throws; send failures are logged as warnings.

// middleware/auth.ts
export const requireAuth: RequestHandler;                       // 401 UNAUTHORIZED; sets req.user (fresh from DB)
export function requireRole(...roles: Role[]): RequestHandler;  // 403 FORBIDDEN

// middleware/error.ts
export const notFoundHandler: RequestHandler;                   // 404 NOT_FOUND "Route not found"
export const errorHandler: ErrorRequestHandler;
// Maps: AppError → as is; ZodError → 400; Prisma P2002 → 409 CONFLICT; P2003 → 409 IN_USE; P2025 → 404; malformed JSON → 400; else → 500 INTERNAL

// types/express.d.ts — augments Express.Request with `user?: AuthUser`
```

**`applyMoves` behaviour** (the heart of the system):
1. Round each quantity to 3 decimals. Reject quantity ≤ 0 and `from === to` with 400.
2. Load all involved locations once. An unknown id → 404.
3. Process moves in order:
   - If `from` is INTERNAL, do an atomic conditional decrement (`updateMany` where `quantity >= q`). If nothing was updated, throw `409 INSUFFICIENT_STOCK` with the message `Not enough <SKU> at <full location name>: available X, requested Y` and `details { productId, locationId, available, requested }`.
   - If `to` is INTERNAL, upsert and increment its quant.
   - Virtual locations never get quants.
4. Create one `StockMove` per input, with `createdAt = ctx.at ?? now`. Return the created moves.

**`getStockSummary` behaviour:**
- Active products only, unless `includeInactive` is set.
- The in-scope warehouses are all warehouses, or only `warehouseId` if given.
- Each row lists one `WarehouseStock` per in-scope warehouse where the product has quants or a rule.
  - Per-warehouse status: OUT if on hand ≤ 0; LOW if a rule exists and on hand < `minQty`; otherwise OK.
- Product-level status follows §3. Rows are sorted by name.

**`getStockAlerts` behaviour:**
- One row per (product, in-scope warehouse) rule where that warehouse's on hand < `minQty`. Its status is OUT if on hand ≤ 0, otherwise LOW, and `suggestedQty = maxQty − onHand`.
- Plus one row with warehouse `null` for each active product whose total in-scope on hand ≤ 0 and that has no in-scope rule (status OUT, `suggestedQty` null).
- Sorted OUT first, then by name.

### 5.3 Mounted routers (`server/src/app.ts`, frozen)

Every file listed here exists from the foundation and default-exports an Express `Router`. Owners replace the placeholder contents but keep the path and the default export. Placeholders answer `GET /` with 501 NOT_IMPLEMENTED.

| Mount | File | Auth applied in app.ts | Owner |
|---|---|---|---|
| `GET /api/health` | inline → `{ data: { status: "ok" } }` | public | frozen |
| `/api/auth` | `modules/auth/routes.ts` | none (router applies `requireAuth` per route) | Person 1 (foundation built `login` and `me`) |
| `/api/lookups` | `modules/lookups/routes.ts` | requireAuth | frozen |
| `/api/products` | `modules/products/routes.ts` | requireAuth | Person 1 |
| `/api/categories` | `modules/products/categories.routes.ts` | requireAuth | Person 1 |
| `/api/reorder-rules` | `modules/products/reorder-rules.routes.ts` | requireAuth | Person 1 |
| `/api/warehouses` | `modules/settings/warehouses.routes.ts` | requireAuth | Person 1 |
| `/api/locations` | `modules/settings/locations.routes.ts` | requireAuth | Person 1 |
| `/api/operations` | `modules/operations/routes.ts` | requireAuth | Person 2 |
| `/api/dashboard` | `modules/dashboard/routes.ts` | requireAuth | Person 3 |
| `/api/moves` | `modules/moves/routes.ts` | requireAuth | Person 3 |
| `/api/alerts` | `modules/alerts/routes.ts` | requireAuth | Person 3 |
| `/api/search` | `modules/search/routes.ts` | requireAuth | Person 3 |

Order in `app.ts`: `express.json({ limit: "1mb" })` → routers → `notFoundHandler` → `errorHandler`.

### 5.4 Lookups (frozen, read-only, not paginated, for dropdowns anywhere)

| Endpoint | Query | Returns `data` |
|---|---|---|
| `GET /api/lookups/products` | `search?` (name or SKU, case-insensitive) | `{ id, name, sku, uom, categoryId, categoryName }[]`: active only, sorted by name, max 500 |
| `GET /api/lookups/locations` | `type?`, `warehouseId?` | `{ id, name, fullName, type, warehouseId, warehouseCode }[]`: active only, INTERNAL sorted by warehouse code then name, virtual last |
| `GET /api/lookups/warehouses` | — | `{ id, name, code }[]` sorted by code |
| `GET /api/lookups/categories` | — | `{ id, name }[]` sorted by name |
| `GET /api/lookups/stock` | `productId?`, `locationId?`, `warehouseId?` | `{ productId, locationId, quantity }[]`: INTERNAL quants matching the filters |

### 5.5 Auth endpoints built by the foundation

- `POST /api/auth/login` `{ email, password }` → `{ token, user: PublicUser }`. Email is matched case-insensitively and stored lowercase. Bad credentials → 401 "Invalid email or password".
- `GET /api/auth/me` (requireAuth) → `PublicUser`.

Person 1 adds: `POST /signup`, `PATCH /me`, `POST /change-password`, `POST /forgot-password`, `POST /verify-otp`, `POST /reset-password` (details in prompt P1-A).

### 5.6 Endpoint map

Details live in each owner's prompt. This list exists so nobody collides.

- **Person 1:**
  - `/api/products`: `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`
  - `/api/categories`: CRUD
  - `/api/reorder-rules`: CRUD
  - `/api/warehouses`: CRUD
  - `/api/locations`: CRUD
- **Person 2:** `/api/operations`: `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`, `POST /:id/confirm`, `POST /:id/check-availability`, `POST /:id/validate`, `POST /:id/cancel`
- **Person 3:**
  - `/api/dashboard`: `GET /summary`, `GET /operations`
  - `/api/moves`: `GET /`
  - `/api/alerts`: `GET /low-stock`
  - `/api/search`: `GET /`

---

## 6. Frontend

### 6.1 Routes and page files

Every file below exists from the foundation and default-exports a component. Placeholders render `<PageHeader title=… description="Coming soon" />`. Owners replace the placeholder contents; they never add routes. A page may render different child components (inside its own feature folder) for different URL params.

| Path | File (`client/src/…`) | Owner |
|---|---|---|
| `/login` | `features/auth/pages/LoginPage.tsx` (working from foundation) | Person 1 |
| `/signup` | `features/auth/pages/SignupPage.tsx` | Person 1 |
| `/forgot-password` | `features/auth/pages/ForgotPasswordPage.tsx` | Person 1 |
| `/` | redirect → `/dashboard` | frozen |
| `/dashboard` | `features/dashboard/pages/DashboardPage.tsx` | Person 3 |
| `/products` | `features/products/pages/ProductListPage.tsx` | Person 1 |
| `/products/new` | `features/products/pages/ProductFormPage.tsx` | Person 1 |
| `/products/categories` | `features/products/pages/CategoriesPage.tsx` | Person 1 |
| `/products/:id` | `features/products/pages/ProductDetailPage.tsx` | Person 1 |
| `/products/:id/edit` | `features/products/pages/ProductFormPage.tsx` | Person 1 |
| `/operations/:kind` | `features/operations/pages/OperationListPage.tsx` | Person 2 |
| `/operations/:kind/new` | `features/operations/pages/OperationFormPage.tsx` | Person 2 |
| `/operations/:kind/:id` | `features/operations/pages/OperationDetailPage.tsx` | Person 2 |
| `/operations/:kind/:id/edit` | `features/operations/pages/OperationFormPage.tsx` | Person 2 |
| `/moves` | `features/moves/pages/MoveHistoryPage.tsx` | Person 3 |
| `/alerts` | `features/alerts/pages/LowStockPage.tsx` | Person 3 |
| `/settings/warehouses` | `features/settings/pages/WarehousesPage.tsx` | Person 1 |
| `/settings/locations` | `features/settings/pages/LocationsPage.tsx` | Person 1 |
| `/profile` | `features/profile/pages/ProfilePage.tsx` | Person 1 |
| `*` | `app/NotFoundPage.tsx` | frozen |

`:kind` ∈ `receipts | deliveries | transfers | adjustments` (see `KIND_TO_TYPE`). The operation pages show NotFound for any other value.

- `/login`, `/signup` and `/forgot-password` use `AuthLayout` and redirect logged-in users to `/dashboard`.
- Every other route uses `AppLayout` inside `ProtectedRoute`, which redirects to `/login` and remembers where the user was going.

### 6.2 Layout slots (frozen layout importing owner files)

The top bar of `AppLayout` renders two components that Person 3 owns. Both default-export a component with no props; the placeholders render `null`.
- `client/src/features/search/GlobalSearch.tsx`
- `client/src/features/alerts/LowStockBell.tsx`

### 6.3 Sidebar (`app/nav.ts`)

- **Dashboard**
- **Products:** All Products (`/products`), Categories (`/products/categories`), Low Stock (`/alerts`)
- **Operations:** Receipts, Delivery Orders, Internal Transfers, Adjustments (`/operations/<kind>`), Move History (`/moves`)
- **Settings:** Warehouses, Locations
- **Profile menu** (bottom of the sidebar): user name and role, My Profile (`/profile`), Logout

On screens below `md`, the sidebar opens in a Sheet from a menu button in the top bar.

### 6.4 Frozen client library (`client/src/lib`, `client/src/app`)

```ts
// lib/types.ts
export type Role = 'MANAGER' | 'STAFF';
export type LocationType = 'INTERNAL' | 'VENDOR' | 'CUSTOMER' | 'ADJUSTMENT';
export type OperationType = 'RECEIPT' | 'DELIVERY' | 'INTERNAL' | 'ADJUSTMENT';
export type OperationStatus = 'DRAFT' | 'WAITING' | 'READY' | 'DONE' | 'CANCELED';
export type StockStatus = 'OK' | 'LOW' | 'OUT';
export type OperationKind = 'receipts' | 'deliveries' | 'transfers' | 'adjustments';
export interface User { id: number; name: string; email: string; role: Role; createdAt: string }
export interface ListMeta { total: number; page: number; pageSize: number }
export interface LookupProduct { id: number; name: string; sku: string; uom: string; categoryId: number | null; categoryName: string | null }
export interface LookupLocation { id: number; name: string; fullName: string; type: LocationType; warehouseId: number | null; warehouseCode: string | null }
export interface LookupWarehouse { id: number; name: string; code: string }
export interface LookupCategory { id: number; name: string }
export interface LookupStock { productId: number; locationId: number; quantity: number }
export const KIND_TO_TYPE: Record<OperationKind, OperationType>;   // receipts→RECEIPT, deliveries→DELIVERY, transfers→INTERNAL, adjustments→ADJUSTMENT
export const TYPE_TO_KIND: Record<OperationType, OperationKind>;
export const OPERATION_LABELS: Record<OperationType, { singular: string; plural: string }>; // Receipt(s), Delivery Order(s), Internal Transfer(s), Inventory Adjustment(s)
export const STATUS_LABELS: Record<OperationStatus, string>;       // Draft, Waiting, Ready, Done, Canceled
export const PENDING_STATUSES: OperationStatus[];                  // DRAFT, WAITING, READY

// lib/api.ts
export class ApiError extends Error { status: number; code: string; details?: unknown }
export type QueryParams = Record<string, string | number | boolean | null | undefined | Array<string | number>>;
export const tokenStorage: { get(): string | null; set(token: string): void; clear(): void }; // localStorage "stocksense_token"
export const api: {
  get<T>(path: string, params?: QueryParams): Promise<T>;                          // returns body.data
  list<T>(path: string, params?: QueryParams): Promise<{ items: T[]; meta: ListMeta }>;
  post<T>(path: string, body?: unknown): Promise<T>;
  put<T>(path: string, body?: unknown): Promise<T>;
  patch<T>(path: string, body?: unknown): Promise<T>;
  delete<T = null>(path: string): Promise<T>;
};
// `path` is relative to /api ("/products/3").
// Params that are undefined, null or '' are dropped; arrays are joined with commas.
// Network failure → ApiError(0, "NETWORK_ERROR", "Cannot reach the server. Is it running?").
// Non-2xx → ApiError(status, error.code, error.message, error.details).
// A 401 from any path except /auth/login and /auth/signup → clears the token and dispatches window event "auth:logout".

// lib/queryClient.ts
export const queryClient: QueryClient;   // staleTime 15s, refetchOnWindowFocus, retry once except on 4xx
export const STOCK_QUERY_PREFIXES: readonly ['products', 'operations', 'dashboard', 'moves', 'alerts', 'lookups', 'search'];
export function invalidateStockQueries(): Promise<void>;

// lib/lookups.ts (TanStack Query hooks around §5.4, keys ['lookups', <name>, params])
export function useLookupProducts(params?: { search?: string }): UseQueryResult<LookupProduct[]>;
export function useLookupLocations(params?: { type?: LocationType; warehouseId?: number }): UseQueryResult<LookupLocation[]>;
export function useLookupWarehouses(): UseQueryResult<LookupWarehouse[]>;
export function useLookupCategories(): UseQueryResult<LookupCategory[]>;
export function useLookupStock(params: { productId?: number; locationId?: number; warehouseId?: number }, options?: { enabled?: boolean }): UseQueryResult<LookupStock[]>;

// lib/hooks.ts
export function useDebouncedValue<T>(value: T, delayMs?: number): T;   // default 300
export function useQueryParams(): [Record<string, string>, (patch: Record<string, string | number | null | undefined>) => void];
// reads and writes URL search params (replace: true); null/undefined/'' removes a key

// lib/format.ts
export function formatQty(value: number, uom?: string): string;       // "1,234.5 kg" (max 2 decimals)
export function formatDate(iso: string): string;                      // "26 Sep 2026"
export function formatDateTime(iso: string): string;                  // "26 Sep 2026, 14:05"
export function isLate(scheduledDate: string, status: OperationStatus): boolean;

// lib/validation.ts (client mirrors of server rules)
export const emailSchema;     // z.string().trim().toLowerCase().email()
export const passwordSchema;  // same rule as the server

// lib/utils.ts: `cn()` from shadcn

// app/AuthProvider.tsx
export function AuthProvider(props: { children: ReactNode }): JSX.Element;
export function useAuth(): { user: User | null; isLoading: boolean; isManager: boolean;
  login(token: string, user: User): void; logout(): void; refreshUser(): Promise<void> };
// On mount: if a token exists, GET /auth/me. Listens for "auth:logout".
// logout() clears the token, the user and the query cache.
```

### 6.5 Shared components (`client/src/components/common`, frozen)

```ts
PageHeader({ title: string; description?: string; actions?: ReactNode; backTo?: string })
DataTable<T>({ columns: Column<T>[]; rows: T[] | undefined; rowKey: (row: T) => string | number;
  isLoading?: boolean; emptyMessage?: string; onRowClick?: (row: T) => void })
  // Column<T> = { key: string; header: string; cell: (row: T) => ReactNode; className?: string; align?: 'left' | 'right' }
  // horizontal scroll container, skeleton rows while loading, EmptyState when rows is empty
Pagination({ page: number; pageSize: number; total: number; onPageChange: (page: number) => void })
StatusBadge({ status: OperationStatus })       // Draft gray, Waiting amber, Ready blue, Done green, Canceled red
StockStatusBadge({ status: StockStatus })      // OK green "In stock", LOW amber "Low stock", OUT red "Out of stock"
ConfirmDialog({ open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string;
  confirmLabel?: string; destructive?: boolean; loading?: boolean; onConfirm: () => void })
EmptyState({ title: string; description?: string; action?: ReactNode })
ErrorState({ error: unknown; onRetry?: () => void })   // shows ApiError.message
```

The shadcn/ui components installed in `components/ui` are: button, input, label, textarea, select, checkbox, card, table, dialog, alert-dialog, dropdown-menu, popover, command, badge, tabs, separator, skeleton, sheet, tooltip, avatar, alert, sonner. Use only these. A product picker = Popover + Command.

### 6.6 Query key prefixes

| Prefix | Owner |
|---|---|
| `lookups`, `auth` | frozen |
| `products`, `categories`, `reorder-rules`, `warehouses`, `locations` | Person 1 |
| `operations` | Person 2 |
| `dashboard`, `moves`, `alerts`, `search` | Person 3 |

### 6.7 Cross-feature URL contract

Features never import each other; they link through these URLs. The owner must honour the listed query params by reading them with `useQueryParams()` as initial filter values and keeping them in sync.

| URL | Implemented by | Query params |
|---|---|---|
| `/products` | Person 1 | `search`, `categoryId`, `warehouseId`, `stockStatus` (OK \| LOW \| OUT), `page` |
| `/products/:id` | Person 1 | — |
| `/operations/:kind` | Person 2 | `status` (comma list), `warehouseId`, `search`, `page` |
| `/operations/:kind/new` | Person 2 | `productId`, `quantity`, `locationId`: pre-fills one line and the INTERNAL location (destination for receipts/adjustments, source for deliveries/transfers) |
| `/operations/:kind/:id` | Person 2 | — |
| `/moves` | Person 3 | `productId`, `locationId`, `warehouseId`, `type`, `search`, `dateFrom`, `dateTo`, `page` |
| `/alerts` | Person 3 | `warehouseId` |
| `/dashboard` | Person 3 | `type`, `status`, `warehouseId`, `categoryId` |

---

## 7. Seed data guarantees (`server/prisma/seed.ts`, frozen)

- **Users:** Alex Manager (MANAGER) and Sam Staff (STAFF), with the logins in §2.
- **Warehouses:** Main Warehouse (`WH`) and Secondary Warehouse (`WH2`).
- **INTERNAL locations:** `WH/Stock`, `WH/Rack A`, `WH/Rack B`, `WH/Production Floor`, `WH2/Stock`.
- **Virtual locations:** Vendors, Customers, Inventory Adjustment.
- **Categories:** Raw Materials, Furniture, Office Supplies, Electronics.
- **Products:** at least 12, including `STL-KG` "Steel" (kg), `STL-ROD` "Steel Rods" (Units) and `FUR-CHAIR` "Office Chair" (Units).
- **The problem statement's flow for Steel**, all DONE:
  1. Receipt of 100 kg into `WH/Stock`.
  2. Internal transfer of 100 kg from `WH/Stock` to `WH/Production Floor`.
  3. Delivery of 20 kg from `WH/Production Floor`.
  4. Adjustment at `WH/Production Floor` counted 77 (−3).
  Result: 77 kg on hand.
- **Reorder rules** on at least 6 products. At least 2 products are LOW, and at least 1 product with a rule is OUT.
- **Operations in every relevant status:**
  - RECEIPT: DRAFT, READY, several DONE, one CANCELED.
  - DELIVERY: DRAFT, WAITING (quantity > available), READY, several DONE.
  - INTERNAL: READY (scheduled tomorrow), DONE.
  - ADJUSTMENT: DRAFT, DONE.
  - At least one pending operation is late.
- DONE operations are spread over the last 14 days (the moves' `createdAt` = the operation's `doneAt`).
- All stock goes through `applyMoves`, and all references through `nextReference`. At the end the seed asserts that every INTERNAL quant equals its net moves, and throws on any mismatch.
