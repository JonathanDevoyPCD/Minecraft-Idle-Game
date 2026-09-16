import { getSkillNodeCraftingPointCost, SKILL_TREE_BRANCH_ENTRY_IDS, SKILL_TREE_BY_ID, SKILL_TREE_NODES, WORLD_POWER_EXPANSION_NODE_IDS, type SkillDiscoveryRule, type SkillNodeDefinition, type SkillMilestoneRule } from './skill-tree';

export interface GameState {
  schemaVersion: number;
  level: number;
  xp: number;
  totalXp: number;
  craftingPoints: number;
  /** @deprecated Kept as a save-compatibility mirror; Skill Tree ranks are authoritative. */
  speedRank: number;
  /** @deprecated Kept as a save-compatibility mirror; Skill Tree ranks are authoritative. */
  toolRank: number;
  worldRank: number;
  worldPower: number;
  worldSeed: number;
  settlementProgress: number;
  settlementHub: SettlementHubInstance;
  settlementStorage: SettlementStorageInstance;
  population: number;
  completedStoryMilestones: string[];
  chunkSize: number;
  worldCells: WorldCell[];
  pathCells: PathCell[];
  placements: WorldPlacement[];
  availableMineSites: number;
  undergroundLayer: number;
  mines: MineSite[];
  constructionQueue: ConstructionProject[];
  builderSlots: number;
  expansionDirections: WorldDirection[];
  resources: Record<string, number>;
  blockProgress: Record<string, BlockMiningProgress>;
  skillRanks: Record<string, number>;
  /** Direct Mining-menu upgrades, kept separate from the Skill Tree ranks. */
  mineUpgradeRanks?: Record<string, number>;
  lastSavedAt: number;
}

export type ToolKind = 'hand' | 'pickaxe' | 'shovel' | 'axe';
export type BlockType = 'grass' | 'dirt' | 'stone' | 'deepslate' | 'bedrock';
export type WorldDirection = 'north' | 'east' | 'south' | 'west';
export type BiomeId = 'meadow' | 'forest' | 'desert' | 'mountain' | 'snow' | 'swamp' | 'crystal';
export const WORLD_DIRECTIONS: WorldDirection[] = ['north', 'east', 'south', 'west'];
export type PathTier = 'dirt' | 'cobblestone' | 'stone';

export interface PathCell {
  x: number;
  z: number;
  tier: PathTier;
}

export type WorldPlacementKind = 'mine' | 'dwelling' | 'well' | 'farm' | 'tree' | 'animal-pen';
export type BuildingConstructionState = 'complete' | 'building' | 'upgrading';

export interface WorldPlacement {
  id: string;
  kind: WorldPlacementKind;
  x: number;
  z: number;
  width: number;
  depth: number;
  direction: WorldDirection;
  level: number;
  constructionState: BuildingConstructionState;
}

export interface SettlementHubInstance {
  id: 'settlement-hub';
  level: number;
  constructionState: BuildingConstructionState;
}

export interface SettlementStorageInstance {
  id: 'settlement-storage';
  level: number;
  constructionState: BuildingConstructionState;
}

export interface MineSite {
  id: string;
  x: number;
  z: number;
  direction?: WorldDirection;
  cartCount: number;
  storageCarts: number;
  railLevel: number;
  railLength: MineRailLength;
  minerCount: number;
  progressMs: number;
  lastUpdatedAt: number;
  completedTrips: number;
  /** Canonical mine-local inventory. Settlement resources are only changed by collection. */
  inventory: Record<string, number>;
  storageCapacityLevel: number;
}

export type MineCargoKind = 'stone' | 'coal' | 'iron' | 'gold' | 'diamond';
export type MineRailLength = 2 | 3 | 4;
export type MineStorageFillState = 'empty' | 'low' | 'medium' | 'full';

export interface MineProductionResult {
  trips: number;
  xp: number;
  resources: Record<string, number>;
}

export interface ResourceTransferResult {
  transferred: Record<string, number>;
  overflow: Record<string, number>;
}

export interface MineCollectionResult extends ResourceTransferResult {
  mineId: string;
}

export interface WorldCell {
  x: number;
  z: number;
  biome: BiomeId;
}

export type MeadowFeatureKind = 'path' | 'tree' | 'farm' | 'well' | 'dwelling';

export interface MeadowFeature {
  id: string;
  kind: MeadowFeatureKind;
  x: number;
  z: number;
}

export type LivingEntityKind = 'villager' | 'pig' | 'cow' | 'sheep';

export interface LivingEntityPlan {
  id: string;
  kind: LivingEntityKind;
  x: number;
  z: number;
  role?: 'unassigned' | 'miner' | 'farmer' | 'toolsmith';
}

export type ConstructionKind = 'adjacent-cell' | 'surface-3x3' | 'chunk-upgrade' | 'building-build' | 'building-upgrade';
export type ConstructionAction = 'build' | 'upgrade' | 'expand';
export type ConstructionTargetKind = 'building' | 'mine' | 'path' | 'world' | 'hub' | 'storage';
export type ResourceCost = Record<string, number>;

export interface ConstructionProject {
  id: string;
  action: ConstructionAction;
  targetKind: ConstructionTargetKind;
  targetId: string;
  builderId: string | null;
  kind: ConstructionKind;
  startedAt: number;
  completesAt: number;
  durationMs: number;
  cost: ResourceCost;
  direction?: WorldDirection;
}

export interface BuildingDefinition {
  kind: WorldPlacementKind;
  name: string;
  maxLevel: number;
  buildCost: ResourceCost;
  upgradeCosts: readonly ResourceCost[];
  buildDurationMs: number;
  upgradeDurationMs: number;
  settlementProgressOnBuild: number;
  settlementProgressOnUpgrade: number;
}

/** Roadmap-approved Settlement XP rewards for immediate development actions. */
export const SETTLEMENT_DEVELOPMENT_REWARDS = {
  pathBuild: 2,
  pathUpgrade: 2,
  mineBuild: 100,
  mineUpgrade: 100,
  mineStorageUpgrade: 100,
} as const;

export interface SettlementHubBuildingRequirement {
  kind: WorldPlacementKind;
  count: number;
  minimumLevel: number;
}

export interface SettlementHubUpgradeDefinition {
  fromLevel: number;
  toLevel: number;
  targetStageId: SettlementStageId;
  requiredSettlementProgress: number;
  requiredPopulation: number;
  requiredBuildings: readonly SettlementHubBuildingRequirement[];
  requiredResources: ResourceCost;
  requiredStoryMilestones: readonly string[];
  durationMs: number;
  settlementProgressReward: number;
  worldPowerReward: number;
  builderSlots: number;
}

export interface SettlementStorageUpgradeDefinition {
  fromLevel: number;
  toLevel: number;
  capacity: number;
  requiredResources: ResourceCost;
  durationMs: number;
  settlementProgressReward: number;
}

/** Shared building data for the generic construction and upgrade flow. */
export const BUILDING_DEFINITIONS: Readonly<Record<WorldPlacementKind, BuildingDefinition>> = {
  mine: {
    kind: 'mine', name: 'Mine', maxLevel: 1, buildCost: {}, upgradeCosts: [],
    buildDurationMs: 10_000, upgradeDurationMs: 15_000, settlementProgressOnBuild: 100, settlementProgressOnUpgrade: 50,
  },
  dwelling: {
    kind: 'dwelling', name: 'Dwelling', maxLevel: 3, buildCost: { dirt: 10 }, upgradeCosts: [{ cobblestone: 40 }, { cobblestone: 80 }],
    buildDurationMs: 10_000, upgradeDurationMs: 15_000, settlementProgressOnBuild: 100, settlementProgressOnUpgrade: 50,
  },
  well: {
    kind: 'well', name: 'Well', maxLevel: 3, buildCost: { cobblestone: 10 }, upgradeCosts: [{ cobblestone: 40 }, { cobblestone: 80 }],
    buildDurationMs: 10_000, upgradeDurationMs: 15_000, settlementProgressOnBuild: 100, settlementProgressOnUpgrade: 50,
  },
  farm: {
    kind: 'farm', name: 'Farm', maxLevel: 3, buildCost: { dirt: 20 }, upgradeCosts: [{ dirt: 20 }, { dirt: 40 }],
    buildDurationMs: 10_000, upgradeDurationMs: 15_000, settlementProgressOnBuild: 100, settlementProgressOnUpgrade: 50,
  },
  tree: {
    kind: 'tree', name: 'Tree', maxLevel: 1, buildCost: {}, upgradeCosts: [],
    buildDurationMs: 10_000, upgradeDurationMs: 15_000, settlementProgressOnBuild: 25, settlementProgressOnUpgrade: 0,
  },
  'animal-pen': {
    kind: 'animal-pen', name: 'Animal Pen', maxLevel: 3, buildCost: { dirt: 20 }, upgradeCosts: [{ dirt: 20 }, { dirt: 40 }],
    buildDurationMs: 10_000, upgradeDurationMs: 15_000, settlementProgressOnBuild: 100, settlementProgressOnUpgrade: 50,
  },
};

export interface BlockMiningProgress {
  type: BlockType;
  stableType?: BlockType;
  damage: number;
  replacementAt: number | null;
}

export const MINE_TRIP_DURATION_MS = 8_000;
export const MINE_RAIL_LENGTHS: readonly MineRailLength[] = [4, 3, 2];
export const DEFAULT_MINE_RAIL_LENGTH: MineRailLength = 4;
export const MINE_LAYER_NAMES = ['Stone Layer', 'Deepstone Layer', 'Bedrock Boundary'] as const;
export type MineUpgradeId = 'rail-speed';

export type MineProductionTier = 'shallow' | 'iron' | 'redstone' | 'diamond';
export type MineProductionResource =
  | 'cobblestone'
  | 'coal'
  | 'copper'
  | 'deepslate'
  | 'iron'
  | 'redstone'
  | 'lapis'
  | 'gold'
  | 'diamond';

export interface MineOreTableEntry {
  resource: MineProductionResource;
  weight: number;
}

export interface MineProductionDefinition {
  tier: MineProductionTier;
  name: string;
  entries: readonly MineOreTableEntry[];
}

/**
 * The active mine production tables. Weights are balance targets from the
 * roadmap and deliberately exclude Emerald, which is rolled separately.
 */
export const MINE_PRODUCTION_TABLES: readonly MineProductionDefinition[] = [
  {
    tier: 'shallow',
    name: 'Shallow Stone Mine',
    entries: [
      { resource: 'cobblestone', weight: 80 },
      { resource: 'coal', weight: 15 },
      { resource: 'copper', weight: 5 },
    ],
  },
  {
    tier: 'iron',
    name: 'Iron Layer',
    entries: [
      { resource: 'deepslate', weight: 60 },
      { resource: 'coal', weight: 15 },
      { resource: 'copper', weight: 10 },
      { resource: 'iron', weight: 15 },
    ],
  },
  {
    tier: 'redstone',
    name: 'Redstone Layer',
    entries: [
      { resource: 'deepslate', weight: 50 },
      { resource: 'iron', weight: 20 },
      { resource: 'redstone', weight: 12 },
      { resource: 'lapis', weight: 8 },
      { resource: 'gold', weight: 10 },
    ],
  },
  {
    tier: 'diamond',
    name: 'Diamond Layer',
    entries: [
      { resource: 'deepslate', weight: 55 },
      { resource: 'iron', weight: 15 },
      { resource: 'redstone', weight: 10 },
      { resource: 'gold', weight: 10 },
      { resource: 'lapis', weight: 7 },
      { resource: 'diamond', weight: 3 },
    ],
  },
];

/** Capacity is a Skill Tree perk: rank 0 is the baseline one-roll cart. */
export const MINE_CART_CAPACITY_BY_HANDLING_RANK: readonly number[] = [1, 2, 3, 4];

export interface MineUpgradeDefinition {
  id: MineUpgradeId;
  category: 'rails' | 'storage';
  name: string;
  description: string;
  costs: readonly ResourceCost[];
  settlementProgressReward: number;
}
export const MINE_UPGRADES: readonly MineUpgradeDefinition[] = [
  {
    id: 'rail-speed',
    category: 'rails',
    name: 'Powered Rails',
    description: 'Shortens every minecart trip.',
    costs: [{ cobblestone: 40 }, { cobblestone: 100 }, { cobblestone: 250 }],
    settlementProgressReward: SETTLEMENT_DEVELOPMENT_REWARDS.mineUpgrade,
  },
];
export const MINE_STORAGE_BASE_CAPACITY = 100;
export const MINE_STORAGE_CAPACITY_PER_UPGRADE = 100;
export const MINE_STORAGE_UPGRADE_COSTS: readonly ResourceCost[] = [
  { cobblestone: 25 },
  { cobblestone: 75 },
  { cobblestone: 150 },
  { cobblestone: 300 },
];
export const MINE_STORAGE_UPGRADE_SETTLEMENT_PROGRESS = SETTLEMENT_DEVELOPMENT_REWARDS.mineStorageUpgrade;
export const MINE_STORAGE_BASE_FILL_DURATION_MS = 12 * 60 * 1000;
export const MINE_STORAGE_FILL_REDUCTION_PER_MINE_UPGRADE_MS = 25 * 1000;

export function getSettlementStorageCapacity(state: Pick<GameState, 'settlementStorage'>): number {
  const level = Math.max(1, Math.floor(Number(state.settlementStorage.level) || 1));
  const definition = SETTLEMENT_STORAGE_LEVELS[Math.min(SETTLEMENT_STORAGE_LEVELS.length - 1, level - 1)];
  return definition.capacity;
}

