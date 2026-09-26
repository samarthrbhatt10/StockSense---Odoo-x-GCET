# P3-C · Documentation, demo script, final integration

**Person 3 · two parts:**
- **Part 1** on `p3/features`, 15:15–16:15
- **Part 2** on `main` after the final merge, 16:30–17:00

Read `AGENTS.md` and `docs/CONTRACT.md` before starting.

**You own only:** `README.md`, `docs/DEMO.md` and your four feature folders (see CONTRACT §1).

---

## Part 1: README and demo script

**First, inspect the real code.** Read `server/prisma/schema.prisma`, `server/src/app.ts`, `server/src/lib/stock.ts`, `client/src/app/router.tsx`, and skim every module and feature folder on `origin/main` (`git fetch origin` first; read with `git show origin/main:<path>`, without merging). **Describe what actually exists. Never invent features.** If something is on `main` but unfinished, leave it out or mark it "planned".

**Write `README.md`**, clear and scannable:
1. **Title and one-line pitch**, then a short "What it does" paragraph.
2. **Features mapped to the problem statement:** a table with the requirement from the brief, how StockSense implements it, and where to find it in the app. Cover:
   - authentication with OTP reset;
   - dashboard KPIs and filters;
   - products and categories with reorder rules;
   - receipts;
   - deliveries (pick/pack/validate);
   - internal transfers;
   - adjustments;
   - move history;
   - low-stock alerts;
   - multi-warehouse;
   - SKU search.
3. **Tech stack:** each choice with a one-line reason.
4. **Architecture:** a Mermaid diagram of client pages → API modules → the lib (`applyMoves`, stock status) → PostgreSQL. Then explain the core design in 4–6 sentences:
   - every operation is a movement between locations, with virtual Vendor / Customer / Adjustment locations;
   - an append-only ledger (`StockMove`) plus current balances (`StockQuant`);
   - one function (`applyMoves`) is the only writer;
   - validation is atomic with a conditional decrement, so stock can never go negative and double-clicks cannot double-count.
5. **Data model:** a Mermaid `erDiagram` of the main entities and relations (from the real schema).
6. **Getting started:**
   - prerequisites (Node 24/22, PostgreSQL 16+);
   - create the DB;
   - `cp server/.env.example server/.env`;
   - `npm run setup`, then `npm run dev`;
   - URLs and demo logins;
   - "Password reset codes print in the server console when SMTP isn't configured";
   - Windows notes (use `copy`; make sure the PostgreSQL service is running).
7. **Scripts table.**
8. **Project structure:** a short tree of the top two levels, plus the module/feature folders.
9. **Team and workflow:** who owned what (CONTRACT §1), the branch-per-person flow with checkpoint merges, the frozen shared contract, and how AI coding agents were used (with humans reviewing every diff).
10. **Validation and error handling:** Zod on both sides, the consistent error envelope, human-readable messages.

**Write `docs/DEMO.md`**: a 5-minute live demo script, as a numbered sequence of exact clicks and what to say.
1. Log in (manager).
2. Dashboard tour: KPIs, a filter by warehouse, the chart, the late banner.
3. **The problem statement's flow, live:**
   - receive 50 Steel Rods → validate → show the stock;
   - transfer 5 to Rack A;
   - deliver 10 Office Chairs with pick/pack → validate;
   - adjust Steel for 3 damaged units.
4. Move History filtered to Steel: "every change is a ledger row".
5. **Show the safeguards:**
   - validate a delivery that exceeds stock → the clear 409 message, with nothing changed;
   - try to delete a product with history → the "deactivate instead" message;
   - log in as staff → view-only settings.
6. Low stock bell → the alerts page → "Create receipt" pre-filled.
7. Ctrl+K search by SKU.
8. Forgot-password OTP (the code shown in the server console).
9. **Close with judge talking points** (short bullets):
   - the ledger and virtual-locations design;
   - atomic validation and rollback;
   - the stock-status logic shared by the list, dashboard and alerts;
   - the parallel ownership model and frozen contract, plus clean Git history;
   - offline-first (local PostgreSQL, no cloud services).
   Add a "Likely questions and answers" list with 6–8 items, for example:
   - why no reservations?
   - how would you add lots/serials?
   - how does multi-warehouse affect reorder rules?
   - how do you prevent negative stock under concurrency?

Commit `docs: readme and demo script`. Do not push. Report.

---

## Part 2: final integration on `main` (after all three branches are merged)

The human has checked out `main` and pulled. **Do not edit files outside your folders.** Your job here is to find and report problems precisely, and to fix only your own.

1. Run `npm run setup`, then `npm run check`. Record any failure verbatim, with the file and the owner.
2. Start `npm run dev`. Run `docs/DEMO.md` step by step in the browser (or through the API where you cannot use a browser). Then check, at desktop and at 375px:
   - every sidebar page loads without console errors;
   - every page has loading, empty and error states;
   - numbers are consistent across pages: Steel shows the same on-hand on the product page, the dashboard scope and the move history net;
   - LOW/OUT counts match between the product list, the dashboard and the bell;
   - every cross-feature link in CONTRACT §6.7 lands on a correctly pre-filtered page.
3. Fix issues in your own folders and commit (`fix(<area>): …`).
4. For issues in other owners' folders, produce a **bug list** grouped by owner. For each bug give:
   - a one-line title;
   - exact reproduction steps;
   - expected vs. actual;
   - the error text;
   - the suspected file.
   Format each bug so it can be pasted straight into `docs/prompts/FIX.md`.
5. Update `README.md` if anything described there turned out not to work, so the README never over-claims.

**Final report:**
- the check results;
- the demo run, marking each step pass/fail;
- the bug list per owner;
- what you fixed.
