import { SKILL_TREE_BRANCH_ENTRY_IDS, SKILL_TREE_BY_ID, SKILL_TREE_NODES, type SkillNodeDefinition } from './skill-tree';

export interface GameState {
  level: number;
  xp: number;
  totalXp: number;
  craftingPoints: number;
  speedRank: number;
  toolRank: number;
  worldRank: number;
  worldPower: number;
  worldSeed: number;
  worldCells: WorldCell[];
  undergroundLayer: number;
  expansionDirections: WorldDirection[];
  resources: Record<string, number>;
  blockProgress: Record<string, BlockMiningProgress>;
  skillRanks: Record<string, number>;
  lastSavedAt: number;
}

export type ToolKind = 'hand' | 'pickaxe' | 'shovel' | 'axe';
export type BlockType = 'grass' | 'dirt' | 'stone' | 'deepslate';
export type WorldDirection = 'north' | 'east' | 'south' | 'west';
export type BiomeId = 'meadow' | 'forest' | 'desert' | 'mountain' | 'snow' | 'swamp' | 'crystal';
export const WORLD_DIRECTIONS: WorldDirection[] = ['north', 'east', 'south', 'west'];

export interface WorldCell {
  x: number;
  z: number;
  biome: BiomeId;
}

export interface BlockMiningProgress {
  type: BlockType;
  stableType?: BlockType;
  damage: number;
  replacementAt: number | null;
}

export const TOOL_KIND_PROFILES = {
  hand: { kind: 'hand', name: 'Hand', harvestPower: 1, description: 'Gather simple blocks by hand.' },
  pickaxe: { kind: 'pickaxe', name: 'Pickaxe', harvestPower: 2, description: 'Breaks stone and reveals deeper resources.' },
  shovel: { kind: 'shovel', name: 'Shovel', harvestPower: 2, description: 'Moves dirt and harvests soft ground quickly.' },
  axe: { kind: 'axe', name: 'Axe', harvestPower: 2, description: 'Chops wood and gathers forest materials.' },
} as const;

export const BLOCK_DEFINITIONS = {
  grass: { name: 'Grass Block', requiredTool: 'shovel', resource: 'dirt', resourceName: 'Dirt', hardness: 0.6, description: 'Soft ground ready for planting and expansion.' },
  dirt: { name: 'Dirt Block', requiredTool: 'shovel', resource: 'dirt', resourceName: 'Dirt', hardness: 0.5, description: 'Loose earth gathered from the first meadow.' },
  stone: { name: 'Cobblestone Block', requiredTool: 'pickaxe', resource: 'cobblestone', resourceName: 'Cobblestone', hardness: 1.5, description: 'A sturdy block that rewards a pickaxe.' },
  deepslate: { name: 'Deepslate Block', requiredTool: 'pickaxe', resource: 'deepslate', resourceName: 'Deepslate', hardness: 3, description: 'Dense deep-earth stone that rewards a strong pickaxe.' },
} as const;

export const BLOCK_PROGRESSION: readonly BlockType[] = ['dirt', 'grass', 'stone'];

export const SAVE_KEY = 'idlecraft-save-v1';
export const SPEED_RATES = [1, 1.5, 2, 2.5, 3.25];
export const TOOL_TIERS = [
  { kind: 'hand', material: 'Bare', name: 'Bare Hands', requiredLevel: 1, cost: 0, harvestPower: 1, description: 'Harvest basic blocks by hand.' },
  { kind: 'pickaxe', material: 'Wooden', name: 'Wooden Pickaxe', requiredLevel: 2, cost: 1, harvestPower: 2, description: 'Harvests 2 XP per strike and unlocks wooden tool forms.' },
  { kind: 'pickaxe', material: 'Stone', name: 'Stone Pickaxe', requiredLevel: 4, cost: 2, harvestPower: 3, description: 'Harvests 3 XP per strike and reaches deeper materials.' },
  { kind: 'pickaxe', material: 'Iron', name: 'Iron Pickaxe', requiredLevel: 6, cost: 3, harvestPower: 4, description: 'Harvests 4 XP per strike and prepares the world for rare ores.' },
] as const;
export const WORLD_TIERS = [
  { name: 'One Block', requiredLevel: 1, cost: 0, blockCount: 1, description: 'A humble starting point for your world.' },
  { name: 'First Meadow', requiredLevel: 3, cost: 1, blockCount: 27, description: 'Grow a connected 3×3 meadow with dirt and stone beneath.' },
  { name: 'Second Meadow', requiredLevel: 6, cost: 2, blockCount: 54, description: 'Choose a direction and grow another connected meadow chunk.' },
] as const;

