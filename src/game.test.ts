import { describe, expect, it } from 'vitest';
import { addXp, BLOCK_PROGRESSION, buySkillNode, buySpeedUpgrade, buyToolUpgrade, buyWorldExpansion, calculateOfflineXp, expandToFirstAdjacentCell, expandToSurface3x3, freshState, getAutoRate, getContextTool, getHarvestPower, getMiningStats, getNextBlockType, harvestResource, loadState, xpRequired } from './game';

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
    expect(buyWorldExpansion(state)).toBe(true);
    expect(state.worldRank).toBe(1);
    expect(state.craftingPoints).toBe(1);
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
    expect(state).toMatchObject({ worldRank: 1, worldPower: 1, craftingPoints: 1 });
    expect(buySkillNode(state, 'world-surface-3x3')).toBe(true);
    expect(state).toMatchObject({ worldRank: 2, worldPower: 0, craftingPoints: 0 });
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
});
