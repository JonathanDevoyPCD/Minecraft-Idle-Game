# AGENTS.md — Villagers Idle World Game

## Purpose

This repository contains **Villagers – Idle World Game**, an isometric Minecraft-inspired idle settlement builder.

The authoritative game-design specification is:

- `GAME_DESIGN_ROADMAP.md`

Before changing progression, economy, construction, mining, settlement, skill-tree, trader, resource, story, villager, automation, or world-expansion systems, read the relevant sections of that roadmap.

The roadmap defines **what the game should become**. This file defines **how to work safely in the repository**.

## Core development rule

Do not attempt to implement the entire roadmap as one uncontrolled rewrite.

Work through the roadmap's **Development Roadmap** phases in order. Finish, validate, and commit one phase before beginning the next.

Never silently skip requirements because a phase is large. If a phase must be split, split it into explicit sub-phases and record that in `ROADMAP_IMPLEMENTATION_STATUS.md`.

## Source of truth hierarchy

When instructions conflict, use this order:

1. The user's current prompt.
2. `AGENTS.md`.
3. `GAME_DESIGN_ROADMAP.md`.
4. Existing implementation-plan documents.
5. Existing code behavior.

Older prototype behavior must not override the new roadmap when the roadmap explicitly replaces it.

## Existing game qualities to preserve

Unless the roadmap explicitly changes them, preserve:

- the isometric/orthographic presentation;
- existing camera controls;
- the authored block scale;
- current world placement and collision behavior;
- path-connected structure placement;
- mine/path visual relationship;
- one physical minecart per mine;
- local and Supabase saving behavior;
- mobile and desktop responsiveness;
- existing working assets and animations.

Do not redesign the visual identity unless a task explicitly requires it.

## Architecture rules

Prefer data-driven systems.

Do not add one-off conditionals for every building, resource, upgrade, story objective, settlement tier, or trader offer when a registry/definition model can represent them.

Each progression concept must have a single authoritative owner:

- Skill Tree → perks and knowledge.
- Smithy / tool-production systems → actual tool tiers.
- Mine → mine upgrades and mine production.
- Building instance → building level and building-specific production.
- Settlement Hub → global settlement era/tier.
- World expansion → regions, chunks, and biomes.
- Wandering Trader → emerald trade economy.
- Story/Journal → guided objectives and narrative progression.

Avoid duplicate upgrade paths.

## Save-data rules

Progression work will require schema changes.

For every save-schema change:

- make the schema version explicit;
- preserve existing saves where practical;
- write migration logic when a safe migration is possible;
- if a destructive reset is genuinely required, document the reason in `ROADMAP_IMPLEMENTATION_STATUS.md`;
- never silently reinterpret old fields in a way that corrupts progression;
- test both fresh-state creation and migrated-state loading.

## Implementation workflow

For each roadmap phase:

1. Read the entire phase in `GAME_DESIGN_ROADMAP.md`.
2. Inspect the current implementation before editing.
3. Write/update `ROADMAP_IMPLEMENTATION_STATUS.md` with:
   - current phase;
   - current sub-phase;
   - files/systems affected;
   - migration requirements;
   - acceptance criteria.
4. Implement the smallest coherent slice.
5. Add or update automated tests.
6. Run:
   - `npm test`
   - `npm run build`
   - `git diff --check`
7. Browser-verify important player flows when UI/gameplay behavior changes.
8. Fix regressions before moving on.
9. Update `ROADMAP_IMPLEMENTATION_STATUS.md`.
10. Commit the completed coherent slice with a descriptive commit message.
11. Leave the worktree clean at phase boundaries.

## Testing expectations

Do not consider a system complete because TypeScript compiles.

Tests should cover game-state/business logic including, where relevant:

- affordability;
- unlock requirements;
- builder availability;
- construction start/completion;
- storage limits;
- production pausing at full storage;
- resource transfer;
- settlement-hub prerequisites;
- skill costs and prerequisites;
- discoveries;
- trader stock and anti-arbitrage behavior;
- offline progression bounds;
- save migration.

UI changes should also be browser-verified.

## Economy rules

Do not invent arbitrary costs without checking the roadmap's economy-time targets.

Costs should be reasoned from expected production rates.

Emeralds are primarily a trading/convenience currency and must not become a mandatory bottleneck for ordinary core progression.

World Power is for world/biome expansion.

Crafting Points are for Skill Tree knowledge/perks.

Physical resources fund physical progression.

Settlement XP is progression/reputation and is not spent.

## Skill Tree rules

- Natural resources are discoveries, not ordinary purchased skills.
- Branch-entry milestones should not waste Crafting Points.
- Skill costs should scale with power/rank.
- Tool tiers belong to crafting/Smithy progression, not duplicate instant skill purchases.
- Prevent circular prerequisites.
- Keep node IDs stable when possible; migrations are required when IDs or semantics change.

## Construction rules

The target architecture is a generic construction system supporting:

- build;
- upgrade;
- expand.

Construction should use builder slots and building instances rather than proliferating special-case queues.

Player placement must remain collision-safe and path-aware.

## Mine rules

- One physical cart per mine.
- Mine production goes to mine-local storage first.
- Full mine storage pauses further production.
- Manual collection moves mine-local inventory to settlement storage.
- Later Hauler/automation systems can perform this transfer.
- Normal mine upgrades cost ordinary resources, not Emeralds.
- Mine depth/level determines available ore tables.
- Rare Emerald mining remains a bonus, not the main progression source.

## Scope control

Do not jump ahead to later phases simply because a later feature is easier or more visually exciting.

Do not add Nether/End systems, combat, multiplayer raiding, or unrelated feature creep unless the user explicitly changes the roadmap.

## Documentation maintenance

`GAME_DESIGN_ROADMAP.md` is the design source of truth.

`ROADMAP_IMPLEMENTATION_STATUS.md` is the implementation source of truth.

When implementation reveals a genuine conflict or missing rule, record the decision in the status document rather than silently changing the game's design.

## Required completion report for each task

At the end of each Codex task, report:

- what changed;
- which roadmap requirement it satisfies;
- migrations performed;
- tests run and results;
- browser verification performed;
- remaining work in the current phase;
- next recommended sub-phase.
