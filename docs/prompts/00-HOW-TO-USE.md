# StockSense: team runbook

This kit lets three people build StockSense in parallel with AI coding agents and merge cleanly. The pieces:

- **`AGENTS.md`**: the rules every agent follows. Claude Code, Cursor and Codex read it automatically; Copilot is pointed to it by `.github/copilot-instructions.md`.
- **`docs/CONTRACT.md`**: the shared contract, covering ownership, data rules, API and UI interfaces, and the links between features.
- **`docs/prompts/`**: one prompt per work block. They live in the repo, so you run one by pointing your agent at the file.

**The one rule for humans:** every person's agent touches only their own folders. Frozen files change only at checkpoints, on `main`, by the foundation author.

---

## Before 9:00 (everyone)

- [ ] Node.js 24 LTS (22 also works): `node -v`
- [ ] Git, and a GitHub account
- [ ] PostgreSQL 16+ running, with a user and password you know. Prisma creates the `stocksense` database if your user is allowed to; otherwise run `createdb stocksense`.
- [ ] Your AI agent installed and signed in (Claude Code, Cursor agent, Codex, or Copilot agent mode)
- [ ] Person 3: create the GitHub repository and add Persons 1 and 2 as collaborators
- [ ] Confirm with the organisers that bringing a pre-written plan and prompt kit is allowed. The kit contains no application code apart from the database schema.

## 9:00–9:05 · Kickoff

**Person 3:**
```bash
git clone <repo-url> stocksense && cd stocksense
# unzip the kit here so AGENTS.md sits at the repository root
npm install                       # root only: installs concurrently, creates package-lock.json
git add -A && git commit -m "chore: project kit (contract, agent rules, prompts, schema)"
git push origin main
```

**Persons 1 and 2:** clone after the push.

**Everyone:** copy the env file (`cp server/.env.example server/.env`, or on Windows `copy server\.env.example server\.env`), then set `DATABASE_URL` to your local PostgreSQL.

## Timeline

| Time | Person 1 | Person 2 | Person 3 |
|---|---|---|---|
| 9:05–9:45 | `P0-client-foundation` on `p1/foundation-client` | `P2-0-prep` (no code) | `P0-server-foundation` on `p3/foundation-server` |
| 9:45–10:00 | **Checkpoint 0** (see below) | | |
| 10:00–11:00 | `P1-A-auth` | `P2-A-operations-api` | `P3-A-dashboard` |
| 11:00–12:15 | `P1-B-settings` | `P2-A` (cont.) | `P3-B-moves-alerts-search` |
| 12:15–12:45 | **Checkpoint 1** + lunch | | |
| 12:45–15:00 | `P1-C-products` | `P2-B-operations-ui` | `P3-B` (cont.) |
| 15:00–15:15 | **Checkpoint 2** | | |
| 15:15–16:15 | Polish your own pages (375px pass, `FIX.md`), then test other areas and report bugs | `P2-C-adjustments-polish` | `P3-C-integration` part 1 (README, DEMO) |
| 16:15–16:30 | **Checkpoint 3: feature freeze**, final merge | | |
| 16:30–17:00 | Fix your own bugs from Person 3's list (`FIX.md`) | same | `P3-C-integration` part 2 (integration run), then everyone rehearses the demo |

Feature branches after Checkpoint 0: `p1/features`, `p2/operations`, `p3/features`.

## How to run a prompt

1. **You** switch to the right branch first. Agents never switch branches.
2. Start a **fresh** agent session in the repo root, one session per prompt. The prompts are self-contained, and a clean context avoids confusion.
3. Say: **`I am Person 2. Read docs/prompts/P2-A-operations-api.md and follow it exactly.`**
   For the big prompts (P0-S, P0-C, P2-A, P1-C, P3-B), agents with a plan mode can show the plan first; check that its file list is inside your folders.
4. Watch it work, and approve commands. When it finishes, check:
   - `git diff --stat HEAD~1`: only your folders;
   - the report: "Contract change requests: none", or post them to the team.
5. Ask it: "Explain the 3 most important decisions in what you just built." Judges ask each member about their own part.

## Checkpoint 0 (9:45): foundation merge

1. Person 3 pushes `p3/foundation-server`, opens a PR and merges it. Then Person 1 does the same with `p1/foundation-client`. They touch different folders, so there are no conflicts.
2. **Everyone:**
   ```bash
   git checkout main && git pull
   npm run setup
   npm run dev
   ```
3. Open http://localhost:5173 and log in as `manager@stocksense.local` / `Manager@123`. Click every sidebar entry: each placeholder page should load. Resize to phone width: the sidebar should become a menu.
4. If something is broken, the foundation author fixes it now, on `main`, before anyone branches.
5. Create your branch: `git checkout -b p1/features` (or `p2/operations`, or `p3/features`).

**From here on, the foundation is frozen.**

## Checkpoints 1–3

Everyone runs **`CHECKPOINT.md`** ("I am Person N. Follow docs/prompts/CHECKPOINT.md."). Then merge PRs into `main` in the order **Person 3 → Person 1 → Person 2**, one at a time. The next person merges `main` into their branch again before pushing; this should be instant. Details are in `CHECKPOINT.md`.

Push your own branch any time as a backup. Only merging into `main` waits for checkpoints.

## Contract change requests

When an agent reports that a frozen file needs to change:
1. Post the exact request in the team chat.
2. At the next checkpoint, **before** the feature merges, the foundation author (Person 3 for `server/` and `prisma/`, Person 1 for `client/`) applies it on `main` in a small PR titled `contract: …`, and updates `docs/CONTRACT.md` if the change affects the interface.
3. Everyone merges `main` as part of the checkpoint.

Until then, the requester works around it inside their own folders.

## If you fall behind: cut from the bottom

| Person | Must have | Cut first |
|---|---|---|
| 1 | login, signup, OTP reset, product list/create/detail with stock per location, warehouses, locations | profile editing, category page polish, reorder-rule editing UI (the seed already has rules) |
| 2 | operations API, list/form/detail for receipts, deliveries and transfers with validate, basic adjustments | pick/pack checklist, "count all products", keyboard shortcuts, sticky mobile action bar |
| 3 | dashboard KPIs and filters, move history, low-stock page and bell, SKU search, README | activity chart, CSV export, DEMO.md polish |

## When things go wrong

| Problem | Fix |
|---|---|
| An agent loops for more than 10 minutes, or edits files outside its folders | Stop it. `git checkout -- <files>` (or `git stash`). Start a fresh session with a narrower request or the `FIX.md` template. |
| `P1001: Can't reach database server` | PostgreSQL isn't running, or `DATABASE_URL` is wrong. |
| Permission denied creating the database | `createdb stocksense` as a superuser, or grant CREATEDB. |
| Port 4000 or 5173 is in use | Stop the old dev process. |
| Endless redirects to login | Clear the `stocksense_token` in the browser's localStorage. |
| `curl` behaves oddly on Windows PowerShell | Use `curl.exe` or `Invoke-RestMethod`. |
| Your data vanished | `npm run setup` and `npm run db:reset` intentionally re-seed; that is expected. |
