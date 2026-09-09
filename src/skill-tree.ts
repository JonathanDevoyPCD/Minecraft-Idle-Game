export type SkillBranchId =
  | 'harvesting'
  | 'tools-crafting'
  | 'materials-deep-mining'
  | 'automation'
  | 'world-growth-biomes'
  | 'life-settlement'
  | 'mastery-long-term';

export type SkillNodeKind = 'rank' | 'unlock' | 'milestone' | 'choice' | 'capstone';

export interface SkillNodeCost {
  craftingPoints: number;
  resources: Record<string, number>;
}

export interface SkillNodeDefinition {
  id: string;
  branch: SkillBranchId;
  title: string;
  description: string;
  effect: string;
  worldConsequence: string;
  kind: SkillNodeKind;
  maxRank: number;
  prerequisites: string[];
  cost: SkillNodeCost;
}

export interface SkillBranchDefinition {
  id: SkillBranchId;
  title: string;
  subtitle: string;
  colour: string;
}

export const SKILL_TREE_BRANCHES: SkillBranchDefinition[] = [
  { id: 'harvesting', title: 'Harvesting', subtitle: 'Make every strike count', colour: '#d98c32' },
  { id: 'tools-crafting', title: 'Tools and Crafting', subtitle: 'Build better ways to harvest', colour: '#7a9d4a' },
  { id: 'materials-deep-mining', title: 'Materials and Deep Mining', subtitle: 'Reveal what lies below', colour: '#718692' },
  { id: 'automation', title: 'Automation', subtitle: 'Keep the world working', colour: '#c56a56' },
  { id: 'world-growth-biomes', title: 'World Growth and Biomes', subtitle: 'Shape the land', colour: '#4b9d91' },
  { id: 'life-settlement', title: 'Life and Settlement', subtitle: 'Give the world a reason to live', colour: '#ad73a9' },
  { id: 'mastery-long-term', title: 'Mastery and Long-Term Progression', subtitle: 'Commit to the next world', colour: '#9072b8' },
];

const EMPTY_RESOURCES: Record<string, number> = {};

function node(
  branch: SkillBranchId,
  id: string,
  title: string,
  description: string,
  effect: string,
  kind: SkillNodeKind,
  prerequisites: string[] = [],
  maxRank = 1,
  worldConsequence = 'No immediate terrain change.',
): SkillNodeDefinition {
  return {
    id,
    branch,
    title,
    description,
    effect,
    worldConsequence,
    kind,
    maxRank,
    prerequisites,
    cost: { craftingPoints: kind === 'capstone' ? 5 : 1, resources: EMPTY_RESOURCES },
  };
}

const harvesting: SkillNodeDefinition[] = [
  node('harvesting', 'harvesting-bare-hands', 'Bare Hands I–III', 'Train the basic strike into a reliable rhythm.', '+10% manual strike speed per rank.', 'rank', [], 3),
  node('harvesting', 'harvesting-strike-power', 'Strike Power I–III', 'Put more force behind every active strike.', '+1 effective manual power per rank.', 'rank', ['harvesting-bare-hands'], 3),
  node('harvesting', 'harvesting-precision', 'Precision Mining I–II', 'Reduce wasted effort when a target is nearly broken.', 'Reduce wasted strikes by 5% per rank.', 'rank', ['harvesting-bare-hands'], 2),
  node('harvesting', 'harvesting-critical-breaks', 'Critical Breaks', 'A perfectly timed strike can finish a block immediately.', 'Unlocks a small instant-break chance.', 'unlock', ['harvesting-precision']),
  node('harvesting', 'harvesting-resource-yield', 'Resource Yield I–III', 'Recover more useful material from each break.', '+10% resource drops per rank.', 'rank', ['harvesting-strike-power'], 3),
  node('harvesting', 'harvesting-combo-momentum', 'Combo Momentum', 'Consecutive active clicks build a temporary bonus.', 'Unlocks a manual combo multiplier.', 'unlock', ['harvesting-precision']),
  node('harvesting', 'harvesting-multi-block', 'Multi-Block Strike', 'Let a strong strike reach an adjacent exposed block.', 'Unlocks adjacent-block damage.', 'milestone', ['harvesting-combo-momentum', 'harvesting-resource-yield']),
  node('harvesting', 'harvesting-chain-mining', 'Chain Mining', 'Continue through connected blocks after a successful break.', 'Unlocks connected-target continuation.', 'milestone', ['harvesting-multi-block', 'automation-target-queue']),
  node('harvesting', 'harvesting-mastery', 'Harvest Mastery', 'Master the complete active harvesting discipline.', 'Unlocks the harvesting capstone bonus.', 'capstone', ['harvesting-chain-mining', 'harvesting-critical-breaks'], 1, 'Adds a visible mastery aura to the active target.'),
];

