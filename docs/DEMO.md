# StockSense: 5-minute live demo

Exact clicks, and what to say while doing them. Numbers assume a **freshly seeded database**.

## Before you start (not part of the 5 minutes)

1. `npm run db:reset`, then `npm run dev`. Keep the terminal with the **server log** visible on a second screen (step 8 needs it).
2. Open <http://localhost:5173> in a normal window, and a **private window** for the staff login (step 5c).
3. Seeded starting point you'll refer to:
   - **Steel Rods** (`STL-ROD`): 25 at `WH/Rack A`, reorder minimum 40 → **Low stock**.
   - **Office Chair** (`FUR-CHAIR`): 6 at `WH/Rack B`, minimum 10 → **Low stock**.
   - **Steel** (`STL-KG`): 77 kg at `WH/Production Floor`, after the brief's own flow (100 in → transfer → 20 out → −3 adjustment).
   - **`WH/OUT/0006`**: a *Ready* delivery of 10 Steel Rods from `WH/Rack A` to BuildRight Infra. We use it in step 5a.
4. Every **Validate** opens a confirmation dialog that says exactly what will move. Click **Validate** again in the dialog.

> ⚠️ **Known issue (until the operations product-picker fix lands):** picking a product in a *new* receipt, delivery or transfer form doesn't stick. Open those forms from the product page's **Receive** / **Deliver** quick actions, or from the pre-filled URLs below; the product line is then already filled. The adjustment form's picker works.
> - Receipt: `/operations/receipts/new?productId=2&quantity=50&locationId=1` (Steel Rods × 50 → WH/Stock)
> - Transfer: `/operations/transfers/new?productId=2&quantity=5&locationId=1` (from WH/Stock)
> - Delivery: `/operations/deliveries/new?productId=6&quantity=10&locationId=1` (Office Chair from WH/Stock)
>
> With this workaround a document holds one product, so receive the 20 Office Chairs as a second receipt (`productId=6&quantity=20&locationId=1`).

---

## 1. Log in (0:00, 15 s)

1. On `/login`, enter `manager@stocksense.local` / `Manager@123` → **Sign in**.

> "StockSense is an inventory system for a multi-warehouse business. I'm logged in as a manager; there's also a staff role we'll see later."

## 2. Dashboard tour (0:15, 40 s)

1. Point at the **KPI cards**: Products in stock, Low stock **2**, Out of stock **2**, Pending receipts, Pending deliveries, Internal transfers scheduled.
   > "Every card is a link to the exact filtered list behind the number."
2. Point at the amber **late banner**: "2 operations are past their scheduled date". Click it; the table filters to pending operations.
3. Open the **Warehouse** filter → pick **Secondary Warehouse**. The KPIs and table re-scope. Set it back to **All**.
   > "Filters live in the URL, so any view can be bookmarked or shared."
4. Point at the chart **"Completed operations, last 14 days"**.
   > "Receipts, deliveries, transfers and adjustments per day, straight from completed documents."

## 3. The problem statement's flow, live (0:55, 2 min)

**a. Receive 50 Steel Rods**
1. Sidebar → **Operations → Receipts** → **New Receipt**.
2. Supplier: `Metal Supply Co`. Destination: **WH/Stock**.
3. Product line: **Steel Rods**, quantity `50`. Click **Add product** → **Office Chair**, quantity `20`.
4. Click **Save & confirm** → the receipt opens as **Ready** (`WH/IN/0009`). Click **Validate** → **Done**.
5. Press **Ctrl K** → type `STL-ROD` → open **Steel Rods**: on hand **75** (25 at Rack A + 50 at Stock), and the badge flipped from *Low stock* to **In stock**.
   > "Validating is the only moment stock changes. It wrote two ledger rows, Vendors → WH/Stock, one per product."

**b. Transfer 5 to Rack A**
1. **Operations → Internal Transfers** → **New Internal Transfer**.
2. From: **WH/Stock**. To: **WH/Rack A**. Line: **Steel Rods** `5`. The line shows what's available at the source.
3. **Save & confirm** → **Validate** → Done. The product page now shows Rack A **30**, Stock **45**, total still **75**.
   > "A transfer changes where stock is, never how much there is."

