# Roadmap Implementation Status

## Authority

- Design source of truth: `GAME_DESIGN_ROADMAP.md`
- Repository working rules: `AGENTS.md`

## Active Direction Override — 2026-09-19

The user has temporarily stopped production-roadmap development and authorized a fresh visual/world foundation on the isolated `/testing/` page. Keep all work for this direction inside `testing/` and testing-specific modules under `src/testing/`; do not change the production game page or resume Phase 4D until the user explicitly redirects work. This override changes the active task, not the historical completion records below.

- Current active slice: fixed-isometric world-only staging foundation.
- Scope: logical 60×60 grid, 50×50 buildable center, 5-cell nonbuildable border, reserved cardinal border entrances, restrained deterministic border dressing, fixed isometric camera, desktop drag-pan and wheel zoom with projection-based world bounds.
- Save migration: none; this page has no game state or save integration.
- Production roadmap: Phase 4D remains deferred, not started.

### Testing World Foundation completion record

- Replaced only `testing/index.html` with a world-only canvas page and isolated its styles and runtime under `testing/` and `src/testing/`; the production page and gameplay systems were not changed.
- Added deterministic 60x60 logical cells with a centered 50x50 buildable area and a 5-cell non-buildable border. Reserved 3-cell-wide north/east/south/west corridors are represented in grid helpers and excluded from decorative instances.
- Rendered the world as one textured grass/dirt slab plus a subtle playable clearing. Reused the existing grass, dirt, oak log and oak leaves textures; border trees and rocks use instanced meshes rather than one render object per cell.
- Added a fixed orthographic isometric camera, smooth bounded wheel zoom, left-drag pan, viewport-responsive sizing and zoom-aware projection-based clamping. No rotation/orbit interaction is registered.
- Added grid and camera tests for dimensions, buildability, entrance corridors, deterministic dressing, coordinate mapping, zoom-dependent bounds, all four drag directions and hard clamping.
- No save migration or gameplay systems were added.
- Browser-verified `/Minecraft-Idle-Game/testing/` at 1024x768 and 1440x900: centered initial view, full-map zoom-out, close zoom, all four corner directions, no large void beyond modest peripheral overscan, no rotation on right-drag, one canvas with empty body text, and no console errors or warnings. The local browser measured 61 animation frames over 1.0 second at 1024x768.

### Testing camera clamp follow-up — 2026-09-19

- Root cause: deriving limits from the full viewport's projected ground footprint counted peripheral diagonal corners against the square world bounds. At medium zoom on common desktop aspects, that footprint nearly consumed the world half-span and collapsed practical pan travel.
- Replaced the extent approximation with projection of all four corners of a 78%-sized viewport safe frame onto the ground plane using the fixed camera yaw and pitch. The safe frame remains within the rendered 60x60 world; only a modest outer margin can show the existing background, while target limits expand as zoom increases.
- Zoom changes smoothly re-clamp the current target toward newly tightened limits; resize recomputes the frustum and bounds. Low zoom remains centered, 4:3 medium zoom keeps more than 3 world units of travel per axis, and max zoom provides substantially more.
- Browser-verified `/Minecraft-Idle-Game/testing/` at 1024x768 and 1440x900: min zoom centered with bounds fixed at zero; medium zoom reached north, south, east and west; max zoom reached all four edges and all four corners; zooming out from an edge eased the target back to center; resize recomputed the pan range; right-drag did not rotate the camera. Browser console reported zero errors and warnings.
- Added tests for projected corner containment, useful medium-zoom travel at 4:3, increasing range at close zoom and smooth re-clamping. No gameplay, grid dimensions, assets, save data or migrations changed.

## Current Phase

**Phase 4 — Processing**

Status: Phase 1 through Phase 3 and Phase 4A through Phase 4C are complete.

## Current Sub-Phase

**Phase 4C - Stonecutter and Furnace chains**

Status: Complete and pushed.

## Current-repo audit

| Area | Retain | Migrate | Replace later in Phase 1 |
|---|---|---|---|
| Game state | Flat state object, deterministic world cells, mine/path records, local and cloud save entry points | Add explicit Settlement Hub instance, level and prerequisite progress; add Settlement Storage level | Add population and production systems in later Phase 1 slices |
| Save schema | `loadState` sanitisation, timestamped local save, Supabase row ownership/RLS | Backward-compatible schema 4/5/6/7/8/9 to schema 10 normalization, including Hub, storage authority, typed mine inventory and mine-owned production level | Add migrations for remaining Hub requirements as those systems land |
| Construction | Existing completion effects for world expansion and offline timestamps | Generalize projects with action, target, builder and cost metadata; preserve expansion kinds as compatibility/effect identifiers | Move all physical build/upgrade/expand actions onto the generic project model |
| Placement | Integer grid, footprints, collision, path connection, mine/path relationship and one-cart rule | Normalize placement records into levelled, stateful building instances | Route normal placement through builder-backed construction |
| Settlement | Settlement Progress remains the earned development metric; existing visual stage labels remain | Hub level is now the sole settlement-stage authority; requirements, upgrade queue and current-era consequences are data-driven | Add storage/population production requirements and deeper Hub consequences in later slices |
| Resources/UI | Existing resource inventory, Mining/Build drawers, responsive HUD and visuals | Add one global storage summary to the existing resource brief/modal | Add broader next-goal UI and storage upgrade controls in later Phase 1D slices |
| Tests | Vitest game, skill-tree and geometry coverage | Add Hub authority, requirements, builder construction, save migration and storage transfer tests | Add remaining population prerequisite tests with later slices |

The current code now has one serialized generic `constructionQueue` with builder assignment, capacity, target/action/cost/duration metadata and compatibility expansion kinds. `WorldPlacement` is the persistent structure record and now carries level and construction state. Settlement stages are now derived solely from the serialized Settlement Hub level; Settlement Progress remains a requirement and development metric rather than a second stage authority. Current-era mine permits, trader availability, later build-category gates and living-entity visibility are derived from the Hub consequence registry without adding save fields. Mine production now owns typed local inventory and manual collection, while the existing one-cart mine/path visuals remain in place.

## Phase 1 sub-phases

### Phase 1A - Construction spine and builder capacity (first slice)

- Add a canonical builder slot count to the save state.
- Extend construction projects with stable IDs, build/upgrade/expand action metadata, target metadata, builder assignment and data-driven resource costs.
- Keep current expansion behavior and public helpers working while normalizing old projects into the new shape.
- Assign projects to available builders, queue additional projects, release builders on completion, and continue timers from saved timestamps/offline time.
- Surface builder availability in the existing HUD without changing the isometric scene or placement interaction.

### Phase 1B - Persistent building instances and generic construction targets

- Add building level and construction state to persistent placements (or a single canonical building-instance record).
- Define build/upgrade/expand costs and timers in registries, then route placement and upgrades through the shared project model.
- Add tests for affordability, builder contention, completion effects, save/load and placement compatibility.

### Phase 1C - Settlement Hub authority

- Phase 1C-A: Add the explicit Hub instance, authoritative level, data-driven requirements, first builder-backed upgrade flow and conservative migration.
- Phase 1C-B: Integrate all Hub-driven unlock consequences and tune the later-tier requirements once storage, population and story systems exist.

### Phase 1D - Settlement storage and progression UI

- Add first-class global storage capacity and overflow-safe resource transfers.
- Add requirement/next-goal and builder/project feedback to the HUD and modals.
- Integrate all construction, Hub and storage timers with offline progression and Supabase/local save flows.

## Phase 2 sub-phases

### Phase 2A - Mine upgrade consolidation and Emerald deadlock removal (first slice)

- Remove Emerald payments from all current mine rail and mine-storage upgrades.
- Make the Mine the sole current authority for rail-speed and mine-storage capacity upgrades; remove the duplicate Skill Tree contribution from the active rail-speed calculation while retaining its node as later automation knowledge.
- Consolidate the two current mine-storage upgrade tracks into the serialized mine storage-capacity level, retaining legacy values safely on load.
- Break the Emerald-to-First-Villager prerequisite cycle without adding villagers, trader systems or Phase 3 inventories.
- Preserve existing mine visuals, one-cart rule, path connection, save compatibility and Supabase contract.

### Phase 2B - Skill Tree currency and discovery ownership

- Phase 2B-A: Convert natural material nodes into free, data-driven discoveries triggered by eligible surface, mine, layer and biome conditions; preserve legacy purchased ranks.
- Phase 2B-B: Make branch entries free Settlement-Hub milestones and expose branch availability from Hub progression.
- Phase 2B-C: Introduce increasing Crafting Point rank costs for Skill Tree skills and blueprints.
- Phase 2B-D: Migrate any remaining purchased material/branch ranks conservatively so no player loses discovered content.

### Phase 2C - Legacy authority retirement and World Power boundary

- Retire or migrate the remaining direct speed, tool and world upgrade routes in favour of their authoritative owners.
- Limit World Power to world/biome expansion commitments; remove it from ordinary skills and non-expansion upgrades.
- Keep Settlement Progress as non-spendable development progress and align its remaining awards with meaningful construction.

### Phase 2C implementation sub-phases

1. **Phase 2C-A - Retire legacy direct upgrade routes and canonicalize runtime reads (current slice)**
   - Remove direct Speed, Tool and World upgrade mutators and their hidden compatibility UI.
   - Derive automatic speed and tool summaries from canonical Skill Tree ranks.
   - Preserve old `speedRank` and `toolRank` save fields as migration inputs and compatibility mirrors; never charge or refund during migration.
2. **Phase 2C-B - Enforce the World Power boundary**
   - Keep World Power spendable only by world/biome expansion commitments.
   - Remove any World Power cost or reward from ordinary skill, tool, mine and building routes.
   - Add regression coverage for the canonical expansion path and non-expansion rejection.
