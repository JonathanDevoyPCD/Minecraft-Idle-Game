# IdleCraft World and Settlement Phase Guide

Status: **FIXED IMPLEMENTATION ORDER**

This guide is the working contract for moving IdleCraft from a mining prototype into a persistent, buildable isometric world. Work proceeds one phase at a time. Each phase is implemented, tested, browser-verified, committed, and reviewed before the next phase begins. Bugs found within the active phase are handled before moving on. Unrelated polish and speculative systems are deferred.

## Design goal

IdleCraft should feel like a world that grows over a long period of play. Mining is a permanent underground operation that gathers materials without destroying the visible world. Surface and underground layers remain stable, while mine entrances, rails, carts, structures, settlement progression, and automation expand around them.

## Fixed phases

### Step 1 — Preserve authored terrain and retire destructive mining

- Keep each visible terrain block's identity stable: grass stays grass, dirt stays dirt, stone stays stone, and deepslate stays deepslate.
- Preserve old block-progress fields and migrate prototype saves safely, but do not use them to destroy or replace terrain during ordinary play.
- Keep legacy tool and mining helpers available for save/API compatibility until their callers are fully retired.
- Migrate old prototype saves so transformed Dirt → Grass → Stone blocks return to their authored terrain role instead of permanently polluting the world with stone.
- Do not add new biomes, structures, villagers, or settlement rules in this step.

### Step 2 — Build a real construction and expansion layer

- Keep the coordinate-based surface grid as the source of truth for world cells.
- Separate harvesting from construction: resources and World Power pay for new cells and structures.
- Add a construction queue and visible build timer for expansions.
- Make `Add Adjacent Block` create one connected plot, then make `Expand to a 3×3 Surface` fill the authored meadow footprint.
- Keep every new cell at the existing block scale and preserve camera zoom, pan, rotation, and floor placement.

### Step 3 — Replace block breaking with permanent mine operations

- Stop terrain blocks from breaking, disappearing, or transforming during ordinary play.
- Add a permanent mine entrance using the existing block scale and a four-block rail footprint.
- Run minecarts as the primary idle mining loop; cart count, miners, storage carts, and powered rails improve production.
- Keep underground strata persistent: surface, stone, deepstone, and the eventual bedrock boundary unlock layer by layer.
- Scatter small, layer-appropriate ore deposits as optional clickable bonus targets. They award extra resources and XP but never break or alter terrain.
- Route mine output into the existing resource, XP, save, and skill-tree systems.
- Keep the existing construction queue separate: mining gathers materials; construction uses them to grow the world.

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
- Use deterministic placement from the world seed so the same world remains stable across saves.

### Step 6 — Add life and settlement entities

- Add villagers, animals, farming, housing, storage, and settlement jobs.
- Keep villagers and animals as world entities rather than mineable blocks.
- Unlock these through the existing Life and Settlement skill-tree branch.

### Step 7 — Add automation for harvesting and building

- Add workers, target queues, tool assignment, storage, workshop production, and construction assistance.
- Automation may gather resources and reduce build time, but must not bypass costs or settlement requirements.
- Keep offline progress bounded and deterministic.

### Step 8 — Expand materials, biomes, and deep-world content

- Add sand, gravel, clay, logs, leaves, ores, water, desert, forest, mountain, snow, swamp, and rare crystal content.
- Apply the matching Bare Bones textures and tool requirements through data-driven material definitions.
- Add caves, rare ore veins, and bedrock boundaries only when their prerequisite world layers exist.

### Step 9 — Balance, performance, and release hardening

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
- Step 1: **complete** — authored terrain is preserved and legacy-save migration is implemented and verified.
- Step 2: **complete** — coordinate cells now grow through a persisted construction queue with visible build progress.
- Step 3: **complete** — permanent mine operations, layered terrain, and optional non-destructive ore clicks are implemented and verified.
- Step 4: **foundation in progress** — persistent settlement growth, stage thresholds, construction rewards, and the replacement HUD are implemented and verified; living-world requirements remain queued for Steps 5–7.
- Steps 5–9: queued.
