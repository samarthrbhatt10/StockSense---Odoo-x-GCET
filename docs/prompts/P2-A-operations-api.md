# P2-A · Operations API: receipts, deliveries, transfers, adjustments

**Person 2 · branch `p2/operations` · target 10:00–12:15**

Read `AGENTS.md` and `docs/CONTRACT.md` (§3, §4 and §5 in full) before starting. If the human pasted corrections from your P2-0 plan below this line, they take priority.

**You own only:** `server/src/modules/operations/`.

This module is the core of the product: every stock change except initial stock flows through it. Correctness beats features. Every rule below is tested at the end.

## Files

- `routes.ts`: thin handlers only.
- `schemas.ts`: Zod schemas.
- `service.ts`: list, detail, create, update, delete.
- `workflow.ts`: confirm, check-availability, validate, cancel, and the availability helper.

## Endpoints (mounted at `/api/operations`, `requireAuth` already applied)

### `GET /` — list
- Query: pagination; `type?` (OperationType); `status?` (`enumList` of statuses); `warehouseId?` (matches the source OR destination location's warehouse); `search?` (reference or partnerName, case-insensitive contains); `dateFrom?` / `dateTo?` (on `scheduledDate`, via `toDateRange`).
- Sort by `scheduledDate` desc, then `id` desc.
- Item shape:
  ```
  { id, reference, type, status, partnerName, scheduledDate, doneAt, isLate,
    sourceLocation: { id, fullName }, destLocation: { id, fullName },
    lineCount, totalQuantity, createdBy: { id, name } }
  ```

### `GET /:id` — detail
- The list fields, plus `notes`, `createdAt`, `updatedAt`, `lines` and `moves`.
- `lines`: `[{ id, productId, product: { id, name, sku, uom }, quantity, countedQuantity, available }]`, where `available` is:
  - DELIVERY / INTERNAL: current quantity at the source;
  - ADJUSTMENT: current quantity at the counted location while not DONE, and the stored recorded `quantity` once DONE;
  - RECEIPT: `null`.
- `moves`: `[{ id, productId, productName, fromName, toName, quantity, createdAt }]`.

### `POST /` — create a DRAFT
- Body:
  ```
  { type, sourceLocationId?, destLocationId?, partnerName? (≤ 120), scheduledDate? (ISO; default now),
    notes? (≤ 500), lines: [{ productId, quantity?, countedQuantity? }] (1–100) }
  ```
- Location rules come from the CONTRACT §3 table:
  - the server sets the virtual side with `getVirtualLocation`, and ignores any virtual-side id the client sends;
  - required INTERNAL locations must exist, be active and be `INTERNAL` (else 400 with a field error);
  - INTERNAL transfers need source ≠ destination.
- Line rules:
  - RECEIPT / DELIVERY / INTERNAL: `quantity > 0`.
  - ADJUSTMENT: `countedQuantity ≥ 0`, and `quantity` is stored as 0.
  - Products must exist and be active.
  - No product may appear twice (400, "Each product can appear only once").
- In ONE transaction: `nextReference(tx, type, <operation warehouse code>)`, create the operation and its lines.
- Returns 201 with the detail shape.

### `PUT /:id` — edit
- DRAFT only (else 409 INVALID_STATE "Only draft operations can be edited").
- Same body; `type` must match or be omitted. Replace all lines in one transaction. The reference never changes.

### `DELETE /:id`
- DRAFT only (else 409). Delete it (lines cascade). Returns `{ id }`.

### Workflow actions
Each returns the detail shape. Implement exactly CONTRACT §4.
- `POST /:id/confirm`: DRAFT only.
  - RECEIPT / ADJUSTMENT → READY.
  - DELIVERY / INTERNAL → READY if `isAvailable`, else WAITING.
- `POST /:id/check-availability`: WAITING or READY only. Re-evaluate and set READY or WAITING.
- `POST /:id/validate`: READY only. In ONE `prisma.$transaction`:
  1. **Claim the operation atomically:** `tx.operation.updateMany({ where: { id, status: "READY" }, data: { status: "DONE", doneAt: now } })`. If `count === 0` → 409 INVALID_STATE "Only ready operations can be validated". This stops a double-click from moving stock twice.
  2. Build the moves per CONTRACT §4:
     - RECEIPT: vendor → destination, one move per line.
     - DELIVERY: source → customer.
     - INTERNAL: source → destination.
     - ADJUSTMENT: for each line, `recorded = getQuantity(tx, productId, destLocationId)`; update the line's `quantity = recorded`; `diff = counted − recorded` (rounded to 3 decimals); `diff > 0` → Inventory Adjustment → location; `diff < 0` → location → Inventory Adjustment (quantity `−diff`); `diff = 0` → no move.
  3. `applyMoves(tx, moves, { type, reference, userId: req.user!.id, operationId: id })`. If it throws INSUFFICIENT_STOCK, the whole transaction (including step 1) rolls back and the error reaches the client as 409.
- `POST /:id/cancel`: DRAFT, WAITING or READY → CANCELED. DONE or CANCELED → 409 INVALID_STATE.

**`isAvailable(db, operation)`**: sum the line quantities per product, then compare with `getQuantity` at the source. True only if every product is covered.

All error messages must be human-readable sentences; the UI shows them verbatim.

## Verify: run this whole script against a freshly seeded database (`npm run db:reset`)

Log in as the manager and use the ids from `/api/lookups/*`. Record the actual responses.

1. **Receipt:** 50 Steel Rods to `WH/Stock` → 201 DRAFT with a reference like `WH/IN/000N`. Confirm → READY. Validate → DONE. `lookups/stock` shows +50, and the detail shows 1 move from Vendors.
2. **Waiting delivery:** delivery of (current stock + 10) Office Chairs from `WH/Stock` → confirm → WAITING. Validate → 409 INVALID_STATE. Receive 10 more chairs (as in step 1). Check-availability → READY. Validate → DONE, and stock drops by the full amount.
3. **Double validate:** validate the step 1 receipt again → 409 INVALID_STATE, and stock is unchanged.
4. **Rollback:**
   - create two READY deliveries that each take 60% of some product's stock at one location;
   - validate the first → DONE;
   - validate the second → 409 INSUFFICIENT_STOCK with the contract message;
   - the second is still READY, and no new moves exist for it.
5. **Transfer:** `WH/Stock` → `WH/Rack A` for 5 units → DONE. On hand in WH is unchanged; the quantities per location moved.
6. **Adjustment down:** count Steel at `WH/Production Floor` at (recorded − 3) → DONE. The line's `quantity` = recorded, stock = counted, and there is one move to Inventory Adjustment.
7. **Adjustment up and equal:** count something higher → a move from Inventory Adjustment. Count something equal to its recorded quantity → DONE with no move.
8. **Validation errors:** transfer with source = destination → 400; duplicate product lines → 400; a receipt without `destLocationId` → 400; an inactive product → 400.
9. **Wrong-state actions:** edit a READY operation → 409; delete a DONE one → 409; cancel a DONE one → 409; cancel a DRAFT → CANCELED.
10. **List filters:** `GET /?type=DELIVERY&status=WAITING,READY&warehouseId=<WH>` returns only matching rows, with a correct `meta.total`. `search=WH/IN` finds receipts.

Then `npm run check` passes, and `git status` shows changes only in `server/src/modules/operations/`. Commit `operations: api and workflow`, and report a compact table of the 10 checks with pass/fail.
