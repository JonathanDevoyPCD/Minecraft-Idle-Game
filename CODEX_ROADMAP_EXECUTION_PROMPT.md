# Codex Roadmap Execution Prompt

Use this prompt at the start of the roadmap implementation.

---

You are now implementing the new progression/economy architecture for **Villagers – Idle World Game**.

Repository source of truth:

1. Read `AGENTS.md`.
2. Read **all of** `GAME_DESIGN_ROADMAP.md`.
3. Inspect the existing implementation before changing code, especially:
   - `src/game.ts`
   - `src/skill-tree.ts`
   - `src/main.ts`
   - `src/player-save.ts`
   - current tests
   - the existing world/settlement and skill-tree planning documents.

The existing game is a working prototype. Preserve working camera behavior, isometric scale, placement UX, mine/path visuals, assets, saving, and responsive UI unless the roadmap explicitly replaces a system.

## Mission

Carry the game from its current prototype progression into the architecture defined by `GAME_DESIGN_ROADMAP.md`.

Do **not** implement all ten phases as one enormous rewrite.

Treat the roadmap as a multi-phase engineering program. Implement it sequentially, with tests and commits at stable boundaries.

## First task

Start with:

**Phase 1 — Progression Foundation**

The target outcomes are:

- Settlement Hub levels become the authoritative global settlement progression.
- Builder slots exist and limit concurrent building/upgrading.
- Construction becomes a generic system supporting build / upgrade / expand.
- Buildings have persistent instances and levels.
- Resource storage capacity becomes a first-class system.
- Buildings and upgrades have data-driven resource costs.
- Construction/building upgrades use real timers.
- Existing mine/path placement behavior continues to work.
- Existing saves are migrated safely where practical.

Before editing:

1. Audit the current game state and relevant UI.
2. Identify fields/functions that will be replaced, retained, or migrated.
3. Create or update `ROADMAP_IMPLEMENTATION_STATUS.md`.
4. Write the Phase 1 implementation plan there, split into coherent sub-phases if necessary.
5. Define acceptance criteria for Phase 1.

Then implement the first coherent Phase 1 slice.

## Hard rules

- Do not skip ahead to Wandering Trader, biomes, late-game resources, prestige, etc.
- Do not remove working gameplay just to simplify implementation.
- Do not create duplicate progression systems.
- Prefer data-driven registries and typed definitions.
- Keep saves deterministic and migration-aware.
- Add tests for business logic.
- Keep the UI usable on desktop and mobile.
- Never make Emeralds a normal core-upgrade currency.
- Keep one physical minecart per mine.
- Keep `GAME_DESIGN_ROADMAP.md` unchanged unless an implementation contradiction is discovered and explicitly documented for user review.

## Verification

After every coherent implementation slice run:

```bash
npm test
npm run build
git diff --check
```

For UI/gameplay changes, also run the game and browser-verify the changed flow.

Do not call the phase complete while tests or build are failing.

At the end of the task:

1. Update `ROADMAP_IMPLEMENTATION_STATUS.md`.
2. Summarize what is complete and what remains.
3. Commit the coherent work.
4. Leave the worktree clean.
5. Tell me exactly which Phase 1 sub-phase should be run next.

When I later say:

> Continue the roadmap.

Read `AGENTS.md`, `GAME_DESIGN_ROADMAP.md`, and `ROADMAP_IMPLEMENTATION_STATUS.md`, then continue from the first incomplete sub-phase. Do not redo completed work and do not jump ahead.