export function getSettlementStorageUpgrade(
  state: Pick<GameState, 'settlementStorage'>,
): SettlementStorageUpgradeDefinition | null {
  const fromLevel = Math.max(1, Math.floor(Number(state.settlementStorage.level) || 1));
  const target = SETTLEMENT_STORAGE_LEVELS.find((definition) => definition.level === fromLevel + 1);
  if (!target?.upgradeCost || !target.upgradeDurationMs) return null;
  return {
    fromLevel,
    toLevel: target.level,
    capacity: target.capacity,
    requiredResources: { ...target.upgradeCost },
    durationMs: target.upgradeDurationMs,
    settlementProgressReward: target.settlementProgressReward ?? 0,
  };
}

export interface SettlementStorageUpgradeStatus {
  definition: SettlementStorageUpgradeDefinition | null;
  ready: boolean;
  missing: string[];
}

export function getSettlementStorageUpgradeStatus(
  state: Pick<GameState, 'settlementStorage' | 'resources'>,
): SettlementStorageUpgradeStatus {
  const definition = getSettlementStorageUpgrade(state);
  if (!definition) return { definition: null, ready: false, missing: [] };
  const missing: string[] = [];
  if (state.settlementStorage.constructionState !== 'complete') missing.push('Current storage upgrade must finish');
  Object.entries(definition.requiredResources).forEach(([resource, amount]) => {
    if ((state.resources[resource] ?? 0) < amount) missing.push(`${amount.toLocaleString()} ${resource}`);
  });
  return { definition, ready: missing.length === 0, missing };
}

export function getStoredResourceTotal(state: Pick<GameState, 'resources'>): number {
  return Object.values(state.resources).reduce((total, value) => total + Math.max(0, Math.floor(Number(value) || 0)), 0);
}

export function getAvailableSettlementStorage(
  state: Pick<GameState, 'resources' | 'settlementStorage'>,
): number {
  return Math.max(0, getSettlementStorageCapacity(state) - getStoredResourceTotal(state));
}

export function addSettlementResource(state: GameState, resource: string, amount = 1): number {
  const requested = Math.max(0, Math.floor(Number(amount) || 0));
  const transferred = Math.min(requested, getAvailableSettlementStorage(state));
  if (transferred > 0) state.resources[resource] = (state.resources[resource] ?? 0) + transferred;
  return transferred;
}

export function transferResourcesToSettlement(
  state: GameState,
  resources: Readonly<Record<string, number>>,
): ResourceTransferResult {
  const transferred: Record<string, number> = {};
  const overflow: Record<string, number> = {};
  Object.entries(resources).forEach(([resource, amount]) => {
    const requested = Math.max(0, Math.floor(Number(amount) || 0));
    const accepted = addSettlementResource(state, resource, requested);
    if (accepted > 0) transferred[resource] = accepted;
    if (requested > accepted) overflow[resource] = requested - accepted;
  });
  return { transferred, overflow };
}

const MINE_ID = 'starter-mine';
const MINE_MINER_NODE_ID = 'automation-miner-helper';

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
  bedrock: { name: 'Bedrock Boundary', requiredTool: 'pickaxe', resource: 'bedrock', resourceName: 'Bedrock', hardness: Number.POSITIVE_INFINITY, description: 'A permanent boundary. It cannot be harvested.' },
} as const;

export const BLOCK_PROGRESSION: readonly BlockType[] = ['dirt', 'grass', 'stone'];

const isTestingSurface = typeof window !== 'undefined' && window.location.pathname.includes('/testing/');
export const SAVE_KEY = isTestingSurface ? 'idlecraft-testing-save-v4' : 'idlecraft-save-v4';
export const SAVE_SCHEMA_VERSION = 9;
export const LEGACY_SAVE_SCHEMA_VERSION = 7;
export const LEGACY_SAVE_SCHEMA_VERSIONS: readonly number[] = [4, 5, 6, 7, 8];
export const STARTING_CHUNK_SIZE = 7;
export const STARTING_PATH_CELLS: readonly PathCell[] = [
  { x: 0, z: 3, tier: 'dirt' },
  { x: 1, z: 3, tier: 'dirt' },
  { x: 2, z: 3, tier: 'dirt' },
];
export const PATH_TIERS: readonly { tier: PathTier; requiredResource?: string; resourceCost: number; description: string }[] = [
  { tier: 'dirt', resourceCost: 0, description: 'A simple route that keeps villagers moving.' },
  { tier: 'cobblestone', requiredResource: 'cobblestone', resourceCost: 8, description: 'A durable route that improves settlement traffic.' },
  { tier: 'stone', requiredResource: 'cobblestone', resourceCost: 16, description: 'A finished route prepared for a larger settlement.' },
];
export const DIRT_PATH_BUILD_COST = 2;
export const SETTLEMENT_STORAGE_LEVELS = [
  { level: 1, capacity: 500, upgradeCost: null, upgradeDurationMs: 0, settlementProgressReward: 0 },
  { level: 2, capacity: 1_500, upgradeCost: { dirt: 100, cobblestone: 100 }, upgradeDurationMs: 30_000, settlementProgressReward: 100 },
  { level: 3, capacity: 5_000, upgradeCost: { dirt: 250, cobblestone: 500 }, upgradeDurationMs: 60_000, settlementProgressReward: 250 },
  { level: 4, capacity: 10_000, upgradeCost: { dirt: 1_000, cobblestone: 2_500 }, upgradeDurationMs: 120_000, settlementProgressReward: 500 },
] as const;
export const WORLD_PLACEMENT_DEFINITIONS: Readonly<Record<WorldPlacementKind, { width: number; depth: number; requiresPath: boolean }>> = {
  mine: { width: 1, depth: 4, requiresPath: true },
  dwelling: { width: 2, depth: 2, requiresPath: true },
  well: { width: 1, depth: 1, requiresPath: true },
  farm: { width: 2, depth: 2, requiresPath: true },
  tree: { width: 1, depth: 1, requiresPath: false },
  'animal-pen': { width: 2, depth: 2, requiresPath: true },
};

export type BuildItemId = 'mine' | 'path' | 'path-upgrade' | 'farm' | 'smithing' | 'houses' | 'animals' | 'science';
export type UnlockPrerequisiteKind = 'skill' | 'settlement-stage' | 'level' | 'resource';

export interface UnlockPrerequisite {
  kind: UnlockPrerequisiteKind;
  id?: string;
  required: number;
  label: string;
}

export interface BuildItemUnlockDefinition {
  id: BuildItemId;
  label: string;
  prerequisites: readonly UnlockPrerequisite[];
}

// The registry is intentionally data-driven so every buildable can share the
// same unlock flow as the mine. Future item definitions can add requirements
// here without adding another one-off conditional to the UI or game loop.
export const BUILD_ITEM_UNLOCKS: readonly BuildItemUnlockDefinition[] = [
  { id: 'mine', label: 'Mine', prerequisites: [{ kind: 'skill', id: 'world-cave-entrance', required: 1, label: 'Mine Entrance skill' }] },
  { id: 'path', label: 'Path', prerequisites: [] },
  { id: 'path-upgrade', label: 'Path Upgrade', prerequisites: [{ kind: 'resource', id: 'cobblestone', required: 8, label: '8 cobblestone' }] },
  { id: 'farm', label: 'Farm', prerequisites: [{ kind: 'settlement-stage', id: 'hamlet', required: 1, label: 'Settlement Hub: Hamlet' }, { kind: 'skill', id: 'life-crops', required: 1, label: 'Crops skill' }] },
  { id: 'smithing', label: 'Smithing', prerequisites: [{ kind: 'settlement-stage', id: 'village', required: 1, label: 'Settlement Hub: Village' }, { kind: 'skill', id: 'tools-tool-bench', required: 1, label: 'Tool Bench skill' }] },
  { id: 'houses', label: 'Houses', prerequisites: [{ kind: 'settlement-stage', id: 'hamlet', required: 1, label: 'Settlement Hub: Hamlet' }, { kind: 'skill', id: 'life-villager-housing', required: 1, label: 'Villager Housing skill' }] },
  { id: 'animals', label: 'Animals', prerequisites: [{ kind: 'settlement-stage', id: 'village', required: 1, label: 'Settlement Hub: Village' }, { kind: 'skill', id: 'life-animals', required: 1, label: 'Animals skill' }] },
  { id: 'science', label: 'Science', prerequisites: [{ kind: 'settlement-stage', id: 'small-town', required: 1, label: 'Settlement Hub: Small Town' }, { kind: 'skill', id: 'materials-redstone', required: 1, label: 'Redstone skill' }] },
];
export const SPEED_RATES = [1, 1.5, 2, 2.5, 3.25];
export const TOOL_TIERS = [
  { kind: 'hand', material: 'Bare', name: 'Bare Hands', requiredLevel: 1, cost: 0, harvestPower: 1, description: 'Harvest basic blocks by hand.' },
  { kind: 'pickaxe', material: 'Wooden', name: 'Wooden Pickaxe', requiredLevel: 2, cost: 1, harvestPower: 2, description: 'Harvests 2 XP per strike and unlocks wooden tool forms.' },
  { kind: 'pickaxe', material: 'Stone', name: 'Stone Pickaxe', requiredLevel: 4, cost: 2, harvestPower: 3, description: 'Harvests 3 XP per strike and reaches deeper materials.' },
  { kind: 'pickaxe', material: 'Iron', name: 'Iron Pickaxe', requiredLevel: 6, cost: 3, harvestPower: 4, description: 'Harvests 4 XP per strike and prepares the world for rare ores.' },
] as const;
export const WORLD_TIERS = [
  { name: 'Starting Chunk 7×7', requiredLevel: 1, cost: 0, blockCount: 49, description: 'A roomy meadow with a three-tile starter path.' },
  { name: 'Chunk Expansion 9×9', requiredLevel: 3, cost: 1, blockCount: 81, description: 'Add a new perimeter ring around the starting settlement.' },
  { name: 'Chunk Expansion 11×11', requiredLevel: 6, cost: 2, blockCount: 121, description: 'Open another perimeter ring for the growing village.' },
] as const;

export type SettlementStageId = 'dwelling' | 'hamlet' | 'village' | 'small-town' | 'town' | 'city' | 'large-city' | 'endless';

export interface SettlementStageDefinition {
  id: SettlementStageId;
  name: string;
  requiredProgress: number;
  requiredWorldRank: number;
  description: string;
}

export const SETTLEMENT_STAGES: readonly SettlementStageDefinition[] = [
  { id: 'dwelling', name: 'Dwelling', requiredProgress: 0, requiredWorldRank: 0, description: 'A first foothold for the growing world.' },
  { id: 'hamlet', name: 'Hamlet', requiredProgress: 500, requiredWorldRank: 1, description: 'A few connected plots now form a small community.' },
  { id: 'village', name: 'Village', requiredProgress: 2_000, requiredWorldRank: 2, description: 'The settlement has room for dedicated homes and work.' },
  { id: 'small-town', name: 'Small Town', requiredProgress: 7_500, requiredWorldRank: 2, description: 'A dependable settlement with several working districts.' },
  { id: 'town', name: 'Town', requiredProgress: 25_000, requiredWorldRank: 2, description: 'A durable center of trade, craft, and exploration.' },
  { id: 'city', name: 'City', requiredProgress: 75_000, requiredWorldRank: 2, description: 'A mature settlement with a broad connected world.' },
  { id: 'large-city', name: 'Large City', requiredProgress: 200_000, requiredWorldRank: 2, description: 'A major living world built over a long campaign.' },
  { id: 'endless', name: 'Endless Mode', requiredProgress: 500_000, requiredWorldRank: 2, description: 'The settlement loop continues without a final cap.' },
] as const;

export interface SettlementHubConsequenceDefinition {
  hubLevel: number;
  mineSiteCapacity: number;
  traderUnlocked: boolean;
}

/** Derived gates owned by the Hub, kept in one registry with no extra save fields. */
export const SETTLEMENT_HUB_CONSEQUENCES: readonly SettlementHubConsequenceDefinition[] = [
  { hubLevel: 1, mineSiteCapacity: 1, traderUnlocked: false },
  { hubLevel: 2, mineSiteCapacity: 1, traderUnlocked: true },
  { hubLevel: 3, mineSiteCapacity: 1, traderUnlocked: true },
  { hubLevel: 4, mineSiteCapacity: 2, traderUnlocked: true },
  { hubLevel: 5, mineSiteCapacity: 2, traderUnlocked: true },
  { hubLevel: 6, mineSiteCapacity: 3, traderUnlocked: true },
  { hubLevel: 7, mineSiteCapacity: 3, traderUnlocked: true },
  { hubLevel: 8, mineSiteCapacity: 3, traderUnlocked: true },
] as const;

/**
 * Hub requirements are intentionally data rather than stage-threshold logic.
 * Later slices can add storage, population and story systems without adding
 * another progression path to the game loop.
 */
