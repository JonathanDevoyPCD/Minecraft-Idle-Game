import { describe, expect, it } from 'vitest';
import { syncAutomaticSkillNodes } from './game';
import { addSettlementProgress, addSettlementResource, addXp, advanceMineOperations, BLOCK_PROGRESSION, buildPathCell, buyMineStorageUpgrade, buyMineUpgrade, buySkillNode, calculateOfflineXp, canAffordSkillNode, canBuildPathCell, canMoveWorldPlacement, canPlaceMine, canPlaceWorldPlacement, collectOreBonus, completeConstructionProjects, CONSTRUCTION_DURATIONS_MS, createWorldPlacement, debugUnlockFullSkillTree, destroyWorldPlacement, DIRT_PATH_BUILD_COST, dispatchMineCart, expandToFirstAdjacentCell, expandToSurface3x3, freshState, generateMineCartCargo, getActiveBuilderCount, getAvailableBuilderSlots, getAutoRate, getAvailableMineSites, getAvailableSettlementStorage, getBuildItemUnlockStatus, getBuildingUpgradeCost, getBuilderSlotCount, getContextTool, getLivingEntityPlan, getMeadowFeaturePlan, getMineCartCapacity, getMineCartCount, getMineCartTravelState, getMineEmeraldChance, getMineProductionDefinition, getMineProductionTier, getMineSiteCapacity, getMineStorageCapacity, getMineStorageFillState, getMineStorageUpgradeCost, getMineTripDuration, getMiningStats, getNextBlockType, getNextSettlementStage, getSettlementHubConsequences, getSettlementHubUpgradeStatus, getSettlementNextGoal, getSettlementStage, getSettlementStorageCapacity, getSettlementStorageUpgrade, getSettlementStorageUpgradeStatus, getStableBlockType, getStoredResourceTotal, getTool, harvestResource, isTraderUnlocked, loadState, MINE_PRODUCTION_TABLES, MINE_TRIP_DURATION_MS, moveWorldPlacement, placeWorldPlacement, queueBuildingConstruction, queueBuildingUpgrade, queueConstruction, queueSettlementHubUpgrade, queueSettlementStorageUpgrade, reconcileElapsedProgress, selectWeightedMineResource, SETTLEMENT_HUB_UPGRADES, SETTLEMENT_STAGES, SETTLEMENT_STORAGE_LEVELS, STARTING_CHUNK_SIZE, syncDiscoveredSkillNodes, transferResourcesToSettlement, unlockStarterMine, upgradePathCell, xpRequired } from './game';
import { SKILL_TREE_NODES, WORLD_POWER_EXPANSION_NODE_IDS } from './skill-tree';
import { collectMineStorage, getMineStorageAmount } from './game';

