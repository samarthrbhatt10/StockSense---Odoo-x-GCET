# P2-C · Inventory adjustments UI and operations polish

**Person 2 · branch `p2/operations` · target 15:15–16:15**

Read `AGENTS.md` and `docs/CONTRACT.md` (§3 operation lines, §4 adjustments) before starting. Build on the structure from P2-B.

**You own only:** `client/src/features/operations/` (the server module too, if a bug fix is needed: `server/src/modules/operations/`).

## 1. Adjustments (replace the stubs `AdjustmentForm.tsx` and `AdjustmentLines.tsx`)

The goal is to fix mismatches between recorded stock and a physical count.

**`AdjustmentForm`** (`/operations/adjustments/new` and `/:id/edit`)
- Fields: counted location (`LocationSelect`, INTERNAL); a reason/notes field (placeholder "e.g. Damaged during handling, cycle count"); scheduled date.
- **Lines table:** Product · Recorded (from `useLookupStock({ locationId })`, 0 if none) · Counted (number input, ≥ 0) · Difference (counted − recorded, green with + / red with −, or "—" when equal).
- Buttons: "Add product" (ProductPicker), and "Count all products here", which adds a line for every product with stock at the chosen location, with counted pre-filled to recorded so the user only edits the mismatches.
- Prefill from the URL: `productId` and `locationId` (CONTRACT §6.7).
- Submit sends lines with `countedQuantity` only. "Save & confirm" works as for other kinds.
- Guard: changing the location after lines exist asks for confirmation, then refreshes the recorded values.

**Adjustment detail** (`AdjustmentLines`, used by `OperationDetailPage` when the kind is adjustments):
- Columns: Product · Recorded · Counted · Difference.
- Before DONE, "Recorded" is live (`line.available`). After DONE, it is the stored value (`line.quantity`), with a caption: "Recorded quantity at the time of validation".
- The validate confirmation summarises the net effect, e.g. "Steel: −3 kg at WH/Production Floor. Office Chair: +2 Units at WH/Rack A".

## 2. Polish across all operation pages

- The Late badge and the scheduled date are consistent in the list and the detail.
- Skeletons match the final layout (no layout jump). Every error state has Retry.
- List: remember the last-used status tab per kind while navigating (the URL already does this; make the "back to list" link preserve the list's query string).
- Keyboard: Enter in the last quantity input adds a new line; Escape closes the pickers.
- Empty lines: block submit with the message "Add at least one product".
- Re-check at 375px: the lines editor, the action bar (sticky at the bottom on mobile), and the stepper (scrolls horizontally when needed).
- Fix anything found while running the flow below.

## 3. End-to-end run of the problem statement (fresh `npm run db:reset`), all through the UI

1. Receive 50 Steel Rods from a vendor into `WH/Stock` → stock +50.
2. Deliver 10 Office Chairs → stock −10.
3. Internal transfer: 5 Steel Rods from `WH/Stock` to `WH/Rack A` → total unchanged, locations updated.
4. Adjustment: 3 kg of Steel damaged at `WH/Production Floor` → count = recorded − 3 → stock −3.
5. Every step appears in `/moves` (if Person 3's page is merged) or in each operation's "Stock moves" card.

Then `npm run check` passes, and `git status` shows changes only in your folders. Commit `operations: adjustments and polish`. Report the end-to-end results and anything you could not finish.
