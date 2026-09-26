# P2-0 · Preparation (no code)

**Person 2 · on `main` · 9:05–9:45, while Persons 1 and 3 build the foundation**

The foundation is being built right now, so there is no code to extend yet. Use this time to make your first real prompt (P2-A) fast and correct.

Read `AGENTS.md`, `docs/CONTRACT.md` (especially §3, §4 and §5.2), `server/prisma/schema.prisma`, `docs/prompts/P2-A-operations-api.md` and `docs/prompts/P2-B-operations-ui.md`.

**Do NOT create or modify any file.**

Produce, in this chat:

1. **An implementation plan for P2-A**: the files you will create in `server/src/modules/operations/`, the functions in `service.ts` with their signatures, and the Zod schemas.
2. **The state machine as a table**: each (current status × action) → result (new status, or an error code). Cover every combination, including the invalid ones.
3. **The exact moves `validate` must produce** for each operation type, including the three adjustment cases (counted > recorded, counted < recorded, counted = recorded).
4. **A test script plan**: the ordered list of API calls (with bodies) you will run at the end of P2-A to prove every rule. It must include:
   - a delivery that goes WAITING and later READY after a receipt;
   - a double validate;
   - a validate that fails with INSUFFICIENT_STOCK and leaves the database unchanged;
   - an adjustment in each direction.
5. **Questions or ambiguities you found in the contract.** For each one, state the interpretation you will use unless told otherwise.

Keep it tight. The human will review it before Checkpoint 0 and paste corrections into P2-A if needed.