3. **Phase 2C-C - Align Settlement Progress awards with meaningful construction**
   - Audit remaining progress awards and retain them only for completed construction, Hub progression, or other roadmap-approved development milestones.
   - Keep Settlement Progress non-spendable and expose the authoritative next-goal state in the existing UI.

## Phase 2C-B implementation plan

1. Define the data-driven set of Skill Tree nodes that represent World Power expansion commitments.
2. Reject World Power costs on any ordinary Skill Tree node and verify the current registry contains no such costs.
3. Keep Hub rewards and the existing Skill Tree/construction expansion commitment as the only active World Power flow; preserve world size, direction, builder and save behavior.
4. Add regression coverage for expansion-only spending and for non-expansion upgrades remaining independent of World Power.

## Phase 2C-B acceptance criteria

- [x] World Power is spendable only by data-defined world/biome expansion commitments.
- [x] Ordinary Skill Tree, tool, mine and building upgrades do not require or consume World Power.
- [x] The existing World Power expansion commitment still queues through the generic construction system with its current world geometry and builder behavior.
- [x] Hub rewards remain a progression source while Settlement Progress stays non-spendable.
- [x] No save schema or Supabase migration is required; existing World Power balances remain intact.
- [x] `npm test`, `npm run build`, `git diff --check` and browser verification pass.

## Phase 2C-C implementation plan

1. Audit every Settlement Progress write and keep awards only for completed buildings, building/storage/Hub upgrades, path and mine development, or other roadmap-approved milestones.
2. Remove the legacy emphasis on terrain expansion by making world expansion completion non-rewarding while preserving its construction and geometry effects.
3. Add a small data-driven development reward registry for path construction, mine placement, mine upgrades and mine-storage upgrades; keep Settlement Progress non-spendable.
4. Preserve the existing Hub-owned next-goal UI and add regression coverage for approved awards, expansion no-award behavior and Hub authority.

## Phase 2C-C acceptance criteria

- [x] Settlement Progress is awarded only by completed/approved development actions, not ordinary mining or terrain expansion alone.
- [x] Path construction, mine placement and mine upgrades award the roadmap-defined development amounts.
- [x] Building, Settlement Storage and Hub completion rewards remain completion-time and data-driven.
- [x] Settlement Progress remains non-spendable and the existing Hub next-goal UI remains authoritative.
- [x] Existing saves and Supabase payloads require no schema migration.
- [x] `npm test`, `npm run build`, `git diff --check` and browser verification pass.

## Phase 3 audit before Phase 4

Phase 3 passes its completion audit at the current baseline. Mine-local typed inventory remains authoritative; production deposits into mine storage before any settlement transfer; manual Collect respects settlement capacity; full mine storage pauses production; offline reconciliation uses the same bounded production path; weighted ore tables, mine levels and cart capacity are data-driven; rail and storage upgrades are mine-owned and funded by normal resources; Emerald remains a rare bonus; schema 8/9/10/11 migrations preserve mine clocks, IDs, orientation, inventory, capacity and levels; and one-cart repeated movement remains owned by the renderer's persisted mine clock. No Phase 3 fix was required before Phase 4.

Baseline audit evidence: 98 Vitest tests passed, the production build passed, `git diff --check` passed, and existing browser QA covered repeated cart travel, mine collection, storage-full pause, offline delivery feedback, save/reload continuity, mine orientations and rail configurations. The browser session's Supabase requests were unavailable in isolation, but local gameplay and save behavior remained functional with no application exceptions.

## Phase 4 implementation sub-phases

1. **Phase 4A - Processing recipe and persistent queue foundation (current slice)**
   - Add a typed recipe registry and persistent processing jobs with one occupied slot per processing building.
   - Route inputs from settlement storage, persist timestamps for save/reload and offline progression, and preserve completed outputs when settlement storage is full.
   - Make the generic building-instance model able to identify processing buildings without adding a second construction system.
2. **Phase 4B - Sawmill vertical slice**
   - Add the first player-placeable Sawmill through Build Mode and shared builder construction.
   - Add the Logs -> Planks recipe, processing panel, affordability feedback and processed-material discovery.
3. **Phase 4C - Stonecutter and Furnace chains**
   - Add Stonecutter and Furnace placement, Stone, Bricks, Glass and ingot recipes, discovery integration and deterministic queue/output feedback.
4. **Phase 4D - Smithy/tool authority**
   - Add Smithy placement and move actual tool-tier progression into its builder-backed processing flow without restoring Skill Tree tool ownership.

## Phase 4A implementation plan

1. Add a schema-versioned `processingJobs` collection to the canonical save state and normalize older payloads without changing their gameplay data.
2. Add one data-driven `PROCESSING_RECIPES` registry with typed building, input, output, duration, quantity and unlock fields for the Phase 4 processing chains.
3. Add generic start, affordability/status, completion, output-preservation and collection functions. A processing building can have one active or output-blocked job; output overflow remains on that job rather than being discarded.
4. Integrate timestamp reconciliation into the existing offline/save loop and generic building definitions, while leaving player-facing building placement and final production UI to the next sub-phases.
5. Add business-logic coverage for input consumption, one-slot contention, completion timing, full-storage preservation, partial output transfer, save migration and offline completion.

## Phase 4A acceptance criteria

- [x] Processing recipes are represented by one typed, data-driven registry rather than per-recipe branches.
- [x] A processing job consumes settlement inputs once, occupies one building slot, persists `startedAt`/`completesAt`, and completes deterministically after its duration.
- [x] Completed output transfers through settlement storage; insufficient capacity preserves every untransferred output on the completed job.
- [x] Save/load and offline reconciliation continue active and output-blocked jobs without simulating every elapsed second.
- [x] Processing building targets use the existing `WorldPlacement`/generic construction model and do not create a second construction queue.
- [x] Existing Phase 1-3 behavior remains green, including mine-local inventory, collection, full-storage pause, offline mine production and one-cart movement.
- [x] `npm test`, `npm run build`, `git diff --check` and browser regression verification pass.

## Phase 4A completion record

- Added the typed `PROCESSING_RECIPES` registry for the initial Sawmill, Stonecutter and Furnace transformation definitions, including building requirements, inputs, outputs, durations, quantities and discovery gates.
- Added persistent `processingJobs` with one occupied slot per processing building, exact input payment, timestamped completion, deterministic offline advancement and output retry/collection.
- Completed output is routed through Settlement Storage. Partial or full output overflow remains on a `ready` job and is never silently deleted.
- Processing buildings are ordinary `WorldPlacement` building kinds and use the existing generic placement/construction model; no second construction queue was introduced. Player-facing Sawmill placement/UI remains Phase 4B scope.
- Bumped the save schema from 11 to 12. Schema 4 through schema 11 saves remain readable, and older saves receive an empty processing-job list without changing existing progression. No Supabase table or RLS migration was required.
- Added automated coverage for registry selection, input consumption, one-slot contention, completion timing, partial/full storage handling, output collection, schema migration and offline completion.
- Browser-verified the production route at `http://127.0.0.1:5176/Minecraft-Idle-Game/`: title, HUD, independent Mining/Build drawers, storage summary, fresh-state shell and zero runtime error console messages. Existing Phase 3 minecart/collection/storage behavior remains covered by the prior Phase 3 browser record and the full regression suite.

## Phase 4B implementation plan

1. Add a data-driven Sawmill Build Mode item gated by the Settlement Hub's Hamlet stage, with the existing builder-backed construction queue, a 2x2 path-connected footprint and a normal resource build cost.
2. Add the Sawmill world representation and placement ghost without introducing a second building or construction system; preserve the existing isometric world, placement rules and save flow.
3. Bind the Sawmill panel to the Phase 4 typed recipe and persistent processing-job APIs. Show the Logs input, Planks output, duration, affordability, one-slot busy state, completion and storage-full feedback.
4. Use the existing timestamp reconciliation and settlement-storage transfer path for save/reload and offline completion. A completed Planks output is never discarded when storage is full.
5. Keep Planks out of the Skill Tree discovery registry for this slice: the Sawmill's Hamlet Build Mode gate is the single unlock authority, and successful processing is surfaced through the Sawmill/storage UI rather than adding a duplicate discovery system or Crafting Point cost.
6. Add focused business-logic coverage and browser verification for the complete placement, construction and Logs-to-Planks flow.

## Phase 4B acceptance criteria

- [x] Sawmill is unlocked by the authoritative Settlement Hub Hamlet stage and is unavailable before that stage.
- [x] Sawmill placement uses the existing Build Mode, integer-grid, collision, path-connection, builder and timestamped construction systems.
- [x] Sawmill build cost is data-driven (`10 Logs + 20 Cobblestone`) and is consumed once when construction begins.
- [x] A completed Sawmill exposes the typed `1 Logs -> 4 Planks` recipe, checks affordability and occupies exactly one processing slot.
- [x] Inputs are consumed once; timed completion transfers Planks through Settlement Storage, while storage-full output remains recoverable through the shared job state.
- [x] Save/reload and offline timestamp reconciliation continue Sawmill construction and processing without a schema or Supabase migration.
- [x] Existing mine/path visuals, one-cart mine behavior, mine-local economy, construction and save systems remain intact.
- [x] `npm test`, `npm run build`, `git diff --check` and browser verification pass.

## Phase 4B completion record

