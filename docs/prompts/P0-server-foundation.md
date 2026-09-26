# P0-S · Server foundation

**Person 3 · branch `p3/foundation-server` · target 35 minutes · runs at the same time as P0-C (Person 1)**

You are building the frozen server foundation of StockSense. Two other developers start building features on top of it within the hour, and their prompts reference your file paths, export names, signatures and response shapes exactly as written in `docs/CONTRACT.md`. **Exactness beats creativity here.** If the contract specifies something, implement exactly that; do not rename, reshape or "improve" it.

Read `AGENTS.md` and `docs/CONTRACT.md` completely before starting.

**For this task only, you own all of `server/`.** Do not create or edit anything in `client/`, and do not touch repo-root files. The root `package.json` and lock file already exist and are final.

## Steps

**1. Package and tooling (`server/`)**
- `server/package.json`:
  - `"name": "server"`, `"private": true`, `"type": "module"`;
  - the scripts from CONTRACT §2;
  - `"prisma": { "seed": "tsx prisma/seed.ts" }`.
- Install exactly these:
  - dependencies: `express@5 @prisma/client@6 zod@3 jsonwebtoken bcryptjs nodemailer dotenv`
  - devDependencies: `prisma@6 typescript@~6.0 tsx @types/node @types/express@5 @types/jsonwebtoken @types/nodemailer`
  - Do not upgrade any major beyond these; the contract depends on Prisma 6 and Zod 3 behaviour. bcryptjs ships its own types.
- `server/tsconfig.json`:
  - options: `target ES2022`, `module ESNext`, `moduleResolution bundler`, `strict`, `esModuleInterop`, `skipLibCheck`, `noEmit`, `types ["node"]`;
  - `include ["src", "prisma"]`;
  - no `baseUrl`, no `paths`.
  - We run TypeScript only through tsx and never emit, so **imports have no file extensions**.
- Copy `server/.env.example` to `server/.env` (not committed) and set a working `DATABASE_URL` for this machine.

**2. Database**
`server/prisma/schema.prisma` already exists and is final. Do not change a single character. Run `npx prisma migrate dev --name init`, and commit `server/prisma/migrations/`.

**3. Frozen library**
Implement every file and export in CONTRACT §5.2 with exactly the listed names and behaviour:
- `lib/`: `prisma.ts`, `http.ts`, `validate.ts`, `auth.ts`, `format.ts`, `sequence.ts`, `stock.ts`, `mailer.ts`
- `middleware/`: `auth.ts`, `error.ts`
- `types/express.d.ts`

Pay particular attention to these:
- **`applyMoves`**: the conditional decrement must be atomic (`updateMany` with `quantity: { gte: q }`, then check `count`). It must never create quants for virtual locations. It must build the exact INSUFFICIENT_STOCK message and details from the contract.
- **`getStockSummary` and `getStockAlerts`**: load active products, INTERNAL quants (with location → warehouse) and reorder rules in a few queries, then aggregate in memory. Follow the status rules in CONTRACT §3 and §5.2 precisely, because the product list, the dashboard and the alerts all depend on them agreeing.
- **`nextReference`**: a single `upsert` with `create: { key, next: 2 }` and `update: { next: { increment: 1 } }`; the number used is `row.next - 1`.
- **`errorHandler`**: the mappings in §5.2, the envelope in §5.1, and `console.error` for 500s only.
- **`parse`**: `z.output` typing, and `details: { fieldErrors, formErrors }` from `error.flatten()`.

**4. Lookups module (`modules/lookups/routes.ts`)**
All five endpoints in CONTRACT §5.4, with exact response shapes.

**5. Auth module (`modules/auth/routes.ts`, plus `service.ts` and `schemas.ts`)**
Implement ONLY `POST /login` and `GET /me` (with `requireAuth` on that route), as in CONTRACT §5.5. Person 1 extends this module later, so keep it clean and small.

**6. Placeholder routers**
For every other file in the CONTRACT §5.3 table: default-export a `Router` whose `GET /` responds `501` with `{ error: { code: "NOT_IMPLEMENTED", message: "<Module> is not implemented yet" } }`.

**7. `app.ts` and `index.ts`**
- `app.ts`: mount exactly per the §5.3 table, in the stated order, with `requireAuth` exactly where marked. Export `app`.
- `index.ts`: `import "dotenv/config"`, listen on `PORT` (default 4000), and log `StockSense API on http://localhost:<port>`.

**8. Seed (`prisma/seed.ts`)**
Produce everything guaranteed in CONTRACT §7.
- Wrap each operation's creation and stock effect in `prisma.$transaction`.
- Create references with `nextReference`.
- Create stock ONLY with `applyMoves`, passing `at` = `doneAt` so history is spread over the last 14 days.
- For the DONE adjustment, set the line's `quantity` to the recorded quantity, exactly as validation would.
- End with the consistency assertion from §7, then print a short summary: counts per table, which products are LOW/OUT, and the demo logins.

## Verify (all must pass before you commit)

1. `npm install --prefix server`, then `npm run db:setup --prefix server` on a fresh database, completes without errors. Run it twice to prove it is repeatable.
2. `npm run typecheck --prefix server` → 0 errors.
3. Start the server (`npm run dev --prefix server`). Call each of these with curl, or `Invoke-RestMethod` on Windows:
   - `POST /api/auth/login` as the manager → 200 with a token. Wrong password → 401 `UNAUTHORIZED`. Malformed body → 400 `VALIDATION_ERROR`.
   - `GET /api/auth/me` with the token → the user. Without the token → 401.
   - Each `/api/lookups/*` endpoint → non-empty data in the documented shape. `locations?type=INTERNAL` returns exactly the 5 INTERNAL locations with `fullName`s like `WH/Rack A`.
   - `GET /api/products` → 501 `NOT_IMPLEMENTED`. `GET /api/nope` → 404 `NOT_FOUND`. `GET /api/health` → `{ data: { status: "ok" } }`.
4. Create a temporary script in `server/scripts/`, and delete it afterwards. In it, prove the following:
   - Moving more Steel out of `WH/Production Floor` than is available throws `INSUFFICIENT_STOCK` with the contract message, and the database is unchanged afterwards (the transaction rolled back).
   - `getStockSummary()` reports Steel with `onHand` 77.
   - `getStockAlerts()` returns the LOW/OUT products the seed intended.
   - `nextReference` for RECEIPT/WH returns the next unused number.

Commit with the message `foundation: server`. Do not push.

**Report:** what you built, the verification output (short), and any deviation from the contract. There should be none; if something in the contract was impossible, explain exactly why and what you did instead.
