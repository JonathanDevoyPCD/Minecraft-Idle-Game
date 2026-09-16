import { describe, expect, it } from 'vitest';
import { addSettlementProgress, addXp, advanceMineOperations, BLOCK_PROGRESSION, buildPathCell, buyMineStorageUpgrade, buyMineUpgrade, buySkillNode, buySpeedUpgrade, buyToolUpgrade, buyWorldExpansion, calculateOfflineXp, canBuildPathCell, canMoveWorldPlacement, canPlaceMine, canPlaceWorldPlacement, collectOreBonus, completeConstructionProjects, CONSTRUCTION_DURATIONS_MS, createWorldPlacement, debugUnlockFullSkillTree, destroyWorldPlacement, DIRT_PATH_BUILD_COST, dispatchMineCart, expandToFirstAdjacentCell, expandToSurface3x3, freshState, getActiveBuilderCount, getAvailableBuilderSlots, getAutoRate, getAvailableMineSites, getBuildItemUnlockStatus, getBuildingUpgradeCost, getBuilderSlotCount, getContextTool, getHarvestPower, getLivingEntityPlan, getMeadowFeaturePlan, getMineCargoKind, getMineCartCount, getMineEmeraldChance, getMineSiteCapacity, getMineStorageCapacity, getMineStorageFillDuration, getMineStorageFillState, getMineStorageUpgradeCost, getMineTripDuration, getMiningStats, getNextBlockType, getNextSettlementStage, getSettlementStage, getStableBlockType, harvestResource, loadState, MINE_STORAGE_BASE_FILL_DURATION_MS, MINE_TRIP_DURATION_MS, moveWorldPlacement, placeWorldPlacement, queueBuildingConstruction, queueBuildingUpgrade, queueConstruction, SETTLEMENT_STAGES, STARTING_CHUNK_SIZE, unlockStarterMine, upgradePathCell, xpRequired } from './game';
import { SKILL_TREE_NODES } from './skill-tree';