export const SETTLEMENT_HUB_UPGRADES: readonly SettlementHubUpgradeDefinition[] = [
  {
    fromLevel: 1, toLevel: 2, targetStageId: 'hamlet', requiredSettlementProgress: 500, requiredPopulation: 0,
    requiredBuildings: [{ kind: 'mine', count: 1, minimumLevel: 1 }], requiredResources: { dirt: 50, cobblestone: 50 },
    requiredStoryMilestones: [], durationMs: 30_000, settlementProgressReward: 500, worldPowerReward: 1, builderSlots: 2,
  },
  {
    fromLevel: 2, toLevel: 3, targetStageId: 'village', requiredSettlementProgress: 2_000, requiredPopulation: 1,
    requiredBuildings: [{ kind: 'dwelling', count: 1, minimumLevel: 1 }, { kind: 'well', count: 1, minimumLevel: 1 }, { kind: 'farm', count: 1, minimumLevel: 1 }],
    requiredResources: { dirt: 100, cobblestone: 200 }, requiredStoryMilestones: ['chapter-3-place-to-stay'], durationMs: 120_000, settlementProgressReward: 750, worldPowerReward: 1, builderSlots: 2,
  },
  {
    fromLevel: 3, toLevel: 4, targetStageId: 'small-town', requiredSettlementProgress: 7_500, requiredPopulation: 4,
    requiredBuildings: [{ kind: 'mine', count: 2, minimumLevel: 1 }, { kind: 'farm', count: 2, minimumLevel: 1 }, { kind: 'animal-pen', count: 1, minimumLevel: 1 }],
    requiredResources: { dirt: 250, cobblestone: 500 }, requiredStoryMilestones: ['chapter-7-deep-world'], durationMs: 300_000, settlementProgressReward: 1_000, worldPowerReward: 1, builderSlots: 3,
  },
  {
    fromLevel: 4, toLevel: 5, targetStageId: 'town', requiredSettlementProgress: 25_000, requiredPopulation: 8,
    requiredBuildings: [{ kind: 'dwelling', count: 4, minimumLevel: 1 }, { kind: 'farm', count: 2, minimumLevel: 2 }, { kind: 'well', count: 1, minimumLevel: 2 }],
    requiredResources: { dirt: 500, cobblestone: 1_000 }, requiredStoryMilestones: ['chapter-5-iron-below'], durationMs: 600_000, settlementProgressReward: 1_500, worldPowerReward: 1, builderSlots: 3,
  },
  {
    fromLevel: 5, toLevel: 6, targetStageId: 'city', requiredSettlementProgress: 75_000, requiredPopulation: 16,
    requiredBuildings: [{ kind: 'mine', count: 3, minimumLevel: 1 }, { kind: 'dwelling', count: 6, minimumLevel: 2 }, { kind: 'farm', count: 3, minimumLevel: 2 }],
    requiredResources: { dirt: 1_000, cobblestone: 2_500 }, requiredStoryMilestones: ['chapter-8-diamonds'], durationMs: 1_200_000, settlementProgressReward: 2_000, worldPowerReward: 1, builderSlots: 3,
  },
  {
    fromLevel: 6, toLevel: 7, targetStageId: 'large-city', requiredSettlementProgress: 200_000, requiredPopulation: 30,
    requiredBuildings: [{ kind: 'dwelling', count: 10, minimumLevel: 2 }, { kind: 'farm', count: 5, minimumLevel: 3 }, { kind: 'animal-pen', count: 3, minimumLevel: 2 }],
    requiredResources: { dirt: 2_000, cobblestone: 5_000 }, requiredStoryMilestones: ['chapter-9-living-world'], durationMs: 2_400_000, settlementProgressReward: 3_000, worldPowerReward: 1, builderSlots: 4,
  },
  {
    fromLevel: 7, toLevel: 8, targetStageId: 'endless', requiredSettlementProgress: 500_000, requiredPopulation: 50,
    requiredBuildings: [{ kind: 'dwelling', count: 15, minimumLevel: 3 }, { kind: 'farm', count: 8, minimumLevel: 3 }, { kind: 'well', count: 3, minimumLevel: 3 }],
    requiredResources: { dirt: 5_000, cobblestone: 10_000 }, requiredStoryMilestones: ['chapter-10-beyond-horizon'], durationMs: 3_600_000, settlementProgressReward: 5_000, worldPowerReward: 1, builderSlots: 5,
  },
] as const;

const SETTLEMENT_PROGRESS_BY_CONSTRUCTION: Record<ConstructionKind, number> = {
  // World expansion is still a completed construction, but it no longer
  // generates Settlement XP by itself. Development rewards come from the
  // settlement structures and infrastructure that make the world meaningful.
  'adjacent-cell': 0,
  'surface-3x3': 0,
  'chunk-upgrade': 0,
  'building-build': 0,
  'building-upgrade': 0,
};

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
  const worldCells = createSquareChunkCells(STARTING_CHUNK_SIZE);
  const state: GameState = {
    schemaVersion: SAVE_SCHEMA_VERSION,
    level: 1,
    xp: 0,
    totalXp: 0,
    craftingPoints: 0,
    speedRank: 0,
    toolRank: 0,
    worldRank: 0,
    worldPower: 0,
    worldSeed: 184731,
    settlementProgress: 0,
    settlementHub: { id: 'settlement-hub', level: 1, constructionState: 'complete' },
    settlementStorage: { id: 'settlement-storage', level: 1, constructionState: 'complete' },
    population: 0,
    completedStoryMilestones: [],
    chunkSize: STARTING_CHUNK_SIZE,
    worldCells,
    pathCells: STARTING_PATH_CELLS.map((cell) => ({ ...cell })),
    placements: [],
    availableMineSites: 1,
    undergroundLayer: 0,
    mines: [],
    constructionQueue: [],
    builderSlots: 1,
    expansionDirections: [],
    resources: { dirt: 0, cobblestone: 0 },
    blockProgress: {},
    skillRanks: {},
    mineUpgradeRanks: {},
    lastSavedAt: now,
  };
  syncAutomaticSkillNodes(state);
  return state;
}

export function createSquareChunkCells(size: number, biome: BiomeId = 'meadow'): WorldCell[] {
  const safeSize = Math.max(1, Math.floor(size));
  const start = -Math.floor(safeSize / 2);
  return Array.from({ length: safeSize * safeSize }, (_, index) => ({
    x: start + (index % safeSize),
    z: start + Math.floor(index / safeSize),
    biome,
  }));
}

export function getChunkBounds(state: Pick<GameState, 'worldCells'>): { minX: number; maxX: number; minZ: number; maxZ: number } {
  const cells = state.worldCells.length > 0 ? state.worldCells : [{ x: 0, z: 0, biome: 'meadow' as const }];
  return {
    minX: Math.min(...cells.map((cell) => cell.x)),
    maxX: Math.max(...cells.map((cell) => cell.x)),
    minZ: Math.min(...cells.map((cell) => cell.z)),
    maxZ: Math.max(...cells.map((cell) => cell.z)),
  };
}

export function getPathCell(state: Pick<GameState, 'pathCells'>, x: number, z: number): PathCell | undefined {
  return state.pathCells.find((cell) => cell.x === x && cell.z === z);
}

export function isPathCell(state: Pick<GameState, 'pathCells'>, x: number, z: number): boolean {
  return Boolean(getPathCell(state, x, z));
}

export function getMineFootprint(
  x: number,
  z: number,
  direction: WorldDirection = 'south',
  railLength: MineRailLength = DEFAULT_MINE_RAIL_LENGTH,
): Array<{ x: number; z: number }> {
  const offset = getWorldDirectionOffset(direction);
  return Array.from({ length: railLength }, (_, index) => ({ x: x + offset.x * index, z: z + offset.z * index }));
}

function getWorldDirectionOffset(direction: WorldDirection): { x: number; z: number } {
  return direction === 'north'
    ? { x: 0, z: -1 }
    : direction === 'east'
      ? { x: 1, z: 0 }
      : direction === 'west'
        ? { x: -1, z: 0 }
        : { x: 0, z: 1 };
}

export function getMineRailPathConnection(
  state: Pick<GameState, 'pathCells'>,
  x: number,
  z: number,
  direction: WorldDirection = 'south',
  railLength: MineRailLength = DEFAULT_MINE_RAIL_LENGTH,
): { railIndex: number; pathX: number; pathZ: number } | null {
  const footprint = getMineFootprint(x, z, direction, railLength);
  const railIndex = footprint.length - 1;
  const terminal = footprint[railIndex];
  const offset = getWorldDirectionOffset(direction);
  const pathX = terminal.x + offset.x;
  const pathZ = terminal.z + offset.z;
  return isPathCell(state, pathX, pathZ) ? { railIndex, pathX, pathZ } : null;
}

function areAdjacentToPath(state: Pick<GameState, 'pathCells'>, footprint: readonly { x: number; z: number }[]): boolean {
  return footprint.some((cell) => WORLD_DIRECTIONS.some((direction) => {
    const offset = getWorldDirectionOffset(direction);
    return isPathCell(state, cell.x + offset.x, cell.z + offset.z);
  }));
}

export function getPlacementFootprint(placement: Pick<WorldPlacement, 'x' | 'z' | 'width' | 'depth' | 'direction'>): Array<{ x: number; z: number }> {
  const horizontal = placement.direction === 'east' || placement.direction === 'west';
  const width = horizontal ? placement.depth : placement.width;
  const depth = horizontal ? placement.width : placement.depth;
  const stepX = placement.direction === 'west' ? -1 : 1;
  const stepZ = placement.direction === 'north' ? -1 : 1;
  return Array.from({ length: width * depth }, (_, index) => ({
    x: placement.x + (horizontal ? stepX * Math.floor(index / depth) : index % width),
    z: placement.z + (horizontal ? index % depth : stepZ * Math.floor(index / width)),
  }));
}

export function createWorldPlacement(
  kind: WorldPlacementKind,
  id: string,
  x: number,
  z: number,
  direction: WorldDirection = 'south',
  railLength: MineRailLength = DEFAULT_MINE_RAIL_LENGTH,
): WorldPlacement {
  const definition = WORLD_PLACEMENT_DEFINITIONS[kind];
  return {
    id,
    kind,
    x,
    z,
    width: definition.width,
    depth: kind === 'mine' ? railLength : definition.depth,
    direction,
    level: 1,
    constructionState: 'complete',
  };
}

export function canPlaceWorldPlacement(
  state: Pick<GameState, 'worldCells' | 'pathCells' | 'placements'>,
  placement: WorldPlacement,
): boolean {
  if (!Number.isInteger(placement.x) || !Number.isInteger(placement.z) || placement.width < 1 || placement.depth < 1) return false;
  const footprint = getPlacementFootprint(placement);
  const bounds = getChunkBounds(state);
  if (footprint.some((cell) => cell.x < bounds.minX || cell.x > bounds.maxX || cell.z < bounds.minZ || cell.z > bounds.maxZ)) return false;
  if (footprint.some((cell) => isPathCell(state, cell.x, cell.z))) return false;
  const occupied = state.placements
    .filter((candidate) => candidate.id !== placement.id)
    .flatMap((candidate) => getPlacementFootprint(candidate));
  if (occupied.some((cell) => footprint.some((candidate) => candidate.x === cell.x && candidate.z === cell.z))) return false;
  const definition = WORLD_PLACEMENT_DEFINITIONS[placement.kind];
  return !definition.requiresPath || areAdjacentToPath(state, footprint);
}

export function placeWorldPlacement(state: GameState, placement: WorldPlacement): boolean {
  if (!canPlaceWorldPlacement(state, placement)) return false;
  state.placements.push({ ...placement });
  return true;
}

/** Validate moving an existing placed structure to a new grid origin. */
export function canMoveWorldPlacement(
  state: GameState,
  id: string,
  x: number,
  z: number,
  direction?: WorldDirection,
): boolean {
  const existing = state.placements.find((placement) => placement.id === id);
  if (!existing) return false;
  const nextDirection = direction ?? existing.direction;
  const mine = existing.kind === 'mine' ? state.mines.find((candidate) => candidate.id === id) : undefined;
  const nextPlacement = mine
    ? createWorldPlacement('mine', id, x, z, nextDirection, mine.railLength)
    : { ...existing, x, z, direction: nextDirection };
  const remainingPlacements = state.placements.filter((placement) => placement.id !== id);
  const remainingMines = state.mines.filter((candidate) => candidate.id !== id);
  const validationState = { ...state, placements: remainingPlacements, mines: remainingMines };
  return mine
    ? canPlaceMine(validationState, x, z, nextDirection, mine.railLength)
    : canPlaceWorldPlacement(validationState, nextPlacement);
}

/** Move a structure without resetting any of its runtime state. */
export function moveWorldPlacement(
  state: GameState,
  id: string,
  x: number,
  z: number,
  direction?: WorldDirection,
): boolean {
  if (!canMoveWorldPlacement(state, id, x, z, direction)) return false;
  const placement = state.placements.find((candidate) => candidate.id === id)!;
  placement.x = x;
  placement.z = z;
  placement.direction = direction ?? placement.direction;
  const mine = state.mines.find((candidate) => candidate.id === id);
  if (mine) {
    mine.x = x;
    mine.z = z;
    mine.direction = placement.direction;
  }
  return true;
}

/** Destroy a placed structure and, for mines, release its mine-site slot. */
export function destroyWorldPlacement(state: GameState, id: string): boolean {
  const placementIndex = state.placements.findIndex((placement) => placement.id === id);
  if (placementIndex < 0) return false;
  state.placements.splice(placementIndex, 1);
  const mineIndex = state.mines.findIndex((mine) => mine.id === id);
  if (mineIndex >= 0) state.mines.splice(mineIndex, 1);
  syncAvailableMineSites(state);
  return true;
}