**c. Deliver 10 Office Chairs with pick / pack**
1. **Operations → Delivery Orders** → **New Delivery Order**.
2. Customer: `Northwind Offices`. Source: **WH/Stock**. Line: **Office Chair** `10` (available: 20).
3. **Save & confirm** → **Ready**. Point at the disabled **Validate** button.
4. Tick **Items picked**, then **Items packed** → **Validate** is enabled → click it → **Done**.
   > "Confirm checks availability: if there isn't enough, the order goes to *Waiting* instead of *Ready*. The pick/pack checklist is a guard for the warehouse floor."

**d. Adjust Steel for 3 damaged units**
1. **Operations → Adjustments** → **New Inventory Adjustment**.
2. Counted location: **WH/Production Floor**. **Add product** → **Steel**: the line shows *Recorded 77 kg*. Set **Counted** to `74`; *Difference* shows **−3 kg**. Reason: `3 kg damaged`.
3. **Save & confirm** (`WH/ADJ/0002`) → **Validate** → Done. Steel is now **74 kg**, and the document lists its stock move: Production Floor → Inventory Adjustment, 3.
   > "You enter what you counted. The system records what it expected and writes only the difference, 3 kg, to the virtual Inventory Adjustment location."

## 4. Move History: "every change is a ledger row" (2:55, 25 s)

1. Sidebar → **Operations → Move History**.
2. Product filter → **Steel**. You see 5 rows: receipt +100 → WH/Stock, transfer WH/Stock → Production Floor, delivery −20, the seeded adjustment −3, and today's adjustment −3.
   > "Balances are a cache; this is the truth. Add up the rows and you get exactly the on-hand on the product page. The seed checks that for every product."
3. Optionally click **Export CSV**.

## 5. Safeguards (3:20, 55 s)

**a. A delivery that exceeds stock → clear 409, nothing changes**
1. **Delivery Orders** → **New Delivery Order**. Source **WH/Rack A**, line **Steel Rods** `25` (available 30) → **Save & confirm** → tick both boxes → **Validate** → Done. Rack A now has **5**. (Picker workaround: `/operations/deliveries/new?productId=2&quantity=25&locationId=2`.)
2. Back to **Delivery Orders** → open **`WH/OUT/0006`** (BuildRight Infra, 10 Steel Rods, *Ready* since yesterday). The line already warns **"5 Units · not enough"**.
3. Tick **Items picked** + **Items packed** → **Validate** → confirm.
4. The toast reads: **"Not enough STL-ROD at WH/Rack A: available 5, requested 10"**. The status is still **Ready**; open Steel Rods and nothing moved.
   > "Ready doesn't reserve stock, so someone else can ship it first. Validation re-checks inside one database transaction with a conditional decrement: all lines succeed or none do. Double-clicking Validate can't count twice either, because the second click finds the order is no longer Ready."

**b. Delete a product with history → "deactivate instead"**
1. **Products → All Products** → **Steel** → **Delete** → **Delete product** in the dialog.
2. The toast reads: **"This product has stock history. Deactivate it instead."**
   > "The ledger is never rewritten. Old products are deactivated and disappear from pickers."

**c. Staff sees settings as view-only**
1. In the private window, log in as `staff@stocksense.local` / `Staff@123`.
2. Sidebar → **Settings → Warehouses**: no add / edit / delete buttons, only the notice *"View only: ask a manager to change settings."* The same applies to Locations and Categories.
   > "Roles are enforced on the server with requireRole('MANAGER'). The UI just hides what would be refused."

## 6. Low-stock bell → alerts → pre-filled receipt (4:15, 20 s)

1. Back in the manager window, click the **bell** in the top bar. The count dropped from 4 to **2**: Steel Rods and Office Chair are no longer low.
2. Click **View all** (or **Products → Low Stock**). **A4 Paper Ream** is *Out of stock* in WH, with suggested quantity **100** (max − on hand).
3. Click **Create receipt** → a new receipt opens pre-filled: A4 Paper Ream × 100 → **WH/Stock**.
   > "The list, the dashboard, the bell and this page all use one stock-status function, so the numbers always agree."

## 7. Ctrl K search by SKU (4:35, 10 s)