describe('Villagers - Idle World Game progression', () => {
  it('uses the intended early level curve', () => {
    expect([1, 2, 3].map(xpRequired)).toEqual([100, 250, 400]);
  });

  it('levels up and carries excess XP', () => {
    const state = freshState();
    expect(addXp(state, 110)).toBe(1);
    expect(state).toMatchObject({ level: 2, xp: 10, totalXp: 110, craftingPoints: 1 });
  });

  it('spends a crafting point on auto speed', () => {
    const state = freshState();
    addXp(state, 100);
    expect(buySpeedUpgrade(state)).toBe(true);
    expect(getAutoRate(state)).toBe(1.5);
  });

  it('routes tree purchases into the existing speed system', () => {
    const state = freshState();
    addXp(state, 350);
    expect(buySkillNode(state, 'branch-entry-automation')).toBe(true);
    expect(buySkillNode(state, 'automation-auto-strike')).toBe(true);
    expect(state.skillRanks['automation-auto-strike']).toBe(1);
    expect(state.speedRank).toBe(1);
    expect(getAutoRate(state)).toBe(1.5);
  });

  it('debug unlocks the full skill tree and its derived mine systems', () => {
    const state = freshState(1000);
    debugUnlockFullSkillTree(state, 1000);

    expect(Object.keys(state.skillRanks)).toHaveLength(SKILL_TREE_NODES.length);
    expect(SKILL_TREE_NODES.every((node) => state.skillRanks[node.id] === node.maxRank)).toBe(true);
    expect(state.toolRank).toBe(3);
    expect(state.undergroundLayer).toBe(2);
    expect(state.mines).toHaveLength(1);
    expect(getAvailableMineSites(state)).toBe(2);
  });

  it('unlocks a wooden pickaxe and increases harvest power', () => {
    const state = freshState();
    addXp(state, 100);
    expect(buyToolUpgrade(state)).toBe(true);
    expect(state.toolRank).toBe(1);
    expect(getHarvestPower(state)).toBe(2);
  });

  it('selects the right tool form for each block family', () => {
    const state = freshState();
    expect(getContextTool(state, 'grass').name).toBe('Hand');
    addXp(state, 100);
    buyToolUpgrade(state);
    expect(getContextTool(state, 'grass').name).toBe('Wooden Shovel');
    expect(getContextTool(state, 'stone').name).toBe('Wooden Pickaxe');
  });

  it('keeps tool-family unlocks independent in the skill tree', () => {
    const state = freshState();
    addXp(state, 750);
    expect(buySkillNode(state, 'branch-entry-tools-crafting')).toBe(true);
    expect(buySkillNode(state, 'tools-tool-bench')).toBe(true);
    expect(buySkillNode(state, 'tools-wooden-pickaxe')).toBe(true);
    expect(getContextTool(state, 'stone').name).toBe('Wooden Pickaxe');
    expect(getContextTool(state, 'grass').name).toBe('Hand');
  });

  it('keeps harvested resources independent by block type', () => {
    const state = freshState();
    harvestResource(state, 'dirt');
    harvestResource(state, 'stone', 2);
    expect(state.resources).toEqual({ dirt: 1, cobblestone: 2 });
  });

  it('advances each broken block through the dirt, grass, and cobblestone sequence', () => {
    expect(BLOCK_PROGRESSION).toEqual(['dirt', 'grass', 'stone']);
    expect(getNextBlockType('dirt')).toBe('grass');
    expect(getNextBlockType('grass')).toBe('stone');
    expect(getNextBlockType('stone')).toBe('stone');
    expect(getNextBlockType('deepslate')).toBe('deepslate');
  });

  it('keeps authored terrain stable when a harvested block respawns', () => {
    expect(getStableBlockType('grass')).toBe('grass');
    expect(getStableBlockType('grass', { stableType: 'grass' })).toBe('grass');
    expect(getStableBlockType('stone', { stableType: 'deepslate' })).toBe('deepslate');
  });

  it('uses harder mining times for cobblestone and improves with a pickaxe', () => {
    const state = freshState();
    const handStone = getMiningStats(state, 'stone');
    addXp(state, 100);
    buyToolUpgrade(state);
    const woodenStone = getMiningStats(state, 'stone');
    expect(handStone.breakTimeSeconds).toBeGreaterThan(woodenStone.breakTimeSeconds);
    expect(handStone.maxDamage).toBeGreaterThan(getMiningStats(state, 'dirt').maxDamage);
  });

  it('preserves independent block progress and replacement timers in saves', () => {
    const saved = { ...freshState(1000), blockProgress: {
      'block-0-0-0-core': { type: 'stone' as const, damage: 7, replacementAt: 12000 },
    } };
    const storage = { getItem: () => JSON.stringify(saved) } as unknown as Storage;
    expect(loadState(storage, 2000).blockProgress['block-0-0-0-core']).toEqual(saved.blockProgress['block-0-0-0-core']);
  });

  it('starts on a procedural 7×7 chunk with a three-tile path line and one free mine site', () => {
    const state = freshState();
    expect(state.schemaVersion).toBe(6);
    expect(getBuilderSlotCount(state)).toBe(1);
    expect(getActiveBuilderCount(state)).toBe(0);
    expect(getAvailableBuilderSlots(state)).toBe(1);
    expect(state.chunkSize).toBe(STARTING_CHUNK_SIZE);
    expect(state.worldCells).toHaveLength(49);
    expect(state.pathCells.map((cell) => `${cell.x},${cell.z}`)).toEqual(['0,3', '1,3', '2,3']);
    expect(state.availableMineSites).toBe(1);
  });

  it('requires a mine footprint to stay inside the chunk and point its rail end directly at a path', () => {
    const state = freshState();
    expect(canPlaceMine(state, 0, -1, 'south')).toBe(true);
    expect(canPlaceMine(state, -2, 1, 'east')).toBe(false);
    expect(canPlaceMine(state, 0, 0, 'south')).toBe(false);
    expect(canPlaceMine(state, -2, -2, 'north')).toBe(false);
    expect(unlockStarterMine(state, 1000, 0, -1, 'south')).toBe(true);
    expect(state.availableMineSites).toBe(0);
    expect(unlockStarterMine(state, 1000, 1, -1, 'west')).toBe(false);
  });

  it('supports short, medium, and long rails when their terminal faces a path', () => {
    const state = freshState();
    expect(canPlaceMine(state, 0, 1, 'south', 2)).toBe(true);
    expect(canPlaceMine(state, 0, 0, 'south', 3)).toBe(true);
    expect(canPlaceMine(state, 0, -1, 'south', 4)).toBe(true);
    expect(unlockStarterMine(state, 1000, 0, 1, 'south', 2)).toBe(true);
    expect(state.mines[0].railLength).toBe(2);
    expect(state.placements.find((placement) => placement.id === 'starter-mine')?.depth).toBe(2);
  });

  it('supports three independent mine sites and adds one slot per settlement stage', () => {
    const state = freshState();
    state.skillRanks = { 'world-cave-entrance': 1, 'world-second-mine-site': 1, 'world-third-mine-site': 1 };
    expect(getMineSiteCapacity(state)).toBe(3);
    expect(getAvailableMineSites(state)).toBe(3);
    expect(unlockStarterMine(state, 1000, 0, 1, 'south', 2)).toBe(true);
    expect(unlockStarterMine(state, 1000, 1, -1, 'south', 4)).toBe(true);
    expect(unlockStarterMine(state, 1000, 2, -1, 'south', 4)).toBe(true);
    expect(state.mines.map((mine) => mine.id)).toEqual(['starter-mine', 'mine-2', 'mine-3']);
    expect(getAvailableMineSites(state)).toBe(0);
    state.worldRank = 1;
    addSettlementProgress(state, 500);
    expect(getSettlementStage(state).id).toBe('hamlet');
    expect(getMineSiteCapacity(state)).toBe(4);
    expect(getAvailableMineSites(state)).toBe(1);
  });

  it('reports build prerequisites from the shared unlock registry', () => {
    const state = freshState();
    expect(getBuildItemUnlockStatus(state, 'mine').unlocked).toBe(false);
    state.skillRanks['world-cave-entrance'] = 1;
    expect(getBuildItemUnlockStatus(state, 'mine').unlocked).toBe(true);
  });

  it('uses one collision rule for path-facing structures', () => {
    const state = freshState();
    const dwelling = createWorldPlacement('dwelling', 'dwelling-1', 1, 1, 'south');
    expect(canPlaceWorldPlacement(state, dwelling)).toBe(true);
    expect(placeWorldPlacement(state, dwelling)).toBe(true);
    expect(canPlaceWorldPlacement(state, createWorldPlacement('well', 'well-1', 1, 1, 'south'))).toBe(false);
    expect(canPlaceWorldPlacement(state, createWorldPlacement('dwelling', 'dwelling-2', 1, 2, 'south'))).toBe(false);
  });

  it('stores every placed structure as a complete level-one building instance', () => {
    const state = freshState();
    const dwelling = createWorldPlacement('dwelling', 'dwelling-1', 1, 1, 'south');
    expect(placeWorldPlacement(state, dwelling)).toBe(true);
    expect(state.placements[0]).toMatchObject({ level: 1, constructionState: 'complete' });
  });

  it('routes a new building through the shared build project and timer', () => {
    const state = freshState();
    const dwelling = createWorldPlacement('dwelling', 'dwelling-1', 1, 1, 'south');
    state.resources.dirt = 10;
    const now = 1_000;
    expect(queueBuildingConstruction(state, dwelling, now)).toBe(true);
    expect(state.resources.dirt).toBe(0);
    expect(state.placements[0]).toMatchObject({ level: 1, constructionState: 'building' });
    expect(state.constructionQueue[0]).toMatchObject({ action: 'build', targetKind: 'building', targetId: dwelling.id, durationMs: 10_000 });
    expect(completeConstructionProjects(state, now + 10_000)).toHaveLength(1);
    expect(state.placements[0]).toMatchObject({ level: 1, constructionState: 'complete' });
    expect(state.settlementProgress).toBe(100);
  });

  it('queues a data-driven building upgrade, deducts its cost, and completes it', () => {
    const state = freshState();
    const dwelling = createWorldPlacement('dwelling', 'dwelling-1', 1, 1, 'south');
    expect(placeWorldPlacement(state, dwelling)).toBe(true);
    state.resources.cobblestone = 40;
    const now = 2_000;

    expect(getBuildingUpgradeCost(state, dwelling.id)).toEqual({ cobblestone: 40 });
    expect(queueBuildingUpgrade(state, dwelling.id, now)).toBe(true);
    expect(state.resources.cobblestone).toBe(0);
    expect(state.placements[0]).toMatchObject({ level: 1, constructionState: 'upgrading' });
    expect(state.constructionQueue[0]).toMatchObject({
      action: 'upgrade', targetKind: 'building', targetId: dwelling.id, builderId: 'builder-1', durationMs: 15_000,
    });

    expect(completeConstructionProjects(state, now + 14_999)).toHaveLength(0);
    expect(completeConstructionProjects(state, now + 15_000)).toHaveLength(1);
    expect(state.placements[0]).toMatchObject({ level: 2, constructionState: 'complete' });
    expect(state.settlementProgress).toBe(50);
    expect(getActiveBuilderCount(state)).toBe(0);
    expect(queueBuildingUpgrade(state, dwelling.id, now + 15_001)).toBe(false);
  });

  it('keeps building upgrades queued independently when the builder is busy', () => {
    const state = freshState();
    const first = createWorldPlacement('dwelling', 'dwelling-1', 1, 1, 'south');
    const second = createWorldPlacement('dwelling', 'dwelling-2', -1, 1, 'south');
    expect(placeWorldPlacement(state, first)).toBe(true);
    expect(placeWorldPlacement(state, second)).toBe(true);
    state.resources.cobblestone = 80;
    const now = 3_000;
    expect(queueBuildingUpgrade(state, first.id, now)).toBe(true);
    expect(queueBuildingUpgrade(state, second.id, now + 1)).toBe(true);
    expect(state.constructionQueue[1]).toMatchObject({ targetId: second.id, builderId: null, startedAt: 0, completesAt: 0 });

    completeConstructionProjects(state, now + 15_000);
    expect(state.constructionQueue[0]).toMatchObject({ targetId: second.id, builderId: 'builder-1', startedAt: now + 15_000 });
    completeConstructionProjects(state, now + 30_000);
    expect(state.placements.map((placement) => placement.level)).toEqual([2, 2]);
  });

  it('moves and destroys a mine without resetting its runtime state', () => {
    const state = freshState();
    expect(unlockStarterMine(state, 1000, 0, -1, 'south', 4)).toBe(true);
    state.mines[0].progressMs = 1234;
    state.mines[0].completedTrips = 7;
    expect(canMoveWorldPlacement(state, 'starter-mine', 0, 0, 'south')).toBe(false);
    expect(canMoveWorldPlacement(state, 'starter-mine', 0, -1, 'south')).toBe(true);
    expect(moveWorldPlacement(state, 'starter-mine', 0, -1, 'south')).toBe(true);
    expect(state.mines[0]).toMatchObject({ progressMs: 1234, completedTrips: 7, x: 0, z: -1 });
    expect(destroyWorldPlacement(state, 'starter-mine')).toBe(true);
    expect(state.mines).toHaveLength(0);
    expect(state.placements).toHaveLength(0);
    expect(getAvailableMineSites(state)).toBe(1);
  });

  it('upgrades path tiles independently', () => {
    const state = freshState();
    state.resources.cobblestone = 8;
    expect(upgradePathCell(state, 0, 3)).toBe(true);
    expect(state.pathCells.find((cell) => cell.x === 0 && cell.z === 3)?.tier).toBe('cobblestone');
    expect(state.resources.cobblestone).toBe(0);
    expect(upgradePathCell(state, 0, 2)).toBe(false);
    expect(upgradePathCell(state, 0, -1)).toBe(false);
  });

  it('builds connected dirt paths one tile at a time without occupying structures', () => {
    const state = freshState();
    state.resources.dirt = DIRT_PATH_BUILD_COST;
    expect(canBuildPathCell(state, 0, 2)).toBe(true);
    expect(canBuildPathCell(state, -2, -2)).toBe(false);
    expect(buildPathCell(state, 0, 2)).toBe(true);
    expect(state.pathCells.find((cell) => cell.x === 0 && cell.z === 2)?.tier).toBe('dirt');
    expect(state.resources.dirt).toBe(0);
    expect(buildPathCell(state, -1, 2)).toBe(false);
    const dwelling = createWorldPlacement('dwelling', 'dwelling-1', 1, 1, 'south');
    expect(placeWorldPlacement(state, dwelling)).toBe(true);
    state.resources.dirt = DIRT_PATH_BUILD_COST;
    expect(canBuildPathCell(state, 1, 1)).toBe(false);
  });

  it('expands the world after the first growth milestone', () => {
    const state = freshState();
    addXp(state, 350);
    expect(state.level).toBe(3);
    const now = 1000;
    expect(buyWorldExpansion(state, 'north', now)).toBe(true);
    expect(state.worldRank).toBe(0);
    expect(state.constructionQueue[0]).toMatchObject({ kind: 'chunk-upgrade', startedAt: now, completesAt: now + CONSTRUCTION_DURATIONS_MS['chunk-upgrade'] });
    expect(completeConstructionProjects(state, now + CONSTRUCTION_DURATIONS_MS['chunk-upgrade'] - 1)).toHaveLength(0);
    expect(completeConstructionProjects(state, now + CONSTRUCTION_DURATIONS_MS['chunk-upgrade'])).toHaveLength(1);
    expect(state.worldRank).toBe(1);
    expect(state.chunkSize).toBe(9);
    expect(state.worldCells).toHaveLength(81);
    expect(state.craftingPoints).toBe(1);
    expect(state.settlementProgress).toBe(400);
  });

  it('assigns one builder and starts queued projects when the builder is released', () => {
    const state = freshState();
    const now = 1_000;
    expect(queueConstruction(state, 'adjacent-cell', now, 'north')).toBe(true);
    expect(queueConstruction(state, 'surface-3x3', now, 'east')).toBe(true);
    expect(getActiveBuilderCount(state)).toBe(1);
    expect(getAvailableBuilderSlots(state)).toBe(0);
    expect(state.constructionQueue[0]).toMatchObject({ action: 'expand', targetKind: 'world', builderId: 'builder-1', cost: {} });
    expect(state.constructionQueue[1]).toMatchObject({ action: 'expand', targetKind: 'world', builderId: null, startedAt: 0, completesAt: 0 });

    expect(completeConstructionProjects(state, now + CONSTRUCTION_DURATIONS_MS['adjacent-cell'])).toHaveLength(1);
    expect(state.constructionQueue[0].builderId).toBe('builder-1');
    expect(state.constructionQueue[0].startedAt).toBe(now + CONSTRUCTION_DURATIONS_MS['adjacent-cell']);
    expect(completeConstructionProjects(state, now + CONSTRUCTION_DURATIONS_MS['adjacent-cell'] + CONSTRUCTION_DURATIONS_MS['surface-3x3'])).toHaveLength(1);
    expect(getActiveBuilderCount(state)).toBe(0);
  });

  it('progresses through deliberately spaced settlement stages', () => {
    const state = freshState();
    expect(SETTLEMENT_STAGES.map((stage) => stage.requiredProgress)).toEqual([0, 500, 2_000, 7_500, 25_000, 75_000, 200_000, 500_000]);
    expect(getSettlementStage(state).name).toBe('Dwelling');
    expect(getNextSettlementStage(state)?.name).toBe('Hamlet');
    state.worldRank = 1;
    addSettlementProgress(state, 500);
    expect(getSettlementStage(state).name).toBe('Hamlet');
    expect(getNextSettlementStage(state)?.name).toBe('Village');
    state.worldRank = 2;
    addSettlementProgress(state, 1_500);
    expect(getSettlementStage(state).name).toBe('Village');
  });

  it('does not advance settlement progress from mine output alone', () => {
    const state = freshState(1000);
    unlockStarterMine(state, 1000);
    advanceMineOperations(state, 1000 + MINE_TRIP_DURATION_MS);
    expect(state.settlementProgress).toBe(0);
  });

  it('grows surface cells in deliberate stages', () => {
    const state = freshState();
    expect(state.worldCells).toHaveLength(49);
    expandToFirstAdjacentCell(state);
    expect(state.worldCells).toHaveLength(81);
    expect(state.worldCells).toContainEqual({ x: 0, z: -1, biome: 'meadow' });
    expandToSurface3x3(state);
    expect(state.worldCells).toHaveLength(121);
  });

  it('uses World Power for the major surface expansion', () => {
    const state = freshState();
    addXp(state, 750);
    expect(buySkillNode(state, 'branch-entry-world-growth-biomes')).toBe(true);
    expect(buySkillNode(state, 'world-adjacent-block')).toBe(true);
    expect(state).toMatchObject({ worldRank: 0, worldPower: 1, craftingPoints: 1 });
    const now = Date.now();
    completeConstructionProjects(state, now + CONSTRUCTION_DURATIONS_MS['adjacent-cell']);
    expect(buySkillNode(state, 'world-surface-3x3')).toBe(true);
    expect(state).toMatchObject({ worldRank: 0, worldPower: 0, craftingPoints: 0 });
    completeConstructionProjects(state, now + 1 + CONSTRUCTION_DURATIONS_MS['chunk-upgrade']);
    expect(state.worldRank).toBe(1);
    expect(state.chunkSize).toBe(9);
  });

  it('queues the 9×9 build after perimeter planning', () => {
    const state = freshState();
    state.craftingPoints = 3;
    state.skillRanks = { 'branch-entry-world-growth-biomes': 1 };
    const now = 5000;
    expect(buySkillNode(state, 'world-adjacent-block', now)).toBe(true);
    expect(buySkillNode(state, 'world-surface-3x3', now + 1)).toBe(true);
    expect(state.worldCells).toHaveLength(49);
    expect(state.constructionQueue).toHaveLength(1);
    expect(state.constructionQueue[0].startedAt).toBe(now + 1);
    completeConstructionProjects(state, now + 1 + CONSTRUCTION_DURATIONS_MS['chunk-upgrade']);
    expect(state.worldCells).toHaveLength(81);
  });

  it('opens the deepslate layer through the world-growth node', () => {
    const state = freshState();
    state.worldRank = 2;
    state.worldCells = Array.from({ length: 9 }, (_, index) => ({
      x: (index % 3) - 1,
      z: Math.floor(index / 3) - 1,
      biome: 'meadow' as const,
    }));
    state.craftingPoints = 1;
    state.skillRanks = {
      'world-surface-3x3': 1,
      'materials-stone': 1,
    };
    expect(buySkillNode(state, 'world-underground-layer')).toBe(true);
    expect(state.undergroundLayer).toBe(1);
  });

  it('migrates prototype upgrade counters into stable tree nodes', () => {
    const storage = {
      getItem: () => JSON.stringify({
        schemaVersion: 4,
        level: 6,
        xp: 0,
        totalXp: 900,
        craftingPoints: 2,
        speedRank: 2,
        toolRank: 1,
        worldRank: 1,
        worldSeed: 99,
        expansionDirections: [],
        resources: { dirt: 4, cobblestone: 2 },
        lastSavedAt: 0,
      }),
    } as unknown as Storage;
    const state = loadState(storage, 1000);
    expect(state).toMatchObject({ schemaVersion: 6, worldRank: 1, worldPower: 1, chunkSize: 7, builderSlots: 1 });
    expect(state.skillRanks).toMatchObject({ 'automation-auto-strike': 2, 'tools-tool-bench': 1 });
  });

  it('migrates schema 4 expansion projects into generic builder projects', () => {
    const saved = {
      ...freshState(0),
      schemaVersion: 4,
      constructionQueue: [{ kind: 'adjacent-cell', startedAt: 1000, completesAt: 11000, direction: 'north' }],
    };
    const storage = { getItem: () => JSON.stringify(saved) } as unknown as Storage;
    const state = loadState(storage, 2000);
    expect(state.schemaVersion).toBe(6);
    expect(state.constructionQueue[0]).toMatchObject({ action: 'expand', targetKind: 'world', targetId: 'adjacent-cell-north', builderId: 'builder-1', cost: {} });
    expect(state.constructionQueue[0].completesAt).toBe(11000);
  });

  it('migrates schema 5 placements without building metadata into complete level-one instances', () => {
    const placement = createWorldPlacement('dwelling', 'dwelling-1', 1, 1, 'south');
    const saved = { ...freshState(0), schemaVersion: 5, placements: [{ ...placement, level: undefined, constructionState: undefined }] };
    const storage = { getItem: () => JSON.stringify(saved) } as unknown as Storage;
    const state = loadState(storage, 1000);
    expect(state.schemaVersion).toBe(6);
    expect(state.placements[0]).toMatchObject({ id: placement.id, level: 1, constructionState: 'complete' });
  });

  it('preserves a spent World Power balance when loading a current save', () => {
    const storage = {
      getItem: () => JSON.stringify({ ...freshState(0), worldRank: 2, worldPower: 0 }),
    } as unknown as Storage;
    expect(loadState(storage, 1000).worldPower).toBe(0);
  });

  it('migrates old expanded saves into settlement growth', () => {
    const storage = {
      getItem: () => JSON.stringify({ ...freshState(0), settlementProgress: undefined, worldRank: 2, worldCells: undefined }),
    } as unknown as Storage;
    expect(loadState(storage, 1000).settlementProgress).toBe(500);
  });

  it('keeps the first meadow feature layout deterministic per world seed', () => {
    expect(getMeadowFeaturePlan(184731)).toEqual(getMeadowFeaturePlan(184731));
    const plan = getMeadowFeaturePlan(184731);
    expect(plan.filter((feature) => feature.kind === 'tree')).toHaveLength(2);
    expect(plan.find((feature) => feature.kind === 'dwelling')).toMatchObject({ x: -0.55, z: -0.55 });
    expect(plan.find((feature) => feature.kind === 'farm')).toMatchObject({ x: -0.05, z: 0.95 });
    expect(plan.find((feature) => feature.kind === 'well')).toMatchObject({ x: 0.95, z: 0.95 });
    expect(plan.find((feature) => feature.id === 'path-south')).toMatchObject({ x: 0.49, z: 0.95 });
    expect(plan.filter((feature) => feature.kind === 'tree').every((feature) => feature.x >= -1 && feature.x <= 1 && feature.z >= -1 && feature.z <= 1)).toBe(true);
  });

  it('reveals living entities from the settlement branch', () => {
    const state = freshState();
    expect(getLivingEntityPlan(state)).toHaveLength(0);
    state.worldRank = 2;
    state.skillRanks = { 'life-animals': 1, 'life-first-villager': 1 };
    const entityPlan = getLivingEntityPlan(state);
    expect(entityPlan.map((entity) => entity.kind)).toEqual(['pig', 'cow', 'villager']);
    const animals = entityPlan.filter((entity) => entity.kind !== 'villager');
    expect(animals.every((entity) => entity.x >= -1.35 && entity.x <= 1.35 && entity.z >= -1.35 && entity.z <= 1.35)).toBe(true);
    expect(new Set(animals.map((entity) => `${entity.x},${entity.z}`)).size).toBe(animals.length);
    expect(entityPlan.find((entity) => entity.kind === 'villager')).toMatchObject({ x: 0.35, z: -1.08 });
    state.skillRanks['life-specialist-miner'] = 1;
    expect(getLivingEntityPlan(state).find((entity) => entity.kind === 'villager')?.role).toBe('miner');
  });

  it('migrates legacy expanded saves into coordinate cells', () => {
    const storage = {
      getItem: () => JSON.stringify({ ...freshState(0), worldRank: 1, worldCells: undefined }),
    } as unknown as Storage;
    expect(loadState(storage, 1000).worldCells).toHaveLength(49);
  });

  it('calculates offline gains at half efficiency', () => {
    const state = freshState(0);
    expect(calculateOfflineXp(state, 60_000)).toBe(30);
  });

  it('runs a permanent mine without changing the world cells', () => {
    const state = freshState(1000);
    const originalCells = [...state.worldCells];
    expect(unlockStarterMine(state, 1000)).toBe(true);
    expect(advanceMineOperations(state, 1000 + MINE_TRIP_DURATION_MS / 2)).toMatchObject({ trips: 0, xp: 0 });
    expect(advanceMineOperations(state, 1000 + MINE_TRIP_DURATION_MS - 1)).toMatchObject({ trips: 0, xp: 0 });
    const result = advanceMineOperations(state, 1000 + MINE_TRIP_DURATION_MS);
    expect(result).toMatchObject({ trips: 1, xp: 2, resources: { cobblestone: 1 } });
    expect(state.worldCells).toEqual(originalCells);
    expect(state.mines[0].progressMs).toBe(0);
  });

  it('fills mine storage from the first returning cart and reaches full in twelve minutes', () => {
    const state = freshState(1000);
    unlockStarterMine(state, 1000);
    const mine = state.mines[0];
    expect(getMineStorageCapacity(mine)).toBe(100);
    expect(getMineStorageFillDuration(mine)).toBe(MINE_STORAGE_BASE_FILL_DURATION_MS);
    expect(getMineStorageFillState(0, 100)).toBe('empty');
    expect(getMineStorageFillState(1, 100)).toBe('low');
    expect(getMineStorageFillState(60, 100)).toBe('medium');
    expect(getMineStorageFillState(100, 100)).toBe('full');

    advanceMineOperations(state, 1000 + MINE_TRIP_DURATION_MS);
    expect(mine.storageAmount).toBe(5);
    expect(getMineStorageFillState(mine.storageAmount, getMineStorageCapacity(mine))).toBe('low');

    advanceMineOperations(state, 1000 + MINE_TRIP_DURATION_MS + getMineStorageFillDuration(mine));
    expect(mine.storageAmount).toBe(100);
    expect(getMineStorageFillState(mine.storageAmount, getMineStorageCapacity(mine))).toBe('full');
  });

  it('supports individual mine storage capacity upgrades for one Emerald', () => {
    const state = freshState(1000);
    unlockStarterMine(state, 1000);
    state.resources.emerald = 1;
    const mine = state.mines[0];
    expect(getMineStorageUpgradeCost(state, mine.id)).toBe(1);
    expect(buyMineStorageUpgrade(state, mine.id)).toBe(true);
    expect(state.resources.emerald).toBe(0);
    expect(mine.storageCapacityLevel).toBe(1);
    expect(getMineStorageCapacity(mine)).toBe(200);
  });

  it('loads a saved mine operation', () => {
    const saved = {
      ...freshState(1000),
      worldRank: 2,
      undergroundLayer: 1,
      mines: [{ id: 'starter-mine', x: 0, z: 1, cartCount: 1, storageCarts: 0, railLevel: 0, minerCount: 0, progressMs: 2000, lastUpdatedAt: 1000, completedTrips: 0 }],
    };
    const storage = { getItem: () => JSON.stringify(saved) } as unknown as Storage;
    expect(loadState(storage, 2000).mines).toHaveLength(1);
  });

  it('keeps one cart per mine while keeping bonus ore clickable', () => {
    const state = freshState(1000);
    state.skillRanks = { 'automation-mine-carts': 2 };
    expect(getMineCartCount(state)).toBe(1);
    unlockStarterMine(state, 1000);
    expect(dispatchMineCart(state, 1000)).toMatchObject({ trips: 0, xp: 0 });
    const result = advanceMineOperations(state, 1000 + MINE_TRIP_DURATION_MS);
    expect(result.trips).toBe(1);
    expect(state.resources.cobblestone).toBe(1);
    expect(state.mines[0].cartCount).toBe(1);
    expect(state.mines[0].storageCarts).toBe(0);
    expect(collectOreBonus(state, 'diamond')).toBe(1);
    expect(state.resources.diamond).toBe(1);
    expect(dispatchMineCart(state, 1000).trips).toBe(0);
  });

  it('keeps Mining-menu upgrades separate and pays for them with Emeralds', () => {
    const state = freshState(1000);
    expect(getMineEmeraldChance(state)).toBeCloseTo(0.0008);
    expect(buyMineUpgrade(state, 'rail-speed')).toBe(false);
    unlockStarterMine(state, 1000);
    state.resources.emerald = 13;
    const baseDuration = getMineTripDuration(state);
    expect(buyMineUpgrade(state, 'rail-speed')).toBe(true);
    expect(state.resources.emerald).toBe(8);
    expect(getMineTripDuration(state)).toBeLessThan(baseDuration);
    expect(buyMineUpgrade(state, 'storage-capacity')).toBe(true);
    expect(getMineCartCount(state)).toBe(1);
    expect(state.resources.emerald).toBe(0);
  });

  it('can award the level-one Emerald chance when a cart delivers', () => {
    const state = freshState(1000);
    unlockStarterMine(state, 1000);
    const result = advanceMineOperations(state, 1000 + MINE_TRIP_DURATION_MS, () => 0);
    expect(result.resources.emerald).toBe(1);
    expect(state.resources.emerald).toBe(1);
  });

  it('shows the deepest unlocked material in returning minecart cargo', () => {
    const state = freshState();
    expect(getMineCargoKind(state)).toBe('stone');
    state.undergroundLayer = 1;
    state.skillRanks = { 'materials-coal': 1, 'materials-iron': 1 };
    expect(getMineCargoKind(state)).toBe('iron');
    state.undergroundLayer = 2;
    state.skillRanks['materials-gold'] = 1;
    expect(getMineCargoKind(state)).toBe('gold');
    state.skillRanks['materials-diamond'] = 1;
    expect(getMineCargoKind(state)).toBe('diamond');
  });
});