- Added the Hamlet-gated Sawmill to the data-driven Build Mode registry and Production category. It occupies a path-connected 2x2 footprint, costs 10 Logs plus 20 Cobblestone, and uses the shared 10-second builder construction flow.
- Added a procedural Sawmill scene visual and yellow/invalid placement ghost, with placement records persisted as ordinary `WorldPlacement` building instances.
- Added the Sawmill modal UI for level, recipe, input/output, duration, affordability, active-job countdown, one-slot feedback, completion and Settlement Storage status. Start and collect actions call the shared Phase 4 processing APIs.
- The existing typed `sawmill-planks` recipe remains authoritative: 1 Log produces 4 Planks in 10 seconds. Planks are intentionally not a separate Skill Tree discovery in this slice; no duplicate unlock or Crafting Point path was added.
- Added focused tests for Hamlet gating, construction cost/payment, construction blocking, timed processing and missing-input feedback. No save schema or Supabase migration was required.
- Browser-verified the production route at `http://127.0.0.1:5176/Minecraft-Idle-Game/`: locked Sawmill before Hamlet; unlocked Production category; valid Sawmill placement; construction-in-progress modal; completed building; Logs-to-Planks affordability and one-slot busy state; timed completion into Settlement Storage; and reload continuity while processing was active. No application console errors were observed; existing Phase 3 minecart/storage behavior remains covered by the regression suite and prior browser record.

## Phase 4C implementation plan

1. Extend the existing data-driven Build Mode and building registries with a Hamlet-gated Stonecutter and a Hamlet-plus-Coal-discovery Furnace. Use physical-resource construction costs and the existing integer-grid, path-connected placement and builder queue.
2. Expand the typed `PROCESSING_RECIPES` registry with Cobblestone -> Stone and the early Furnace chains for Iron Ore -> Iron Ingot, Gold Ore -> Gold Ingot, Sand -> Glass and Clay -> Bricks. Keep Coal as a normal recipe input/fuel entry and keep unavailable raw materials correctly locked by discovery/input state.
3. Replace the Sawmill-only processing panel and renderer plumbing with one shared processing-building UI and generic processing-building visuals/ghosts. Recipe cards expose locked reasons, costs, outputs, duration, slot state and storage-blocked output without creating building-specific job logic.
4. Reuse the existing one-slot processing jobs, atomic input payment, timestamp completion, settlement-storage transfer, overflow preservation, local save and offline reconciliation paths for all three buildings.
5. Add focused tests for Stonecutter/Furnace unlocks, construction costs, recipe ownership, wrong-building rejection, level/input/fuel requirements, atomic starts, completion/storage and save/offline behavior, while retaining the Sawmill regression coverage.
6. Browser-verify both new vertical slices, Sawmill coexistence, storage output and mine/cart/construction regressions before closing Phase 4C.

## Phase 4C acceptance criteria

- [x] Stonecutter and Furnace are normal path-connected `WorldPlacement` buildings using the shared builder construction queue and physical-resource costs.
- [x] Stonecutter exposes the data-driven `2 Cobblestone -> 1 Stone` recipe with the configured level, unlock and duration values.
- [x] Furnace exposes data-driven Iron Ingot, Gold Ingot, Glass and Bricks recipes; Coal is represented as a normal input/fuel requirement.
- [x] Recipes for unavailable raw materials remain visibly locked with actionable reasons and do not bypass discovery or biome progression.
- [x] All three processing buildings share recipe resolution, one-slot busy state, atomic input payment, timestamps, output storage and overflow behavior.
- [x] Save/load and offline processing work for Stonecutter and Furnace without a schema or Supabase migration.
- [x] Existing Sawmill, settlement storage, construction, mine-local economy, Mine Collect, one-cart behavior and minecart movement remain intact.
- [x] `npm test`, `npm run build`, `git diff --check` and browser verification pass.

## Phase 1 Target Outcomes

- [x] Settlement Hub levels are authoritative global progression.
- [x] Builder slots limit concurrent construction/upgrades.
- [x] Generic build / upgrade / expand construction model.
- [x] Persistent building instances and levels.
- [x] First-class settlement resource storage capacity.
- [x] Data-driven building and upgrade costs.
- [x] Construction timers integrated with offline/save progression.
- [x] Existing mine/path placement continues to function.
- [x] Save migration is implemented and tested.
- [x] Desktop/mobile player flow is browser-verified.

## Implementation Notes

First slice keeps the existing `constructionQueue` field name so current UI and saves do not require a broad rewrite; its entries become generic construction projects.

Builder capacity starts at one, matching the current single active construction behavior. Later Hub completion can increase it through the same authoritative settlement system.

Existing world expansion projects retain the legacy `kind` because completion still needs to apply the correct world effect. The new action/target fields are the canonical routing metadata.

Settlement stage derivation now reads the explicit Hub level; the Hub upgrade flow is the only supported way to advance settlement stages.

Existing mine/path placement, mine storage behavior, one-cart animation and Supabase ownership rules are not changed by Phase 1A.

## Save Migration Notes

Current schema version: 12.

Schema 4 through schema 11 saves are accepted and normalized into schema 12 on load. Existing world, path, placement, mine, resource, skill and timestamp data is preserved. Legacy placements receive level 1 and complete construction state; legacy projects receive a persisted duration from the construction registry. Legacy saves do not inherit an unearned Hub level; they begin at the Dwelling Hub authority and Storage level 1. Schema 8 mine storage scalars migrate into typed local cobblestone inventory without changing mine clocks, IDs, orientation, rail length, storage capacity or effective tier. Schema 9 mines without `mineLevel` inherit the effective production tier represented by their saved underground layer and discoveries, then persist as Mine level 1, 2, 3 or 5 as appropriate. Schema 10's global `mineUpgradeRanks['rail-speed']` mirror is copied into each mine's `railLevel` when needed; schema 11 runtime never reads that global mirror. Schema 12 adds timestamped processing jobs; older saves receive none.

Legacy expansion-only projects are assigned stable IDs, `action: expand`, world targets, no resource cost and an available builder when loaded.

Legacy cloud rows remain readable because the client accepts the previous save version and passes the payload through the same local migration before use. No Supabase table or RLS change is needed.

Fresh schema 12 saves start with a complete level-one Settlement Hub, level-one Settlement Storage (500 capacity), zero population/story milestones, one builder slot, no active projects and no processing jobs. Each mine starts at Mine level 1, rail level 0 and storage capacity level 0 with an empty typed local inventory.

## Completed Slices

Baseline audit: 50 Vitest tests passed; production build passed; `git diff --check` passed before Phase 1A changes.

Phase 1A: 52 tests passed; production build and `git diff --check` passed; browser smoke verified the existing UI and builder indicator.

Phase 1B: 57 tests passed; production build and `git diff --check` passed; browser verified the active mine level in the Mining drawer and preserved menu behavior.
Phase 1C-A: 59 tests passed; production build and `git diff --check` passed; browser verified the Hub trigger/modal and disabled first upgrade on fresh production and staging pages. Staging also verified clean shared-script startup; production retained only the pre-existing favicon 404.
Phase 1C-B: 60 tests passed; production build and `git diff --check` passed; browser verified Hub-driven category locks, the fresh Dwelling Hub modal, staging separation and the supplied favicon on production and staging routes.
Phase 1D-A: 63 tests passed; production build and `git diff --check` passed; browser verified global storage usage in the resource brief/modal on production and staging routes.
Phase 1D-B: 67 tests passed; production build and `git diff --check` passed; browser verified the independent Mining storage drawer, Settlement Storage upgrade blocker and next-goal/builder feedback at desktop and compact viewport sizes with no application console errors.
Phase 1D-C: 69 tests passed; production build and `git diff --check` passed; browser verified local and cloud-shaped restore reconciliation, offline progress feedback, independent drawers and responsive production/staging shells at desktop and compact viewport sizes with no application console errors.
Minecart regression fix: 70 tests passed; production build and `git diff --check` passed; browser verified repeated long-rail travel, an east-facing short rail, and active save/reload continuity with exactly one cart per mine.
Phase 2A: 72 tests passed; production build and `git diff --check` passed; browser verified the independent Mining drawer, normal-resource mine upgrade labels and the removal of the duplicate Storage Carts upgrade entry.
Phase 2B-A: 74 tests passed; production build and `git diff --check` passed; browser verified locked Build Mode categories remain semantically clickable, open their submenus with lock feedback, and the existing mine/path item flow remains available.
Phase 2B-B: 75 tests passed; production build and `git diff --check` passed; browser verified Hub-gated branch entries in the Skill Tree show as unlocked only at their configured Hub level and remain free of Crafting Point costs.
Phase 2B-C: 77 tests passed; production build and `git diff --check` passed; browser verified current-rank Skill Tree costs in the Skill Tree node and inspector with no application console errors.
Phase 2B-D: 78 tests passed; production build and `git diff --check` passed; browser verified the migrated Skill Tree loads with preserved progression and no application console errors.
Phase 2C-A: 77 tests passed; production build and `git diff --check` passed; browser verified production and staging Skill Tree, Mining and Build Mode shells with no application console errors and confirmed the legacy upgrade panel is absent.
Phase 2C-B: 80 tests passed; production build and `git diff --check` passed; browser verified the production Skill Tree and World Power summary with no application console errors.
Phase 2C-C: 80 tests passed; production build and `git diff --check` passed; browser verified Build Mode path flow, Settlement XP/next-goal UI and no application console errors.
Phase 3A: 82 tests passed; production build and `git diff --check` passed; browser verified local mine storage presentation, manual collection controls, save normalization and no application console errors. The existing cart projection remains the sole transform owner.
Phase 3B: 87 tests passed; production build and `git diff --check` passed; browser verified weighted local production, multi-resource storage, collection, reload continuity, repeated trips and two mine orientations/rail configurations. Supabase requests were unavailable in the isolated browser session; local gameplay remained functional.
Phase 3C-A: 91 tests passed; production build and `git diff --check` passed; browser verified mine-level upgrade feedback, builder-backed completion, per-mine production-table transition and save/reload continuity with one cart and local inventory intact.
Phase 3C-B: 93 tests passed; production build and `git diff --check` passed; browser verified per-mine Rails and Storage panels, independent mine-targeted queues, normal-resource payment, builder feedback and no cross-mine side effects.
Phase 4A: 103 tests passed; production build and `git diff --check` passed; browser verified the production shell, independent drawers, storage summary and zero runtime console errors. Processing recipe/job logic was verified through input, queue, storage-overflow, migration and offline tests.
Phase 4C: 110 tests passed; production build and `git diff --check` passed; browser verified the Production submenu exposes Stonecutter and Furnace, preserves the Hamlet/Coal locks, and keeps the shared processing modal route available. Stonecutter/Furnace construction, recipe ownership, atomic Coal fuel payment, output completion and offline reconciliation are covered by the shared processing tests. No save schema or Supabase migration was required.