/** A new route must grow from the existing connected path network. */
export function canBuildPathCell(
  state: Pick<GameState, 'worldCells' | 'pathCells' | 'placements'>,
  x: number,
  z: number,
): boolean {
  if (!Number.isInteger(x) || !Number.isInteger(z)) return false;
  if (!state.worldCells.some((cell) => cell.x === x && cell.z === z)) return false;
  if (isPathCell(state, x, z)) return false;
  const occupied = state.placements.flatMap((placement) => getPlacementFootprint(placement));
  if (occupied.some((cell) => cell.x === x && cell.z === z)) return false;
  return WORLD_DIRECTIONS.some((direction) => {
    const offset = getWorldDirectionOffset(direction);
    return isPathCell(state, x + offset.x, z + offset.z);
  });
}

export function buildPathCell(state: GameState, x: number, z: number): boolean {
  if (!canBuildPathCell(state, x, z)) return false;
  if ((state.resources.dirt ?? 0) < DIRT_PATH_BUILD_COST) return false;
  state.resources.dirt -= DIRT_PATH_BUILD_COST;
  state.pathCells.push({ x, z, tier: 'dirt' });
  addSettlementProgress(state, SETTLEMENT_DEVELOPMENT_REWARDS.pathBuild);
  return true;
}

export function canMovePathCell(state: GameState, x: number, z: number, nextX: number, nextZ: number): boolean {
  const source = getPathCell(state, x, z);
  if (!source || !Number.isInteger(nextX) || !Number.isInteger(nextZ)) return false;
  if (x === nextX && z === nextZ) return true;
  const remainingPaths = state.pathCells.filter((cell) => cell !== source);
  const destinationState = { ...state, pathCells: remainingPaths };
  if (!canBuildPathCell(destinationState, nextX, nextZ)) return false;
  return state.mines.every((mine) => getMineRailPathConnection(destinationState, mine.x, mine.z, mine.direction, mine.railLength) !== null);
}

export function movePathCell(state: GameState, x: number, z: number, nextX: number, nextZ: number): boolean {
  if (!canMovePathCell(state, x, z, nextX, nextZ)) return false;
  const path = getPathCell(state, x, z)!;
  path.x = nextX;
  path.z = nextZ;
  return true;
}

export function destroyPathCell(state: GameState, x: number, z: number): boolean {
  const index = state.pathCells.findIndex((cell) => cell.x === x && cell.z === z);
  if (index < 0) return false;
  state.pathCells.splice(index, 1);
  return true;
}

export function getNextPathTier(tier: PathTier): PathTier | null {
  const index = PATH_TIERS.findIndex((entry) => entry.tier === tier);
  return PATH_TIERS[index + 1]?.tier ?? null;
}

export function upgradePathCell(state: GameState, x: number, z: number): boolean {
  const path = getPathCell(state, x, z);
  if (!path) return false;
  const nextTier = getNextPathTier(path.tier);
  if (!nextTier) return false;
  const definition = PATH_TIERS.find((entry) => entry.tier === nextTier)!;
  const resource = definition.requiredResource;
  if (resource && (state.resources[resource] ?? 0) < definition.resourceCost) return false;
  if (resource) state.resources[resource] -= definition.resourceCost;
  path.tier = nextTier;
  addSettlementProgress(state, SETTLEMENT_DEVELOPMENT_REWARDS.pathUpgrade);
  return true;
}

export function canPlaceMine(
  state: Pick<GameState, 'worldCells' | 'pathCells' | 'placements' | 'mines' | 'availableMineSites'>,
  x: number,
  z: number,
  direction: WorldDirection = 'south',
  railLength: MineRailLength = DEFAULT_MINE_RAIL_LENGTH,
): boolean {
  if (getAvailableMineSites(state) <= 0 || !Number.isInteger(x) || !Number.isInteger(z)) return false;
  const footprint = getMineFootprint(x, z, direction, railLength);
  const bounds = getChunkBounds(state);
  if (footprint.some((cell) => cell.x < bounds.minX || cell.x > bounds.maxX || cell.z < bounds.minZ || cell.z > bounds.maxZ)) return false;
  if (footprint.some((cell) => isPathCell(state, cell.x, cell.z))) return false;
  const occupied = state.placements.flatMap((placement) => getPlacementFootprint(placement));
  if (occupied.some((cell) => footprint.some((candidate) => candidate.x === cell.x && candidate.z === cell.z))) return false;
  if (state.mines.some((mine) => getMineFootprint(mine.x, mine.z, mine.direction, mine.railLength).some((cell) => footprint.some((candidate) => candidate.x === cell.x && candidate.z === cell.z)))) return false;
  return Boolean(getMineRailPathConnection(state, x, z, direction, railLength));
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

function seededNoise(seed: number, x: number, z: number): number {
  const raw = Math.sin(seed * 0.017 + x * 12.9898 + z * 78.233) * 43758.5453;
  return raw - Math.floor(raw);
}

export function getMeadowFeaturePlan(worldSeed: number): readonly MeadowFeature[] {
  // The 3x3 meadow is still the current surface size, so settlement features
  // use reserved sub-cell positions instead of competing for the same integer
  // cell. The house occupies the northwest plot, with the well and farm along
  // the southeast edge and trees kept around the outer boundary.
  const treeCandidates = [
    { x: 0.95, z: -0.95 },
    { x: -0.95, z: 0.95 },
  ].sort((a, b) => seededNoise(worldSeed, b.x, b.z) - seededNoise(worldSeed, a.x, a.z));
  return [
    { id: 'path-north', kind: 'path', x: 0, z: -1 },
    { id: 'path-core', kind: 'path', x: 0, z: 0 },
    { id: 'path-south', kind: 'path', x: 0.49, z: 0.95 },
    { id: 'starter-farm', kind: 'farm', x: -0.05, z: 0.95 },
    { id: 'starter-well', kind: 'well', x: 0.95, z: 0.95 },
    { id: 'starter-dwelling', kind: 'dwelling', x: -0.55, z: -0.55 },
    ...treeCandidates.slice(0, 2).map((candidate, index) => ({
      id: `starter-tree-${index}`,
      kind: 'tree' as const,
      x: candidate.x,
      z: candidate.z,
    })),
  ];
}

export function getLivingEntityPlan(state: GameState): readonly LivingEntityPlan[] {
  if (getSettlementStageIndex(state) < 2) return [];
  const entities: LivingEntityPlan[] = [];
  if (getSkillNodeRank(state, 'life-animals') > 0) {
    entities.push({ id: 'starter-pig', kind: 'pig', x: 0.55, z: 0.25 });
    entities.push({ id: 'starter-cow', kind: 'cow', x: 1.05, z: 0.25 });
  }
  if (getSkillNodeRank(state, 'life-animal-pens') > 0) {
    entities.push({ id: 'starter-sheep', kind: 'sheep', x: 0.85, z: -0.1 });
  }
  if (getSkillNodeRank(state, 'life-first-villager') > 0) {
    const role = getSkillNodeRank(state, 'life-specialist-miner') > 0
      ? 'miner'
      : getSkillNodeRank(state, 'life-specialist-farmer') > 0
        ? 'farmer'
        : getSkillNodeRank(state, 'life-toolsmith') > 0
          ? 'toolsmith'
          : 'unassigned';
    entities.push({ id: 'first-villager', kind: 'villager', x: 0.35, z: -1.08, role });
  }
  return entities;
}

export function getStableBlockType(authoredType: BlockType, savedProgress?: Pick<BlockMiningProgress, 'stableType'>): BlockType {
  return savedProgress?.stableType ?? authoredType;
}

export function expandToFirstAdjacentCell(state: GameState, direction: WorldDirection = 'north'): void {
  if (state.chunkSize >= STARTING_CHUNK_SIZE) {
    expandToNextChunk(state);
    return;
  }
  const offsets: Record<WorldDirection, readonly [number, number]> = {
    north: [0, -1],
    east: [1, 0],
    south: [0, 1],
    west: [-1, 0],
  };
  const [x, z] = offsets[direction];
  addWorldCell(state, x, z);
  state.worldRank = Math.max(state.worldRank, 1);
  syncAvailableMineSites(state);
}

export function expandToSurface3x3(state: GameState): void {
  expandToNextChunk(state);
}

export function expandToNextChunk(state: GameState): void {
  const nextSize = Math.max(STARTING_CHUNK_SIZE, state.chunkSize + 2);
  const existingBiomes = new Map(state.worldCells.map((cell) => [worldCellKey(cell.x, cell.z), cell.biome]));
  state.worldCells = createSquareChunkCells(nextSize).map((cell) => ({
    ...cell,
    biome: existingBiomes.get(worldCellKey(cell.x, cell.z)) ?? cell.biome,
  }));
  state.chunkSize = nextSize;
  state.worldRank = Math.max(state.worldRank, Math.floor((nextSize - STARTING_CHUNK_SIZE) / 2));
  syncAvailableMineSites(state);
}

function createMineSite(
  id: string,
  now: number,
  x: number,
  z: number,
  direction: WorldDirection,
  railLength: MineRailLength,
): MineSite {
  return {
    id,
    x,
    z,
    direction,
    cartCount: 1,
    storageCarts: 0,
    railLevel: 0,
    railLength,
    minerCount: 0,
    progressMs: 0,
    lastUpdatedAt: now,
    completedTrips: 0,
    inventory: {},
    storageCapacityLevel: 0,
  };
}

export function unlockStarterMine(
  state: GameState,
  now = Date.now(),
  x = 0,
  z = -1,
  direction: WorldDirection = 'south',
  railLength: MineRailLength = DEFAULT_MINE_RAIL_LENGTH,
): boolean {
  if (!canPlaceMine(state, x, z, direction, railLength)) return false;
  const id = state.mines.length === 0 && !state.placements.some((placement) => placement.id === MINE_ID)
    ? MINE_ID
    : `mine-${state.mines.length + 1}`;
  state.mines.push(createMineSite(id, now, x, z, direction, railLength));
  state.placements.push(createWorldPlacement('mine', id, x, z, direction, railLength));
  addSettlementProgress(state, SETTLEMENT_DEVELOPMENT_REWARDS.mineBuild);
  syncAutomaticSkillNodes(state);
  syncAvailableMineSites(state);
  return true;
}

export function getMineLayer(state: GameState): number {
  return Math.min(2, Math.max(0, Math.floor(state.undergroundLayer)));
}

export function getMineProductionTier(
  state: Pick<GameState, 'undergroundLayer' | 'skillRanks'>,
): MineProductionTier {
  const layer = Math.min(2, Math.max(0, Math.floor(Number(state.undergroundLayer) || 0)));
  if (layer >= 2 && getSkillNodeRank(state, 'materials-diamond') > 0) return 'diamond';
  if (layer >= 2) return 'redstone';
  if (layer >= 1) return 'iron';
  return 'shallow';
}

export function getMineProductionDefinition(
  state: Pick<GameState, 'undergroundLayer' | 'skillRanks'>,
): MineProductionDefinition {
  const tier = getMineProductionTier(state);
  return MINE_PRODUCTION_TABLES.find((definition) => definition.tier === tier) ?? MINE_PRODUCTION_TABLES[0];
}

/** A compact visual fallback for the authored cart contents model. */
export function getMineProductionVisualKind(
  state: Pick<GameState, 'undergroundLayer' | 'skillRanks'>,
): MineCargoKind {
  const resource = getMineProductionDefinition(state).entries[0]?.resource;
  return resource === 'diamond' ? 'diamond' : resource === 'gold' ? 'gold' : 'stone';
}

/** Select one entry from a normalized weighted table without coupling it to rendering. */
export function selectWeightedMineResource(
  entries: readonly MineOreTableEntry[],
  roll: number,
): MineProductionResource {
  const totalWeight = entries.reduce((total, entry) => total + Math.max(0, entry.weight), 0);
  if (totalWeight <= 0 || entries.length === 0) return 'cobblestone';
  const normalizedRoll = Math.min(0.999999999, Math.max(0, Number.isFinite(roll) ? roll : 0));
  let threshold = normalizedRoll * totalWeight;
  for (const entry of entries) {
    threshold -= Math.max(0, entry.weight);
    if (threshold < 0) return entry.resource;
  }
  return entries[entries.length - 1].resource;
}

/**
 * Generate one cart's complete cargo manifest. Each capacity slot gets one
 * weighted ore roll and Emerald is independently evaluated per slot.
 */
export function generateMineCartCargo(
  state: GameState,
  random = Math.random,
  capacity = getMineCartCapacity(state),
): Record<string, number> {
  const cargo: Record<string, number> = {};
  const definition = getMineProductionDefinition(state);
  const safeCapacity = Math.max(1, Math.floor(Number(capacity) || 1));
  for (let rollIndex = 0; rollIndex < safeCapacity; rollIndex += 1) {
    const resource = selectWeightedMineResource(definition.entries, random());
    cargo[resource] = (cargo[resource] ?? 0) + 1;
    if (random() < getMineEmeraldChance(state)) cargo.emerald = (cargo.emerald ?? 0) + 1;
  }
  return cargo;
}

export function getMineStorageCapacity(mine: Pick<MineSite, 'storageCapacityLevel'>): number {
  return MINE_STORAGE_BASE_CAPACITY + Math.max(0, Math.floor(Number(mine.storageCapacityLevel) || 0)) * MINE_STORAGE_CAPACITY_PER_UPGRADE;
}

export function getMineStorageAmount(mine: Pick<MineSite, 'inventory'>): number {
  return Object.values(mine.inventory).reduce((total, value) => total + Math.max(0, Math.floor(Number(value) || 0)), 0);
}

export function getMineStorageContents(mine: Pick<MineSite, 'inventory'>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(mine.inventory)
      .map(([resource, amount]) => [resource, Math.max(0, Math.floor(Number(amount) || 0))] as const)
      .filter(([, amount]) => amount > 0),
  );
}

