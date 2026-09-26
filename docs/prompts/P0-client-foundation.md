# P0-C · Client foundation

**Person 1 · branch `p1/foundation-client` · target 35 minutes · runs at the same time as P0-S (Person 3)**

You are building the frozen client foundation of StockSense: the app shell, routing, auth handling, API helper and shared components. Three developers build their pages on top of it within the hour, and their prompts reference your file paths, export names and props exactly as written in `docs/CONTRACT.md` §6. **Exactness beats creativity here.** Implement the contract as specified; do not rename, reshape or "improve" it.

Read `AGENTS.md` and `docs/CONTRACT.md` completely before starting.

**For this task only, you own all of `client/`.** Do not create or edit anything in `server/`, and do not touch repo-root files. The root `package.json` and lock file already exist and are final.

The server is being built at the same time and is not available yet. Build against the contract; login is tested end to end at Checkpoint 0.

## Steps

**1. Scaffold `client/` (Vite + React + TypeScript + Tailwind v4 + shadcn/ui on Radix)**
- Preferred: from the repo root, run `npx shadcn@latest init -t vite -b radix -p nova -n client --no-monorepo -y`. Then confirm `client/` is a Vite React TypeScript project with Tailwind v4 and the `@/*` alias working.
- Fallback, if that command fails or prompts: run `npm create vite@latest client -- --template react-ts` (non-interactive; do not auto-start). Then add Tailwind v4 with `@tailwindcss/vite`, and run `npx shadcn@latest init -b radix -p nova -y` inside `client/`. Follow the official shadcn/ui Vite guide.
- Configure the `@/*` → `./src/*` alias with `paths` only, in `tsconfig.json`, `tsconfig.app.json` and `vite.config.ts`. `baseUrl` is deprecated in TypeScript 6. Only if the shadcn CLI cannot detect the alias without it, add `"baseUrl": "."` together with `"ignoreDeprecations": "6.0"`.
- Keep the TypeScript version the template installs (it must be ≤ 6.x). Keep the template's strict compiler flags.

**2. Components and packages**
- Add the shadcn components listed in CONTRACT §6.5, non-interactively: `npx shadcn@latest add <names…> -y`.
- Install: `react-router@7 @tanstack/react-query react-hook-form @hookform/resolvers zod@3 recharts lucide-react` (lucide may already be present). No other packages.

**3. Config**
- `vite.config.ts`: dev server port 5173; proxy `/api` → `http://localhost:4000`.
- `package.json`: `"name": "client"` and the scripts from CONTRACT §2 (add `typecheck: "tsc -b"`).

**4. Frozen library**
Implement everything in CONTRACT §6.4 with exactly those names and behaviours:
- `lib/`: `types.ts`, `api.ts`, `queryClient.ts`, `lookups.ts`, `hooks.ts`, `format.ts`, `validation.ts` (`lib/utils.ts` comes from shadcn)
- `app/`: `AuthProvider.tsx`

Specifics:
- `ApiError` assigns its fields in the constructor body. Parameter properties are not allowed (`erasableSyntaxOnly`).
- The `api` helper always sends `Content-Type: application/json` when there is a body, and adds `Authorization: Bearer <token>` when a token exists.
- `useQueryParams` wraps React Router's `useSearchParams` with `replace: true`.

**5. Shared components (`components/common/`)**
Implement exactly the props in CONTRACT §6.5, and export all of them from `components/common/index.ts`.

**6. App shell (`app/`)**
- `router.tsx` (`createBrowserRouter`) with every route in CONTRACT §6.1: `ProtectedRoute`, a `PublicOnlyRoute` for the three auth pages, `AuthLayout`, `AppLayout`, `NotFoundPage`, and `nav.ts`.
- `main.tsx` provider order: `StrictMode` → `QueryClientProvider` → `AuthProvider` → `RouterProvider`, plus sonner's `<Toaster richColors position="top-right" />`.
- **AppLayout:**
  - a fixed sidebar (about 240px) with the StockSense brand, grouped navigation per CONTRACT §6.3 with suitable lucide icons and a clear active state, and the profile menu at the bottom (avatar initials, name, role, My Profile, Logout);
  - a top bar containing the mobile menu button (below `md`, it opens the sidebar in a Sheet), `<GlobalSearch />` and `<LowStockBell />`;
  - a main content area (`max-w-7xl`, comfortable padding).
- **AuthLayout:** a centred card on a subtle background, showing the brand.
- **Visual direction:** a clean, professional back-office look. Neutral surfaces, one accent colour used consistently for primary actions and active nav, generous whitespace, and readable 14px body text. Light mode only.

**7. Placeholder files**
Create every page file in CONTRACT §6.1 and the two slot files in §6.2, at the exact paths:
- pages render `<PageHeader title="<Page name>" description="Coming soon" />`;
- the slot components render `null`.
- The operation pages must render `NotFoundPage` when `:kind` is not one of the four kinds.

**8. `LoginPage` (fully working)**
- Email and password fields using React Hook Form + Zod (`emailSchema`, and a required password).
- On submit: `api.post('/auth/login')` → `login(token, user)` → navigate to the originally requested page, or `/dashboard`.
- Show the API error message inline.
- Links to `/signup` and `/forgot-password`.
- In dev only (`import.meta.env.DEV`), show a small hint with the demo login.

## Verify (all must pass before you commit)

1. `npm run typecheck --prefix client` and `npm run build --prefix client` → 0 errors, 0 warnings about unused code.
2. Start `npm run dev --prefix client` and check (use a browser tool if you have one; otherwise reason through the code carefully and list what the human should click at Checkpoint 0):
   - `/login` renders inside AuthLayout. Submitting with the server down shows "Cannot reach the server. Is it running?" instead of crashing.
   - `/dashboard` without a token redirects to `/login`.
   - An unknown URL shows NotFound.
   - Every page file and slot file from §6.1 and §6.2 exists at its exact path. List them with `git status` to prove it.
3. `grep` your code for the exact export names in §6.4 and §6.5. Every one must exist with the documented signature.

Commit with the message `foundation: client`. Do not push.

**Report:** what you built, the verification output, a short click-through checklist for the human at Checkpoint 0, and any deviation from the contract (there should be none).