const toolsCrafting: SkillNodeDefinition[] = [
  node('tools-crafting', 'tools-tool-bench', 'Tool Bench', 'Create and improve tools at a dedicated work surface.', 'Unlocks tool recipes and tool durability.', 'unlock', [], 1, 'Adds a Tool Bench anchor to the world.'),
  node('tools-crafting', 'tools-wooden-shovel', 'Wooden Shovel', 'Shape a first tool for soil and soft ground.', 'Unlocks the Wooden Shovel recipe.', 'unlock', ['tools-tool-bench']),
  node('tools-crafting', 'tools-wooden-pickaxe', 'Wooden Pickaxe', 'Shape a first tool for stone and coal.', 'Unlocks the Wooden Pickaxe recipe.', 'unlock', ['tools-tool-bench']),
  node('tools-crafting', 'tools-wooden-axe', 'Wooden Axe', 'Shape a first tool for logs and wooden structures.', 'Unlocks the Wooden Axe recipe.', 'unlock', ['tools-tool-bench']),
  node('tools-crafting', 'tools-stone-set', 'Stone Tool Set', 'Replace wooden heads with durable stone.', 'Unlocks Stone Shovel, Pickaxe, and Axe recipes.', 'milestone', ['tools-wooden-shovel', 'tools-wooden-pickaxe', 'tools-wooden-axe']),
  node('tools-crafting', 'tools-iron-shovel', 'Iron Shovel', 'Harvest dense soil and gravel efficiently.', 'Unlocks the Iron Shovel recipe.', 'unlock', ['tools-stone-set', 'materials-iron']),
  node('tools-crafting', 'tools-iron-pickaxe', 'Iron Pickaxe', 'Reach valuable ores below the surface.', 'Unlocks the Iron Pickaxe recipe.', 'unlock', ['tools-stone-set', 'materials-iron']),
  node('tools-crafting', 'tools-iron-axe', 'Iron Axe', 'Harvest mature trees and wooden structures.', 'Unlocks the Iron Axe recipe.', 'unlock', ['tools-stone-set', 'materials-iron']),
  node('tools-crafting', 'tools-hoe-farming', 'Hoe and Farming Tools', 'Prepare soil for the first crops.', 'Unlocks hoe and farming tool recipes.', 'unlock', ['tools-iron-shovel', 'life-crops']),
  node('tools-crafting', 'tools-shears', 'Shears', 'Collect leaves, vines, and wool efficiently.', 'Unlocks the Shears recipe.', 'unlock', ['tools-iron-axe', 'materials-leaves-vines']),
  node('tools-crafting', 'tools-bucket', 'Bucket', 'Move water and support future terrain shaping.', 'Unlocks the Bucket recipe.', 'unlock', ['tools-iron-shovel', 'world-water-tile']),
  node('tools-crafting', 'tools-diamond-set', 'Diamond Tool Set', 'Craft the fastest conventional tool family.', 'Unlocks Diamond Shovel, Pickaxe, Axe, and Hoe.', 'milestone', ['tools-iron-shovel', 'tools-iron-pickaxe', 'tools-iron-axe', 'materials-diamond']),
  node('tools-crafting', 'tools-reinforced', 'Reinforced Tools', 'Extend tools for long idle sessions.', '+50% tool durability.', 'unlock', ['tools-diamond-set']),
  node('tools-crafting', 'tools-durability', 'Tool Durability I–III', 'Make each crafted tool last longer.', '+15% durability per rank.', 'rank', ['tools-tool-bench'], 3),
  node('tools-crafting', 'tools-mastery', 'Tool Mastery', 'Master the complete tool family.', 'Unlocks the tool branch capstone bonus.', 'capstone', ['tools-reinforced', 'tools-durability'], 1, 'Adds a workshop glow and tool rack to the world.'),
  node('tools-crafting', 'tools-advanced-workshop', 'Advanced Workshop', 'Turn raw resources into complex recipes.', 'Unlocks advanced crafting recipes.', 'milestone', ['tools-mastery', 'automation-workshop-production'], 1, 'Adds an Advanced Workshop structure.'),
];

