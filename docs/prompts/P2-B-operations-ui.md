# P2-B · Operations UI: list, form, detail

**Person 2 · branch `p2/operations` · target 12:45–15:00**

Read `AGENTS.md` and `docs/CONTRACT.md` (§4, §6.1, §6.4–§6.7) before starting. Your API from P2-A is on this branch. Read `server/src/modules/operations/` to get the exact response shapes, and mirror them in client types.

**You own only:** `client/src/features/operations/`.

One generic set of pages serves all four kinds. Put the kind-specific differences in a single config object, not in scattered `if`s.

## Structure (inside `features/operations/`)

- `kinds.ts`: resolves `:kind` to `{ type, labels, partnerLabel ("Supplier" | "Customer" | null), needsSource, needsDest, showsAvailability, description }`, e.g. receipts → "Incoming stock from vendors".
- `types.ts`, `schemas.ts` (Zod, mirroring the server rules), `api.ts` (typed calls with the `api` helper), `hooks.ts` (queries with keys under `['operations', …]`, plus mutations).
- `components/`:
  - `OperationFilters`
  - `LinesEditor`
  - `ProductPicker` (Popover + Command: search name/SKU, show SKU · name · uom, exclude already-picked products)
  - `LocationSelect` (INTERNAL locations from `useLookupLocations`)
  - `StatusStepper`
  - `OperationActions`
  - `DeliveryChecklist`
  - `AdjustmentForm.tsx` and `AdjustmentLines.tsx`: stubs that just render "Adjustments coming next" (filled in P2-C)
- `pages/`: the three existing page files. Replace their contents; keep their paths and default exports.

## `OperationListPage` (`/operations/:kind`)

- Header: the plural label, the kind description, and a "New <singular>" button.
- **Status tabs:** All · Pending (DRAFT, WAITING, READY) · Draft · Waiting · Ready · Done · Canceled. They are bound to the `status` URL param (comma list); `status=DRAFT,WAITING,READY` highlights Pending. **Links from the dashboard depend on this.**
- **Filters:** warehouse (`warehouseId`), search (`search`, debounced), and `page`, all via `useQueryParams` (CONTRACT §6.7).
- **Table columns:**
  - Reference (monospace, bold);
  - Supplier/Customer (only for receipts and deliveries);
  - From → To, using full names (adjustments show just "Location");
  - Scheduled (with a red "Late" badge when `isLate`);
  - Items ("3 products · 120 units");
  - Status (`StatusBadge`).
  Clicking a row opens the detail. Add a friendly empty state for each kind with a "Create" call to action.

## `OperationFormPage` (`/operations/:kind/new` and `/:kind/:id/edit`)

- For `adjustments`, render `<AdjustmentForm />` and stop. Everything below covers the other three kinds.
- **Fields:**
  - partner (with the kind's label), when applicable;
  - source and/or destination (`LocationSelect`); transfers show both, and destination options exclude the chosen source;
  - scheduled date (`<input type="date">`, default today);
  - notes;
  - lines.
- **`LinesEditor`:** rows of ProductPicker + quantity (uom suffix) + remove button, and an "Add product" button.
  - For deliveries and transfers, show "Available: X uom" at the chosen source (`useLookupStock({ locationId })`). If the quantity exceeds it, show an amber hint: "Only X available; this will wait for stock". This is allowed, not blocked.
  - Below `md` width, rows become stacked cards.
- **Prefill** from the URL on `new`: `productId`, `quantity` (default 1) and `locationId` (the destination for receipts, the source for deliveries/transfers), per CONTRACT §6.7.
- **Buttons:** "Save draft" → create/update → navigate to the detail page. "Save & confirm" → create/update, then `confirm` → detail.
- **Editing:** if the operation is not DRAFT, redirect to the detail page with a toast.
- Show server field errors on the matching fields where possible, and otherwise in a toast.

## `OperationDetailPage` (`/operations/:kind/:id`)

- **Header:** the reference (large, monospace), `StatusBadge`, the kind label, and a back link to the list.
- **`StatusStepper`:** Draft → Ready → Done, with Waiting shown as an amber state between Draft and Ready when relevant. Canceled shows as a red terminal state.
- **Info grid:** partner, From → To (full names), scheduled (plus Late badge), done at, created by, notes.
- **Lines table:** product (name + SKU), quantity with uom, and, for deliveries/transfers that aren't DONE, "Available at source" in red when it's insufficient.
- **`OperationActions`**, by status:
  - DRAFT: Edit · Confirm (primary) · Delete · Cancel
  - WAITING: Check availability (primary) · Cancel
  - READY: Validate (primary) · Check availability (deliveries/transfers only) · Cancel
  - DONE / CANCELED: no actions
- **`DeliveryChecklist`** (deliveries in READY only): "Items picked" and "Items packed" checkboxes, both required before Validate is enabled (UI state only, per CONTRACT §4).
- **Validate** asks for confirmation in a ConfirmDialog with an effect summary, e.g. "Adds 50 Units of Steel Rods to WH/Stock" or "Removes 10 Units of Office Chair from WH/Stock". On success: toast "Validated. Stock updated.", then `invalidateStockQueries()`. On 409: toast the server message and refetch.
- **Delete and Cancel** go through ConfirmDialog.
- **When DONE:** show a "Stock moves" card (product, from → to, quantity, time) and a link "View in Move History" → `/moves?search=<reference>`.

Every action button shows a spinner while pending and is disabled during any other pending action.

## Verify

1. `npm run check` passes.
2. In the browser (desktop and 375px), on a freshly seeded database:
   - create a receipt from `/operations/receipts/new?productId=<Steel Rods id>&quantity=50` (the line is prefilled) → Save & confirm → Validate → Done. `/products/<id>` shows the new stock (if P1's page is merged; otherwise check `/api/lookups/stock`);
   - create a delivery for more than is available → it goes to Waiting, with the amber hints showing. Receive more stock → Check availability → Ready → tick picked + packed → Validate;
   - an internal transfer between two racks;
   - cancel a draft; delete a draft;
   - open `/operations/deliveries?status=DRAFT,WAITING,READY` directly → the Pending tab is active and the list is filtered;
   - open `/operations/nonsense` → NotFound.
3. `git status` shows changes only in `client/src/features/operations/`. Then commit `operations: list, form, detail ui` and report.
