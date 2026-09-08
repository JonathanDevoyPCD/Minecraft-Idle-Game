export interface GameState {
  level: number;
  xp: number;
  totalXp: number;
  craftingPoints: number;
  speedRank: number;
  lastSavedAt: number;
}

export const SAVE_KEY = 'idlecraft-save-v1';
export const SPEED_RATES = [1, 1.5, 2, 2.5, 3.25];

export function freshState(now = Date.now()): GameState {
  return {
    level: 1,
    xp: 0,
    totalXp: 0,
    craftingPoints: 0,
    speedRank: 0,
    lastSavedAt: now,
  };
}

export function xpRequired(level: number): number {
  return 100 + 150 * Math.max(0, level - 1);
}

export function addXp(state: GameState, amount: number): number {
  let levelUps = 0;
  state.xp += amount;
  state.totalXp += amount;

  while (state.xp >= xpRequired(state.level)) {
    state.xp -= xpRequired(state.level);
    state.level += 1;
    state.craftingPoints += 1;
    levelUps += 1;
  }

  return levelUps;
}

export function getAutoRate(state: GameState): number {
  return SPEED_RATES[Math.min(state.speedRank, SPEED_RATES.length - 1)];
}

export function buySpeedUpgrade(state: GameState): boolean {
  if (state.level < 2 || state.craftingPoints < 1 || state.speedRank >= SPEED_RATES.length - 1) {
    return false;
  }

  state.craftingPoints -= 1;
  state.speedRank += 1;
  return true;
}

export function loadState(storage: Storage, now = Date.now()): GameState {
  const raw = storage.getItem(SAVE_KEY);
  if (!raw) return freshState(now);

  try {
    const parsed = JSON.parse(raw) as Partial<GameState>;
    const base = freshState(now);
    return {
      level: Math.max(1, Number(parsed.level) || base.level),
      xp: Math.max(0, Number(parsed.xp) || 0),
      totalXp: Math.max(0, Number(parsed.totalXp) || 0),
      craftingPoints: Math.max(0, Number(parsed.craftingPoints) || 0),
      speedRank: Math.min(SPEED_RATES.length - 1, Math.max(0, Number(parsed.speedRank) || 0)),
      lastSavedAt: Number(parsed.lastSavedAt) || now,
    };
  } catch {
    return freshState(now);
  }
}

export function saveState(storage: Storage, state: GameState, now = Date.now()): void {
  state.lastSavedAt = now;
  storage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function calculateOfflineXp(state: GameState, now = Date.now()): number {
  const elapsedSeconds = Math.max(0, Math.min(8 * 60 * 60, (now - state.lastSavedAt) / 1000));
  if (elapsedSeconds < 10) return 0;
  return Math.floor(elapsedSeconds * getAutoRate(state) * 0.5);
}