const materialsDeepMining: SkillNodeDefinition[] = [
  node('materials-deep-mining', 'materials-dirt-grass', 'Dirt and Grass', 'Understand the first living surface.', 'Unlocks dirt and grass drops.', 'unlock', [], 1, 'The starting surface becomes a registered material pool.'),
  node('materials-deep-mining', 'materials-stone', 'Stone', 'Expose the first solid layer beneath the grass.', 'Unlocks stone and cobblestone drops.', 'unlock', ['materials-dirt-grass'], 1, 'Reveals the first underground layer.'),
  node('materials-deep-mining', 'materials-sand', 'Sand', 'Find loose material for beaches and glass.', 'Unlocks sand drops and recipes.', 'unlock', ['materials-dirt-grass']),
  node('materials-deep-mining', 'materials-gravel', 'Gravel', 'Harvest coarse aggregate from rough ground.', 'Unlocks gravel drops.', 'unlock', ['materials-stone']),
  node('materials-deep-mining', 'materials-clay', 'Clay', 'Collect workable earth for building.', 'Unlocks clay drops and recipes.', 'unlock', ['materials-sand']),
  node('materials-deep-mining', 'materials-logs-planks', 'Logs and Planks', 'Turn a forest harvest into a building material.', 'Unlocks logs, planks, and wood recipes.', 'unlock', ['materials-dirt-grass', 'world-forest-patch'], 1, 'Adds trees to eligible surface chunks.'),
  node('materials-deep-mining', 'materials-leaves-vines', 'Leaves and Vines', 'Harvest the living parts of a forest.', 'Unlocks leaves, vines, and plant drops.', 'unlock', ['materials-logs-planks', 'tools-wooden-axe']),
  node('materials-deep-mining', 'materials-coal', 'Coal', 'Find the first fuel-bearing ore.', 'Unlocks coal drops and fuel recipes.', 'unlock', ['materials-stone', 'tools-wooden-pickaxe']),
  node('materials-deep-mining', 'materials-copper', 'Copper', 'Reveal a versatile early metal.', 'Unlocks copper drops and recipes.', 'unlock', ['materials-coal']),
  node('materials-deep-mining', 'materials-iron', 'Iron', 'Reach the metal that improves every tool branch.', 'Unlocks iron drops and recipes.', 'milestone', ['materials-copper', 'tools-wooden-pickaxe']),
  node('materials-deep-mining', 'materials-lapis', 'Lapis', 'Collect a rare blue mineral for future infusions.', 'Unlocks lapis drops.', 'unlock', ['materials-iron']),
  node('materials-deep-mining', 'materials-redstone', 'Redstone', 'Find the material that powers mechanisms.', 'Unlocks redstone drops and automation recipes.', 'unlock', ['materials-lapis', 'automation-workshop-production']),
  node('materials-deep-mining', 'materials-gold', 'Gold', 'Reach a valuable soft metal for advanced recipes.', 'Unlocks gold drops.', 'unlock', ['materials-iron', 'tools-iron-pickaxe']),
  node('materials-deep-mining', 'materials-diamond', 'Diamond', 'Find the material for the strongest conventional tools.', 'Unlocks diamond drops.', 'milestone', ['materials-gold', 'materials-deep-layer']),
  node('materials-deep-mining', 'materials-emerald', 'Emerald', 'Discover a settlement-focused rare resource.', 'Unlocks emerald drops and trade value.', 'unlock', ['materials-gold', 'life-first-villager']),
  node('materials-deep-mining', 'materials-obsidian', 'Obsidian', 'Reach the hardest ordinary material.', 'Unlocks obsidian drops and endgame recipes.', 'unlock', ['materials-diamond', 'world-cave-entrance']),
  node('materials-deep-mining', 'materials-deep-layer', 'Deep Mining Layer', 'Open a deeper stratum with new resource tables.', 'Unlocks deeper terrain and mining depth.', 'milestone', ['materials-stone', 'world-underground-layer'], 1, 'Adds a visible lower layer beneath the island.'),
  node('materials-deep-mining', 'materials-rare-ore-veins', 'Rare Ore Veins', 'Increase the chance of valuable veins appearing.', '+25% rare ore vein frequency.', 'unlock', ['materials-deep-layer', 'materials-diamond']),
  node('materials-deep-mining', 'materials-bedrock-boundary', 'Bedrock Boundary', 'Mark the permanent bottom of the world.', 'Unlocks the unbreakable depth boundary.', 'capstone', ['materials-obsidian', 'materials-rare-ore-veins'], 1, 'Adds bedrock as the final visible world boundary.'),
];