## Test / Verification History

- Phase 1C-A: `npm test` — 59 tests passed across 3 files; `npm run build` passed; `git diff --check` passed.
- Phase 1C-A browser: local production page and staging page loaded at `http://localhost:5174/Minecraft-Idle-Game/` and `/testing/`; Hub modal showed Dwelling, Hamlet as the next stage, data-driven requirements, and a disabled upgrade button on a fresh state. No application runtime errors were present.
- Phase 1C-B: `npm test` — 60 tests passed across 3 files; `npm run build` passed; `git diff --check` passed. No save schema change or migration was required because all new consequences are derived from the existing Hub level.
- Phase 1C-B browser: local production and staging pages loaded without application errors. Fresh UI showed Mining, Farm, Smithing, Houses and Animals build categories disabled while Paths remained available; the Hub modal showed Dwelling and Hamlet requirements; both route-relative favicon requests returned HTTP 200 with `image/x-icon`.
- Phase 1D-A: `npm test` — 63 tests passed across 3 files; `npm run build` passed; `git diff --check` passed. Schema 7 saves migrate to schema 8 with a default level-one Settlement Storage while preserving existing resources and Hub/runtime data.
- Phase 1D-A browser: local production and staging pages loaded at `http://localhost:5174/Minecraft-Idle-Game/` and `/testing/` with zero application errors. The resource brief and Resources modal both displayed `Storage 0 / 500`; staging remained isolated and retained its banner.
- Phase 1D-B: `npm test` — 67 tests passed across 3 files; `npm run build` passed; `git diff --check` passed. The build retains the existing large-chunk advisory only.
- Phase 1D-B browser: Playwright CLI verified the production route `http://127.0.0.1:5176/Minecraft-Idle-Game/` at 1280x720 and 390x844, plus the staging route `/testing/` at 1280x720. Mining and Build Mode remained independent; Mining > Storage showed Settlement Storage at `0/500`, the data-driven upgrade action and disabled missing-resource feedback; the HUD showed next-goal and builder availability text; staging retained its isolation banner. Console error checks returned zero errors on both routes.
- Phase 1D-C: `npm test` — 69 tests passed across 3 files; `npm run build` passed; `git diff --check` passed. The build retains the existing large-chunk advisory only.
- Phase 1D-C browser: Playwright CLI verified production at `http://127.0.0.1:5176/Minecraft-Idle-Game/` and staging at `/testing/` on desktop and compact viewports. Restored no-mine state displayed offline XP once; Mining and Build Mode stayed independent; next-goal, builder and storage feedback rendered; staging retained its isolation banner; console error checks returned zero errors.
- Minecart regression: render-loop optimization had left two transform writers active: routine scene/UI reconciliation and the frame animator both positioned the same cart. The renderer is now the sole transform owner, using a shared pure projection of persisted `progressMs` and `lastUpdatedAt`. Playwright verified normal repeated travel, an east-facing rail and a reload during production; the saved mine retained one cart and its progress advanced from `1107ms` to `4707ms` after reload.
- Phase 3B browser: Playwright CLI verified the local production route at `http://127.0.0.1:5180/Minecraft-Idle-Game/`. The Mining drawer showed `3 cargo/trip`, the mine-local storage accumulated multiple resource types, `Collect` transferred them to Settlement Storage, reload preserved the active mine and progress, and a second east-facing short-rail mine rendered with one cart. Supabase authentication/save requests returned the environment's existing unavailable-service errors; no application exception was observed.
- Phase 3C-A browser: Playwright CLI verified the local production route at `http://127.0.0.1:5180/Minecraft-Idle-Game/`. Mining showed Mine level 1, the Reinforced Mine normal-resource cost and Shallow Stone Mine table; clicking queued a 30-second mine-targeted builder project without changing the level, completion changed the mine to level 2 and Iron Layer, and reload preserved the completed level, active local inventory and one cart. Console error checks returned zero errors.
- Phase 3C-B browser: Playwright CLI verified the local production route at `http://127.0.0.1:5180/Minecraft-Idle-Game/` with two seeded mines. Rails showed separate Long and Medium route cards; upgrading Mine 1 queued only its rail project and completed at Rail level 1 with a 6-second cycle while Mine 2 remained at Rail level 0 with an 8-second cycle. Storage showed separate mine cards; Mine 1 storage queued independently and the builder-blocked state was visible. No application console errors were observed.

## Phase 2C-A completion record

- Removed the direct `buySpeedUpgrade`, `buyToolUpgrade` and `buyWorldExpansion` mutators so Speed, Tool and World progression no longer has a second active purchase route.
- Made `getAutoRate` read the canonical `automation-auto-strike` Skill Tree rank and made `getTool` read canonical tool-family ranks; legacy counters remain compatibility mirrors only.
- Removed the hidden legacy upgrade panel and its unused style from both production and staging shells; the existing Skill Tree/construction expansion flow remains unchanged.
- Preserved schema 8 and the existing migration: legacy `speedRank` and `toolRank` values still map into stable Skill Tree ranks without spending or refunding Crafting Points. No Supabase migration was required.
- Added regression coverage proving stale legacy counters cannot override canonical Skill Tree runtime reads and converted legacy tests to canonical purchase paths.

## Phase 2C-B completion record

- Added the data-driven `WORLD_POWER_EXPANSION_NODE_IDS` registry so only explicit world-expansion commitments may spend World Power.
- Added runtime validation that rejects World Power costs on ordinary Skill Tree, tool, mine and building routes, including invalid negative or non-finite costs.
- Preserved the existing Hub reward source and Skill Tree/construction expansion flow, including world geometry, builder behavior and saved World Power balances.
- Added registry, ordinary-upgrade and accidental-cost regression tests; no save schema or Supabase migration was required.
- Browser-verified the production Skill Tree and World Power summary at `http://127.0.0.1:5180/Minecraft-Idle-Game/` with zero application console errors.

## Phase 2C-C completion record

- Audited every runtime Settlement Progress write; mine output and ordinary resource collection remain non-rewarding, while building, storage and Hub rewards remain completion-time.
- Removed Settlement Progress rewards from terrain expansion completion so World Power expansion does not advance settlement development by itself.
- Added the data-driven `SETTLEMENT_DEVELOPMENT_REWARDS` registry for path construction, path upgrades, mine placement, mine upgrades and mine-storage upgrades using the roadmap's approved values.
- Preserved Settlement Progress as a non-spendable Hub requirement and kept the existing Hub next-goal HUD as the authoritative feedback surface.
- Added regression coverage for approved path/mine awards, no-award expansion completion and mine output not advancing progress; no save schema or Supabase migration was required.
- Browser-verified the production Build Mode path flow and Settlement XP/next-goal UI at `http://127.0.0.1:5180/Minecraft-Idle-Game/` with zero application console errors.

## Phase 4C completion record

- Added Stonecutter and Furnace to the authoritative Build Mode unlock registry. Stonecutter is Hamlet-gated and costs 40 Cobblestone; Furnace is Hamlet plus Coal discovery-gated and costs 50 Cobblestone plus 10 Logs. Both use the existing path-connected placement and one-builder construction queue.
- Extended the single `PROCESSING_RECIPES` registry with Stonecutter `2 Cobblestone -> 1 Stone` in 10 seconds and Furnace Iron Ore -> Iron Ingot, Gold Ore -> Gold Ingot, Sand -> Glass and Clay -> Bricks in 15 seconds. Each Furnace recipe consumes one Coal as its normal input/fuel entry and requires both Coal and the relevant raw-material discovery.
- Replaced the Sawmill-only modal and renderer plumbing with a shared processing panel, recipe cards, locked-reason feedback, one-slot state and generic procedural Stonecutter/Furnace visuals. Furnace fire is visible only while its shared processing job is active.
- Reused the existing atomic input payment, timestamped job, Settlement Storage transfer/overflow, local save and offline reconciliation paths. The recipe registry now supports multiple unlock requirements without introducing a parallel queue or discovery system.
- Added focused Stonecutter/Furnace tests for unlocks, costs, construction blocking, recipe ownership, input/fuel validation, atomic starts, completion and offline processing while retaining the Sawmill regression coverage. No schema or Supabase migration was needed.
- Browser-verified the local Production submenu at `http://127.0.0.1:5176/Minecraft-Idle-Game/`; fresh state showed the new Stonecutter and Furnace entries with actionable locked states, and the route loaded with no application exceptions. The existing minecart/storage behavior remains protected by the Phase 3 regression suite and prior browser verification.

## Fresh starter mine placement regression fix

- Root cause: the Build Mode `Mine` blueprint inherited the `world-cave-entrance` Skill Tree prerequisite even though a fresh Settlement Hub already grants one mine-site permit. This duplicate gate disabled the only starter mine before the placement flow could begin.
- Removed that duplicate blueprint prerequisite. `getAvailableMineSites`, Settlement Hub mine-site consequences and `canPlaceMine` remain the authorities for physical site capacity, collision, path connection and placement validity; existing Skill Tree world knowledge remains available for its own discovery/perk role.
- Added regression coverage proving a fresh save exposes the Mine blueprint and one permit, then reaches zero available sites after placing the starter mine. No save schema or Supabase migration was required.
- Browser-verified a clean fresh session: Build Mode -> Mining shows an enabled `Mine` item, clicking it enters mine placement mode, and the page reports zero application console errors.