export function getMineStorageCargoKind(
  state: Pick<GameState, 'undergroundLayer' | 'skillRanks'>,
  mine: Pick<MineSite, 'inventory'>,
): MineCargoKind {
  const resourceKinds: ReadonlyArray<[string, MineCargoKind]> = [
    ['diamond', 'diamond'],
    ['gold', 'gold'],
    ['iron', 'iron'],
    ['coal', 'coal'],
    ['copper', 'gold'],
    ['redstone', 'coal'],
    ['lapis', 'diamond'],
    ['deepslate', 'stone'],
    ['cobblestone', 'stone'],
    ['stone', 'stone'],
  ];
  for (const [resource, cargoKind] of resourceKinds) {
    if ((mine.inventory[resource] ?? 0) > 0) return cargoKind;
  }
  const visualResource = getMineProductionDefinition(state).entries[0]?.resource;
  return visualResource === 'diamond' ? 'diamond' : visualResource === 'gold' ? 'gold' : 'stone';
}

export function getMineStorageFillDuration(mine: Pick<MineSite, 'railLevel'>): number {
  const upgrades = Math.max(0, Math.floor(Number(mine.railLevel) || 0));
  return Math.max(60_000, MINE_STORAGE_BASE_FILL_DURATION_MS - upgrades * MINE_STORAGE_FILL_REDUCTION_PER_MINE_UPGRADE_MS);
}

export function getMineStorageFillState(
  amount: number,
  capacity = MINE_STORAGE_BASE_CAPACITY,
): MineStorageFillState {
  const safeCapacity = Math.max(1, capacity);
  const ratio = Math.max(0, Math.min(1, amount / safeCapacity));
  if (ratio <= 0) return 'empty';
  if (ratio < 0.6) return 'low';
  if (ratio < 1) return 'medium';
  return 'full';
}

export function getMineStorageUpgradeCost(state: Pick<GameState, 'mines'>, mineId: string): ResourceCost | null {
  const mine = state.mines.find((candidate) => candidate.id === mineId);
  if (!mine) return null;
  const level = Math.max(0, Math.floor(Number(mine.storageCapacityLevel) || 0));
  const cost = MINE_STORAGE_UPGRADE_COSTS[level];
  return cost ? { ...cost } : null;
}

export function buyMineStorageUpgrade(state: GameState, mineId: string): boolean {
  const mine = state.mines.find((candidate) => candidate.id === mineId);
  const cost = getMineStorageUpgradeCost(state, mineId);
  if (!mine || !cost || !canAffordResourceCost(state.resources, cost)) return false;
  payResourceCost(state.resources, cost);
  mine.storageCapacityLevel = Math.max(0, Math.floor(Number(mine.storageCapacityLevel) || 0)) + 1;
  addSettlementProgress(state, MINE_STORAGE_UPGRADE_SETTLEMENT_PROGRESS);
  return true;
}

export function getMineUpgradeRank(
  state: Pick<GameState, 'skillRanks'> & Partial<Pick<GameState, 'mineUpgradeRanks'>>,
  id: MineUpgradeId,
): number {
  return Math.max(0, Math.floor(Number(state.mineUpgradeRanks?.[id]) || 0));
}

export function getMineUpgradeDefinition(id: MineUpgradeId): MineUpgradeDefinition | undefined {
  return MINE_UPGRADES.find((upgrade) => upgrade.id === id);
}

export function getMineUpgradeCost(
  state: Pick<GameState, 'skillRanks'> & Partial<Pick<GameState, 'mineUpgradeRanks'>>,
  id: MineUpgradeId,
): ResourceCost | null {
  const definition = getMineUpgradeDefinition(id);
  if (!definition) return null;
  const rank = getMineUpgradeRank(state, id);
  const cost = definition.costs[rank];
  return cost ? { ...cost } : null;
}

export function buyMineUpgrade(state: GameState, id: MineUpgradeId): boolean {
  if (state.mines.length === 0) return false;
  const cost = getMineUpgradeCost(state, id);
  if (!cost || !canAffordResourceCost(state.resources, cost)) return false;
  payResourceCost(state.resources, cost);
  state.mineUpgradeRanks ??= {};
  state.mineUpgradeRanks[id] = getMineUpgradeRank(state, id) + 1;
  if (id === 'rail-speed') {
    state.mines.forEach((mine) => {
      mine.railLevel = getMineUpgradeRank(state, 'rail-speed');
    });
  }
  const definition = getMineUpgradeDefinition(id);
  addSettlementProgress(state, definition?.settlementProgressReward ?? 0);
  return true;
}

export function getMineCartCount(_state: GameState): number {
  // A mine has one physical cart. Cart-related progression can improve the
  // route later, but it must never spawn additional carts on the same mine.
  return 1;
}

export function getMineCartCapacity(state: Pick<GameState, 'skillRanks'>): number {
  const handlingRank = Math.min(
    MINE_CART_CAPACITY_BY_HANDLING_RANK.length - 1,
    getSkillNodeRank(state, 'automation-mine-carts'),
  );
  return MINE_CART_CAPACITY_BY_HANDLING_RANK[handlingRank] ?? MINE_CART_CAPACITY_BY_HANDLING_RANK[0];
}

export function getMineTripDuration(state: GameState): number {
  const railRanks = getMineUpgradeRank(state, 'rail-speed');
  return Math.max(2_000, MINE_TRIP_DURATION_MS / (1 + railRanks * 0.25));
}

export interface MineCartTravelState {
  phase: number;
  travellingToMine: boolean;
  travel: number;
}

/** Project the persisted production clock into the current minecart trip. */
export function getMineCartTravelState(
  state: GameState,
  mine: Pick<MineSite, 'progressMs' | 'lastUpdatedAt'>,
  now = Date.now(),
): MineCartTravelState {
  const tripDuration = getMineTripDuration(state);
  const projectedProgressMs = Math.max(0, mine.progressMs) + Math.max(0, now - mine.lastUpdatedAt);
  const phase = (projectedProgressMs % tripDuration) / tripDuration;
  const travellingToMine = phase < 0.5;
  const travel = travellingToMine ? phase * 2 : 1 - (phase - 0.5) * 2;
  return { phase, travellingToMine, travel };
}

/** Level-one mines have a rare 0.08% Emerald drop chance; rail upgrades improve it slowly. */
export function getMineEmeraldChance(state: GameState): number {
  const railRanks = getMineUpgradeRank(state, 'rail-speed');
  return Math.min(0.01, 0.0008 + railRanks * 0.0002);
}

function addMineResource(result: MineProductionResult, resource: string, amount: number): void {
  if (amount <= 0) return;
  result.resources[resource] = (result.resources[resource] ?? 0) + amount;
}

function depositMineCargo(
  mine: MineSite,
  cargo: Readonly<Record<string, number>>,
  remainingCapacity: number,
  result: MineProductionResult,
): number {
  let acceptedTotal = 0;
  Object.entries(cargo).forEach(([resource, amount]) => {
    const accepted = Math.min(
      Math.max(0, Math.floor(Number(amount) || 0)),
      Math.max(0, remainingCapacity - acceptedTotal),
    );
    if (accepted <= 0) return;
    mine.inventory[resource] = (mine.inventory[resource] ?? 0) + accepted;
    addMineResource(result, resource, accepted);
    acceptedTotal += accepted;
  });
  return acceptedTotal;
}

export function advanceMineOperations(state: GameState, now = Date.now(), random = Math.random): MineProductionResult {
  const result: MineProductionResult = { trips: 0, xp: 0, resources: {} };
  const layer = getMineLayer(state);
  const tripDuration = getMineTripDuration(state);
  state.mines.forEach((mine) => {
    mine.cartCount = 1;
    mine.storageCarts = 0;
    mine.railLevel = getMineUpgradeRank(state, 'rail-speed');
    mine.minerCount = getSkillNodeRank(state, MINE_MINER_NODE_ID) > 0 ? 1 : 0;
    const storageCapacity = getMineStorageCapacity(mine);
    const currentStorage = getMineStorageAmount(mine);
    if (currentStorage >= storageCapacity) {
      // Persist the pause watermark without rewinding the cart's phase. A
      // collection action can resume from this exact delivery boundary.
      mine.lastUpdatedAt = now;
      return;
    }
    const elapsed = Math.max(0, Math.min(8 * 60 * 60 * 1000, now - mine.lastUpdatedAt));
    const totalProgress = mine.progressMs + elapsed;
    // The loop begins at the path: an empty cart travels to the mine, loads,
    // then delivers the ore back to the rail end. Credit the delivery only when
    // that full loop reaches the path-facing terminal.
    const completedArrivals = Math.floor(totalProgress / tripDuration);
    mine.lastUpdatedAt = now;
    if (completedArrivals <= 0) {
      mine.progressMs = totalProgress;
      return;
    }

    let acceptedTrips = 0;
    let storageAmount = currentStorage;
    for (let trip = 0; trip < completedArrivals; trip += 1) {
      const cargo = generateMineCartCargo(state, random);
      const acceptedAmount = depositMineCargo(mine, cargo, storageCapacity - storageAmount, result);
      if (acceptedAmount <= 0) break;
      storageAmount += acceptedAmount;
      acceptedTrips += 1;
    }
    mine.completedTrips += acceptedTrips;
    result.trips += acceptedTrips;
    result.xp += acceptedTrips * (layer >= 1 ? 3 : 2);
    // If storage filled during an elapsed interval, park at the delivery
    // boundary rather than carrying unprocessed trips through the pause.
    mine.progressMs = acceptedTrips < completedArrivals ? 0 : totalProgress - completedArrivals * tripDuration;
  });
  syncAutomaticSkillNodes(state);
  return result;
}

export function collectMineStorage(state: GameState, mineId: string, now = Date.now()): MineCollectionResult {
  const mine = state.mines.find((candidate) => candidate.id === mineId);
  if (!mine) return { mineId, transferred: {}, overflow: {} };
  const transferred: Record<string, number> = {};
  const overflow: Record<string, number> = {};
  Object.entries(getMineStorageContents(mine)).forEach(([resource, amount]) => {
    const accepted = addSettlementResource(state, resource, amount);
    if (accepted > 0) {
      transferred[resource] = accepted;
      mine.inventory[resource] -= accepted;
    }
    if (amount > accepted) overflow[resource] = amount - accepted;
    if ((mine.inventory[resource] ?? 0) <= 0) delete mine.inventory[resource];
  });
  if (getMineStorageAmount(mine) < getMineStorageCapacity(mine)) {
    mine.lastUpdatedAt = now;
  }
  return { mineId, transferred, overflow };
}

export function dispatchMineCart(state: GameState, now = Date.now()): MineProductionResult {
  if (state.mines.length === 0) return { trips: 0, xp: 0, resources: {} };
  state.mines.forEach((mine) => {
    mine.lastUpdatedAt = now;
    mine.progressMs = 0;
  });
  return { trips: 0, xp: 0, resources: {} };
}

export function collectOreBonus(state: GameState, resource: string, amount = 1): number {
  return addSettlementResource(state, resource, amount);
}

export const CONSTRUCTION_DURATIONS_MS: Record<ConstructionKind, number> = {
  'adjacent-cell': 10_000,
  'surface-3x3': 30_000,
  'chunk-upgrade': 45_000,
  'building-build': 10_000,
  'building-upgrade': 15_000,
};

/** Resource costs are owned by the construction registry, not by the UI. */
export const CONSTRUCTION_COSTS: Readonly<Record<ConstructionKind, ResourceCost>> = {
  'adjacent-cell': {},
  'surface-3x3': {},
  'chunk-upgrade': {},
  'building-build': {},
  'building-upgrade': {},
};

export function getBuildingDefinition(kind: WorldPlacementKind): BuildingDefinition {
  return BUILDING_DEFINITIONS[kind];
}

export function canAffordResourceCost(resources: Readonly<Record<string, number>>, cost: ResourceCost): boolean {
  return Object.entries(cost).every(([resource, amount]) => (resources[resource] ?? 0) >= amount);
}

export function payResourceCost(resources: Record<string, number>, cost: ResourceCost): void {
  Object.entries(cost).forEach(([resource, amount]) => {
    resources[resource] = Math.max(0, (resources[resource] ?? 0) - amount);
  });
}

export function getBuildingUpgradeCost(
  state: Pick<GameState, 'placements'>,
  placementId: string,
): ResourceCost | null {
  const placement = state.placements.find((candidate) => candidate.id === placementId);
  if (!placement || placement.constructionState !== 'complete') return null;
  const definition = getBuildingDefinition(placement.kind);
  const cost = definition.upgradeCosts[placement.level - 1];
  return cost ? { ...cost } : null;
}

/**
 * Add a non-mine placement through the shared builder-backed construction
 * queue. Mine placement keeps its established skill/site flow because it
 * also creates the mine runtime record and rail relationship.
 */