const automation: SkillNodeDefinition[] = [
  node('automation', 'automation-auto-strike', 'Auto Strike I–III', 'Improve the default automatic harvesting rhythm.', '+0.25 automatic strikes per second per rank.', 'rank', [], 3),
  node('automation', 'automation-target-queue', 'Target Queue', 'Remember more than one target for automation.', 'Unlocks a queued target list.', 'unlock', ['automation-auto-strike']),
  node('automation', 'automation-block-priority', 'Block Priority', 'Choose which available materials matter most.', 'Unlocks material priority rules.', 'unlock', ['automation-target-queue']),
  node('automation', 'automation-tool-selection', 'Automatic Tool Selection', 'Let workers choose the correct available tool.', 'Unlocks automatic tool selection.', 'unlock', ['automation-block-priority', 'tools-tool-bench']),
  node('automation', 'automation-miner-helper', 'Miner Helper', 'Add the first worker to the world.', 'Unlocks one helper worker.', 'milestone', ['automation-tool-selection'], 1, 'Adds a visible Miner Helper to the world.'),
  node('automation', 'automation-second-worker', 'Second Worker', 'Run two independent work assignments.', 'Unlocks a second helper worker.', 'unlock', ['automation-miner-helper']),
  node('automation', 'automation-offline-efficiency', 'Offline Efficiency I–III', 'Make progress while the game is closed more productive.', '+10% offline efficiency per rank.', 'rank', ['automation-auto-strike'], 3),
  node('automation', 'automation-tool-assignment', 'Tool Assignment', 'Give specific tools to specific workers.', 'Unlocks per-worker tool slots.', 'unlock', ['automation-second-worker', 'automation-tool-selection']),
  node('automation', 'automation-storage-chest', 'Storage Chest', 'Store materials before production or expansion.', 'Unlocks expanded resource storage.', 'milestone', ['automation-miner-helper']),
  node('automation', 'automation-workshop-production', 'Workshop Production', 'Let a workshop process materials automatically.', 'Unlocks queued workshop recipes.', 'unlock', ['automation-storage-chest', 'tools-tool-bench']),
  node('automation', 'automation-quarry', 'Quarry', 'Automate a focused deep-mining operation.', 'Unlocks quarry production.', 'milestone', ['automation-workshop-production', 'materials-deep-layer'], 1, 'Adds a quarry opening to the underground layer.'),
  node('automation', 'automation-resource-conveyor', 'Resource Conveyor', 'Move materials between mining and production.', 'Unlocks automated resource routing.', 'unlock', ['automation-quarry']),
  node('automation', 'automation-mastery', 'Automation Mastery', 'Master the complete production network.', 'Unlocks the automation capstone bonus.', 'capstone', ['automation-resource-conveyor', 'automation-offline-efficiency'], 1, 'Adds a visible production network to the world.'),
];

