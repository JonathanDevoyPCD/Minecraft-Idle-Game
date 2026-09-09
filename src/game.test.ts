import { describe, expect, it } from 'vitest';
import { addXp, buySpeedUpgrade, buyToolUpgrade, buyWorldExpansion, calculateOfflineXp, freshState, getAutoRate, getContextTool, getHarvestPower, harvestResource, xpRequired } from './game';

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

  it('keeps harvested resources independent by block type', () => {
    const state = freshState();
    harvestResource(state, 'dirt');
    harvestResource(state, 'stone', 2);
    expect(state.resources).toEqual({ dirt: 1, cobblestone: 2 });
  });

  it('expands the world after the first growth milestone', () => {
    const state = freshState();
    addXp(state, 350);
    expect(state.level).toBe(3);
    expect(buyWorldExpansion(state)).toBe(true);
    expect(state.worldRank).toBe(1);
    expect(state.craftingPoints).toBe(1);
  });

  it('calculates offline gains at half efficiency', () => {
    const state = freshState(0);
    expect(calculateOfflineXp(state, 60_000)).toBe(30);
  });
});