const AUTO_STRIKE_NODE_ID = 'automation-auto-strike';
const TOOL_BENCH_NODE_ID = 'tools-tool-bench';
const WOODEN_PICKAXE_NODE_ID = 'tools-wooden-pickaxe';
const STONE_TOOL_SET_NODE_ID = 'tools-stone-set';
const IRON_PICKAXE_NODE_ID = 'tools-iron-pickaxe';
const ADJACENT_BLOCK_NODE_ID = 'world-adjacent-block';
const SURFACE_3X3_NODE_ID = 'world-surface-3x3';
const UNDERGROUND_LAYER_NODE_ID = 'world-underground-layer';
const TOOL_NODE_IDS = [
  'tools-wooden-shovel',
  'tools-wooden-pickaxe',
  'tools-wooden-axe',
  'tools-stone-set',
  'tools-iron-shovel',
  'tools-iron-pickaxe',
  'tools-iron-axe',
] as const;

export function getExpansionChunkOrigin(expansionNumber: number, direction: WorldDirection): { x: number; z: number } {
  const distance = Math.max(1, Math.floor(expansionNumber));
  if (direction === 'north') return { x: -1, z: -1 - distance * 3 };
  if (direction === 'east') return { x: -1 + distance * 3, z: -1 };
  if (direction === 'south') return { x: -1, z: -1 + distance * 3 };
  return { x: -1 - distance * 3, z: -1 };
}

export function freshState(now = Date.now()): GameState {
  return {
    level: 1,
    xp: 0,
    totalXp: 0,
    craftingPoints: 0,
    speedRank: 0,
    toolRank: 0,
    worldRank: 0,
    worldPower: 0,
    worldSeed: 184731,
    worldCells: [{ x: 0, z: 0, biome: 'meadow' }],
    undergroundLayer: 0,
    expansionDirections: [],
    resources: { dirt: 0, cobblestone: 0 },
    blockProgress: {},
    skillRanks: {},
    lastSavedAt: now,
  };
}

function worldCellKey(x: number, z: number): string {
  return `${x},${z}`;
}

function addWorldCell(state: GameState, x: number, z: number, biome: BiomeId = 'meadow'): void {
  if (state.worldCells.some((cell) => cell.x === x && cell.z === z)) return;
  state.worldCells.push({ x, z, biome });
}

export function getWorldSurfaceCells(state: GameState): readonly WorldCell[] {
  return state.worldCells;
}

export function getStableBlockType(authoredType: BlockType, savedProgress?: Pick<BlockMiningProgress, 'stableType'>): BlockType {
  return savedProgress?.stableType ?? authoredType;
}

export function expandToFirstAdjacentCell(state: GameState, direction: WorldDirection = 'north'): void {
  const offsets: Record<WorldDirection, readonly [number, number]> = {
    north: [0, -1],
    east: [1, 0],
    south: [0, 1],
    west: [-1, 0],
  };
  const [x, z] = offsets[direction];
  addWorldCell(state, x, z);
  state.worldRank = Math.max(state.worldRank, 1);
}