## Next Work

The active user-approved work is the isolated `/testing/` visual/world foundation described above. Production roadmap work is paused; Phase 4D - Smithy and tool crafting remains the next production-roadmap sub-phase but must not resume until the user explicitly redirects work.

Next active task: user review of the testing-world foundation; refine only the staging page if requested. Next production-roadmap sub-phase (deferred): Phase 4D - Smithy and tool crafting. Phase 4A, Phase 4B and Phase 4C are complete; Phase 3 — Real Mine Economy is complete.

Phase 1 and Phase 2 Economy Cleanup are complete. Phase 2 has been split into coherent cleanup slices; Phase 2A, 2B-A, 2B-B, 2B-C, 2B-D, 2C-A, 2C-B and 2C-C are complete and pushed. Phase 4A, Phase 4B and Phase 4C are complete and pushed. These records remain historical; Phase 4D is deferred by the active direction override.

## Phase 3 implementation sub-phases

1. **Phase 3A - Canonical mine-local inventory and collection**
   - Replace the visual-only mine storage scalar with a typed local inventory on each mine.
   - Route completed cart cargo into that inventory instead of settlement resources.
   - Stop production when local storage reaches capacity and add an explicit partial `Collect` flow to settlement storage.
   - Migrate legacy storage amounts conservatively and preserve cart clocks, mine identity, capacity upgrades and Supabase payload compatibility.
2. **Phase 3B - Data-driven mine production and cart capacity**
   - Add weighted per-trip ore tables, deterministic cargo generation and explicit cart capacity without introducing Emerald trading.
   - Keep Emerald as a separate rare bonus and preserve one physical cart per mine.
3. **Phase 3C - Mine levels and upgrade ownership**
   - Move mine-specific production/depth progression into mine-owned levels and normal-resource costs.
   - Keep rail speed/route upgrades and storage capacity as separate mine-owned upgrade definitions.
4. **Phase 3D - Offline mine economy and final Mining UI**
   - Reconcile offline trips using the same local-inventory, capacity and full-pause rules.
   - Expose typed contents, capacity, fullness, pause state and collection feedback in the Mining menu.

## Phase 3D implementation plan

1. Extend the existing mine-production result with a typed per-mine report containing accepted deliveries, accepted resources, local storage amount/capacity and whether production is paused at capacity.
2. Keep `reconcileElapsedProgress` as the single restore entry point for local and Supabase-shaped saves, and surface its per-mine reports as concise return/paused feedback without creating a second production simulation.
3. Make the Mines, Rails and Storage panels consume the existing shared `getMineOperationsSummary` plus per-mine reports; show typed local contents, capacity/fullness, pause state and the latest collection result in the Storage panel.
4. Add focused tests for offline elapsed trips, capacity pause, multi-mine report isolation, collection feedback and save-watermark idempotency. No schema or Supabase contract migration is expected.

## Phase 3D acceptance criteria

- [x] Offline reconciliation advances mine trips through the same local-inventory, capacity and full-pause rules as active play.
- [x] Offline production never bypasses mine-local storage or directly increases settlement resources.
- [x] Each mine's Mining views expose typed contents, capacity, fullness, cart/trip details and paused state from shared read models.
- [x] Restore feedback identifies per-mine deliveries and full-storage pauses; manual collection feedback identifies transferred and overflow resources.
- [x] One cart per mine, smooth repeated movement, orientation/rail routing and save/reload continuity remain intact.
- [x] No save schema, Supabase contract or Phase 4+ system is introduced.
- [x] `npm test`, `npm run build`, `git diff --check` and browser verification pass.

## Phase 3D completion record

- Extended the existing `advanceMineOperations` result with isolated typed reports for every mine, including accepted deliveries/resources, local storage amount/capacity, fullness and pause state.
- Kept `reconcileElapsedProgress` as the only restore simulation for local and Supabase-shaped saves, so offline deliveries use the same weighted cargo, local-inventory, capacity and full-pause rules as active play.
- Added restore feedback to Mining > Storage for per-mine offline deliveries and full-storage pauses, plus timed manual collection feedback for transferred and overflow resources.
- Persisted reconciled mine clock state whenever restored mines are present and removed the initial shell's duplicate offline-XP award; the game-layer reconciliation remains the sole XP authority.
- Added coverage for offline delivery reports, capacity-limited pause reports, multiple-mine isolation and restore idempotency. No save schema, Supabase contract or runtime minecart migration was required.
- Browser-verified controlled offline restoration, Mining > Storage feedback, manual collection into Settlement Storage, repeated production, cart screenshots across time and reload continuity. Supabase requests were intentionally blocked in the isolated QA session; no application exceptions were observed.

## Phase 3A implementation plan

1. Add a canonical `inventory` resource map to `MineSite`; remove runtime dependence on the legacy `storageAmount` scalar.
2. Bump the client save schema and migrate legacy scalar storage into a safe typed material entry without changing mine clocks, IDs, orientations or upgrade ranks.
3. Change mine production to place accepted cargo in local inventory, pause at local capacity, and leave settlement resources unchanged until collection.
4. Add a data-driven collection helper that transfers as much inventory as settlement storage can accept and leaves overflow in the mine.
5. Update the mine world visual and Mining drawer to derive fill, contents and `Collect` availability from the canonical inventory.

## Phase 3A acceptance criteria

- [x] Each mine owns a typed local inventory; no mine production reward is directly added to settlement resources.
- [x] A completed cart trip increases local inventory and XP, while `Collect` transfers inventory to settlement storage.
- [x] Collection supports partial transfer and preserves the untransferred remainder.
- [x] Full mine storage pauses production without resetting the persisted cart clock or spawning another cart.
- [x] Legacy saves migrate their previous storage amount without losing quantity, and fresh/current saves round-trip the inventory.
- [x] Mine identity, orientation, rail length, one-cart behavior, placement and existing Supabase save payloads remain compatible.
- [x] `npm test`, `npm run build`, `git diff --check` and browser verification pass.

## Phase 3A completion record

- Added typed `MineSite.inventory` as the sole local storage authority and removed runtime dependence on the former visual-only `storageAmount` field.
- Mine deliveries now generate deterministic current cargo into local inventory, award XP, and leave settlement resources unchanged until the player presses `Collect`.
- Added partial collection through settlement storage capacity; overflow remains in the mine and full local storage pauses the production clock without creating another cart.
- Bumped the client save schema from 8 to 9. Schema 8 scalar mine storage migrates conservatively to cobblestone inventory while preserving mine timing, identity, orientation, rail length and upgrades; no Supabase table or RLS migration was required.
- Updated the world storage visual and Mining drawer to show typed contents, local capacity/fullness and collection/paused state.
- Added regression coverage for local delivery, partial collection, full-storage pause, typed inventory migration and schema 9 normalization.

## Phase 3B implementation plan

1. Replace the legacy every-X-trip cargo counters with a typed, data-driven ore-table registry and deterministic weighted selection helper.
2. Use the existing global `undergroundLayer` as the temporary canonical production-tier input for this slice; map layers 0/1/2 to Shallow/Iron/Redstone and use the already-discovered Diamond node to select the Diamond table. Phase 3C will migrate this authority into mine-owned depth/level progression.
3. Make the existing Automation Mine Cart Handling Skill Tree rank the sole current cart-capacity perk: rank 0 produces one weighted cargo roll and each rank adds one roll, while `cartCount` remains fixed at one physical cart per mine.
4. Generate one complete cart manifest per completed trip, evaluate Emerald independently per cargo roll, and deposit only the deterministic prefix that fits remaining mine-local capacity.
5. Refresh the existing discovery synchronization after accepted production so eligible Phase 2 discovery nodes remain the only discovery authority; do not add trader or Emerald purchase logic.
6. Add focused tests for table selection, weights, capacity, partial/full storage, discovery refresh, Emerald separation and current-schema compatibility; browser-verify repeated production, local collection, reload and multiple mine orientations/configurations.

## Phase 3B acceptance criteria

- [x] Shallow, Iron, Redstone and Diamond ore tables are typed, data-driven and match the roadmap's 80/15/5, 60/15/10/15, 50/20/12/8/10 and 55/15/10/10/7/3 targets.
- [x] Completed cart trips use weighted resource rolls instead of the removed every-X-trip reward counters.
- [x] Cart capacity is authoritative, upgradeable through the existing Mine Cart Handling Skill Tree rank, and increases resources delivered per trip without spawning another cart.
- [x] Production deposits into mine-local inventory only, respects remaining capacity with deterministic partial overflow handling, and preserves full-storage pause behavior.
- [x] Emerald is not in any normal ore table and remains an independent rare bonus roll; no trader or Emerald-gated ordinary upgrade was added.
- [x] Existing discovery synchronization is refreshed after mine production without creating a second discovery system or charging Crafting Points.
- [x] Existing schema 9 saves remain compatible; no migration or Supabase schema change is required.
- [x] `npm test`, `npm run build`, `git diff --check` and browser verification pass.

## Phase 3B completion record

- Added the `MINE_PRODUCTION_TABLES` registry and pure weighted resource selector for Shallow Stone, Iron, Redstone and Diamond production tiers.
- Removed the legacy base-resource and periodic Coal/Iron/Gold/Diamond counters. Each completed physical cart trip now generates a deterministic manifest from the active table, with one roll per cart-capacity slot.
- Made the existing `automation-mine-carts` Skill Tree rank the single cart-capacity input (`1 + rank` cargo rolls) and updated its player-facing effect text; `cartCount` remains normalized to one.
- Emerald remains a separate per-roll rare bonus and is deposited into mine-local inventory alongside accepted normal cargo; global resources still change only through `Collect`.
- Added deterministic partial-capacity deposit behavior and retained full-storage pause/resume, save/load timing, discovery synchronization and one-cart visuals. No save or Supabase migration was required.
- Added coverage for tier selection, weighted boundaries, multi-roll output, partial/full capacity, discovery refresh, Emerald separation and current schema behavior. Browser-verified changing local mine contents, collection, reload continuity, repeated production, and a second east-facing short-rail configuration.