export function queueBuildingConstruction(state: GameState, placement: WorldPlacement, now = Date.now()): boolean {
  if (placement.kind === 'mine' || state.placements.some((candidate) => candidate.id === placement.id)) return false;
  if (!canPlaceWorldPlacement(state, placement)) return false;
  const definition = getBuildingDefinition(placement.kind);
  if (!canAffordResourceCost(state.resources, definition.buildCost)) return false;
  const building = { ...placement, level: 1, constructionState: 'building' as const };
  state.placements.push(building);
  const queued = queueConstruction(state, 'building-build', now, undefined, {
    action: 'build',
    targetKind: 'building',
    targetId: placement.id,
    cost: definition.buildCost,
    durationMs: definition.buildDurationMs,
  });
  if (!queued) {
    state.placements.pop();
    return false;
  }
  payResourceCost(state.resources, definition.buildCost);
  return true;
}

export function getBuilderSlotCount(state: Pick<GameState, 'builderSlots'>): number {
  return Math.max(0, Math.floor(Number(state.builderSlots) || 0));
}

export function getActiveBuilderCount(state: Pick<GameState, 'constructionQueue'>): number {
  return new Set(
    state.constructionQueue
      .map((project) => project.builderId)
      .filter((builderId): builderId is string => Boolean(builderId)),
  ).size;
}

export function getAvailableBuilderSlots(state: Pick<GameState, 'builderSlots' | 'constructionQueue'>): number {
  return Math.max(0, getBuilderSlotCount(state) - getActiveBuilderCount(state));
}

function getNextConstructionId(state: Pick<GameState, 'constructionQueue'>, kind: ConstructionKind, targetId: string): string {
  const baseId = `${kind}-${targetId}`;
  if (!state.constructionQueue.some((project) => project.id === baseId)) return baseId;
  let suffix = 2;
  while (state.constructionQueue.some((project) => project.id === `${baseId}-${suffix}`)) suffix += 1;
  return `${baseId}-${suffix}`;
}

function assignQueuedConstruction(state: GameState, now: number): void {
  const assignedBuilderIds = new Set(
    state.constructionQueue
      .map((project) => project.builderId)
      .filter((builderId): builderId is string => Boolean(builderId)),
  );
  for (const project of state.constructionQueue) {
    if (project.builderId || assignedBuilderIds.size >= getBuilderSlotCount(state)) continue;
    const builderId = Array.from({ length: getBuilderSlotCount(state) }, (_, index) => `builder-${index + 1}`)
      .find((candidate) => !assignedBuilderIds.has(candidate));
    if (!builderId) continue;
    project.builderId = builderId;
    project.startedAt = now;
    project.completesAt = now + project.durationMs;
    assignedBuilderIds.add(builderId);
  }
  state.constructionQueue.sort((a, b) => {
    if (Boolean(a.builderId) !== Boolean(b.builderId)) return a.builderId ? -1 : 1;
    return (a.startedAt || Number.POSITIVE_INFINITY) - (b.startedAt || Number.POSITIVE_INFINITY);
  });
}

export function queueConstruction(
  state: GameState,
  kind: ConstructionKind,
  now = Date.now(),
  direction?: WorldDirection,
  metadata?: Partial<Pick<ConstructionProject, 'action' | 'targetKind' | 'targetId' | 'cost' | 'durationMs'>>,
): boolean {
  const action = metadata?.action ?? 'expand';
  const targetKind = metadata?.targetKind ?? 'world';
  const targetId = metadata?.targetId ?? (direction ? `${kind}-${direction}` : kind);
  if (state.constructionQueue.some((project) => project.action === action && project.targetKind === targetKind && project.targetId === targetId)) return false;
  const hasBuilder = getAvailableBuilderSlots(state) > 0;
  const durationMs = metadata?.durationMs ?? CONSTRUCTION_DURATIONS_MS[kind];
  const project: ConstructionProject = {
    id: getNextConstructionId(state, kind, targetId),
    action,
    targetKind,
    targetId,
    builderId: hasBuilder ? null : null,
    kind,
    startedAt: hasBuilder ? now : 0,
    completesAt: hasBuilder ? now + durationMs : 0,
    durationMs,
    cost: { ...(CONSTRUCTION_COSTS[kind] ?? {}), ...(metadata?.cost ?? {}) },
    direction,
  };
  state.constructionQueue.push(project);
  assignQueuedConstruction(state, now);
  return true;
}

/** Queue one level upgrade for a placed building and reserve its resources. */
export function queueBuildingUpgrade(state: GameState, placementId: string, now = Date.now()): boolean {
  const placement = state.placements.find((candidate) => candidate.id === placementId);
  const cost = getBuildingUpgradeCost(state, placementId);
  if (!placement || !cost || !canAffordResourceCost(state.resources, cost)) return false;
  const definition = getBuildingDefinition(placement.kind);
  if (!queueConstruction(state, 'building-upgrade', now, undefined, {
    action: 'upgrade',
    targetKind: 'building',
    targetId: placementId,
    cost,
    durationMs: definition.upgradeDurationMs,
  })) return false;
  payResourceCost(state.resources, cost);
  placement.constructionState = 'upgrading';
  return true;
}

/** Queue the next Settlement Hub era after all of its requirements are met. */
export function queueSettlementHubUpgrade(state: GameState, now = Date.now()): boolean {
  const status = getSettlementHubUpgradeStatus(state);
  if (!status.definition || !status.ready || !canAffordResourceCost(state.resources, status.definition.requiredResources)) return false;
  if (!queueConstruction(state, 'building-upgrade', now, undefined, {
    action: 'upgrade',
    targetKind: 'hub',
    targetId: state.settlementHub.id,
    cost: status.definition.requiredResources,
    durationMs: status.definition.durationMs,
  })) return false;
  payResourceCost(state.resources, status.definition.requiredResources);
  state.settlementHub.constructionState = 'upgrading';
  return true;
}

/** Queue the next global Settlement Storage capacity upgrade through a builder. */
export function queueSettlementStorageUpgrade(state: GameState, now = Date.now()): boolean {
  const status = getSettlementStorageUpgradeStatus(state);
  if (!status.definition || !status.ready || !canAffordResourceCost(state.resources, status.definition.requiredResources)) return false;
  if (!queueConstruction(state, 'building-upgrade', now, undefined, {
    action: 'upgrade',
    targetKind: 'storage',
    targetId: state.settlementStorage.id,
    cost: status.definition.requiredResources,
    durationMs: status.definition.durationMs,
  })) return false;
  payResourceCost(state.resources, status.definition.requiredResources);
  state.settlementStorage.constructionState = 'upgrading';
  return true;
}

function completeBuildingConstruction(state: GameState, project: ConstructionProject): void {
  const placement = state.placements.find((candidate) => candidate.id === project.targetId);
  if (!placement || project.targetKind !== 'building') return;
  const definition = getBuildingDefinition(placement.kind);
  if (project.action === 'build') {
    placement.level = 1;
    placement.constructionState = 'complete';
    addSettlementProgress(state, definition.settlementProgressOnBuild);
    return;
  }
  if (project.action === 'upgrade') {
    placement.level = Math.min(definition.maxLevel, placement.level + 1);
    placement.constructionState = 'complete';
    addSettlementProgress(state, definition.settlementProgressOnUpgrade);
  }
}

function completeSettlementHubUpgrade(state: GameState, project: ConstructionProject): void {
  if (project.targetKind !== 'hub' || project.action !== 'upgrade' || project.targetId !== state.settlementHub.id) return;
  const definition = SETTLEMENT_HUB_UPGRADES.find((upgrade) => upgrade.fromLevel === state.settlementHub.level);
  if (!definition) return;
  state.settlementHub.level = definition.toLevel;
  state.settlementHub.constructionState = 'complete';
  state.builderSlots = Math.max(state.builderSlots, definition.builderSlots);
  state.worldPower += definition.worldPowerReward;
  addSettlementProgress(state, definition.settlementProgressReward);
  syncAutomaticSkillNodes(state);
}

function completeSettlementStorageUpgrade(state: GameState, project: ConstructionProject): void {
  if (project.targetKind !== 'storage' || project.action !== 'upgrade' || project.targetId !== state.settlementStorage.id) return;
  const definition = getSettlementStorageUpgrade(state);
  if (!definition) return;
  state.settlementStorage.level = definition.toLevel;
  state.settlementStorage.constructionState = 'complete';
  addSettlementProgress(state, definition.settlementProgressReward);
}

export function completeConstructionProjects(state: GameState, now = Date.now()): ConstructionProject[] {
  const completed: ConstructionProject[] = [];
  const dueProjects = state.constructionQueue
    .filter((project) => project.builderId && project.completesAt <= now)
    .sort((a, b) => a.completesAt - b.completesAt);
  dueProjects.forEach((project) => {
    const projectIndex = state.constructionQueue.findIndex((candidate) => candidate.id === project.id);
    if (projectIndex < 0) return;
    state.constructionQueue.splice(projectIndex, 1);
    if (project.kind === 'adjacent-cell') expandToFirstAdjacentCell(state, project.direction ?? 'north');
    if (project.kind === 'surface-3x3' || project.kind === 'chunk-upgrade') expandToNextChunk(state);
    if (project.targetKind === 'hub') completeSettlementHubUpgrade(state, project);
    if (project.targetKind === 'storage') completeSettlementStorageUpgrade(state, project);
    if (project.targetKind === 'building') completeBuildingConstruction(state, project);
    if (project.targetKind !== 'building' && project.targetKind !== 'hub' && project.targetKind !== 'storage') addSettlementProgress(state, SETTLEMENT_PROGRESS_BY_CONSTRUCTION[project.kind]);
    completed.push(project);
  });
  assignQueuedConstruction(state, now);
  return completed;
}

export function addSettlementProgress(state: GameState, amount: number): number {
  const safeAmount = Math.max(0, Math.floor(amount));
  if (safeAmount <= 0) return 0;
  state.settlementProgress += safeAmount;
  syncAvailableMineSites(state);
  return safeAmount;
}

export function getSettlementStage(state: Pick<GameState, 'settlementHub'>): SettlementStageDefinition {
  const hubLevel = Math.max(1, Math.floor(Number(state.settlementHub.level) || 1));
  return SETTLEMENT_STAGES[Math.min(SETTLEMENT_STAGES.length - 1, hubLevel - 1)];
}

export function getSettlementStageIndex(state: Pick<GameState, 'settlementHub'>): number {
  return Math.max(0, Math.min(SETTLEMENT_STAGES.length - 1, Math.floor(Number(state.settlementHub.level) || 1) - 1));
}

export function getSettlementHubConsequences(state: Pick<GameState, 'settlementHub'>): SettlementHubConsequenceDefinition {
  const hubLevel = Math.max(1, Math.floor(Number(state.settlementHub.level) || 1));
  return SETTLEMENT_HUB_CONSEQUENCES[Math.min(SETTLEMENT_HUB_CONSEQUENCES.length - 1, hubLevel - 1)];
}

export function isTraderUnlocked(state: Pick<GameState, 'settlementHub'>): boolean {
  return getSettlementHubConsequences(state).traderUnlocked;
}

export interface SettlementHubUpgradeStatus {
  definition: SettlementHubUpgradeDefinition | null;
  ready: boolean;
  missing: string[];
}

export function getSettlementHubUpgrade(state: Pick<GameState, 'settlementHub'>): SettlementHubUpgradeDefinition | null {
  return SETTLEMENT_HUB_UPGRADES.find((upgrade) => upgrade.fromLevel === state.settlementHub.level) ?? null;
}

export function getSettlementHubUpgradeStatus(
  state: Pick<GameState, 'settlementHub' | 'settlementProgress' | 'population' | 'resources' | 'placements' | 'completedStoryMilestones'>,
): SettlementHubUpgradeStatus {
  const definition = getSettlementHubUpgrade(state);
  if (!definition) return { definition: null, ready: false, missing: [] };
  const missing: string[] = [];
  if (state.settlementHub.constructionState !== 'complete') missing.push('Current Hub upgrade must finish');
  if (state.settlementProgress < definition.requiredSettlementProgress) {
    missing.push(`${definition.requiredSettlementProgress.toLocaleString()} Settlement XP`);
  }
  if (state.population < definition.requiredPopulation) missing.push(`${definition.requiredPopulation} population`);
  definition.requiredBuildings.forEach((requirement) => {
    const count = state.placements.filter((placement) => (
      placement.kind === requirement.kind
      && placement.constructionState === 'complete'
      && placement.level >= requirement.minimumLevel
    )).length;
    if (count < requirement.count) {
      missing.push(`${requirement.count} level ${requirement.minimumLevel}+ ${requirement.kind.replace('-', ' ')}`);
    }
  });
  Object.entries(definition.requiredResources).forEach(([resource, amount]) => {
    if ((state.resources[resource] ?? 0) < amount) missing.push(`${amount} ${resource}`);
  });
  definition.requiredStoryMilestones.forEach((milestone) => {
    if (!state.completedStoryMilestones.includes(milestone)) missing.push(`Story milestone: ${milestone}`);
  });
  return { definition, ready: missing.length === 0, missing };
}

export interface SettlementNextGoal {
  kind: 'hub' | 'storage' | 'complete';
  title: string;
  detail: string;
  ready: boolean;
}