const worldGrowth: SkillNodeDefinition[] = [
  node('world-growth-biomes', 'world-adjacent-block', 'Add Adjacent Block', 'Grow the world one connected cell at a time.', 'Unlocks the first adjacent expansion purchase.', 'unlock', [], 1, 'Adds one connected cell to the world.'),
  node('world-growth-biomes', 'world-surface-3x3', 'Expand to a 3×3 Surface', 'Turn the seed into a small playable island.', 'Unlocks the 3×3 surface template.', 'milestone', ['world-adjacent-block'], 1, 'Builds the first authored 3×3 meadow.'),
  node('world-growth-biomes', 'world-underground-layer', 'Add Underground Layer', 'Extend the world downward.', 'Unlocks a deeper terrain layer.', 'unlock', ['world-surface-3x3', 'materials-stone'], 1, 'Adds a lower block layer beneath the surface.'),
  node('world-growth-biomes', 'world-cave-entrance', 'Cave Entrance', 'Create an opening into the deeper world.', 'Unlocks cave anchors and underground access.', 'milestone', ['world-underground-layer']),
  node('world-growth-biomes', 'world-water-tile', 'Water Tile', 'Introduce water as a world-building material.', 'Unlocks water tiles and bucket interaction.', 'unlock', ['world-surface-3x3']),
  node('world-growth-biomes', 'world-forest-patch', 'Forest Patch', 'Grow a dedicated wooded chunk.', 'Unlocks forest chunk templates.', 'milestone', ['world-surface-3x3']),
  node('world-growth-biomes', 'world-desert-patch', 'Desert Patch', 'Grow a dry biome with sand and clay.', 'Unlocks desert chunk templates.', 'milestone', ['world-surface-3x3', 'materials-sand']),
  node('world-growth-biomes', 'world-mountain-patch', 'Mountain Patch', 'Raise a rocky region with deeper strata.', 'Unlocks mountain chunk templates.', 'milestone', ['world-underground-layer']),
  node('world-growth-biomes', 'world-snow-biome', 'Snow Biome', 'Add a cold surface with snow resources.', 'Unlocks snow biome templates.', 'unlock', ['world-mountain-patch']),
  node('world-growth-biomes', 'world-swamp-biome', 'Swamp Biome', 'Add a wet biome rich with plants and clay.', 'Unlocks swamp biome templates.', 'unlock', ['world-water-tile', 'world-forest-patch']),
  node('world-growth-biomes', 'world-crystal-biome', 'Rare Crystal Biome', 'Reveal a rare region with crystal resources.', 'Unlocks rare crystal biome templates.', 'milestone', ['world-mountain-patch', 'materials-diamond']),
  node('world-growth-biomes', 'world-biome-mixing', 'Biome Mixing', 'Blend neighboring biome templates at their borders.', 'Unlocks weighted mixed-biome generation.', 'unlock', ['world-desert-patch', 'world-swamp-biome']),
  node('world-growth-biomes', 'world-radius', 'Larger World Radius I–III', 'Support more connected chunks around the core.', '+1 expansion radius per rank.', 'rank', ['world-biome-mixing'], 3),
  node('world-growth-biomes', 'world-core', 'World Core', 'Master the art of growing a coherent world.', 'Unlocks the world-growth capstone bonus.', 'capstone', ['world-radius', 'world-crystal-biome'], 1, 'Adds a visible core landmark at the center of the world.'),
];