## Phase 3C implementation sub-phases

1. **Phase 3C-A - Mine-owned levels and production depth (current slice)**
   - Add a data-driven six-level Mine progression registry with normal-resource costs, Hub requirements, construction durations and Settlement Progress rewards.
   - Persist `MineSite.mineLevel` as the canonical production/depth authority; preserve the existing global underground-layer value only as a compatibility input for older saves and Skill Tree discovery rules.
   - Route mine-level upgrades through the generic builder-backed construction queue and apply the level only when construction completes.
   - Make production tables, typed cargo visuals and discovery refresh read each mine's level, while retaining Phase 3B capacity, local inventory, full pause and Emerald separation.
   - Add schema migration, tests and Mining-menu upgrade feedback without changing rail or storage ownership yet.
2. **Phase 3C-B - Mine-owned rail and storage upgrade definitions**
   - Move rail speed and route progression off the remaining global compatibility mirror and make the serialized per-mine rail level the sole runtime authority.
   - Keep local storage capacity as its own mine-owned upgrade definition and expose per-mine rail/storage actions without cross-mine side effects.
3. **Phase 3C-C - Mine progression presentation and balancing**
   - Tune the level registry against production-time targets and expose per-mine depth, rail, cart and storage summaries consistently across Mining panels.

## Phase 3C-A implementation plan

1. Add the canonical Mine Level registry and a persisted `mineLevel` field with a conservative schema 9-to-10 migration that preserves each save's effective production tier.
2. Route the Mine Level upgrade through `constructionQueue` with Hub/resource requirements, one-builder contention, one-time payment and completion-only level changes.
3. Use mine-owned level data for production-table selection, visual cargo selection and discovery synchronization; do not remove the global underground-layer compatibility mirror until all legacy consumers are migrated.
4. Add focused tests for fresh/migrated mine levels, tier selection, upgrade affordability/queue/completion, builder contention and unchanged Phase 3B local inventory behavior.
5. Browser-verify the Mining menu shows the mine level and actionable upgrade state, production changes after completion, and existing local storage/one-cart behavior remains intact.

## Phase 3C-A acceptance criteria

- [x] Every fresh and loaded mine has a canonical level from the data-driven Mine Level registry.
- [x] Mine production/depth tables read the individual mine level rather than the global underground-layer value.
- [x] Mine Level upgrades require configured Hub and normal-resource prerequisites, use one builder, deduct once and change the mine only on completion.
- [x] A schema 9 save migrates to schema 10 without losing mine identity, clocks, inventory, orientation, rail length, storage capacity or effective production tier.
- [x] Phase 3B local inventory, partial/full capacity pause, Emerald separation, discovery synchronization and one-cart behavior remain intact.
- [x] `npm test`, `npm run build`, `git diff --check` and browser verification pass.

## Phase 3C-A completion record

- Added the data-driven six-level `MINE_LEVELS` registry with roadmap-aligned depth names, normal-resource costs, Hub requirements, construction durations and Settlement Progress rewards.
- Added canonical `MineSite.mineLevel`; production tables, cargo visuals and mine XP now read the individual mine level instead of using the global underground-layer value at runtime.
- Routed Mine Level upgrades through the generic builder-backed construction queue with one-time resource payment, builder contention, saved timers and completion-only level changes.
- Bumped saves from schema 9 to schema 10. Older saves conservatively map their effective global production tier to each mine's owned level while preserving mine clocks, identity, inventory, orientation, rail length and storage capacity. No Supabase table or RLS migration was required.
- Added Mining-menu Mine level/table/upgrade feedback and regression coverage for fresh state, level authority, upgrade affordability, queue/completion, builder contention and schema migration. Existing rail and storage upgrade ownership remains the scope of Phase 3C-B.

## Phase 3C-B implementation plan

1. Define rail-speed and mine-storage capacity upgrade registries owned by each `MineSite`, retaining the old global rail rank only as a migration mirror.
2. Route both upgrade types through the generic builder-backed construction queue with target mine IDs, one-time normal-resource payment and completion-only level changes.
3. Make per-mine rail level the sole runtime input for trip duration, Emerald chance and Mining summaries; keep physical rail length as the saved route configuration.
4. Expose independent Rails and Storage Mining panels for every mine, with builder/resource blockers and no cross-mine side effects.
5. Add schema 10-to-11 migration coverage for legacy global rail ranks, current mine-owned round trips, upgrade contention and unchanged Phase 3 local inventory behavior.

## Phase 3C-B acceptance criteria

- [x] Rail speed and Emerald chance read each mine's serialized `railLevel`; the global compatibility mirror is not used by runtime production or animation.
- [x] Rail length remains the mine's physical route configuration and is shown per mine without changing the one-cart rule.
- [x] Mine storage capacity remains a separate mine-owned `storageCapacityLevel` registry and does not affect other mines.
- [x] Rail and storage actions target one mine, use normal resources and the shared builder queue, deduct once and apply only on completion.
- [x] Schema 10 saves migrate the legacy global rail mirror into each mine without losing mine timing, identity, orientation, inventory or storage capacity.
- [x] Phase 3A/3B behavior remains intact: local inventory, collection, full-storage pause, discoveries and weighted cargo are unchanged.
- [x] `npm test`, `npm run build`, `git diff --check` and browser verification pass.

## Phase 3C-B completion record

- Added `MINE_RAIL_UPGRADES` and `MINE_STORAGE_UPGRADES` as separate data-driven registries owned by each mine.
- Made `MineSite.railLevel` authoritative for trip duration and the rare Emerald chance; removed the runtime write/read dependency on the global `mineUpgradeRanks['rail-speed']` mirror.
- Converted rail and mine-storage upgrades into mine-targeted generic construction projects with builder contention, normal-resource costs, completion-time application and Settlement Progress rewards.
- Bumped saves from schema 10 to schema 11. Legacy rail ranks are copied into each mine during migration; current saves retain the global field only for compatibility and no Supabase table or RLS migration was required.
- Replaced the single global Powered Rails Mining action with per-mine Rails cards and updated Storage cards to use per-mine queued actions. Browser verification confirmed independent mine cards, one-mine rail queuing, storage queuing and builder feedback.

## Phase 3C-C implementation plan

1. Tune the Mine Level registry with an explicit base storage-fill target that decreases by 25 seconds per completed mine-level upgrade, while preserving the roadmap's eight-second level-one cart cycle.
2. Add one data-driven per-mine operations summary for depth, production table, rail route, cart capacity, trip rate, storage state and pause state so all Mining panels read the same values.
3. Update the Mines, Rails and Storage panels to expose those summaries consistently, including the mine's expected base-capacity fill target and current local inventory.
4. Add focused tests for the tuned level targets, mine-owned fill timing and summary consistency; preserve schema 11 and the existing local/Supabase save payload contract.

## Phase 3C-C acceptance criteria

- [x] Mine levels expose explicit, data-driven storage-fill targets: 12 minutes at level 1, reduced by 25 seconds per mine-level upgrade.
- [x] The established level-one cart cycle remains 8 seconds and rail upgrades remain the only cart-speed input.
- [x] Mines, Rails and Storage panels consistently show each mine's depth/table, rail level/route, one-cart capacity/rate and local storage state.
- [x] Full local storage is visibly identified as paused, while non-full storage shows the expected fill target and current trip rate.
- [x] No save schema, Supabase contract or mine-cart runtime migration is required.
- [x] `npm test`, `npm run build`, `git diff --check` and browser verification pass.

## Phase 3C-C completion record

- Added explicit storage-fill targets to the Mine Level registry: 12 minutes at level 1, reduced by 25 seconds for each mine-level upgrade. The existing eight-second level-one cart cycle remains unchanged; rail level remains the only cart-speed authority.
- Added `getMineOperationsSummary`, a shared data-driven read model for per-mine depth, production table, rail route, one-cart capacity/rate, local storage and pause state.
- Updated Mines, Rails and Storage panels to use the shared mine summary and show depth, route, cart capacity/rate, local contents, fullness and the expected base-capacity fill target.
- Corrected the storage-fill target calculation to use mine level rather than rail level. No save schema, Supabase contract or runtime minecart migration was required.
- Added regression coverage for all six fill targets and summary consistency. Browser verification confirmed the three Mining panels and zero application console errors.

## Phase 2B-A acceptance criteria

- [x] Natural material nodes are represented as free, data-driven discovery nodes rather than Crafting Point purchases.
- [x] Surface, mine, mine-layer and biome conditions automatically grant eligible discoveries while preserving previously purchased legacy ranks.
- [x] Discovery nodes cannot be manually purchased and are reflected as awaiting/discovered in the existing Skill Tree UI.
- [x] Locked Build Mode categories remain semantically clickable, open their category page, and show locked item prerequisites instead of dead controls.
- [x] Existing mine/path placement and save behavior remain intact.
- [x] `npm test`, `npm run build`, `git diff --check` and browser verification pass.

## Phase 2B-A completion record

- Added the data-driven `discovery` Skill Tree node kind and discovery rules for natural materials.
- Added centralized discovery synchronization for fresh state, mine placement, mine operation, skill purchases and save loading; legacy positive ranks are retained.
- Updated Skill Tree presentation so discoveries show `Awaiting Discovery` rather than a purchasable action.
- Kept every Build Mode category navigable when locked and added visible category item previews with prerequisite feedback; implemented buildable items retain their existing mode handlers.
- No save schema or Supabase migration was required; saved positive material ranks remain valid and unearned discoveries are not granted without their world condition.

## Phase 2B-B acceptance criteria

