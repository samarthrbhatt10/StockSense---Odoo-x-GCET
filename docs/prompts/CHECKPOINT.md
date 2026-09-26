# CHECKPOINT · Merge `main` into your branch and prove it still works

**Everyone · at every checkpoint · target 10 minutes**

Tell the agent which person you are, for example: "I am Person 2. Follow docs/prompts/CHECKPOINT.md."

Read `AGENTS.md` and `docs/CONTRACT.md` §1 (ownership) first. **Do not start new features during a checkpoint.**

## Steps

1. **Commit your work:** `git status`. If there are changes, run `npm run check` first; commit only if it passes (`wip: <area>` is fine). If check fails, fix it within your folders first. Never commit a broken build right before a merge.
2. **Scope check:** `git fetch origin`, then `git diff --name-only origin/main...HEAD`.
   - Every listed file must be inside your owned folders.
   - If any is not, show the list and stop: the human decides whether to revert it with `git checkout origin/main -- <file>`.
3. **Merge:** `git merge origin/main --no-edit`.
   - **Conflicts are not expected.** If one occurs in a file you own, resolve it by keeping both sides' intent, then re-run check.
   - If a conflict involves a frozen file or another person's file, do NOT resolve it: run `git merge --abort`, and report the file list to the human.
4. **Reinstall and reset:** `npm run setup`. This installs any new dependencies, resets the database and re-seeds, so you have the same data as everyone else. If this changed any `package-lock.json`, discard those changes (see AGENTS.md).
5. **Build:** `npm run check` → must pass. If it fails:
   - in your folders: fix it and commit `fix: after merging main`;
   - elsewhere: report the exact error and file. Do not edit it.
6. **Smoke test:** `npm run dev`, then check:
   - login works;
   - your own pages and endpoints still work (repeat your prompt's key verification steps briefly);
   - one page from each other person loads without errors (Dashboard, a Product page, an Operations list).
7. **Report:** the merge result, the check result, the smoke-test results, and anything the human must raise with the other two.

## What the humans do after every agent reports success

Merge into `main` in the order **Person 3 → Person 1 → Person 2**, one at a time:
1. Push your branch and open a PR to `main`.
2. Merge it.
3. Tell the next person.

The next person runs `git fetch origin && git merge origin/main --no-edit` (it should be instant) and `npm run check` before pushing their own PR.

After the last merge, everyone runs `git merge origin/main`, `npm run setup` and `npm run dev`, and clicks through the whole app once.