/** Summarize the first actionable progression goal without creating a second authority. */
export function getSettlementNextGoal(
  state: Pick<GameState, 'settlementHub' | 'settlementStorage' | 'settlementProgress' | 'population' | 'resources' | 'placements' | 'completedStoryMilestones'>,
): SettlementNextGoal {
  const hubStatus = getSettlementHubUpgradeStatus(state);
  if (hubStatus.definition) {
    const nextStage = SETTLEMENT_STAGES.find((stage) => stage.id === hubStatus.definition?.targetStageId);
    return {
      kind: 'hub',
      title: `Upgrade to ${nextStage?.name ?? 'next era'}`,
      detail: hubStatus.missing[0] ?? `Ready · ${Math.ceil(hubStatus.definition.durationMs / 1000)}s construction`,
      ready: hubStatus.ready,
    };
  }
  const storageStatus = getSettlementStorageUpgradeStatus(state);
  if (storageStatus.definition) {
    return {
      kind: 'storage',
      title: `Upgrade Storage to ${storageStatus.definition.capacity.toLocaleString()}`,
      detail: storageStatus.missing[0] ?? `Ready · ${Math.ceil(storageStatus.definition.durationMs / 1000)}s construction`,
      ready: storageStatus.ready,
    };
  }
  return { kind: 'complete', title: 'Settlement fully upgraded', detail: 'Keep building and expanding your world.', ready: false };
}

/**
 * Mine permits are consequences of Settlement Hub authority: one starter
 * permit, a second at Small Town, and a third at City.
 */
export function getMineSiteCapacity(state: Pick<GameState, 'settlementHub'>): number {
  return getSettlementHubConsequences(state).mineSiteCapacity;
}

export function getAvailableMineSites(
  state: Pick<GameState, 'mines' | 'availableMineSites'>
    & Partial<Pick<GameState, 'settlementHub'>>,
): number {
  if (state.settlementHub === undefined) {
    return Math.max(0, state.availableMineSites);
  }
  return Math.max(0, getMineSiteCapacity({ settlementHub: state.settlementHub }) - state.mines.length);
}

function syncAvailableMineSites(state: GameState): void {
  state.availableMineSites = getAvailableMineSites(state);
}

export function getBuildItemUnlockStatus(
  state: Pick<GameState, 'level' | 'settlementHub' | 'settlementProgress' | 'worldRank' | 'skillRanks' | 'resources'>,
  itemId: BuildItemId,
): { unlocked: boolean; missing: UnlockPrerequisite[] } {
  const definition = BUILD_ITEM_UNLOCKS.find((entry) => entry.id === itemId);
  if (!definition) return { unlocked: false, missing: [] };
  const missing = definition.prerequisites.filter((prerequisite) => {
    if (prerequisite.kind === 'skill') return getSkillNodeRank(state, prerequisite.id ?? '') < prerequisite.required;
    if (prerequisite.kind === 'settlement-stage') {
      const stageIndex = SETTLEMENT_STAGES.findIndex((stage) => stage.id === prerequisite.id);
      return getSettlementStageIndex(state) < Math.max(0, stageIndex);
    }
    if (prerequisite.kind === 'level') return state.level < prerequisite.required;
    return (state.resources[prerequisite.id ?? ''] ?? 0) < prerequisite.required;
  });
  return { unlocked: missing.length === 0, missing: missing.map((entry) => ({ ...entry })) };
}

