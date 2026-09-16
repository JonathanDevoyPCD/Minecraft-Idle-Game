# Roadmap Implementation Status

## Authority

- Design source of truth: `GAME_DESIGN_ROADMAP.md`
- Repository working rules: `AGENTS.md`

## Current Phase

**Phase 2 — Economy Cleanup**

Status: Phase 2B in progress; Phase 2B-C complete.

## Current Sub-Phase

**Phase 2B-C - Increasing Crafting Point rank costs**

Status: Complete; Phase 2B-D is next.

## Current-repo audit

| Area | Retain | Migrate | Replace later in Phase 1 |
|---|---|---|---|
| Game state | Flat state object, deterministic world cells, mine/path records, local and cloud save entry points | Add explicit Settlement Hub instance, level and prerequisite progress; add Settlement Storage level | Add population and production systems in later Phase 1 slices |
| Save schema | `loadState` sanitisation, timestamped local save, Supabase row ownership/RLS | Backward-compatible schema 4/5/6/7 to schema 8 normalization, including Hub and storage authority | Add migrations for remaining Hub requirements as those systems land |
| Construction | Existing completion effects for world expansion and offline timestamps | Generalize projects with action, target, builder and cost metadata; preserve expansion kinds as compatibility/effect identifiers | Move all physical build/upgrade/expand actions onto the generic project model |
| Placement | Integer grid, footprints, collision, path connection, mine/path relationship and one-cart rule | Normalize placement records into levelled, stateful building instances | Route normal placement through builder-backed construction |
| Settlement | Settlement Progress remains the earned development metric; existing visual stage labels remain | Hub level is now the sole settlement-stage authority; requirements, upgrade queue and current-era consequences are data-driven | Add storage/population production requirements and deeper Hub consequences in later slices |
| Resources/UI | Existing resource inventory, Mining/Build drawers, responsive HUD and visuals | Add one global storage summary to the existing resource brief/modal | Add broader next-goal UI and storage upgrade controls in later Phase 1D slices |
| Tests | Vitest game, skill-tree and geometry coverage | Add Hub authority, requirements, builder construction, save migration and storage transfer tests | Add remaining population prerequisite tests with later slices |

The current code now has one serialized generic `constructionQueue` with builder assignment, capacity, target/action/cost/duration metadata and compatibility expansion kinds. `WorldPlacement` is the persistent structure record and now carries level and construction state. Settlement stages are now derived solely from the serialized Settlement Hub level; Settlement Progress remains a requirement and development metric rather than a second stage authority. Current-era mine permits, trader availability, later build-category gates and living-entity visibility are derived from the Hub consequence registry without adding save fields. Mine output and the current one-cart mine/path visuals are outside this slice and remain unchanged.

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

Current schema version: 8.

Schema 4, schema 5, schema 6 and schema 7 saves are accepted and normalized into schema 8 on load. Existing world, path, placement, mine, resource, skill and timestamp data is preserved. Legacy placements receive level 1 and complete construction state; legacy projects receive a persisted duration from the construction registry. Legacy saves do not inherit an unearned Hub level; they begin at the Dwelling Hub authority and Storage level 1.

Legacy expansion-only projects are assigned stable IDs, `action: expand`, world targets, no resource cost and an available builder when loaded.

Legacy cloud rows remain readable because the client accepts the previous save version and passes the payload through the same local migration before use. No Supabase table or RLS change is needed.

Fresh schema 8 saves start with a complete level-one Settlement Hub, level-one Settlement Storage (500 capacity), zero population/story milestones, one builder slot and no active projects.

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

## Next Work

Next incomplete roadmap sub-phase: Phase 2B-D — Conservative migration of remaining purchased material/branch ranks.

Phase 1 is complete. Phase 2 has been split into coherent cleanup slices; Phase 2A, 2B-A, 2B-B and 2B-C are complete and pushed.

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
