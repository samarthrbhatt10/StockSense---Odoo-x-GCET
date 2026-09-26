# FIX · Bug-fix template

**Anyone · any time.** Copy the block below, fill in the brackets, and paste it to your agent.

---

```
Read AGENTS.md and docs/CONTRACT.md. I am Person [1 | 2 | 3]. I own only the folders listed for me in CONTRACT §1.

Bug: [one-line title]
Steps to reproduce:
1. [...]
2. [...]
Expected: [...]
Actual: [...]
Error text (browser console / server log / API response): [paste verbatim]
Suspected file (optional): [...]

Do this, in order:
1. Reproduce the bug first (API call or page). If you cannot reproduce it, say so and stop.
2. Find the root cause. Explain it in 2–3 sentences before changing anything.
3. If the cause is outside my folders (a frozen file or another person's folder), do NOT edit it.
   Write the exact fix needed as a "Contract change request" or as a note for the owning person, and stop.
4. Otherwise make the smallest fix that addresses the root cause, not the symptom.
   Do not refactor unrelated code.
5. Verify: repeat the reproduction steps (now correct), run `npm run check`
   (must pass), and re-test the nearest related behaviour to make sure nothing else broke.
6. Confirm `git status` shows changes only in my folders, then commit
   "fix(<area>): <what was wrong>". Do not push.
7. Report: root cause, fix, verification.
```