export function getNextSettlementStage(state: GameState): SettlementStageDefinition | null {
  const currentIndex = SETTLEMENT_STAGES.findIndex((stage) => stage.id === getSettlementStage(state).id);
  return SETTLEMENT_STAGES[currentIndex + 1] ?? null;
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

export function getSkillNodeRank(state: Pick<GameState, 'skillRanks'>, nodeId: string): number {
  return Math.max(0, Math.floor(Number(state.skillRanks[nodeId]) || 0));
}

export function isSkillNodeMilestoneUnlocked(
  state: Pick<GameState, 'settlementHub'>,
  milestone: SkillMilestoneRule | undefined,
): boolean {
  if (!milestone) return true;
  if (milestone.trigger === 'settlement-hub') return state.settlementHub.level >= milestone.required;
  return false;
}

function satisfiesDiscoveryRule(state: GameState, rule: SkillDiscoveryRule): boolean {
  if (rule.trigger === 'surface') return state.worldCells.length >= rule.required;
  if (rule.trigger === 'mine') return state.mines.length >= rule.required;
  if (rule.trigger === 'mine-layer') return state.undergroundLayer >= rule.required;
  return state.worldCells.some((cell) => cell.biome === rule.biome);
}

/** Apply gameplay-earned material discoveries without charging Crafting Points. */
export function syncDiscoveredSkillNodes(state: GameState): void {
  SKILL_TREE_NODES.forEach((node) => {
    if (node.kind !== 'discovery' || !node.discovery || getSkillNodeRank(state, node.id) > 0) return;
    if (!satisfiesDiscoveryRule(state, node.discovery)) return;
    if (!node.prerequisites.every((prerequisite) => getSkillNodeRank(state, prerequisite) > 0)) return;
    setSkillNodeRank(state, node.id, 1);
  });
}

/** Apply free, data-driven progression milestones owned by the Settlement Hub. */
export function syncSettlementHubSkillMilestones(state: GameState): void {
  SKILL_TREE_NODES.forEach((node) => {
    if (!node.milestone || getSkillNodeRank(state, node.id) >= node.maxRank) return;
    if (!isSkillNodeMilestoneUnlocked(state, node.milestone)) return;
    setSkillNodeRank(state, node.id, node.maxRank);
  });
}

/** Refresh every automatic Skill Tree unlock in dependency order. */
export function syncAutomaticSkillNodes(state: GameState): void {
  syncSettlementHubSkillMilestones(state);
  syncDiscoveredSkillNodes(state);
}

function setSkillNodeRank(state: GameState, nodeId: string, rank: number): void {
  if (rank <= 0) delete state.skillRanks[nodeId];
  else state.skillRanks[nodeId] = rank;
}

function hasSkillPrerequisites(state: GameState, node: SkillNodeDefinition): boolean {
  return node.prerequisites.every((prerequisite) => getSkillNodeRank(state, prerequisite) > 0);
}

export function canAffordSkillNode(state: GameState, node: SkillNodeDefinition): boolean {
  const currentRank = getSkillNodeRank(state, node.id);
  if (state.craftingPoints < getSkillNodeCraftingPointCost(node, currentRank)) return false;
  const worldPowerCost = node.cost.worldPower ?? 0;
  if (!Number.isFinite(worldPowerCost) || worldPowerCost < 0) return false;
  if (worldPowerCost !== 0 && !WORLD_POWER_EXPANSION_NODE_IDS.includes(node.id as typeof WORLD_POWER_EXPANSION_NODE_IDS[number])) return false;
  if (worldPowerCost > state.worldPower) return false;
  return Object.entries(node.cost.resources).every(([resource, amount]) => (state.resources[resource] ?? 0) >= amount);
}

export function buySkillNode(state: GameState, nodeId: string, now = Date.now()): boolean {
  const node = SKILL_TREE_BY_ID.get(nodeId);
  if (!node) return false;
  syncAutomaticSkillNodes(state);
  if (node.kind === 'discovery') return false;
  if (node.milestone && !isSkillNodeMilestoneUnlocked(state, node.milestone)) return false;
  const currentRank = getSkillNodeRank(state, node.id);
  if (currentRank >= node.maxRank || !hasSkillPrerequisites(state, node) || !canAffordSkillNode(state, node)) return false;
  const craftingPointCost = getSkillNodeCraftingPointCost(node, currentRank);
  const constructionKind = node.id === SURFACE_3X3_NODE_ID ? 'chunk-upgrade' : null;
  if (constructionKind && state.constructionQueue.some((project) => project.kind === constructionKind)) return false;

  state.craftingPoints -= craftingPointCost;
  state.worldPower -= node.cost.worldPower ?? 0;
  Object.entries(node.cost.resources).forEach(([resource, amount]) => {
    state.resources[resource] = (state.resources[resource] ?? 0) - amount;
  });
  setSkillNodeRank(state, node.id, currentRank + 1);

  if (node.id === AUTO_STRIKE_NODE_ID) state.speedRank = Math.min(currentRank + 1, SPEED_RATES.length - 1);
  if (node.id === ADJACENT_BLOCK_NODE_ID) {
    state.worldPower += 1;
  }
  if (node.id === SURFACE_3X3_NODE_ID) queueConstruction(state, 'chunk-upgrade', now);
  if (node.id === UNDERGROUND_LAYER_NODE_ID) state.undergroundLayer = Math.max(state.undergroundLayer, currentRank + 1);
  if (node.id === 'world-cave-entrance') unlockStarterMine(state, now);
  if (TOOL_NODE_IDS.includes(node.id as typeof TOOL_NODE_IDS[number])) {
    state.toolRank = getToolRankFromSkills(state);
  }
  syncAutomaticSkillNodes(state);
  return true;
}

/**
 * Development-only shortcut used by the in-game debug menu. It bypasses costs
 * and prerequisites, then refreshes the derived systems that normal skill
 * purchases would update.
 */
export function debugUnlockFullSkillTree(state: GameState, now = Date.now()): void {
  SKILL_TREE_NODES.forEach((node) => setSkillNodeRank(state, node.id, node.maxRank));
  state.speedRank = SPEED_RATES.length - 1;
  state.toolRank = getToolRankFromSkills(state);
  state.undergroundLayer = Math.max(state.undergroundLayer, 2);

  // Mine Entrance's visible consequence is a starter mine. Avoid duplicating
  // it when the shortcut is used on an existing save.
  if (state.mines.length === 0) unlockStarterMine(state, now);
  syncAvailableMineSites(state);
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

  preserveLegacyBranchEntries(ranks);
  return ranks;
}

/**
 * Keep legacy purchased material/skill progress visible after automatic
 * discoveries and Hub-owned branch entries replaced their old purchase gates.
 * The stable child rank is the source of truth; this only restores the free
 * branch entry required to render that already-earned path.
 */
function preserveLegacyBranchEntries(ranks: Record<string, number>): void {
  Object.entries(SKILL_TREE_BRANCH_ENTRY_IDS).forEach(([branch, entryId]) => {
    const hasBranchProgress = SKILL_TREE_NODES.some((node) => node.branch === branch && node.id !== entryId && ranks[node.id] > 0);
    if (hasBranchProgress) ranks[entryId] = 1;
  });
}

export function getAutoRate(state: GameState): number {
  const rank = Math.min(getSkillNodeRank(state, AUTO_STRIKE_NODE_ID), SPEED_RATES.length - 1);
  return SPEED_RATES[rank];
}

export function getTool(state: GameState) {
  return TOOL_TIERS[Math.min(getToolRankFromSkills(state), TOOL_TIERS.length - 1)];
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

export function harvestResource(state: GameState, blockType: BlockType, amount = 1): number {
  const resource = BLOCK_DEFINITIONS[blockType].resource;
  return addSettlementResource(state, resource, amount);
}

export function getWorldTier(state: GameState) {
  return WORLD_TIERS[Math.min(state.worldRank, WORLD_TIERS.length - 1)];
}

export function loadState(storage: Storage, now = Date.now()): GameState {
  const raw = storage.getItem(SAVE_KEY);
  if (!raw) return freshState(now);

  try {
    const parsed = JSON.parse(raw) as Partial<GameState>;
    const parsedSchemaVersion = Number(parsed.schemaVersion);
    if (parsedSchemaVersion !== SAVE_SCHEMA_VERSION && !LEGACY_SAVE_SCHEMA_VERSIONS.includes(parsedSchemaVersion)) return freshState(now);
    const base = freshState(now);
    const skillRanks = migrateSkillRanks(parsed);
    const parsedWorldPower = Number(parsed.worldPower);
    const parsedSettlementProgress = Number(parsed.settlementProgress);
    const worldRank = Math.min(WORLD_TIERS.length - 1, Math.max(0, Number(parsed.worldRank) || 0));
    const worldCells = parseWorldCells(parsed.worldCells) ?? base.worldCells;
    const pathCells = parsePathCells(parsed.pathCells) ?? base.pathCells;
    const placements = parseWorldPlacements(parsed.placements);
    const mines = parseMines(parsed.mines, now);
    mines.forEach((mine) => {
      if (!placements.some((placement) => placement.id === mine.id)) {
        placements.push(createWorldPlacement('mine', mine.id, mine.x, mine.z, mine.direction ?? 'south', mine.railLength));
      }
    });
    const resources = Object.fromEntries(
      Object.entries(parsed.resources ?? {}).filter(([, value]) => Number.isFinite(Number(value))).map(([key, value]) => [key, Math.max(0, Number(value))]),
    );
    const builderSlots = Number.isFinite(Number(parsed.builderSlots))
      ? Math.max(0, Math.floor(Number(parsed.builderSlots)))
      : base.builderSlots;
    const restored: GameState = {
      schemaVersion: SAVE_SCHEMA_VERSION,
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
      settlementProgress: Number.isFinite(parsedSettlementProgress)
        ? Math.max(0, Math.floor(parsedSettlementProgress))
        : worldRank >= 2 ? 500 : worldRank >= 1 ? 100 : 0,
      // Schema 7 is the first save format that persisted an authoritative Hub;
      // schema 8 adds the Settlement Storage instance; schema 9 adds typed
      // mine-local inventories.
      // Older saves retain their existing world/progress data but begin at the
      // conservative Dwelling authority until the player completes the Hub flow.
      settlementHub: parsedSchemaVersion >= LEGACY_SAVE_SCHEMA_VERSION
        ? parseSettlementHub(parsed.settlementHub)
        : base.settlementHub,
      settlementStorage: parsedSchemaVersion >= 8
        ? parseSettlementStorage(parsed.settlementStorage)
        : base.settlementStorage,
      population: Math.max(0, Math.floor(Number(parsed.population) || 0)),
      completedStoryMilestones: Array.isArray(parsed.completedStoryMilestones)
        ? Array.from(new Set(parsed.completedStoryMilestones.filter((milestone): milestone is string => typeof milestone === 'string').slice(0, 100)))
        : [],
      chunkSize: Math.max(STARTING_CHUNK_SIZE, Math.floor(Number(parsed.chunkSize) || base.chunkSize)),
      worldCells,
      pathCells,
      placements,
      availableMineSites: Number.isFinite(Number(parsed.availableMineSites))
        ? Math.max(0, Math.floor(Number(parsed.availableMineSites)))
        : base.availableMineSites,
      undergroundLayer: Math.min(2, Math.max(0, Math.floor(Number(parsed.undergroundLayer) || 0))),
      mines,
      constructionQueue: parseConstructionQueue(parsed.constructionQueue, builderSlots),
      builderSlots,
      expansionDirections: Array.isArray(parsed.expansionDirections)
        ? parsed.expansionDirections.filter((direction): direction is WorldDirection => WORLD_DIRECTIONS.includes(direction as WorldDirection)).slice(0, WORLD_TIERS.length - 2)
        : base.expansionDirections,
      resources: { ...base.resources, ...resources },
      blockProgress: parseBlockProgress(parsed.blockProgress),
      skillRanks,
      mineUpgradeRanks: parseMineUpgradeRanks(parsed.mineUpgradeRanks),
      lastSavedAt: Number(parsed.lastSavedAt) || now,
    };
    assignQueuedConstruction(restored, now);
    syncAutomaticSkillNodes(restored);
    syncAvailableMineSites(restored);
    return restored;
  } catch {
    return freshState(now);
  }
}

function parseSettlementHub(value: unknown): SettlementHubInstance {
  if (!value || typeof value !== 'object') return { id: 'settlement-hub', level: 1, constructionState: 'complete' };
  const entry = value as Partial<SettlementHubInstance>;
  return {
    id: 'settlement-hub',
    level: Math.min(SETTLEMENT_STAGES.length, Math.max(1, Math.floor(Number(entry.level) || 1))),
    constructionState: entry.constructionState === 'upgrading' || entry.constructionState === 'building' ? entry.constructionState : 'complete',
  };
}

function parseSettlementStorage(value: unknown): SettlementStorageInstance {
  if (!value || typeof value !== 'object') return { id: 'settlement-storage', level: 1, constructionState: 'complete' };
  const entry = value as Partial<SettlementStorageInstance>;
  return {
    id: 'settlement-storage',
    level: Math.min(SETTLEMENT_STORAGE_LEVELS.length, Math.max(1, Math.floor(Number(entry.level) || 1))),
    constructionState: entry.constructionState === 'upgrading' || entry.constructionState === 'building' ? entry.constructionState : 'complete',
  };
}

function parseMineUpgradeRanks(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return {};
  const ranks: Record<string, number> = {};
  Object.entries(value).forEach(([id, rank]) => {
    if (!MINE_UPGRADES.some((upgrade) => upgrade.id === id)) return;
    const definition = getMineUpgradeDefinition(id as MineUpgradeId);
    const safeRank = Math.max(0, Math.floor(Number(rank) || 0));
    ranks[id] = Math.min(definition?.costs.length ?? safeRank, safeRank);
  });
  return ranks;
}

function parseMines(value: unknown, now: number): MineSite[] {
  if (!Array.isArray(value)) return [];
  const seenIds = new Set<string>();
  return value.flatMap((candidate): MineSite[] => {
    if (!candidate || typeof candidate !== 'object') return [];
    const entry = candidate as Partial<MineSite>;
    const rawId = String(entry.id ?? '');
    if (rawId !== MINE_ID && !/^mine-\d+$/.test(rawId)) return [];
    const id = seenIds.has(rawId) ? `mine-${seenIds.size + 1}` : rawId;
    seenIds.add(id);
    const lastUpdatedAt = Number(entry.lastUpdatedAt);
    const storageCapacityLevel = Math.max(0, Math.floor(Number(entry.storageCapacityLevel) || 0));
    const inventory = parseResourceInventory(entry.inventory);
    // Schema 8 stored only a visual scalar. Preserve that quantity as a
    // conservative cobblestone stock rather than silently deleting it.
    if (Object.keys(inventory).length === 0) {
      const legacyStorageAmount = Math.max(0, Math.floor(Number((entry as { storageAmount?: unknown }).storageAmount) || 0));
      if (legacyStorageAmount > 0) inventory.cobblestone = legacyStorageAmount;
    }
    return [{
      id,
      x: Number.isFinite(Number(entry.x)) ? Number(entry.x) : 0,
      z: Number.isFinite(Number(entry.z)) ? Number(entry.z) : 1,
      direction: WORLD_DIRECTIONS.includes(entry.direction as WorldDirection) ? entry.direction as WorldDirection : 'south',
      // Older saves could contain multiple carts. Normalize them to the
      // current one-cart-per-mine rule as they are loaded.
      cartCount: 1,
      storageCarts: 0,
      railLevel: Math.max(0, Math.floor(Number(entry.railLevel) || 0)),
      railLength: MINE_RAIL_LENGTHS.includes(Number(entry.railLength) as MineRailLength)
        ? Number(entry.railLength) as MineRailLength
        : DEFAULT_MINE_RAIL_LENGTH,
      minerCount: Math.max(0, Math.floor(Number(entry.minerCount) || 0)),
      progressMs: Math.max(0, Number(entry.progressMs) || 0),
      lastUpdatedAt: Number.isFinite(lastUpdatedAt) ? lastUpdatedAt : now,
      completedTrips: Math.max(0, Math.floor(Number(entry.completedTrips) || 0)),
      inventory,
      storageCapacityLevel,
    }];
  });
}

function parseResourceInventory(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return {};
  const inventory: Record<string, number> = {};
  Object.entries(value).forEach(([resource, amount]) => {
    if (!/^[a-z][a-z0-9-]{0,39}$/.test(resource)) return;
    const normalized = Math.max(0, Math.floor(Number(amount) || 0));
    if (normalized > 0) inventory[resource] = normalized;
  });
  return inventory;
}

function parsePathCells(value: unknown): PathCell[] | null {
  if (!Array.isArray(value)) return null;
  const cells: PathCell[] = [];
  const seen = new Set<string>();
  value.forEach((candidate) => {
    if (!candidate || typeof candidate !== 'object') return;
    const entry = candidate as Partial<PathCell>;
    const x = Number(entry.x);
    const z = Number(entry.z);
    if (!Number.isInteger(x) || !Number.isInteger(z) || seen.has(worldCellKey(x, z))) return;
    const tier: PathTier = entry.tier === 'cobblestone' || entry.tier === 'stone' ? entry.tier : 'dirt';
    seen.add(worldCellKey(x, z));
    cells.push({ x, z, tier });
  });
  return cells.length > 0 ? cells : null;
}

function parseWorldPlacements(value: unknown): WorldPlacement[] {
  if (!Array.isArray(value)) return [];
  const validKinds: readonly WorldPlacementKind[] = ['mine', 'dwelling', 'well', 'farm', 'tree', 'animal-pen'];
  const placements: WorldPlacement[] = [];
  const seen = new Set<string>();
  value.forEach((candidate) => {
    if (!candidate || typeof candidate !== 'object') return;
    const entry = candidate as Partial<WorldPlacement>;
    if (!entry.id || typeof entry.id !== 'string' || seen.has(entry.id) || !validKinds.includes(entry.kind as WorldPlacementKind)) return;
    const x = Number(entry.x);
    const z = Number(entry.z);
    const width = Number(entry.width);
    const depth = Number(entry.depth);
    if (![x, z, width, depth].every(Number.isFinite) || !Number.isInteger(x) || !Number.isInteger(z) || width < 1 || depth < 1) return;
    seen.add(entry.id);
    const kind = entry.kind as WorldPlacementKind;
    const definition = getBuildingDefinition(kind);
    placements.push({
      id: entry.id,
      kind,
      x,
      z,
      width: Math.min(5, Math.floor(width)),
      depth: Math.min(5, Math.floor(depth)),
      direction: WORLD_DIRECTIONS.includes(entry.direction as WorldDirection) ? entry.direction as WorldDirection : 'south',
      level: Math.min(definition.maxLevel, Math.max(1, Math.floor(Number(entry.level) || 1))),
      constructionState: entry.constructionState === 'building' || entry.constructionState === 'upgrading' ? entry.constructionState : 'complete',
    });
  });
  return placements;
}

function parseConstructionQueue(value: unknown, builderSlots: number): ConstructionProject[] {
  if (!Array.isArray(value)) return [];
  const projects = value.flatMap((candidate): ConstructionProject[] => {
    if (!candidate || typeof candidate !== 'object') return [];
    const entry = candidate as Partial<ConstructionProject>;
    if (entry.kind !== 'adjacent-cell' && entry.kind !== 'surface-3x3' && entry.kind !== 'chunk-upgrade' && entry.kind !== 'building-build' && entry.kind !== 'building-upgrade') return [];
    const startedAt = Number(entry.startedAt);
    const completesAt = Number(entry.completesAt);
    if (!Number.isFinite(startedAt) || !Number.isFinite(completesAt) || completesAt < startedAt) return [];
    const direction = WORLD_DIRECTIONS.includes(entry.direction as WorldDirection) ? entry.direction as WorldDirection : undefined;
    const targetId = typeof entry.targetId === 'string' && entry.targetId.length > 0
      ? entry.targetId
      : direction ? `${entry.kind}-${direction}` : entry.kind;
    const genericProject = {
      id: typeof entry.id === 'string' && entry.id.length > 0 ? entry.id : `${entry.kind}-${targetId}`,
      action: entry.action === 'build' || entry.action === 'upgrade' || entry.action === 'expand' ? entry.action : 'expand' as const,
      targetKind: entry.targetKind === 'building' || entry.targetKind === 'mine' || entry.targetKind === 'path' || entry.targetKind === 'world' || entry.targetKind === 'hub' || entry.targetKind === 'storage'
        ? entry.targetKind
        : 'world' as const,
      targetId,
      builderId: typeof entry.builderId === 'string' && entry.builderId.length > 0 ? entry.builderId : null,
      kind: entry.kind,
      startedAt,
      completesAt,
      durationMs: Number.isFinite(Number(entry.durationMs)) && Number(entry.durationMs) > 0
        ? Number(entry.durationMs)
        : CONSTRUCTION_DURATIONS_MS[entry.kind],
      cost: entry.cost && typeof entry.cost === 'object'
        ? Object.fromEntries(Object.entries(entry.cost).filter(([, amount]) => Number.isFinite(Number(amount)) && Number(amount) >= 0).map(([resource, amount]) => [resource, Number(amount)]))
        : { ...(CONSTRUCTION_COSTS[entry.kind] ?? {}) },
      direction,
    } satisfies ConstructionProject;
    return [genericProject];
  });

  // Schema 4 had a serial expansion queue. Preserve its first active timer,
  // then let the builder-aware queue start the remaining projects safely.
  const assignedBuilderIds = new Set<string>();
  return projects.slice(0, 8).map((project, index) => {
    if (project.builderId && !assignedBuilderIds.has(project.builderId) && assignedBuilderIds.size < builderSlots) {
      assignedBuilderIds.add(project.builderId);
      return project;
    }
    if (index === 0 && builderSlots > 0 && project.startedAt > 0) {
      const builderId = 'builder-1';
      assignedBuilderIds.add(builderId);
      return { ...project, builderId };
    }
    return { ...project, builderId: null, startedAt: 0, completesAt: 0 };
  });
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

function parseBlockProgress(value: unknown): Record<string, BlockMiningProgress> {
  if (!value || typeof value !== 'object') return {};
  const progress: Record<string, BlockMiningProgress> = {};
  Object.entries(value).forEach(([id, candidate]) => {
    if (!candidate || typeof candidate !== 'object') return;
    const entry = candidate as Partial<BlockMiningProgress>;
    if (!entry.type || !(['bedrock', 'deepslate', ...BLOCK_PROGRESSION] as string[]).includes(entry.type)) return;
    const damage = Number(entry.damage);
    const replacementAt = entry.replacementAt === null ? null : Number(entry.replacementAt);
    progress[id] = {
      type: entry.type,
      ...(entry.stableType && (entry.stableType === 'bedrock' || entry.stableType === 'deepslate' || BLOCK_PROGRESSION.includes(entry.stableType))
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
  if (state.mines.length > 0) return 0;
  const elapsedSeconds = Math.max(0, Math.min(8 * 60 * 60, (now - state.lastSavedAt) / 1000));
  if (elapsedSeconds < 10) return 0;
  return Math.floor(elapsedSeconds * getAutoRate(state) * getHarvestPower(state) * 0.5);
}

export interface ElapsedProgressResult {
  completedProjects: ConstructionProject[];
  mineResult: MineProductionResult;
  offlineXp: number;
}

/**
 * Reconcile one restored save against wall-clock time before the render loop
 * takes over. The save watermark is advanced here so a restored no-mine save
 * cannot award the same offline XP again on the next frame.
 */
export function reconcileElapsedProgress(state: GameState, now = Date.now(), random = Math.random): ElapsedProgressResult {
  const completedProjects = completeConstructionProjects(state, now);
  const mineResult = advanceMineOperations(state, now, random);
  const offlineXp = mineResult.trips > 0 ? mineResult.xp : calculateOfflineXp(state, now);
  if (offlineXp > 0) addXp(state, offlineXp);
  state.lastSavedAt = now;
  return { completedProjects, mineResult, offlineXp };
}
