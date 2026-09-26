# StockSense — rules for AI coding agents

Read this file and `docs/CONTRACT.md` completely before doing anything. They override your defaults and any habits from other projects.

## Project

StockSense is an inventory management system built in an 8-hour hackathon by 3 developers working in parallel on separate Git branches that are merged into `main` several times a day. Your task prompt tells you which developer (Person 1, 2 or 3) you are working for.

- `server/`: Node.js, Express 5, TypeScript run with tsx, Prisma 6, PostgreSQL, Zod 3.
- `client/`: React 19, Vite, TypeScript, Tailwind CSS v4, shadcn/ui (Radix), React Router 7, TanStack Query 5, React Hook Form, Zod 3, Recharts, lucide-react, sonner.

Pinned majors are deliberate: Prisma 6 (not 7/8), Zod 3 (not 4), React Router 7 (not 8), TypeScript 6 or lower (not 7). Write code for these versions. Never upgrade them.

## Rule 1 — Stay inside your folders

Folder ownership is defined in `docs/CONTRACT.md` §1.

- You MUST only create, edit or delete files inside the folders your developer owns.
- NEVER edit frozen files. Frozen means: `server/prisma/**`, `server/src/app.ts`, `server/src/index.ts`, `server/src/lib/**`, `server/src/middleware/**`, `server/src/types/**`, `server/src/modules/lookups/**`, `client/src/app/**`, `client/src/lib/**`, `client/src/components/**`, `client/src/main.tsx`, `client/src/index.css`, every `package.json`, every lock file, every `tsconfig*.json`, `vite.config.ts`, `components.json`, `.env.example`, `AGENTS.md`, `CLAUDE.md`, `docs/CONTRACT.md`, `docs/prompts/**`.
- NEVER install, remove or upgrade packages. Everything needed is already installed.
- NEVER import from another developer's module or feature folder. Share code only through the frozen `lib/` and `components/`. Features link to each other only through URLs (`docs/CONTRACT.md` §6.7).
- If a frozen file seems to need a change: do NOT change it. Work around it inside your own folders, and list the exact change under "Contract change requests" in your final report.

Why: three branches merge into `main` several times a day. An edit outside your folders means a merge conflict, and a merge conflict means a broken demo. Every time.

**The only exception:** the two foundation prompts (`P0-server-foundation.md`, `P0-client-foundation.md`) create the frozen files and install the packages. Each states its scope explicitly.

`npm install` (run by `npm run setup`) can rewrite lock files. If `git status` shows a changed `package-lock.json` that you did not intend, discard it with `git checkout -- package-lock.json server/package-lock.json client/package-lock.json`.

## Rule 2 — Server conventions

- Each module uses `routes.ts` (thin handlers), `service.ts` (business logic and Prisma calls) and `schemas.ts` (Zod schemas). Extra router files use the exact names in CONTRACT §5.3.
- Validate every input with `parse()` from `lib/validate`:
  - body: `parse(schema, req.body ?? {})`
  - query: `parse(schema, req.query)`
  - params: `parse(idParamSchema, req.params)`
  Never read `req.body` or `req.query` unvalidated. Never assign to `req.query` (it is read-only in Express 5).
- Expected failures: `throw new AppError(status, code, message, details?)` using the codes in CONTRACT §5.1. Express 5 forwards thrown async errors to the error handler, so do not wrap routes in try/catch just to send errors.
- Respond only through `ok(res, data, status?)` and `list(res, items, meta)` from `lib/http`.
- Stock quantities change ONLY through `applyMoves()` from `lib/stock`, inside `prisma.$transaction(async (tx) => …)`. Never write `StockQuant` or `StockMove` directly.
- Stock status (OK / LOW / OUT) comes ONLY from `getStockSummary()` / `getStockAlerts()` in `lib/stock`. Never re-implement it.
- The logged-in user is `req.user!` (set by `requireAuth`). Manager-only routes add `requireRole('MANAGER')`.
- Prisma queries: `select`/`include` only what the response needs. Paginate lists: page default 1, pageSize default 20, max 100.
- Imports have no file extensions (the project uses tsx with bundler module resolution).

## Rule 3 — Client conventions

- Server data comes ONLY through TanStack Query plus the `api` helper from `@/lib/api`. Query keys start with your module prefix (CONTRACT §6.6).
- After any mutation that changes stock, call `invalidateStockQueries()` from `@/lib/queryClient`.
- Forms use React Hook Form with `zodResolver`, and mirror the server's Zod rules:
  - show field errors under the inputs,
  - disable submit while pending,
  - `toast.success(...)` on success and `toast.error(err.message)` on failure (sonner).
- Use the shared components from `@/components/common` (PageHeader, DataTable, Pagination, StatusBadge, StockStatusBadge, ConfirmDialog, EmptyState, ErrorState) and shadcn/ui from `@/components/ui`. Destructive actions always go through ConfirmDialog.
- Every page handles loading (skeletons), empty and error states.
- Every page is usable at 375px width. Tables scroll horizontally inside their own container.
- TypeScript settings are strict:
  - use `import type` for type-only imports;
  - no TS `enum`s and no constructor parameter properties (`erasableSyntaxOnly`);
  - no unused locals or parameters (the build fails on them);
  - avoid `any`.
- The `@/` alias maps to `client/src/`.

## Rule 4 — Definition of done (every task, no exceptions)

1. From the repo root, `npm run check` passes with zero errors (server typecheck, client typecheck, client build).
2. You started the app (`npm run dev`) and exercised everything you built:
   - every endpoint, including at least one failure case each (bad input → 400, missing id → 404, wrong state → 409);
   - every page, at desktop and at 375px width.
   Log in with the demo users from CONTRACT §2.
3. No leftover placeholders, TODOs, `console.log` debugging or commented-out code in your files.
4. `git status` shows changes only inside your owned folders. If anything else changed, revert it (`git checkout -- <file>`).
5. Commit on the current branch with the message `<area>: <what>` (for example `operations: validate endpoint`). Do NOT push, merge, rebase or switch branches; the human does that.
6. Finish with a report:
   - files created or changed,
   - how you verified them,
   - known gaps,
   - contract change requests (or "none").

Before writing any code, state in one short list which files you will create or modify. Every path on that list must be inside your owned folders.