export function expandToSurface3x3(state: GameState): void {
  for (let x = -1; x <= 1; x += 1) {
    for (let z = -1; z <= 1; z += 1) addWorldCell(state, x, z);
  }
  state.worldRank = Math.max(state.worldRank, 2);
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

export function getSkillNodeRank(state: GameState, nodeId: string): number {
  return Math.max(0, Math.floor(Number(state.skillRanks[nodeId]) || 0));
}

function setSkillNodeRank(state: GameState, nodeId: string, rank: number): void {
  if (rank <= 0) delete state.skillRanks[nodeId];
  else state.skillRanks[nodeId] = rank;
}

function hasSkillPrerequisites(state: GameState, node: SkillNodeDefinition): boolean {
  return node.prerequisites.every((prerequisite) => getSkillNodeRank(state, prerequisite) > 0);
}

export function canAffordSkillNode(state: GameState, node: SkillNodeDefinition): boolean {
  if (state.craftingPoints < node.cost.craftingPoints) return false;
  if ((node.cost.worldPower ?? 0) > state.worldPower) return false;
  return Object.entries(node.cost.resources).every(([resource, amount]) => (state.resources[resource] ?? 0) >= amount);
}

export function buySkillNode(state: GameState, nodeId: string): boolean {
  const node = SKILL_TREE_BY_ID.get(nodeId);
  if (!node) return false;
  const currentRank = getSkillNodeRank(state, node.id);
  if (currentRank >= node.maxRank || !hasSkillPrerequisites(state, node) || !canAffordSkillNode(state, node)) return false;

  state.craftingPoints -= node.cost.craftingPoints;
  state.worldPower -= node.cost.worldPower ?? 0;
  Object.entries(node.cost.resources).forEach(([resource, amount]) => {
    state.resources[resource] = (state.resources[resource] ?? 0) - amount;
  });
  setSkillNodeRank(state, node.id, currentRank + 1);

  if (node.id === AUTO_STRIKE_NODE_ID) state.speedRank = Math.min(currentRank + 1, SPEED_RATES.length - 1);
  if (node.id === ADJACENT_BLOCK_NODE_ID) {
    expandToFirstAdjacentCell(state);
    state.worldPower += 1;
  }
  if (node.id === SURFACE_3X3_NODE_ID) expandToSurface3x3(state);
  if (node.id === UNDERGROUND_LAYER_NODE_ID) state.undergroundLayer = Math.max(state.undergroundLayer, 1);
  if (TOOL_NODE_IDS.includes(node.id as typeof TOOL_NODE_IDS[number])) {
    state.toolRank = getToolRankFromSkills(state);
  }
  return true;
}

function getToolRankFromSkills(state: GameState): number {
  if (getSkillNodeRank(state, IRON_PICKAXE_NODE_ID) > 0) return 3;
  if (getSkillNodeRank(state, STONE_TOOL_SET_NODE_ID) > 0) return 2;
  if (getSkillNodeRank(state, WOODEN_PICKAXE_NODE_ID) > 0) return 1;
  return 0;
}

function migrateSkillRanks(parsed: Partial<GameState>): Record<string, number> {
  const ranks: Record<string, number> = {};
  if (parsed.skillRanks && typeof parsed.skillRanks === 'object') {
    Object.entries(parsed.skillRanks).forEach(([nodeId, value]) => {
      const node = SKILL_TREE_BY_ID.get(nodeId);
      const rank = Math.max(0, Math.floor(Number(value) || 0));
      if (node && rank > 0) ranks[nodeId] = Math.min(node.maxRank, rank);
    });
  }

  // v1 saves stored the three prototype upgrade tracks separately. Mirror that
  // progress into their stable tree nodes without charging the player again.
  const speedRank = Math.max(0, Math.floor(Number(parsed.speedRank) || 0));
  if (!ranks[AUTO_STRIKE_NODE_ID] && speedRank > 0) ranks[AUTO_STRIKE_NODE_ID] = Math.min(3, speedRank);
  const toolRank = Math.max(0, Math.floor(Number(parsed.toolRank) || 0));
  if (toolRank > 0) {
    ranks[TOOL_BENCH_NODE_ID] = 1;
    ranks['tools-wooden-shovel'] = 1;
    ranks[WOODEN_PICKAXE_NODE_ID] = 1;
    ranks['tools-wooden-axe'] = 1;
  }
  if (toolRank > 1) ranks[STONE_TOOL_SET_NODE_ID] = 1;
  if (toolRank > 2) {
    ranks['tools-iron-shovel'] = 1;
    ranks[IRON_PICKAXE_NODE_ID] = 1;
    ranks['tools-iron-axe'] = 1;
  }
  const worldRank = Math.max(0, Math.floor(Number(parsed.worldRank) || 0));
  if (worldRank > 0) ranks[ADJACENT_BLOCK_NODE_ID] = 1;
  if (worldRank > 1) ranks[SURFACE_3X3_NODE_ID] = 1;

  // Branch entries were introduced after the prototype tree. Reveal the entry
  // for any branch that already had progress so existing players keep seeing
  // the path they had already opened without paying again.
  Object.entries(SKILL_TREE_BRANCH_ENTRY_IDS).forEach(([branch, entryId]) => {
    const hasBranchProgress = SKILL_TREE_NODES.some((node) => node.branch === branch && node.id !== entryId && ranks[node.id] > 0);
    if (hasBranchProgress) ranks[entryId] = 1;
  });
  return ranks;
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
  setSkillNodeRank(state, AUTO_STRIKE_NODE_ID, Math.min(3, state.speedRank));
  return true;
}

export function getTool(state: GameState) {
  return TOOL_TIERS[Math.min(state.toolRank, TOOL_TIERS.length - 1)];
}

export function getHarvestPower(state: GameState): number {
  // Offline and automatic gains currently target the starting grass block, so
  // use the tool actually unlocked for that block family rather than a global
  // pickaxe tier that could overstate the player's active capability.
  return getContextTool(state, 'grass').harvestPower;
}

export function getContextTool(state: GameState, blockType: BlockType) {
  const requiredTool = BLOCK_DEFINITIONS[blockType].requiredTool;
  const profile = TOOL_KIND_PROFILES[requiredTool];
  const unlocked = getSkillNodeRank(state, 'tools-iron-' + requiredTool) > 0
    ? { material: 'Iron', harvestPower: 4 }
    : getSkillNodeRank(state, STONE_TOOL_SET_NODE_ID) > 0
      ? { material: 'Stone', harvestPower: 3 }
      : getSkillNodeRank(state, 'tools-wooden-' + requiredTool) > 0
        ? { material: 'Wooden', harvestPower: 2 }
        : null;
  if (!unlocked) return TOOL_KIND_PROFILES.hand;
  return { ...profile, name: `${unlocked.material} ${profile.name}`, harvestPower: unlocked.harvestPower };
}

export interface MiningStats {
  hardness: number;
  breakTimeSeconds: number;
  maxDamage: number;
  strikeDamage: number;
}

export function getNextBlockType(blockType: BlockType): BlockType {
  const index = BLOCK_PROGRESSION.indexOf(blockType);
  if (index < 0) return blockType;
  return BLOCK_PROGRESSION[Math.min(index + 1, BLOCK_PROGRESSION.length - 1)];
}

export function getMiningStats(state: GameState, blockType: BlockType): MiningStats {
  const definition = BLOCK_DEFINITIONS[blockType];
  const tool = getContextTool(state, blockType);
  const correctTool = tool.kind === definition.requiredTool;
  // Minecraft's hardness model is represented here as hardness × 1.5 ÷ tool
  // speed. A usable but non-specialist tool keeps working at a slower rate.
  const breakTimeSeconds = definition.hardness * 1.5 / tool.harvestPower * (correctTool ? 1 : 2);
  return {
    hardness: definition.hardness,
    breakTimeSeconds,
    maxDamage: Math.max(1, Math.ceil(definition.hardness * 10)),
    strikeDamage: Math.max(1, tool.harvestPower),
  };
}

export function harvestResource(state: GameState, blockType: BlockType, amount = 1): void {
  const resource = BLOCK_DEFINITIONS[blockType].resource;
  state.resources[resource] = (state.resources[resource] ?? 0) + amount;
}

export function buyToolUpgrade(state: GameState): boolean {
  const nextTool = TOOL_TIERS[state.toolRank + 1];
  if (!nextTool || state.level < nextTool.requiredLevel || state.craftingPoints < nextTool.cost) {
    return false;
  }

  state.craftingPoints -= nextTool.cost;
  state.toolRank += 1;
  if (state.toolRank >= 1) {
    setSkillNodeRank(state, TOOL_BENCH_NODE_ID, 1);
    setSkillNodeRank(state, 'tools-wooden-shovel', 1);
    setSkillNodeRank(state, WOODEN_PICKAXE_NODE_ID, 1);
    setSkillNodeRank(state, 'tools-wooden-axe', 1);
  }
  if (state.toolRank >= 2) setSkillNodeRank(state, STONE_TOOL_SET_NODE_ID, 1);
  if (state.toolRank >= 3) {
    setSkillNodeRank(state, 'tools-iron-shovel', 1);
    setSkillNodeRank(state, IRON_PICKAXE_NODE_ID, 1);
    setSkillNodeRank(state, 'tools-iron-axe', 1);
  }
  return true;
}

export function getWorldTier(state: GameState) {
  return WORLD_TIERS[Math.min(state.worldRank, WORLD_TIERS.length - 1)];
}

export function buyWorldExpansion(state: GameState, direction: WorldDirection = 'north'): boolean {
  const nextWorld = WORLD_TIERS[state.worldRank + 1];
  if (
    !nextWorld
    || state.level < nextWorld.requiredLevel
    || state.craftingPoints < nextWorld.cost
    || (state.worldRank >= 1 && state.expansionDirections.includes(direction))
  ) {
    return false;
  }

  state.craftingPoints -= nextWorld.cost;
  state.worldRank += 1;
  if (state.worldRank >= 1) {
    expandToFirstAdjacentCell(state, direction);
    setSkillNodeRank(state, ADJACENT_BLOCK_NODE_ID, 1);
    state.worldPower += 1;
  }
  if (state.worldRank >= 2) {
    expandToSurface3x3(state);
    setSkillNodeRank(state, SURFACE_3X3_NODE_ID, 1);
  }
  if (state.worldRank >= 2) state.expansionDirections.push(direction);
  return true;
}

export function loadState(storage: Storage, now = Date.now()): GameState {
  const raw = storage.getItem(SAVE_KEY);
  if (!raw) return freshState(now);

  try {
    const parsed = JSON.parse(raw) as Partial<GameState>;
    const base = freshState(now);
    const skillRanks = migrateSkillRanks(parsed);
    const parsedWorldPower = Number(parsed.worldPower);
    const worldRank = Math.min(WORLD_TIERS.length - 1, Math.max(0, Number(parsed.worldRank) || 0));
    const worldCells = parseWorldCells(parsed.worldCells) ?? legacyWorldCells(worldRank);
    const resources = Object.fromEntries(
      Object.entries(parsed.resources ?? {}).filter(([, value]) => Number.isFinite(Number(value))).map(([key, value]) => [key, Math.max(0, Number(value))]),
    );
    return {
      level: Math.max(1, Number(parsed.level) || base.level),
      xp: Math.max(0, Number(parsed.xp) || 0),
      totalXp: Math.max(0, Number(parsed.totalXp) || 0),
      craftingPoints: Math.max(0, Number(parsed.craftingPoints) || 0),
      speedRank: Math.min(SPEED_RATES.length - 1, Math.max(0, Number(parsed.speedRank) || 0)),
      toolRank: Math.min(TOOL_TIERS.length - 1, Math.max(0, Number(parsed.toolRank) || 0)),
      worldRank,
      worldPower: Number.isFinite(parsedWorldPower)
        ? Math.max(0, parsedWorldPower)
        : Number(parsed.worldRank) > 0 ? 1 : 0,
      worldSeed: Math.max(1, Math.floor(Number(parsed.worldSeed) || base.worldSeed)),
      worldCells,
      undergroundLayer: Math.min(1, Math.max(0, Math.floor(Number(parsed.undergroundLayer) || 0))),
      expansionDirections: Array.isArray(parsed.expansionDirections)
        ? parsed.expansionDirections.filter((direction): direction is WorldDirection => WORLD_DIRECTIONS.includes(direction as WorldDirection)).slice(0, WORLD_TIERS.length - 2)
        : base.expansionDirections,
      resources: { ...base.resources, ...resources },
      blockProgress: parseBlockProgress(parsed.blockProgress),
      skillRanks,
      lastSavedAt: Number(parsed.lastSavedAt) || now,
    };
  } catch {
    return freshState(now);
  }
}

const VALID_BIOMES: readonly BiomeId[] = ['meadow', 'forest', 'desert', 'mountain', 'snow', 'swamp', 'crystal'];

function parseWorldCells(value: unknown): WorldCell[] | null {
  if (!Array.isArray(value)) return null;
  const cells: WorldCell[] = [];
  const seen = new Set<string>();
  value.forEach((candidate) => {
    if (!candidate || typeof candidate !== 'object') return;
    const entry = candidate as Partial<WorldCell>;
    const x = Number(entry.x);
    const z = Number(entry.z);
    if (!Number.isInteger(x) || !Number.isInteger(z)) return;
    const key = worldCellKey(x, z);
    if (seen.has(key)) return;
    seen.add(key);
    cells.push({
      x,
      z,
      biome: VALID_BIOMES.includes(entry.biome as BiomeId) ? entry.biome as BiomeId : 'meadow',
    });
  });
  if (!seen.has(worldCellKey(0, 0))) cells.unshift({ x: 0, z: 0, biome: 'meadow' });
  return cells.length > 0 ? cells : null;
}

function legacyWorldCells(worldRank: number): WorldCell[] {
  if (worldRank <= 0) return [{ x: 0, z: 0, biome: 'meadow' }];
  const cells: WorldCell[] = [];
  for (let x = -1; x <= 1; x += 1) {
    for (let z = -1; z <= 1; z += 1) cells.push({ x, z, biome: 'meadow' });
  }
  return cells;
}

function parseBlockProgress(value: unknown): Record<string, BlockMiningProgress> {
  if (!value || typeof value !== 'object') return {};
  const progress: Record<string, BlockMiningProgress> = {};
  Object.entries(value).forEach(([id, candidate]) => {
    if (!candidate || typeof candidate !== 'object') return;
    const entry = candidate as Partial<BlockMiningProgress>;
    if (!entry.type || (entry.type !== 'deepslate' && !BLOCK_PROGRESSION.includes(entry.type))) return;
    const damage = Number(entry.damage);
    const replacementAt = entry.replacementAt === null ? null : Number(entry.replacementAt);
    progress[id] = {
      type: entry.type,
      ...(entry.stableType && (entry.stableType === 'deepslate' || BLOCK_PROGRESSION.includes(entry.stableType))
        ? { stableType: entry.stableType }
        : {}),
      damage: Number.isFinite(damage) ? Math.max(0, damage) : 0,
      replacementAt: replacementAt !== null && Number.isFinite(replacementAt) ? replacementAt : null,
    };
  });
  return progress;
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
