export interface GameState {
  level: number;
  xp: number;
  totalXp: number;
  craftingPoints: number;
  speedRank: number;
  toolRank: number;
  worldRank: number;
  lastSavedAt: number;
}

export const SAVE_KEY = 'idlecraft-save-v1';
export const SPEED_RATES = [1, 1.5, 2, 2.5, 3.25];
export const TOOL_TIERS = [
  { name: 'Bare Hands', requiredLevel: 1, cost: 0, harvestPower: 1, description: 'Harvest basic blocks by hand.' },
  { name: 'Wooden Pickaxe', requiredLevel: 2, cost: 1, harvestPower: 2, description: 'Harvests 2 XP per strike and unlocks tougher blocks.' },
  { name: 'Stone Pickaxe', requiredLevel: 4, cost: 2, harvestPower: 3, description: 'Harvests 3 XP per strike and reaches deeper materials.' },
  { name: 'Iron Pickaxe', requiredLevel: 6, cost: 3, harvestPower: 4, description: 'Harvests 4 XP per strike and prepares the world for rare ores.' },
] as const;
export const WORLD_TIERS = [
  { name: 'One Block', requiredLevel: 1, cost: 0, blockCount: 1, description: 'A humble starting point for your world.' },
  { name: 'First Meadow', requiredLevel: 3, cost: 1, blockCount: 2, description: 'Add a neighboring dirt block and begin growing outward.' },
] as const;

export function freshState(now = Date.now()): GameState {
  return {
    level: 1,
    xp: 0,
    totalXp: 0,
    craftingPoints: 0,
    speedRank: 0,
    toolRank: 0,
    worldRank: 0,
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

export function getTool(state: GameState) {
  return TOOL_TIERS[Math.min(state.toolRank, TOOL_TIERS.length - 1)];
}

export function getHarvestPower(state: GameState): number {
  return getTool(state).harvestPower;
}

export function buyToolUpgrade(state: GameState): boolean {
  const nextTool = TOOL_TIERS[state.toolRank + 1];
  if (!nextTool || state.level < nextTool.requiredLevel || state.craftingPoints < nextTool.cost) {
    return false;
  }

  state.craftingPoints -= nextTool.cost;
  state.toolRank += 1;
  return true;
}

export function getWorldTier(state: GameState) {
  return WORLD_TIERS[Math.min(state.worldRank, WORLD_TIERS.length - 1)];
}

export function buyWorldExpansion(state: GameState): boolean {
  const nextWorld = WORLD_TIERS[state.worldRank + 1];
  if (!nextWorld || state.level < nextWorld.requiredLevel || state.craftingPoints < nextWorld.cost) {
    return false;
  }

  state.craftingPoints -= nextWorld.cost;
  state.worldRank += 1;
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
      toolRank: Math.min(TOOL_TIERS.length - 1, Math.max(0, Number(parsed.toolRank) || 0)),
      worldRank: Math.min(WORLD_TIERS.length - 1, Math.max(0, Number(parsed.worldRank) || 0)),
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
  return Math.floor(elapsedSeconds * getAutoRate(state) * getHarvestPower(state) * 0.5);
}
