import { describe, expect, it } from 'vitest';
import { addSettlementProgress, addXp, advanceMineOperations, BLOCK_PROGRESSION, buySkillNode, buySpeedUpgrade, buyToolUpgrade, buyWorldExpansion, calculateOfflineXp, collectOreBonus, completeConstructionProjects, CONSTRUCTION_DURATIONS_MS, dispatchMineCart, expandToFirstAdjacentCell, expandToSurface3x3, freshState, getAutoRate, getContextTool, getHarvestPower, getLivingEntityPlan, getMeadowFeaturePlan, getMineCartCount, getMiningStats, getNextBlockType, getNextSettlementStage, getSettlementStage, getStableBlockType, harvestResource, loadState, MINE_TRIP_DURATION_MS, SETTLEMENT_STAGES, unlockStarterMine, xpRequired } from './game';

describe('IdleCraft progression', () => {
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

  it('expands the world after the first growth milestone', () => {
    const state = freshState();
    addXp(state, 350);
    expect(state.level).toBe(3);
    const now = 1000;
    expect(buyWorldExpansion(state, 'north', now)).toBe(true);
    expect(state.worldRank).toBe(0);
    expect(state.constructionQueue[0]).toMatchObject({ kind: 'adjacent-cell', startedAt: now, completesAt: now + CONSTRUCTION_DURATIONS_MS['adjacent-cell'] });
    expect(completeConstructionProjects(state, now + CONSTRUCTION_DURATIONS_MS['adjacent-cell'] - 1)).toHaveLength(0);
    expect(completeConstructionProjects(state, now + CONSTRUCTION_DURATIONS_MS['adjacent-cell'])).toHaveLength(1);
    expect(state.worldRank).toBe(1);
    expect(state.worldCells).toHaveLength(2);
    expect(state.craftingPoints).toBe(1);
    expect(state.settlementProgress).toBe(100);
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
    expect(state.worldCells).toHaveLength(1);
    expandToFirstAdjacentCell(state);
    expect(state.worldCells).toHaveLength(2);
    expect(state.worldCells).toContainEqual({ x: 0, z: -1, biome: 'meadow' });
    expandToSurface3x3(state);
    expect(state.worldCells).toHaveLength(9);
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
    expect(state).toMatchObject({ worldRank: 1, worldPower: 0, craftingPoints: 0 });
    completeConstructionProjects(state, now + CONSTRUCTION_DURATIONS_MS['adjacent-cell'] + CONSTRUCTION_DURATIONS_MS['surface-3x3']);
    expect(state.worldRank).toBe(2);
  });

  it('queues the 3×3 build behind an adjacent plot', () => {
    const state = freshState();
    state.craftingPoints = 3;
    state.skillRanks = { 'branch-entry-world-growth-biomes': 1 };
    const now = 5000;
    expect(buySkillNode(state, 'world-adjacent-block', now)).toBe(true);
    expect(buySkillNode(state, 'world-surface-3x3', now + 1)).toBe(true);
    expect(state.worldCells).toHaveLength(1);
    expect(state.constructionQueue).toHaveLength(2);
    expect(state.constructionQueue[1].startedAt).toBe(now + CONSTRUCTION_DURATIONS_MS['adjacent-cell']);
    completeConstructionProjects(state, now + CONSTRUCTION_DURATIONS_MS['adjacent-cell']);
    expect(state.worldCells).toHaveLength(2);
    completeConstructionProjects(state, now + CONSTRUCTION_DURATIONS_MS['adjacent-cell'] + CONSTRUCTION_DURATIONS_MS['surface-3x3']);
    expect(state.worldCells).toHaveLength(9);
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
    expect(state.skillRanks).toMatchObject({
      'automation-auto-strike': 2,
      'tools-tool-bench': 1,
      'tools-wooden-pickaxe': 1,
      'world-adjacent-block': 1,
    });
    expect(state.worldPower).toBe(1);
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
    expect(plan.find((feature) => feature.kind === 'dwelling')).toMatchObject({ x: 0, z: 0 });
    expect(plan.filter((feature) => feature.kind === 'tree').every((feature) => feature.x !== -1 || feature.z !== 1)).toBe(true);
  });

  it('reveals living entities from the settlement branch', () => {
    const state = freshState();
    expect(getLivingEntityPlan(state)).toHaveLength(0);
    state.worldRank = 2;
    state.skillRanks = { 'life-animals': 1, 'life-first-villager': 1 };
    expect(getLivingEntityPlan(state).map((entity) => entity.kind)).toEqual(['pig', 'cow', 'villager']);
    state.skillRanks['life-specialist-miner'] = 1;
    expect(getLivingEntityPlan(state).find((entity) => entity.kind === 'villager')?.role).toBe('miner');
  });

  it('migrates legacy expanded saves into coordinate cells', () => {
    const storage = {
      getItem: () => JSON.stringify({ ...freshState(0), worldRank: 1, worldCells: undefined }),
    } as unknown as Storage;
    expect(loadState(storage, 1000).worldCells).toHaveLength(9);
  });

  it('calculates offline gains at half efficiency', () => {
    const state = freshState(0);
    expect(calculateOfflineXp(state, 60_000)).toBe(30);
  });

  it('runs a permanent mine without changing the world cells', () => {
    const state = freshState(1000);
    const originalCells = [...state.worldCells];
    expect(unlockStarterMine(state, 1000)).toBe(true);
    expect(advanceMineOperations(state, 1000 + MINE_TRIP_DURATION_MS - 1)).toMatchObject({ trips: 0, xp: 0 });
    const result = advanceMineOperations(state, 1000 + MINE_TRIP_DURATION_MS);
    expect(result).toMatchObject({ trips: 1, xp: 2, resources: { cobblestone: 1 } });
    expect(state.worldCells).toEqual(originalCells);
    expect(state.mines[0].progressMs).toBe(0);
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

  it('scales mine production with carts and keeps bonus ore clickable', () => {
    const state = freshState(1000);
    state.skillRanks = { 'automation-mine-carts': 2 };
    expect(getMineCartCount(state)).toBe(3);
    unlockStarterMine(state, 1000);
    const result = dispatchMineCart(state, 1000);
    expect(result.trips).toBe(3);
    expect(state.resources.cobblestone).toBe(3);
    expect(collectOreBonus(state, 'diamond')).toBe(1);
    expect(state.resources.diamond).toBe(1);
    expect(dispatchMineCart(state, 1000).trips).toBe(3);
  });
});
