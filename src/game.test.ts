import { describe, expect, it } from 'vitest';
import { addXp, buySpeedUpgrade, calculateOfflineXp, freshState, getAutoRate, xpRequired } from './game';

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

  it('calculates offline gains at half efficiency', () => {
    const state = freshState(0);
    expect(calculateOfflineXp(state, 60_000)).toBe(30);
  });
});