- [x] Branch-entry nodes are free and do not consume Crafting Points.
- [x] Branch availability is owned by Settlement Hub level: Dwelling opens Harvesting, Tools and World; Hamlet opens Life; Village opens Automation; Small Town opens Materials and Deep Mining; Town opens Mastery.
- [x] Hub-gated branch entries automatically unlock when a Hub upgrade completes and when a save is loaded.
- [x] Existing branch-entry IDs and legacy positive ranks remain valid; no save schema or Supabase migration is required.
- [x] Locked branch entries show their Hub requirement in the Skill Tree instead of presenting a purchasable path.
- [x] `npm test`, `npm run build`, `git diff --check` and browser verification pass.

## Phase 2B-B completion record

- Added data-driven Settlement Hub milestone rules to the existing stable branch-entry nodes and set their costs to zero.
- Added centralized automatic Skill Tree synchronization for Hub milestones alongside natural material discoveries.
- Preserved legacy purchased branch ranks through the existing conservative skill-rank migration; no schema or Supabase change was needed.
- Updated Skill Tree state and inspector feedback to distinguish Hub-gated branch entries from ordinary prerequisite-locked skills.

## Phase 2B-C acceptance criteria

- [x] Skill Tree rank costs are defined by one data-driven curve: Rank I 1 CP, Rank II 2 CP and Rank III 3 CP; capstones remain 5 CP.
- [x] Purchase affordability and Crafting Point spending use the current rank cost, preventing later ranks from reusing the Rank I price.
- [x] Skill Tree accessibility labels and the selected-node inspector show the cost of the next rank consistently.
- [x] Free discovery nodes and Settlement-Hub branch-entry milestones remain free and automatic.
- [x] Existing save data remains compatible because the cost curve is derived from stable node definitions; no schema or Supabase migration is required.
- [x] `npm test`, `npm run build`, `git diff --check` and browser verification pass.

## Phase 2B-C completion record

- Added a canonical per-rank Crafting Point cost curve to every Skill Tree node definition and a shared lookup helper for the next rank.
- Updated Skill Tree purchase validation, spending, accessibility text and inspector details to use the same rank-aware cost.
- Preserved free discoveries and Hub-owned branch milestones, while keeping capstones at 5 CP.
- Added model and behavior coverage for increasing rank costs; no save or Supabase migration was needed.

## Phase 2B-D acceptance criteria

- [x] Valid purchased material and skill ranks from legacy saves remain present after normalization and are capped only to the current node maximum.
- [x] Legacy progress in a branch restores its stable branch entry so the now-free path remains visible without charging Crafting Points again.
- [x] Automatic discovery and Hub milestone synchronization does not erase or reinterpret previously purchased ranks.
- [x] Unknown, invalid and non-positive rank values remain excluded from the canonical skill-rank map.
- [x] No save schema, Supabase contract or gameplay currency balance migration is required; saved Crafting Points are preserved exactly.
- [x] `npm test`, `npm run build`, `git diff --check` and browser verification pass.

## Phase 2B-D completion record

- Isolated legacy branch-entry restoration in a named migration helper and documented that stable child ranks remain the source of truth.
- Preserved legacy material discoveries and purchased skill ranks while restoring only the free branch entry needed to expose their existing path.
- Added a schema-4 migration regression test proving material/branch ranks survive load without changing Crafting Points and remain non-purchasable discoveries.
- No schema or Supabase migration was required; Phase 2B is now complete.

## Phase 2A acceptance criteria

- [x] Current rail-speed and mine-storage upgrades no longer require Emeralds and use data-driven normal-resource costs.
- [x] The Mine is the sole active authority for rail-speed and storage-capacity upgrades; the duplicate storage upgrade entry and Skill Tree rail-speed contribution are no longer active upgrade paths.
- [x] Existing serialized storage capacity remains authoritative; obsolete legacy storage-capacity ranks are safely ignored during normal save parsing.
- [x] First Villager no longer depends on the Emerald discovery, so the circular progression gate is removed without introducing Phase 3 or trader systems.
- [x] Existing mine/path placement, one-cart travel, local/cloud save contract and responsive Mining UI remain intact.
- [x] `npm test`, `npm run build`, `git diff --check` and browser verification pass.

## Phase 2A completion record

- Consolidated active mine upgrades around `rail-speed` and the per-mine serialized `storageCapacityLevel`.
- Replaced Emerald payments with data-driven cobblestone costs and kept Emerald drops/trading available as a rare economy resource.
- Removed the duplicate Storage Carts Mining-menu item and updated upgrade status/affordability UI for normal-resource costs.
- Removed the Emerald prerequisite from First Villager and added regression coverage for the deadlock and upgrade ownership/costs.
- No save schema or Supabase migration was required; existing storage levels continue to load, while obsolete storage-capacity upgrade ranks are excluded by the current allow-list normalizer.

## Phase 1D-C implementation plan

1. Add one shared elapsed-progress reconciliation operation that completes due generic construction, advances mine production and awards no-mine offline XP while advancing the save watermark exactly once.
2. Run that operation for the initial local save and again after a newer Supabase save is hydrated, then persist the reconciled cloud state so active timers and offline gains cannot be lost or replayed.
3. Preserve the existing save schema and Supabase table contract; add focused tests for local/cloud-shaped restoration, construction completion, builder release, offline XP and idempotency.
4. Browser-verify production and staging at desktop and compact viewports, including the next-goal/storage feedback and absence of runtime errors.

## Phase 1D-C acceptance criteria

- [x] A saved Hub or Settlement Storage construction project completes from elapsed wall-clock time after local restore, releases its builder and applies completion effects once.
- [x] A newer Supabase-restored save receives the same elapsed construction and offline reconciliation as a local restore before it replaces the active state.
- [x] No-mine offline XP is awarded once per save watermark, bounded by the existing offline-efficiency rule, and is not replayed by subsequent frames or saves.
- [x] Reconciled state is persisted locally and queued for cloud sync without changing the schema or Supabase table/RLS contract.
- [x] Desktop and compact production/staging flows remain responsive, show actionable progression feedback and produce no application console errors.
- [x] `npm test`, `npm run build`, `git diff --check` and browser verification pass.

## Phase 1D-C completion record

- Added the canonical `reconcileElapsedProgress` operation for due construction, mine production and no-mine offline XP, with a single save-watermark advance to prevent replay.
- Applied the same reconciliation to initial local restore and newer Supabase state hydration, immediately persisting reconciled state and re-queuing it for cloud sync.
- Added tests for elapsed storage construction completion, builder release, offline XP restoration and idempotency.
- Browser-verified the restored offline-progress modal, Mining/Build independence, next-goal/storage feedback and desktop/compact production and staging layouts with zero console errors.

## Phase 1D-B implementation plan

1. Extend the existing settlement-storage registry with data-driven upgrade costs, durations and progression rewards; keep storage capacity derived from the serialized Settlement Storage instance.
2. Route Settlement Storage upgrades through the shared generic construction queue with a `storage` target, one-builder contention, resource payment and completion-only level changes.
3. Preserve schema 8 compatibility by defaulting older/current storage records to `complete` and retaining any valid saved upgrade state/timer; no new Supabase schema or duplicate storage authority is required.
4. Add a data-driven next-goal summary derived from the authoritative Hub upgrade requirements, including the first actionable missing requirement and builder availability/queue feedback.
5. Integrate the storage upgrade and next-goal/builder feedback into the existing Mining storage panel, Settlement Hub card and construction status without changing the isometric scene or placement behavior.
6. Add business-logic and UI-facing tests for storage upgrade affordability, builder contention, completion, migration and next-goal messaging; browser-verify the production and staging routes.

## Phase 1D-B acceptance criteria

- [x] Settlement Storage upgrade levels, capacities, costs, durations and rewards are defined in one data registry.
- [x] A Settlement Storage upgrade uses the shared construction queue, consumes its configured resources once, occupies one builder and applies the new capacity only on completion.
- [x] Queued storage upgrades wait for a builder and saved active storage upgrades resume safely after loading.
- [x] Existing schema 8 saves without storage construction metadata remain valid with a complete level-one storage instance; no Supabase migration is required.
- [x] The Settlement Hub card exposes the current next goal and a concise blocker/action, while builder feedback distinguishes active, available and queued work.
- [x] Mining storage exposes the Settlement Storage upgrade and its current capacity/level without duplicating mine-local storage upgrades.
- [x] Existing placement, mine/path, one-cart, local save, Supabase compatibility and responsive UI behavior remain intact.
- [x] `npm test`, `npm run build`, `git diff --check` and browser verification pass.

## Phase 1D-B completion record

- Added a data-driven Settlement Storage upgrade registry with level, capacity, resource cost, timer and Settlement Progress reward; capacity remains derived from the serialized storage level.
- Routed storage upgrades through the existing generic construction queue with one-builder contention, one-time resource payment, saved upgrade state and completion-only capacity/progress changes.
- Added schema 8 normalization for older storage records without construction metadata while preserving valid in-progress storage upgrades; no Supabase schema migration was required.
- Added authoritative next-goal and builder feedback to the Settlement Hub card and construction status, and added a separate Settlement Storage upgrade tile to Mining > Storage without changing mine-local upgrades.
- Added coverage for storage affordability, completion, builder contention, save/load resumption, schema normalization and next-goal blocker messaging.

## Phase 1D-A implementation plan

1. Add a serialized Settlement Storage instance with a data-driven level/capacity registry; keep capacity derived from level so there is one storage authority.
2. Add shared storage helpers for total stored resources, remaining capacity, capped additions and multi-resource transfers.
3. Route current mine rewards and manual ore bonuses through the shared transfer API; pause mine production when global storage is full without changing the later Phase 3 mine-local inventory design.
4. Migrate schema 7 saves to schema 8 conservatively, preserving all existing resource balances and defaulting storage to level 1.
5. Surface stored-versus-capacity feedback in the existing resource brief and Resources modal on production and staging pages.
6. Add business-logic tests for capacity, capped transfers, full-storage production pause and schema migration.