const lifeSettlement: SkillNodeDefinition[] = [
  node('life-settlement', 'life-saplings', 'Saplings', 'Start the first renewable plant cycle.', 'Unlocks sapling planting.', 'unlock', ['world-forest-patch'], 1, 'Adds sapling anchors to forest chunks.'),
  node('life-settlement', 'life-crops', 'Crops', 'Grow food from planted seeds.', 'Unlocks crop growth.', 'unlock', ['life-saplings']),
  node('life-settlement', 'life-farmland', 'Farmland', 'Prepare reliable soil for farming.', 'Unlocks farmland tiles.', 'milestone', ['life-crops', 'tools-hoe-farming'], 1, 'Adds farmland to the surface.'),
  node('life-settlement', 'life-animals', 'Animals', 'Invite passive animals into the world.', 'Unlocks animal spawns.', 'unlock', ['life-farmland']),
  node('life-settlement', 'life-animal-pens', 'Animal Pens', 'Keep animals safe and productive.', 'Unlocks animal pen structures.', 'unlock', ['life-animals']),
  node('life-settlement', 'life-storage-shed', 'Storage Shed', 'Expand physical storage near the settlement.', 'Unlocks a larger local storage container.', 'unlock', ['life-farmland', 'automation-storage-chest']),
  node('life-settlement', 'life-first-villager', 'First Villager', 'Give the growing world its first resident.', 'Unlocks the first villager.', 'milestone', ['life-animal-pens', 'life-storage-shed', 'materials-emerald'], 1, 'Adds a visible villager to the settlement.'),
  node('life-settlement', 'life-farmhouse', 'Farmhouse', 'Give the farming branch a home and center.', 'Unlocks the Farmhouse structure.', 'milestone', ['life-farmland', 'life-first-villager']),
  node('life-settlement', 'life-specialist-miner', 'Specialist Miner', 'Assign a villager to deep mining.', 'Unlocks the Miner specialist role.', 'unlock', ['life-first-villager', 'materials-deep-layer']),
  node('life-settlement', 'life-specialist-farmer', 'Specialist Farmer', 'Assign a villager to crop production.', 'Unlocks the Farmer specialist role.', 'unlock', ['life-first-villager', 'life-farmhouse']),
  node('life-settlement', 'life-toolsmith', 'Toolsmith', 'Add a resident who improves the tool economy.', 'Unlocks the Toolsmith role.', 'unlock', ['life-first-villager', 'tools-advanced-workshop']),
  node('life-settlement', 'life-trading', 'Trading', 'Exchange settlement resources for useful materials.', 'Unlocks villager trading.', 'unlock', ['life-toolsmith', 'materials-emerald']),
  node('life-settlement', 'life-settlement-paths', 'Settlement Paths', 'Connect important structures with readable routes.', 'Unlocks path construction.', 'unlock', ['life-farmhouse']),
  node('life-settlement', 'life-villager-housing', 'Villager Housing', 'Provide homes for a larger population.', 'Unlocks housing capacity.', 'unlock', ['life-settlement-paths', 'life-trading']),
  node('life-settlement', 'life-settlement-hub', 'Settlement Hub', 'Centralize the first living community.', 'Unlocks the settlement hub.', 'milestone', ['life-villager-housing', 'life-specialist-miner', 'life-specialist-farmer']),
  node('life-settlement', 'life-living-world', 'Living World', 'Complete the settlement branch.', 'Unlocks the life and settlement capstone bonus.', 'capstone', ['life-settlement-hub', 'life-toolsmith'], 1, 'Adds a lively settlement center and ambient activity.'),
];

