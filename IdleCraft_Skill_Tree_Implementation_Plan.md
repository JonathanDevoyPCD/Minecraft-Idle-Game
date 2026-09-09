# IdleCraft Skill Tree Implementation Plan

Status: **FIXED IMPLEMENTATION ORDER**

This document is the working contract for completing the IdleCraft skill tree. Work proceeds in the numbered order below. Each step is implemented, tested in the browser, and reviewed before the next step begins. Bugs found during a step are handled within that step. Unrelated polish, new systems, and speculative features are deferred.

## Fixed implementation order

### 1. Build the complete skill-tree data model and UI foundation

- Define typed skill-node data with stable IDs, branches, node types, costs, prerequisites, rank limits, and effects.
- Define the graph so nodes can branch one-to-many and later merge where appropriate.
- Build the full-tree view shell, branch layout, node states, connection rendering, and responsive scrolling.
- Keep node purchase effects isolated from rendering so the tree can be extended safely.

### 2. Show every planned node and branch

- Render every node in the complete tree from the start.
- Show future nodes as locked rather than hiding them.
- Make available, affordable, purchased, prerequisite-locked, choice-blocked, and maxed states visually distinct.
- Display each node's effect, rank, cost, prerequisites, and visible world consequence.

### 3. Connect existing upgrades to the tree

- Move current speed, tool, and world-expansion purchases into the appropriate tree nodes.
- Preserve current save data and migrate existing progression safely.
- Keep Crafting Points as the node currency, resources as recipe/construction costs, XP as level progression, and World Power as a major-expansion gate.
- Verify that existing upgrade behavior remains correct after the UI moves.

### 4. Implement the proper mining loop and connect it to the tree

- Add independent per-block durability and damage.
- Break and replace blocks independently, awarding the correct resources and XP.
- Apply tool suitability, tool tiers, drop requirements, resource yield, automation, and world-expansion effects through the tree.
- Add damage, break, resource, and expansion feedback without changing the established block scale, camera, or art direction.

## Complete proposed skill tree

The full tree is visible from the start. XP unlocks levels, Crafting Points unlock skill nodes, resources pay for recipes, and World Power controls major expansions.

### 1. Harvesting

- Bare Hands I–III — faster manual strikes
- Strike Power I–III — more XP per strike
- Precision Mining I–II — reduced wasted strikes
- Critical Breaks — chance to instantly finish a block
- Resource Yield I–III — increase drops
- Combo Momentum — consecutive clicks build a bonus
- Multi-Block Strike — hit adjacent blocks
- Chain Mining — automatically continue through connected blocks
- Harvest Mastery — harvesting capstone

### 2. Tools and Crafting

- Tool Bench
- Wooden Shovel
- Wooden Pickaxe
- Wooden Axe
- Stone Tool Set
- Iron Shovel
- Iron Pickaxe
- Iron Axe
- Hoe and Farming Tools
- Shears
- Bucket
- Diamond Tool Set
- Reinforced Tools
- Tool Durability I–III
- Tool Mastery — tool branch capstone
- Advanced Workshop — unlocks complex recipes

### 3. Materials and Deep Mining

- Dirt and Grass
- Stone
- Sand
- Gravel
- Clay
- Logs and Planks
- Leaves and Vines
- Coal
- Copper
- Iron
- Lapis
- Redstone
- Gold
- Diamond
- Emerald
- Obsidian
- Deep Mining Layer
- Rare Ore Veins
- Bedrock Boundary — permanent unbreakable limit

### 4. Automation

- Auto Strike I–III
- Target Queue
- Block Priority
- Automatic Tool Selection
- Miner Helper
- Second Worker
- Offline Efficiency I–III
- Tool Assignment
- Storage Chest
- Workshop Production
- Quarry
- Resource Conveyor
- Automation Mastery — automation capstone

### 5. World Growth and Biomes

- Add Adjacent Block
- Expand to a 3×3 Surface
- Add Underground Layer
- Cave Entrance
- Water Tile
- Forest Patch
- Desert Patch
- Mountain Patch
- Snow Biome
- Swamp Biome
- Rare Crystal Biome
- Biome Mixing
- Larger World Radius I–III
- World Core — world-growth capstone

### 6. Life and Settlement

- Saplings
- Crops
- Farmland
- Animals
- Animal Pens
- Storage Shed
- First Villager
- Farmhouse
- Specialist Miner
- Specialist Farmer
- Toolsmith
- Trading
- Settlement Paths
- Villager Housing
- Settlement Hub
- Living World — settlement capstone

### 7. Mastery and Long-Term Progression

- Expanded Inventory
- Resource Ledger
- Blueprint System
- Recipe Discovery
- Crafting Queue
- Tool Infusions
- Mining Charms
- Cosmetic Block Skins
- World Challenges
- Rare World Events
- World Seed Bonuses
- Prestige / New World
- New Game+ Mastery

## Fixed design rules

- The skill tree is one connected graph with multiple branches, specializations, and occasional convergence points.
- No planned node is silently removed to simplify the first implementation; future systems may remain locked and inactive until their implementation step.
- Node IDs and save values are stable once released.
- The existing block scale, orthographic/isometric presentation, camera controls, and flat block art remain unchanged unless a later task explicitly changes them.
- Each implementation step ends with `npm test`, `npm run build`, browser verification, `git diff --check`, and a clean committed worktree before the next step.

## Deferred until the relevant step

- Full mining durability and break/replacement behavior: step 4.
- New blocks, ores, recipes, workers, biomes, settlement systems, and prestige effects: step 4 or later content passes.
- Audio, multiplayer, cloud saves, combat, and unrelated visual redesign: outside this sequence.