## Phase 1D-A acceptance criteria

- [x] Fresh saves contain a level-one Settlement Storage with the configured 500-resource capacity.
- [x] Global resource additions cannot raise stored resources above capacity; transfer results expose accepted and overflow amounts.
- [x] Mine production pauses when global storage is full and resumes after capacity is freed, without changing the one-cart or mine-local visual systems.
- [x] Schema 7 saves load as schema 8 without losing resources, mines, placements, Hub state or construction timestamps.
- [x] Production and staging resource UI shows current global storage usage and remains responsive.
- [x] `npm test`, `npm run build`, `git diff --check` and browser verification pass.

## Phase 1D-A completion record

- Added a serialized `settlementStorage` instance and the data-driven `SETTLEMENT_STORAGE_LEVELS` capacity registry, starting at 500 resources.
- Added shared capped additions and multi-resource transfer helpers; current mine rewards, manual ore bonuses, surface harvesting and trader transfers now use the settlement capacity boundary.
- Paused current mine production at full settlement storage while preserving mine-local fill visuals, one-cart behavior and the planned Phase 3 mine inventory boundary.
- Bumped saves from schema 7 to schema 8. Schema 7 Hub state and all existing resources/runtime data remain intact; new storage defaults to level 1.
- Added storage usage to the resource brief and Resources modal on production and staging routes.
- Added tests for fresh storage, overflow reporting, full-storage pause/resume and schema 7 migration.

## Phase 1C-B implementation plan

1. Add a single data-driven Hub consequence registry for current-era capabilities: mine-site permits, trader availability and build-category stage gates.
2. Remove the Skill Tree's direct control over mine-site capacity while preserving the existing nodes as future coordination/perk points rather than additional permits.
3. Make the trader and build-mode category availability read Hub authority, while retaining existing skill prerequisites where they represent knowledge.
4. Align the visible mine-site and category lock messaging with the authoritative Hub requirements.
5. Add tests for Hub-level consequences and preserve schema 7 compatibility; no new save field is required for derived consequences.

## Phase 1C-B acceptance criteria

- [x] Mine-site capacity is controlled by Settlement Hub milestones: one at Dwelling, a second at Small Town, and a third at City.
- [x] Existing Skill Tree mine-site nodes no longer create additional mine permits or duplicate global progression.
- [x] Wandering Trader availability is controlled by the Hub era, becoming available at Hamlet.
- [x] Build categories that represent later settlement systems require their configured Hub era in addition to any knowledge prerequisite.
- [x] Existing mine/path placement, one-cart behavior, construction, saves and Supabase compatibility remain intact.
- [x] `npm test`, `npm run build`, `git diff --check` and browser verification pass.

## Phase 1C-B completion record

- Added the data-driven `SETTLEMENT_HUB_CONSEQUENCES` registry for Hub-owned mine permits and trader availability.
- Moved second and third mine permits from Skill Tree ranks to the Small Town and City Hub milestones; the existing Skill Tree nodes remain as future coordination knowledge nodes.
- Added Hub-era prerequisites to Farm, Smithing, Houses, Animals and Science build definitions while retaining their knowledge prerequisites.
- Made Build Mode category locks and mine blueprint messaging read the shared prerequisite registry; trader availability now reads Hub authority.
- Made living-entity visibility use the Village Hub era rather than world-rank side effects.
- Added favicon links to the game, staging and model pages and copied the supplied root `favicon.ico` into the repository.
- Added automated coverage for Hub consequences, mine-permit milestones, category gates and Hub-gated living entities. No save schema change or Supabase migration was required.

## Phase 1C-A implementation plan

1. Add one explicit serialized Settlement Hub instance with a level and construction state; make it the only settlement-stage authority.
2. Define Hub level transitions and their XP, population, building, resource and story requirements in one data registry.
3. Reuse the generic builder-backed construction queue for the first Hub upgrade, including resource payment, timer, completion reward and builder-slot increase.
4. Add a Hub modal to the production and staging layouts so players can inspect the next stage and why an upgrade is unavailable.
5. Migrate schema 4/5/6 saves conservatively to schema 7 without granting a legacy save an unearned Hub tier.

## Phase 1C-A acceptance criteria

- [x] A fresh save contains a complete level-one Settlement Hub and displays Dwelling.
- [x] Settlement stage labels and stage-index unlock checks read the Hub level, not XP or world rank.
- [x] Hub transitions are data-driven and expose requirements for Settlement XP, population, buildings, resources and story milestones.
- [x] The first Hub upgrade requires the starter mine and configured resources, queues through the shared builder system, consumes its cost, completes after its timer and increases builder capacity.
- [x] Hub upgrades award configured World Power and Settlement Progress only on completion.
- [x] Schema 4/5/6 saves load as schema 7 while retaining existing gameplay data and defaulting Hub authority to Dwelling.
- [x] Production and staging pages expose the same Hub modal and start without application runtime errors.
- [x] `npm test`, `npm run build`, `git diff --check` and browser verification pass.

## Phase 1C-A completion record

- Added `settlementHub`, `population` and `completedStoryMilestones` to the canonical save state.
- Made Hub level the sole settlement-stage authority while retaining Settlement Progress as a prerequisite and progression metric.
- Added the data-driven `SETTLEMENT_HUB_UPGRADES` registry for all planned settlement transitions, with the first transition fully executable.
- Reused generic builder construction for the first Hub upgrade and routed completion through Hub-specific rewards and builder-slot growth.
- Added production/staging Hub triggers and requirement modals; aligned the staging clone's shared modal/mining markup so the common runtime starts cleanly.
- Bumped saves from schema 6 to schema 7. Legacy schema 4/5/6 payloads remain readable and do not receive a free Hub tier.
- Added automated coverage for Hub authority, requirement status, builder-backed upgrade completion, schema migration and stage independence from XP.

## Phase 1B implementation plan

1. Make every serialized world placement a canonical building instance with a level and construction state, while defaulting older placements to level 1 and complete.
2. Add one shared, data-driven building registry for max levels, build/upgrade costs, timers and Settlement Progress rewards.
3. Extend the existing builder-aware construction queue with building build/upgrade target routing, affordability checks and completion effects. Keep existing mine/path placement and mine-specific upgrade UI unchanged until the roadmap's later economy-cleanup work.
4. Surface the persistent mine building level in the existing Mining drawer so the new state is observable without changing the established scene or placement flow.
5. Migrate schema 4 and 5 saves to schema 6, preserving legacy construction timers, placement coordinates, mine runtime state and cloud compatibility.

## Phase 1B acceptance criteria

- [x] Every placed structure persists as a level 1+ building instance with an explicit complete/building/upgrading state.
- [x] Building upgrade definitions, costs, durations and rewards are data-driven and shared by the construction API.
- [x] A building upgrade checks and deducts its configured resources, occupies one builder, supports queued contention and completes after its timer.
- [x] Completing an upgrade raises only the targeted building's level, returns the builder and awards the configured Settlement Progress.
- [x] Schema 4 and schema 5 saves load into schema 6 with legacy placements and construction projects preserved.
- [x] Mine/path placement, one-cart behavior, responsive UI, local saves and Supabase save compatibility remain intact.
- [x] `npm test`, `npm run build`, `git diff --check` and browser verification pass.

## Phase 1B completion record

- Added canonical `level` and `constructionState` fields to every persisted placement, with legacy defaults and max-level sanitization.
- Added the shared `BUILDING_DEFINITIONS` registry for building costs, upgrade costs, timers and Settlement Progress rewards.
- Added builder-backed generic building construction and targeted building upgrade APIs, including resource affordability, queued contention, timer completion and per-instance level changes.
- Extended construction projects with a persisted duration so different registry timers survive save/load and builder reassignment.
- Bumped saves from schema 5 to schema 6. Schema 4 and schema 5 local/cloud payloads remain readable; legacy placement and construction data are normalized without resetting gameplay.
- Added the active mine's persistent building level to the Mining drawer.
- Added automated coverage for building instances, build/upgrade routing, costs, timers, builder contention and schema 5 placement migration.
- Browser-verified the local page at `http://localhost:5174/Minecraft-Idle-Game/`: title, independent drawers, builder indicator, active mine status, cart/ore/storage display and no application runtime errors. The existing favicon request still returns 404.

## Phase 1A acceptance criteria

- [x] A fresh save has exactly one builder slot and a generic construction queue.
- [x] Existing expansion actions still queue, complete, award Settlement Progress and expand the world as before.
- [x] A second project queues when the builder is occupied and starts when the builder is released.
- [x] Construction timers resume correctly from saved timestamps, including offline elapsed time.
- [x] Schema 4 saves load successfully into schema 5 without losing existing gameplay state.
- [x] Local saves and Supabase-loaded legacy saves remain compatible; no secret key or RLS change is introduced.
- [x] Builder availability is visible in the existing game UI.
- [x] Existing placement, mine/path, one-cart and responsive UI tests remain green.
- [x] `npm test`, `npm run build`, `git diff --check` and browser smoke verification pass.

## Phase 1A completion record

- Added `builderSlots` to fresh/restored state, defaulting to one.
- Construction projects now carry stable IDs, action, target kind/id, builder assignment and resource-cost metadata.
- The existing expansion helpers still apply their original world effects, while projects are assigned/released through the builder-aware queue.
- Schema 4 local and cloud payloads are accepted and normalized to schema 5. No destructive reset or Supabase schema change was performed.
- Added tests covering fresh builder state, builder contention/release and legacy project migration.
- Browser smoke verified the fresh game title, builder indicator (`Builders 0/1`), independent Build/Mining toggles, desktop and compact viewport placement, and zero runtime console errors after reload. The only initial console entry was the existing missing `/favicon.ico` request.