describe('Villagers - Idle World Game progression', () => {
  it('uses the intended early level curve', () => {
    expect([1, 2, 3].map(xpRequired)).toEqual([100, 250, 400]);
  });

  it('discovers material nodes from world conditions without spending Crafting Points', () => {
    const state = freshState();
    state.settlementHub.level = 4;
    syncAutomaticSkillNodes(state);
    state.craftingPoints = 1;
    expect(state.skillRanks['branch-entry-materials-deep-mining']).toBe(1);
    expect(state.skillRanks['materials-dirt-grass']).toBe(1);
    expect(buySkillNode(state, 'materials-dirt-grass')).toBe(false);
    unlockStarterMine(state);
    expect(state.skillRanks['materials-stone']).toBe(1);
    expect(state.skillRanks['materials-coal']).toBeUndefined();
    state.skillRanks['tools-wooden-pickaxe'] = 1;
    syncDiscoveredSkillNodes(state);
    expect(state.skillRanks['materials-coal']).toBe(1);
    expect(state.skillRanks['materials-copper']).toBe(1);
    expect(state.craftingPoints).toBe(1);
  });

  it('unlocks Skill Tree branches from Settlement Hub milestones for free', () => {
    const state = freshState();
    expect(state.skillRanks['branch-entry-harvesting']).toBe(1);
    expect(state.skillRanks['branch-entry-tools-crafting']).toBe(1);
    expect(state.skillRanks['branch-entry-world-growth-biomes']).toBe(1);
    expect(state.skillRanks['branch-entry-life-settlement']).toBeUndefined();
    expect(state.craftingPoints).toBe(0);
    expect(buySkillNode(state, 'branch-entry-harvesting')).toBe(false);

    state.settlementHub.level = 2;
    syncAutomaticSkillNodes(state);
    expect(state.skillRanks['branch-entry-life-settlement']).toBe(1);
    expect(state.craftingPoints).toBe(0);

    state.settlementHub.level = 3;
    syncAutomaticSkillNodes(state);
    expect(state.skillRanks['branch-entry-automation']).toBe(1);

    state.settlementHub.level = 4;
    syncAutomaticSkillNodes(state);
    expect(state.skillRanks['branch-entry-materials-deep-mining']).toBe(1);

    state.settlementHub.level = 5;
    syncAutomaticSkillNodes(state);
    expect(state.skillRanks['branch-entry-mastery-long-term']).toBe(1);
    expect(state.craftingPoints).toBe(0);
  });

  it('charges increasing Crafting Point costs for rank upgrades', () => {
    const state = freshState();
    state.craftingPoints = 6;

    expect(buySkillNode(state, 'harvesting-bare-hands')).toBe(true);
    expect(state.craftingPoints).toBe(5);
    expect(buySkillNode(state, 'harvesting-bare-hands')).toBe(true);
    expect(state.craftingPoints).toBe(3);
    expect(buySkillNode(state, 'harvesting-bare-hands')).toBe(true);
    expect(state.craftingPoints).toBe(0);
    expect(buySkillNode(state, 'harvesting-bare-hands')).toBe(false);
  });

  it('levels up and carries excess XP', () => {
    const state = freshState();
    expect(addXp(state, 110)).toBe(1);
    expect(state).toMatchObject({ level: 2, xp: 10, totalXp: 110, craftingPoints: 1 });
  });

  it('uses the Skill Tree as the only authority for automatic speed', () => {
    const state = freshState();
    state.speedRank = 4;
    expect(getAutoRate(state)).toBe(1);
    state.settlementHub.level = 3;
    syncAutomaticSkillNodes(state);
    state.craftingPoints = 1;
    expect(buySkillNode(state, 'automation-auto-strike')).toBe(true);
    state.speedRank = 0;
    expect(getAutoRate(state)).toBe(1.5);
  });

  it('routes tree purchases into the existing speed system', () => {
    const state = freshState();
    state.settlementHub.level = 3;
    syncAutomaticSkillNodes(state);
    addXp(state, 350);
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
    expect(getAvailableMineSites(state)).toBe(0);
  });

  it('uses the Skill Tree as the only authority for tool tiers', () => {
    const state = freshState();
    state.toolRank = 3;
    expect(getTool(state).name).toBe('Bare Hands');
    state.craftingPoints = 2;
    expect(buySkillNode(state, 'tools-tool-bench')).toBe(true);
    expect(buySkillNode(state, 'tools-wooden-pickaxe')).toBe(true);
    state.toolRank = 0;
    expect(getTool(state).name).toBe('Wooden Pickaxe');
    expect(getMiningStats(state, 'stone').strikeDamage).toBe(2);
  });

  it('selects the right tool form for each block family', () => {
    const state = freshState();
    expect(getContextTool(state, 'grass').name).toBe('Hand');
    state.craftingPoints = 3;
    buySkillNode(state, 'tools-tool-bench');
    buySkillNode(state, 'tools-wooden-shovel');
    buySkillNode(state, 'tools-wooden-pickaxe');
    expect(getContextTool(state, 'grass').name).toBe('Wooden Shovel');
    expect(getContextTool(state, 'stone').name).toBe('Wooden Pickaxe');
  });

  it('keeps tool-family unlocks independent in the skill tree', () => {
    const state = freshState();
    addXp(state, 750);
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
    state.craftingPoints = 2;
    buySkillNode(state, 'tools-tool-bench');
    buySkillNode(state, 'tools-wooden-pickaxe');
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
    expect(state.schemaVersion).toBe(9);
    expect(getBuilderSlotCount(state)).toBe(1);
    expect(getActiveBuilderCount(state)).toBe(0);
    expect(getAvailableBuilderSlots(state)).toBe(1);
    expect(state.chunkSize).toBe(STARTING_CHUNK_SIZE);
    expect(state.worldCells).toHaveLength(49);
    expect(state.pathCells.map((cell) => `${cell.x},${cell.z}`)).toEqual(['0,3', '1,3', '2,3']);
    expect(state.availableMineSites).toBe(1);
    expect(state.settlementStorage).toEqual({ id: 'settlement-storage', level: 1, constructionState: 'complete' });
    expect(getSettlementStorageCapacity(state)).toBe(SETTLEMENT_STORAGE_LEVELS[0].capacity);
    expect(getAvailableSettlementStorage(state)).toBe(500);
  });

  it('caps settlement resource transfers and reports overflow', () => {
    const state = freshState();
    expect(getStoredResourceTotal(state)).toBe(0);
    expect(addSettlementResource(state, 'dirt', 498)).toBe(498);
    expect(transferResourcesToSettlement(state, { dirt: 10, cobblestone: 4 })).toEqual({
      transferred: { dirt: 2 },
      overflow: { dirt: 8, cobblestone: 4 },
    });
    expect(getStoredResourceTotal(state)).toBe(500);
    expect(getAvailableSettlementStorage(state)).toBe(0);
    expect(collectOreBonus(state, 'diamond')).toBe(0);
    state.resources.dirt = 400;
    expect(addSettlementResource(state, 'diamond', 10)).toBe(10);
    expect(getStoredResourceTotal(state)).toBe(410);
  });

  it('queues a data-driven Settlement Storage upgrade through the builder system', () => {
    const state = freshState(1_000);
    state.resources = { dirt: 100, cobblestone: 100 };
    const upgrade = getSettlementStorageUpgrade(state);
    expect(upgrade).toMatchObject({ fromLevel: 1, toLevel: 2, capacity: 1_500, durationMs: 30_000 });
    expect(getSettlementStorageUpgradeStatus(state)).toMatchObject({ ready: true, missing: [] });

    expect(queueSettlementStorageUpgrade(state, 2_000)).toBe(true);
    expect(state.resources).toEqual({ dirt: 0, cobblestone: 0 });
    expect(state.settlementStorage.constructionState).toBe('upgrading');
    expect(state.constructionQueue[0]).toMatchObject({ action: 'upgrade', targetKind: 'storage', targetId: 'settlement-storage', builderId: 'builder-1', durationMs: 30_000 });
    expect(getSettlementStorageCapacity(state)).toBe(500);

    expect(completeConstructionProjects(state, 31_999)).toHaveLength(0);
    expect(completeConstructionProjects(state, 32_000)).toHaveLength(1);
    expect(state.settlementStorage).toMatchObject({ level: 2, constructionState: 'complete' });
    expect(getSettlementStorageCapacity(state)).toBe(1_500);
    expect(state.settlementProgress).toBe(100);
  });

  it('reports storage upgrade blockers and the authoritative Hub next goal', () => {
    const state = freshState();
    expect(getSettlementStorageUpgradeStatus(state).missing).toEqual(['100 dirt', '100 cobblestone']);
    expect(getSettlementNextGoal(state)).toMatchObject({ kind: 'hub', title: 'Upgrade to Hamlet', detail: '500 Settlement XP', ready: false });
    state.settlementProgress = 500;
    state.resources = { dirt: 50, cobblestone: 50 };
    expect(getSettlementNextGoal(state)).toMatchObject({ kind: 'hub', title: 'Upgrade to Hamlet', detail: '1 level 1+ mine' });
  });

  it('queues storage behind an occupied builder and resumes it from a save', () => {
    const state = freshState(1_000);
    state.resources = { dirt: 100, cobblestone: 100 };
    expect(queueConstruction(state, 'adjacent-cell', 2_000, 'north')).toBe(true);
    expect(queueSettlementStorageUpgrade(state, 2_000)).toBe(true);
    expect(state.settlementStorage.constructionState).toBe('upgrading');
    expect(state.constructionQueue[1]).toMatchObject({ targetKind: 'storage', builderId: null, startedAt: 0, completesAt: 0 });

    const saved = { ...state };
    const storage = { getItem: () => JSON.stringify(saved) } as unknown as Storage;
    const restored = loadState(storage, 5_000);
    expect(restored.settlementStorage.constructionState).toBe('upgrading');
    expect(restored.constructionQueue.find((project) => project.targetKind === 'storage')).toMatchObject({ builderId: null });
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

  it('grants mine permits from Hub milestones instead of skill nodes', () => {
    const state = freshState();
    state.skillRanks = { 'world-cave-entrance': 1, 'world-second-mine-site': 1, 'world-third-mine-site': 1 };
    expect(getMineSiteCapacity(state)).toBe(1);
    expect(getAvailableMineSites(state)).toBe(1);
    expect(unlockStarterMine(state, 1000, 0, 1, 'south', 2)).toBe(true);
    state.settlementHub.level = 4;
    expect(getSettlementStage(state).id).toBe('small-town');
    expect(getMineSiteCapacity(state)).toBe(2);
    expect(unlockStarterMine(state, 1000, 1, -1, 'south', 4)).toBe(true);
    state.settlementHub.level = 6;
    expect(getSettlementStage(state).id).toBe('city');
    expect(getMineSiteCapacity(state)).toBe(3);
    expect(unlockStarterMine(state, 1000, 2, -1, 'south', 4)).toBe(true);
    expect(state.mines.map((mine) => mine.id)).toEqual(['starter-mine', 'mine-2', 'mine-3']);
    expect(getAvailableMineSites(state)).toBe(0);
  });

  it('reports build prerequisites from the shared unlock registry', () => {
    const state = freshState();
    expect(getBuildItemUnlockStatus(state, 'mine').unlocked).toBe(false);
    state.skillRanks['world-cave-entrance'] = 1;
    expect(getBuildItemUnlockStatus(state, 'mine').unlocked).toBe(true);
  });

  it('derives Hub consequences and stage-gates later build categories', () => {
    const state = freshState();
    expect(getSettlementHubConsequences(state)).toMatchObject({ mineSiteCapacity: 1, traderUnlocked: false });
    expect(isTraderUnlocked(state)).toBe(false);
    expect(getBuildItemUnlockStatus(state, 'farm').unlocked).toBe(false);
    state.settlementHub.level = 2;
    state.skillRanks['life-crops'] = 1;
    expect(getSettlementHubConsequences(state)).toMatchObject({ mineSiteCapacity: 1, traderUnlocked: true });
    expect(isTraderUnlocked(state)).toBe(true);
    expect(getBuildItemUnlockStatus(state, 'farm').unlocked).toBe(true);
    state.settlementHub.level = 4;
    expect(getSettlementHubConsequences(state).mineSiteCapacity).toBe(2);
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
    expect(state.settlementProgress).toBe(2);
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
    expect(state.settlementProgress).toBe(2);
    expect(buildPathCell(state, -1, 2)).toBe(false);
    const dwelling = createWorldPlacement('dwelling', 'dwelling-1', 1, 1, 'south');
    expect(placeWorldPlacement(state, dwelling)).toBe(true);
    state.resources.dirt = DIRT_PATH_BUILD_COST;
    expect(canBuildPathCell(state, 1, 1)).toBe(false);
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
    addSettlementProgress(state, 500);
    expect(getSettlementStage(state).name).toBe('Dwelling');
    expect(getNextSettlementStage(state)?.name).toBe('Hamlet');
    addSettlementProgress(state, 1_500);
    expect(getSettlementStage(state).name).toBe('Dwelling');
    state.settlementHub.level = 2;
    expect(getSettlementStage(state).name).toBe('Hamlet');
    state.settlementHub.level = 3;
    expect(getSettlementStage(state).name).toBe('Village');
  });

  it('keeps Hub authority separate from XP and exposes the first upgrade requirements', () => {
    const state = freshState(1000);
    expect(getSettlementHubUpgradeStatus(state).ready).toBe(false);
    expect(getSettlementHubUpgradeStatus(state).missing).toContain('1 level 1+ mine');

    expect(unlockStarterMine(state, 1000)).toBe(true);
    state.settlementProgress = 500;
    state.resources.dirt = 50;
    state.resources.cobblestone = 50;
    expect(getSettlementHubUpgradeStatus(state)).toMatchObject({
      definition: SETTLEMENT_HUB_UPGRADES[0],
      ready: true,
      missing: [],
    });
  });

  it('queues and completes the first builder-backed Hub upgrade', () => {
    const state = freshState(1000);
    unlockStarterMine(state, 1000);
    state.settlementProgress = 500;
    state.resources.dirt = 50;
    state.resources.cobblestone = 50;
    const now = 2_000;

    expect(queueSettlementHubUpgrade(state, now)).toBe(true);
    expect(state.resources).toMatchObject({ dirt: 0, cobblestone: 0 });
    expect(state.settlementHub.constructionState).toBe('upgrading');
    expect(state.constructionQueue[0]).toMatchObject({
      action: 'upgrade', targetKind: 'hub', targetId: 'settlement-hub', builderId: 'builder-1', durationMs: 30_000,
    });
    expect(getSettlementStage(state).name).toBe('Dwelling');
    expect(completeConstructionProjects(state, now + 29_999)).toHaveLength(0);
    expect(completeConstructionProjects(state, now + 30_000)).toHaveLength(1);
    expect(state.settlementHub).toMatchObject({ level: 2, constructionState: 'complete' });
    expect(getSettlementStage(state).name).toBe('Hamlet');
    expect(state.skillRanks['branch-entry-life-settlement']).toBe(1);
    expect(state.builderSlots).toBe(2);
    expect(state.worldPower).toBe(1);
    expect(state.settlementProgress).toBe(1_000);
  });

  it('does not advance settlement progress from mine output alone', () => {
    const state = freshState(1000);
    unlockStarterMine(state, 1000);
    const progressAfterMine = state.settlementProgress;
    expect(progressAfterMine).toBe(100);
    advanceMineOperations(state, 1000 + MINE_TRIP_DURATION_MS);
    expect(state.settlementProgress).toBe(progressAfterMine);
  });

  it('projects a minecart smoothly through outbound, delivery and return phases', () => {
    const state = freshState(1000);
    unlockStarterMine(state, 1000);
    const mine = state.mines[0];
    const duration = getMineTripDuration(state);

    expect(getMineCartTravelState(state, mine, 1000)).toEqual({ phase: 0, travellingToMine: true, travel: 0 });
    expect(getMineCartTravelState(state, mine, 1000 + duration / 4)).toMatchObject({
      travellingToMine: true,
      travel: 0.5,
    });
    expect(getMineCartTravelState(state, mine, 1000 + duration / 2)).toMatchObject({
      travellingToMine: false,
      travel: 1,
    });
    expect(getMineCartTravelState(state, mine, 1000 + duration * 3 / 4)).toMatchObject({
      travellingToMine: false,
      travel: 0.5,
    });
    expect(getMineCartTravelState(state, mine, 1000 + duration * 2)).toEqual({
      phase: 0,
      travellingToMine: true,
      travel: 0,
    });
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
    expect(buySkillNode(state, 'world-adjacent-block')).toBe(true);
    expect(state).toMatchObject({ worldRank: 0, worldPower: 1, craftingPoints: 2 });
    const now = Date.now();
    completeConstructionProjects(state, now + CONSTRUCTION_DURATIONS_MS['adjacent-cell']);
    expect(state.settlementProgress).toBe(0);
    expect(buySkillNode(state, 'world-surface-3x3')).toBe(true);
    expect(state).toMatchObject({ worldRank: 0, worldPower: 0, craftingPoints: 1 });
    completeConstructionProjects(state, now + 1 + CONSTRUCTION_DURATIONS_MS['chunk-upgrade']);
    expect(state.worldRank).toBe(1);
    expect(state.chunkSize).toBe(9);
    expect(state.settlementProgress).toBe(0);
  });

  it('keeps World Power costs limited to data-defined expansion commitments', () => {
    const worldPowerNodes = SKILL_TREE_NODES.filter((node) => (node.cost.worldPower ?? 0) !== 0);
    expect(worldPowerNodes.map((node) => node.id)).toEqual([...WORLD_POWER_EXPANSION_NODE_IDS]);
    expect(worldPowerNodes.every((node) => node.branch === 'world-growth-biomes')).toBe(true);
  });

  it('keeps ordinary Skill Tree upgrades independent of World Power', () => {
    const state = freshState();
    state.craftingPoints = 1;
    state.worldPower = 0;
    expect(buySkillNode(state, 'harvesting-bare-hands')).toBe(true);
    expect(state.worldPower).toBe(0);
  });

  it('rejects an accidental World Power cost on an ordinary Skill Tree node', () => {
    const state = freshState();
    state.craftingPoints = 1;
    state.worldPower = 1;
    const ordinaryNode = SKILL_TREE_NODES.find((node) => node.id === 'harvesting-bare-hands');
    expect(ordinaryNode).toBeDefined();
    expect(canAffordSkillNode(state, {
      ...ordinaryNode!,
      cost: { ...ordinaryNode!.cost, worldPower: 1 },
    })).toBe(false);
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
    expect(state).toMatchObject({ schemaVersion: 9, worldRank: 1, worldPower: 1, chunkSize: 7, builderSlots: 1, settlementHub: { level: 1, constructionState: 'complete' }, settlementStorage: { level: 1 } });
    expect(state.skillRanks).toMatchObject({ 'automation-auto-strike': 2, 'tools-tool-bench': 1 });
    expect(getAutoRate(state)).toBe(2);
    expect(getTool(state).name).toBe('Wooden Pickaxe');
    expect(state.craftingPoints).toBe(2);
  });

  it('preserves legacy material and branch ranks without changing Crafting Points', () => {
    const saved = {
      ...freshState(0),
      schemaVersion: 4,
      craftingPoints: 4,
      skillRanks: {
        'harvesting-bare-hands': 3,
        'materials-stone': 1,
      },
    };
    const storage = { getItem: () => JSON.stringify(saved) } as unknown as Storage;
    const state = loadState(storage, 1000);

    expect(state.skillRanks).toMatchObject({
      'harvesting-bare-hands': 3,
      'materials-stone': 1,
      'branch-entry-harvesting': 1,
      'branch-entry-materials-deep-mining': 1,
    });
    expect(state.craftingPoints).toBe(4);
    expect(buySkillNode(state, 'materials-stone')).toBe(false);
  });

  it('migrates schema 4 expansion projects into generic builder projects', () => {
    const saved = {
      ...freshState(0),
      schemaVersion: 4,
      settlementHub: { id: 'settlement-hub', level: 3, constructionState: 'complete' },
      constructionQueue: [{ kind: 'adjacent-cell', startedAt: 1000, completesAt: 11000, direction: 'north' }],
    };
    const storage = { getItem: () => JSON.stringify(saved) } as unknown as Storage;
    const state = loadState(storage, 2000);
    expect(state.schemaVersion).toBe(9);
    expect(state.settlementHub.level).toBe(1);
    expect(state.settlementStorage.level).toBe(1);
    expect(state.constructionQueue[0]).toMatchObject({ action: 'expand', targetKind: 'world', targetId: 'adjacent-cell-north', builderId: 'builder-1', cost: {} });
    expect(state.constructionQueue[0].completesAt).toBe(11000);
  });

  it('migrates schema 5 placements without building metadata into complete level-one instances', () => {
    const placement = createWorldPlacement('dwelling', 'dwelling-1', 1, 1, 'south');
    const saved = { ...freshState(0), schemaVersion: 5, placements: [{ ...placement, level: undefined, constructionState: undefined }] };
    const storage = { getItem: () => JSON.stringify(saved) } as unknown as Storage;
    const state = loadState(storage, 1000);
    expect(state.schemaVersion).toBe(9);
    expect(state.settlementHub.level).toBe(1);
    expect(state.settlementStorage.level).toBe(1);
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
    expect(getLivingEntityPlan(state)).toHaveLength(0);
    state.settlementHub.level = 3;
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

  it('reconciles restored construction once and releases its builder', () => {
    const state = freshState(1000);
    state.resources = { dirt: 100, cobblestone: 100 };
    expect(queueSettlementStorageUpgrade(state, 1000)).toBe(true);
    expect(state.settlementStorage.constructionState).toBe('upgrading');

    const restored = reconcileElapsedProgress(state, 31_000);
    expect(restored.completedProjects).toHaveLength(1);
    expect(restored.completedProjects[0].targetKind).toBe('storage');
    expect(state.settlementStorage).toMatchObject({ level: 2, constructionState: 'complete' });
    expect(getAvailableBuilderSlots(state)).toBe(1);
    expect(state.lastSavedAt).toBe(31_000);

    const replay = reconcileElapsedProgress(state, 31_000);
    expect(replay.completedProjects).toHaveLength(0);
    expect(replay.offlineXp).toBe(0);
  });

  it('awards no-mine offline XP once when a cloud-shaped save is restored', () => {
    const state = freshState(0);
    const restored = reconcileElapsedProgress(state, 60_000);
    expect(restored.offlineXp).toBe(30);
    expect(state.totalXp).toBe(30);
    expect(state.lastSavedAt).toBe(60_000);

    expect(reconcileElapsedProgress(state, 60_000).offlineXp).toBe(0);
    expect(state.totalXp).toBe(30);
  });

  it('runs a permanent mine without changing the world cells', () => {
    const state = freshState(1000);
    const originalCells = [...state.worldCells];
    expect(unlockStarterMine(state, 1000)).toBe(true);
    expect(advanceMineOperations(state, 1000 + MINE_TRIP_DURATION_MS / 2)).toMatchObject({ trips: 0, xp: 0 });
    expect(advanceMineOperations(state, 1000 + MINE_TRIP_DURATION_MS - 1)).toMatchObject({ trips: 0, xp: 0 });
    const result = advanceMineOperations(state, 1000 + MINE_TRIP_DURATION_MS, () => 0.01);
    expect(result).toMatchObject({ trips: 1, xp: 2, resources: { cobblestone: 1 } });
    expect(state.resources).toEqual({ dirt: 0, cobblestone: 0 });
    expect(state.mines[0].inventory).toEqual({ cobblestone: 1 });
    expect(state.worldCells).toEqual(originalCells);
    expect(state.mines[0].progressMs).toBe(0);
  });

  it('refreshes the existing discovery system after a mine reveals eligible ores', () => {
    const state = freshState(1000);
    state.settlementHub.level = 4;
    syncAutomaticSkillNodes(state);
    unlockStarterMine(state, 1000);
    state.skillRanks['tools-wooden-pickaxe'] = 1;
    expect(state.skillRanks['materials-coal']).toBeUndefined();
    expect(state.skillRanks['materials-copper']).toBeUndefined();

    advanceMineOperations(state, 1000 + MINE_TRIP_DURATION_MS, () => 0.01);

    expect(state.skillRanks['materials-coal']).toBe(1);
    expect(state.skillRanks['materials-copper']).toBe(1);
  });

  it('keeps producing into mine storage when settlement storage is full, then collects after space is freed', () => {
    const state = freshState(1000);
    unlockStarterMine(state, 1000);
    state.resources.dirt = 500;
    const produced = advanceMineOperations(state, 1000 + MINE_TRIP_DURATION_MS, () => 0.01);
    expect(produced).toMatchObject({ trips: 1, xp: 2, resources: { cobblestone: 1 } });
    expect(state.mines[0].inventory).toEqual({ cobblestone: 1 });
    expect(collectMineStorage(state, state.mines[0].id)).toMatchObject({ transferred: {}, overflow: { cobblestone: 1 } });
    state.resources.dirt = 499;
    expect(collectMineStorage(state, state.mines[0].id)).toMatchObject({ transferred: { cobblestone: 1 }, overflow: {} });
    expect(getStoredResourceTotal(state)).toBe(500);
  });

  it('derives mine storage fullness from typed local contents and pauses at capacity', () => {
    const state = freshState(1000);
    unlockStarterMine(state, 1000);
    const mine = state.mines[0];
    expect(getMineStorageCapacity(mine)).toBe(100);
    expect(getMineStorageFillState(0, 100)).toBe('empty');
    expect(getMineStorageFillState(1, 100)).toBe('low');
    expect(getMineStorageFillState(60, 100)).toBe('medium');
    expect(getMineStorageFillState(100, 100)).toBe('full');

    mine.inventory = { cobblestone: 100 };
    expect(getMineStorageAmount(mine)).toBe(100);
    expect(getMineStorageFillState(getMineStorageAmount(mine), getMineStorageCapacity(mine))).toBe('full');
    const paused = advanceMineOperations(state, 1000 + MINE_TRIP_DURATION_MS * 2);
    expect(paused).toMatchObject({ trips: 0, xp: 0, resources: {} });
    expect(mine.inventory).toEqual({ cobblestone: 100 });
  });

  it('supports individual mine storage capacity upgrades with normal resources', () => {
    const state = freshState(1000);
    unlockStarterMine(state, 1000);
    state.resources.cobblestone = 25;
    state.resources.emerald = 7;
    const mine = state.mines[0];
    expect(getMineStorageUpgradeCost(state, mine.id)).toEqual({ cobblestone: 25 });
    expect(buyMineStorageUpgrade(state, mine.id)).toBe(true);
    expect(state.resources.cobblestone).toBe(0);
    expect(state.resources.emerald).toBe(7);
    expect(mine.storageCapacityLevel).toBe(1);
    expect(getMineStorageCapacity(mine)).toBe(200);
    expect(state.settlementProgress).toBe(200);
  });

  it('drops obsolete storage upgrade ranks while preserving serialized capacity', () => {
    const saved = freshState(1000);
    unlockStarterMine(saved, 1000);
    saved.mineUpgradeRanks = { 'rail-speed': 1, 'storage-capacity': 3 };
    saved.mines[0].storageCapacityLevel = 2;
    const storage = { getItem: () => JSON.stringify(saved) } as unknown as Storage;
    const state = loadState(storage, 2000);
    expect(state.mineUpgradeRanks).toEqual({ 'rail-speed': 1 });
    expect(state.mines[0].storageCapacityLevel).toBe(2);
    expect(getMineStorageCapacity(state.mines[0])).toBe(300);
  });

  it('does not make Emerald a prerequisite for the first villager', () => {
    const firstVillager = SKILL_TREE_NODES.find((node) => node.id === 'life-first-villager');
    expect(firstVillager?.prerequisites).not.toContain('materials-emerald');
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

  it('migrates schema 7 saves to schema 9 without losing resources or runtime state', () => {
    const saved = {
      ...freshState(1000),
      schemaVersion: 7,
      resources: { dirt: 120, cobblestone: 80 },
      settlementHub: { id: 'settlement-hub' as const, level: 2, constructionState: 'complete' as const },
      mines: [{ id: 'starter-mine', x: 0, z: 1, cartCount: 1, storageCarts: 0, railLevel: 0, minerCount: 0, progressMs: 2000, lastUpdatedAt: 1000, completedTrips: 3 }],
    };
    const storage = { getItem: () => JSON.stringify(saved) } as unknown as Storage;
    const state = loadState(storage, 2000);
    expect(state.schemaVersion).toBe(9);
    expect(state.resources).toMatchObject({ dirt: 120, cobblestone: 80 });
    expect(state.settlementHub.level).toBe(2);
    expect(state.settlementStorage).toEqual({ id: 'settlement-storage', level: 1, constructionState: 'complete' });
    expect(state.skillRanks['branch-entry-life-settlement']).toBe(1);
    expect(state.mines[0]).toMatchObject({ completedTrips: 3, progressMs: 2000 });
  });

  it('migrates legacy visual mine storage into typed local inventory', () => {
    const saved = {
      ...freshState(1000),
      schemaVersion: 8,
      mines: [{
        id: 'starter-mine',
        x: 0,
        z: 1,
        direction: 'east',
        railLength: 4,
        cartCount: 1,
        storageCarts: 0,
        railLevel: 2,
        minerCount: 1,
        progressMs: 321,
        lastUpdatedAt: 1000,
        completedTrips: 7,
        storageAmount: 37,
        storageCapacityLevel: 1,
      }],
    };
    const storage = { getItem: () => JSON.stringify(saved) } as unknown as Storage;
    const state = loadState(storage, 2000);
    expect(state.schemaVersion).toBe(9);
    expect(state.mines[0]).toMatchObject({
      direction: 'east',
      railLength: 4,
      railLevel: 2,
      progressMs: 321,
      lastUpdatedAt: 1000,
      completedTrips: 7,
      inventory: { cobblestone: 37 },
      storageCapacityLevel: 1,
    });
    expect(getMineStorageAmount(state.mines[0])).toBe(37);
  });

  it('round-trips typed mine inventory in the current save schema', () => {
    const saved = freshState(1000);
    unlockStarterMine(saved, 1000);
    saved.mines[0].inventory = { cobblestone: 4, coal: 2 };
    const storage = { getItem: () => JSON.stringify(saved) } as unknown as Storage;
    const state = loadState(storage, 2000);
    expect(state.schemaVersion).toBe(9);
    expect(state.mines[0].inventory).toEqual({ cobblestone: 4, coal: 2 });
    expect(getMineStorageAmount(state.mines[0])).toBe(6);
  });

  it('normalizes schema 8 storage records created before storage construction metadata', () => {
    const saved = {
      ...freshState(1000),
      schemaVersion: 8,
      settlementStorage: { id: 'settlement-storage' as const, level: 2 },
    };
    const storage = { getItem: () => JSON.stringify(saved) } as unknown as Storage;
    const state = loadState(storage, 2000);
    expect(state.schemaVersion).toBe(9);
    expect(state.settlementStorage).toEqual({ id: 'settlement-storage', level: 2, constructionState: 'complete' });
  });

  it('keeps one cart per mine while keeping bonus ore clickable', () => {
    const state = freshState(1000);
    state.skillRanks = { 'automation-mine-carts': 2 };
    expect(getMineCartCount(state)).toBe(1);
    expect(getMineCartCapacity(state)).toBe(3);
    unlockStarterMine(state, 1000);
    expect(dispatchMineCart(state, 1000)).toMatchObject({ trips: 0, xp: 0 });
    const result = advanceMineOperations(state, 1000 + MINE_TRIP_DURATION_MS, () => 0.01);
    expect(result.trips).toBe(1);
    expect(state.resources.cobblestone).toBe(0);
    expect(state.mines[0].inventory).toEqual({ cobblestone: 3 });
    expect(state.mines[0].cartCount).toBe(1);
    expect(state.mines[0].storageCarts).toBe(0);
    expect(collectOreBonus(state, 'diamond')).toBe(1);
    expect(state.resources.diamond).toBe(1);
    expect(dispatchMineCart(state, 1000).trips).toBe(0);
  });

  it('keeps Mining-menu upgrades mine-owned and pays normal resources', () => {
    const state = freshState(1000);
    expect(getMineEmeraldChance(state)).toBeCloseTo(0.0008);
    expect(buyMineUpgrade(state, 'rail-speed')).toBe(false);
    unlockStarterMine(state, 1000);
    state.resources.cobblestone = 40;
    state.resources.emerald = 13;
    const baseDuration = getMineTripDuration(state);
    expect(buyMineUpgrade(state, 'rail-speed')).toBe(true);
    expect(state.resources.cobblestone).toBe(0);
    expect(state.resources.emerald).toBe(13);
    expect(getMineTripDuration(state)).toBeLessThan(baseDuration);
    expect(getMineEmeraldChance(state)).toBeCloseTo(0.001);
    expect(getMineCartCount(state)).toBe(1);
    expect(state.settlementProgress).toBe(200);
    expect(getMineStorageUpgradeCost(state, state.mines[0].id)).toEqual({ cobblestone: 25 });
  });

  it('can award the level-one Emerald chance when a cart delivers', () => {
    const state = freshState(1000);
    unlockStarterMine(state, 1000);
    const result = advanceMineOperations(state, 1000 + MINE_TRIP_DURATION_MS, () => 0);
    expect(result.resources.emerald).toBe(1);
    expect(state.resources.emerald).toBeUndefined();
    expect(state.mines[0].inventory.emerald).toBe(1);
  });

  it('selects the data-driven production table from the canonical depth and discovery state', () => {
    const state = freshState();
    expect(getMineProductionTier(state)).toBe('shallow');
    expect(getMineProductionDefinition(state)).toEqual(MINE_PRODUCTION_TABLES[0]);
    state.undergroundLayer = 1;
    expect(getMineProductionTier(state)).toBe('iron');
    expect(getMineProductionDefinition(state).entries).toEqual([
      { resource: 'deepslate', weight: 60 },
      { resource: 'coal', weight: 15 },
      { resource: 'copper', weight: 10 },
      { resource: 'iron', weight: 15 },
    ]);
    state.undergroundLayer = 2;
    expect(getMineProductionTier(state)).toBe('redstone');
    state.skillRanks['materials-diamond'] = 1;
    expect(getMineProductionTier(state)).toBe('diamond');
  });

  it('selects weighted resources at the expected table boundaries', () => {
    const shallow = MINE_PRODUCTION_TABLES[0].entries;
    expect(selectWeightedMineResource(shallow, 0)).toBe('cobblestone');
    expect(selectWeightedMineResource(shallow, 0.79999)).toBe('cobblestone');
    expect(selectWeightedMineResource(shallow, 0.8)).toBe('coal');
    expect(selectWeightedMineResource(shallow, 0.95)).toBe('copper');
    expect(selectWeightedMineResource(shallow, 1)).toBe('copper');
  });

  it('generates multiple normal cargo rolls while keeping Emerald independent', () => {
    const state = freshState();
    state.skillRanks['automation-mine-carts'] = 2;
    const randomValues = [0.81, 0.5, 0.96, 0.5, 0.2, 0.5];
    const cargo = generateMineCartCargo(state, () => randomValues.shift() ?? 0.5);
    expect(cargo).toEqual({ coal: 1, copper: 1, cobblestone: 1 });
    expect(MINE_PRODUCTION_TABLES[0].entries.map((entry) => entry.resource)).not.toContain('emerald');
  });

  it('uses partial remaining mine capacity without deleting existing cargo', () => {
    const state = freshState(1000);
    unlockStarterMine(state, 1000);
    const mine = state.mines[0];
    mine.inventory = { coal: 99 };
    state.skillRanks['automation-mine-carts'] = 2;
    const result = advanceMineOperations(state, 1000 + MINE_TRIP_DURATION_MS, () => 0.01);
    expect(result.trips).toBe(1);
    expect(result.resources).toEqual({ cobblestone: 1 });
    expect(mine.inventory).toEqual({ coal: 99, cobblestone: 1 });
    expect(getMineStorageAmount(mine)).toBe(100);
  });

  it('pauses after a capacity-limited trip and resumes after collection', () => {
    const state = freshState(1000);
    unlockStarterMine(state, 1000);
    const mine = state.mines[0];
    mine.inventory = { cobblestone: 99 };
    state.skillRanks['automation-mine-carts'] = 1;
    const first = advanceMineOperations(state, 1000 + MINE_TRIP_DURATION_MS, () => 0.01);
    expect(first.trips).toBe(1);
    expect(mine.inventory).toEqual({ cobblestone: 100 });
    expect(advanceMineOperations(state, 1000 + MINE_TRIP_DURATION_MS * 3, () => 0.01)).toMatchObject({ trips: 0, xp: 0 });
    expect(collectMineStorage(state, mine.id, 1000 + MINE_TRIP_DURATION_MS * 3).transferred).toEqual({ cobblestone: 100 });
    expect(advanceMineOperations(state, 1000 + MINE_TRIP_DURATION_MS * 4, () => 0.01).trips).toBe(1);
  });
});