1. Press **Ctrl K** (⌘K on Mac) → type `STL` → **Steel** and **Steel Rods** appear. Type `WH/OUT/0006` → jump to the delivery.

## 8. Forgot-password OTP (4:45, 15 s)

1. In the **private window**, log out → **Forgot password?** → email `staff@stocksense.local` → **Send code**.
2. Show the server terminal: the `EMAIL (StockSense)` block with the **6-digit code**.
   > "No SMTP configured, so emails print to the console. Set SMTP_HOST and the same code goes out by email. Codes are hashed, expire in 10 minutes and allow 5 attempts."
3. Enter the code → **Verify code** → set a new password → **Update password** → log in with it. (Use the staff account so the manager login stays valid.)

> ⚠️ **Known issue (until the auth fix lands):** **Update password** currently fails with "otp: Enter the 6-digit code", because the page doesn't keep the verified code for the last step. Stop the demo after **Verify code** succeeds and say "then you set the new password".

---

## 9. Closing: judge talking points

- **Ledger + virtual locations.** Every operation is a move between two locations. Vendors, Customers and Inventory Adjustment are virtual locations, so every unit has a source and a destination. The model is double-entry, the same idea Odoo uses.
- **Atomic validation and rollback.** One transaction claims `READY → DONE`, then conditionally decrements each source (`quantity >= requested`). Any shortfall rolls back everything and returns a 409 that names the SKU, the location and the numbers. Stock can't go negative, and double-clicks can't double-count.
- **One stock-status rule, everywhere.** OK / LOW / OUT comes from a single function used by the product list, the dashboard KPIs, the bell and the alerts page, so they can't disagree.
- **Parallel ownership + frozen contract.** Three people on three branches, each owning their own folders. A frozen contract fixed endpoints, error codes, routes and cross-feature URLs up front. The result was merges without conflicts and a clean Git history, with AI agents writing code under written rules and humans reviewing every diff.
- **Offline-first.** Local PostgreSQL, no cloud services, and OTP emails fall back to the console. It runs on a laptop with no internet.

## Likely questions and answers

1. **Why no reservations?**
   Reserving at confirm adds a second number (reserved vs. on hand) that every screen must reason about. We made validation the single moment of truth and made it safe: the atomic check means overselling is caught with a clear message, not silently allowed. Reservations would be a `reserved` column on `StockQuant`, maintained by the same conditional-update pattern.
2. **How do you prevent negative stock under concurrency?**
   The decrement is `UPDATE … SET quantity = quantity − q WHERE product, location AND quantity >= q`. It runs inside the validation transaction, so PostgreSQL row-locks the quant. If zero rows are updated, we throw and the whole validation rolls back. Two simultaneous validations can't both take the last units.
3. **How would you add lots or serial numbers?**
   Add a `Lot` table and a nullable `lotId` on `StockQuant` (unique by product + location + lot) and on `StockMove`. `applyMoves` takes the lot per move. The ledger model, the virtual locations and the validation flow don't change.
4. **How does multi-warehouse affect reorder rules?**
   Rules are per product *per warehouse*. A product is LOW if any warehouse in scope is below its own minimum. Alerts list each warehouse separately with `suggested = max − on hand`, and "Create receipt" targets that warehouse's Stock location. Filtering the dashboard by warehouse re-scopes the counts.
5. **How do you know balances match the ledger?**
   Only `applyMoves` writes either table, and it writes both in the same transaction. The seed ends by asserting every quant equals its net moves. The same query could run as a nightly integrity check.
6. **What happens if validation fails halfway through a multi-line document?**
   Nothing is written. The status claim, every decrement and every ledger row share one transaction, so the operation stays Ready and the user sees which line was short.
7. **Why store quantities as floats?**
   Products use kg and metres. `applyMoves` rounds to 3 decimals and the UI shows 2. For production we'd switch to `Decimal`; that's a schema change only, because all arithmetic goes through one function.
8. **What can staff do versus managers?**
   Staff run all operations. Managers additionally manage warehouses, locations, categories and reorder rules, and can delete products. This is enforced on the server with `requireRole('MANAGER')`, and the UI hides what the server would refuse.