const masteryLongTerm: SkillNodeDefinition[] = [
  node('mastery-long-term', 'mastery-expanded-inventory', 'Expanded Inventory', 'Carry more resources before returning to storage.', '+25% inventory capacity.', 'unlock', ['automation-storage-chest']),
  node('mastery-long-term', 'mastery-resource-ledger', 'Resource Ledger', 'Track the history of every collected material.', 'Unlocks resource history and totals.', 'unlock', ['mastery-expanded-inventory']),
  node('mastery-long-term', 'mastery-blueprint-system', 'Blueprint System', 'Save authored construction patterns for later use.', 'Unlocks world blueprint slots.', 'unlock', ['mastery-resource-ledger', 'world-core']),
  node('mastery-long-term', 'mastery-recipe-discovery', 'Recipe Discovery', 'Reveal recipes through exploration and material combinations.', 'Unlocks recipe discovery.', 'unlock', ['mastery-resource-ledger', 'tools-advanced-workshop']),
  node('mastery-long-term', 'mastery-crafting-queue', 'Crafting Queue', 'Queue multiple recipes at a workshop.', 'Unlocks a persistent crafting queue.', 'unlock', ['mastery-recipe-discovery', 'automation-workshop-production']),
  node('mastery-long-term', 'mastery-tool-infusions', 'Tool Infusions', 'Add carefully chosen bonuses to finished tools.', 'Unlocks tool infusions.', 'choice', ['mastery-crafting-queue', 'materials-lapis']),
  node('mastery-long-term', 'mastery-mining-charms', 'Mining Charms', 'Equip small bonuses for specialized expeditions.', 'Unlocks mining charms.', 'choice', ['mastery-tool-infusions', 'harvesting-mastery']),
  node('mastery-long-term', 'mastery-cosmetic-skins', 'Cosmetic Block Skins', 'Personalize the world without changing its balance.', 'Unlocks cosmetic block skins.', 'choice', ['mastery-blueprint-system']),
  node('mastery-long-term', 'mastery-world-challenges', 'World Challenges', 'Take on optional constraints for lasting rewards.', 'Unlocks world challenges.', 'milestone', ['mastery-blueprint-system', 'world-core']),
  node('mastery-long-term', 'mastery-rare-events', 'Rare World Events', 'Create occasional surprises in established worlds.', 'Unlocks rare world events.', 'milestone', ['mastery-world-challenges', 'life-living-world']),
  node('mastery-long-term', 'mastery-seed-bonuses', 'World Seed Bonuses', 'Carry selected discoveries into future seeds.', 'Unlocks permanent seed bonuses.', 'unlock', ['mastery-rare-events']),
  node('mastery-long-term', 'mastery-prestige', 'Prestige / New World', 'Retire a developed world for a permanent advantage.', 'Unlocks the New World prestige loop.', 'milestone', ['mastery-seed-bonuses', 'world-core']),
  node('mastery-long-term', 'mastery-new-game-plus', 'New Game+ Mastery', 'Begin again with the lessons of a completed world.', 'Unlocks New Game+ mastery.', 'capstone', ['mastery-prestige', 'mastery-mining-charms'], 1, 'Adds the New World gateway to the world scene.'),
];

export const SKILL_TREE_NODES: SkillNodeDefinition[] = [
  ...harvesting,
  ...toolsCrafting,
  ...materialsDeepMining,
  ...automation,
  ...worldGrowth,
  ...lifeSettlement,
  ...masteryLongTerm,
];

export const SKILL_TREE_BY_ID = new Map(SKILL_TREE_NODES.map((skillNode) => [skillNode.id, skillNode]));

export function getSkillTreeBranch(branch: SkillBranchId): SkillNodeDefinition[] {
  return SKILL_TREE_NODES.filter((skillNode) => skillNode.branch === branch);
}
