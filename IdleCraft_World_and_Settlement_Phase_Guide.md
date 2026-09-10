# IdleCraft World and Settlement Phase Guide

Status: **FIXED IMPLEMENTATION ORDER**

This guide is the working contract for moving IdleCraft from a mining prototype into a persistent, buildable isometric world. Work proceeds one phase at a time. Each phase is implemented, tested, browser-verified, committed, and reviewed before the next phase begins. Bugs found within the active phase are handled before moving on. Unrelated polish and speculative systems are deferred.

## Design goal

IdleCraft should feel like a world that grows over a long period of play. Mining is a permanent underground operation that gathers materials without destroying the visible world. Surface and underground layers remain stable, while mine entrances, rails, carts, structures, settlement progression, and automation expand around them.

## Fixed phases

### Step 1 — Establish the procedural settlement grid

- Reset the prototype save into a new schema. There is no migration of the old one-block/3×3 layout.
- Start with a real 5×5 surface chunk using the existing `BLOCK_SIZE`, camera, lighting, floor, and isometric presentation.
- Add a five-tile dirt-path cross: the centre tile plus its north, east, south, and west neighbours.
- Keep paths as a separate, tile-addressable layer over stable terrain so each path tile can be upgraded independently later.
- Give the player one free mine blueprint, but require a valid player-selected placement beside the path; do not silently overlap the path or other footprints.
- Keep old authored meadow visuals hidden until they are represented by the new placement model.

### Step 2 — Build a real construction and placement layer

- Keep the coordinate-based surface grid as the source of truth for world cells, paths, and occupied footprints.
- Separate harvesting from construction: resources and World Power pay for new cells and structures.
- Add a construction queue and visible build timer for expansions.
- Make the free mine use a four-cell rail footprint extending from, but not replacing, a path tile.
- Add player placement validation: within the chunk, no footprint collision, and at least one orthogonal connection to the path network.
- Add path-facing rules for structures so entrances rotate toward a connected path.
- Make chunk upgrades expand the current square perimeter: 5×5 → 7×7 → 9×9 → 11×11 and onward.
- Keep every new cell at the existing block scale and preserve camera zoom, pan, rotation, and floor placement.

### Step 3 — Preserve terrain and use permanent mine operations

- Keep each visible terrain block's identity stable: grass stays grass, dirt stays dirt, stone stays stone, deepslate stays deepslate, and bedrock remains permanent.
- Stop terrain blocks from breaking, disappearing, or transforming during ordinary play.
- Run minecarts as the primary idle mining loop; cart count, miners, storage carts, and powered rails improve production.
- Keep underground strata persistent and add layers one at a time through the world-growth branch.
- Scatter small, layer-appropriate ore deposits as optional clickable bonus targets. They award extra resources and XP but never break or alter terrain.
- Route mine output into the existing resource, XP, save, and skill-tree systems.
- Keep mining, path construction, structure placement, and chunk expansion as separate actions.

### Step 4 — Add long-term village progression

- Replace the misleading World Seed display with a settlement/world-growth progress bar while keeping player XP separate.
- Add the progression stages: Dwelling, Hamlet, Village, Small Town, Town, City, Large City, and Endless Mode.
- Persist settlement growth separately from player XP and award it when construction projects complete, not from passive mine output alone.
- Make each stage require a long-term combination of settlement progress, structures, population, food/storage, resources, and skill-tree unlocks.
- Reserve population, food, storage, structure, and district gates for the living-world phases so the progression spine does not claim systems that do not exist yet.
- Use increasing thresholds and construction requirements so progression is deliberately slow.

### Step 5 — Author the first living meadow

- Use the available Bare Bones textures for terrain and authored world details.
- Add grid-aligned water, trees, paths, crops, a well, and the first dwelling.
- Keep terrain blocks visually stable while structures are construction objects with their own state; mining output comes from the permanent underground operation.
- Use deterministic asset selection and defaults, but keep player-placed objects persistent and independent of the seed once placed.

### Step 6 — Add life and settlement entities

- Add villagers, animals, farming, housing, storage, and settlement jobs.
- Keep villagers and animals as world entities rather than mineable blocks.
- Unlock these through the existing Life and Settlement skill-tree branch.

### Step 7 — Animate living entities

- Add lightweight Minecraft-style idle loops for villagers and animals: breathing/bobbing, head turns, leg motion, grazing, and short wandering cycles.
- Keep animation deterministic, bounded, and local to the world scene so it does not change resource production or settlement state by itself.
- Prevent entity animation from crossing reserved structure footprints, world edges, or the established block scale.
- Use simple reusable keyframe or procedural motion rather than a heavy character-runtime dependency.

### Step 8 — Add automation for harvesting and building

- Add workers, target queues, tool assignment, storage, workshop production, and construction assistance.
- Automation may gather resources and reduce build time, but must not bypass costs or settlement requirements.
- Keep offline progress bounded and deterministic.

### Step 9 — Expand materials, biomes, and deep-world content

- Add sand, gravel, clay, logs, leaves, ores, water, desert, forest, mountain, snow, swamp, and rare crystal content.
- Apply the matching Bare Bones textures and tool requirements through data-driven material definitions.
- Add caves, rare ore veins, and bedrock boundaries only when their prerequisite world layers exist.

### Step 10 — Balance, performance, and release hardening

- Tune long-term thresholds, resource yields, build timers, automation, and offline gains.
- Verify large-world camera performance, save migration, reset behavior, responsive HUD, and accessibility.
- Complete a production browser pass and confirm GitHub Pages behavior separately from the code push.

## Rules that apply to every step

- The existing flat/isometric block scale is authoritative and must not drift.
- The existing camera controls, infinite zoom intent, left-click mining handoff, hover outline, cloud treatment, and floor placement remain intact unless explicitly changed.
- The skill tree remains the unlock map; systems must connect to its existing branches instead of adding competing upgrade menus.
- Mining and building are different actions. A mined resource may fund construction, but mining must not silently construct or permanently erase authored terrain.
- Use supplied assets where their intended role is clear. Keep asset selection data-driven so future biomes do not require renderer rewrites.
- Each step ends with `npm test`, `npm run build`, browser verification, `git diff --check`, a pushed commit, and a clean worktree.

## Current status

- Previous skill-tree and mining prototype work: complete.
- Step 1: **in progress** — the new schema, procedural 5×5 chunk, five-tile path cross, and free mine placement foundation are being implemented; the old prototype save is intentionally not migrated.
- Step 2: queued — player placement validation, path-facing structures, tile-by-tile path upgrades, and perimeter chunk expansion.
- Step 3: **foundation complete** — permanent mine operations, layered terrain, and optional non-destructive ore clicks are implemented; they are being reconnected to the new placement grid.
- Step 4: **complete (foundation)** — persistent settlement growth, stage thresholds, construction rewards, and the replacement HUD are implemented and verified; living-world requirements remain queued for Steps 5–7.
- Step 5: superseded foundation — the old deterministic 3×3 authored meadow is retired from the active scene; it will return as player-placed, grid-valid content.
- Step 6: paused behind placement — entities remain available as assets, but they will not spawn until a valid pen/farm/habitat footprint exists.
- Step 7: queued — living entity animation after valid placement and scale rules are stable.
- Steps 8–10: queued.
