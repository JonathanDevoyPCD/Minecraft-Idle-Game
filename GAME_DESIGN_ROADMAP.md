# Villagers – Idle World Game
## Complete Progression, Economy & Gameplay Design

---

# 1. The Core Vision

**Villagers – Idle World Game** should be a persistent Minecraft-inspired settlement builder where the player starts with almost nothing and slowly transforms a small patch of land into a huge automated living world.

The fantasy is:

> Start with dirt, a path, one villager and a primitive mine. End with a sprawling automated Minecraft settlement filled with workers, farms, mines, railways, workshops, traders and rare resources.

The game should combine four genres:

**Minecraft**
- resources
- mining depths
- tools
- crafting
- villagers
- biomes
- emeralds
- wandering traders

**Clash of Clans-style progression**
- central settlement tier
- building levels
- limited builders
- construction timers
- resource/storage management
- clear progression requirements
- visually evolving settlement

**Idle game**
- mines operate while away
- farms grow
- production continues
- mine storage fills
- workers continue assignments
- offline progress is meaningful

**Light city builder**
- buildings require paths
- structures occupy grid footprints
- villagers have jobs
- infrastructure matters
- the world visibly evolves

There is deliberately **no multiplayer raiding requirement**.

The player's opponent is progression itself:

**What do I build next?  
What resource do I need?  
How do I increase production?  
Should I upgrade storage or production?  
Do I spend resources now or save for my Settlement Hub?  
Which skill branch do I invest in?  
What will the next mine layer reveal?**

That is the loop that can keep the game compelling.

---

# 2. What Is Currently Wrong With the Progression

The game already has most of the required systems:

- Player XP
- Crafting Points
- World Power
- Settlement Progress
- Resources
- Skill unlocks
- World expansion
- Direct tool upgrades
- Direct mine upgrades
- Mining menu upgrades
- Building unlock requirements
- Settlement stages

But several of these systems independently control progression.

That means the player does not have one clear answer to:

> "What should I be working toward?"

For example, the current skill system gives almost every ordinary node the same **1 Crafting Point cost**, regardless of whether it represents Bare Hands or Redstone technology. Most nodes currently have no resource requirements at all.

There is also a literal progression deadlock:

**Emerald requires First Villager.**

But:

**First Villager requires Emerald.**

Neither can legitimately unlock first.

There are also several parallel upgrade systems.

The code still contains direct speed, tool and world upgrade functions while those systems are also represented in the Skill Tree.

Mining has the same issue.

Emeralds currently pay for direct mine upgrades, despite emeralds starting at only a **0.08% chance per minecart trip**.

At an 8-second base trip:

- 450 trips/hour
- 0.36 expected emeralds/hour
- roughly one emerald every 2.8 hours

That means a 5-emerald upgrade represents roughly 14 hours of expected baseline mining.

An ordinary rail upgrade should not work like that.

Emeralds should be exciting.

They should not be the currency the player needs to make their mine function properly.

---

# 3. The New Progression Hierarchy

Every system should have exactly one job.

## Player XP

Represents the player's overall experience.

Earned from:

- mining
- completing construction
- harvesting
- crafting
- story objectives
- exploration
- discovering resources

XP unlocks player levels.

Player levels periodically grant:

**Crafting Points / Skill Points.**

XP should never directly purchase buildings.

---

# 4. Crafting Points

Crafting Points become the currency of the **Skill Tree only**.

They represent knowledge.

You use them to improve *how* things work.

Examples:

- +10% minecart capacity
- +10% crop yield
- faster manual harvesting
- better offline efficiency
- improved worker efficiency
- critical mining
- automated collection
- improved tool efficiency

Crafting Points should generally **not unlock natural resources**.

The player should not spend one Skill Point and magically learn that coal exists.

Coal should be discovered by reaching the correct mine layer.

---

# 5. Resources

Resources build things.

That is their primary purpose.

Examples:

**Raw**
- Dirt
- Logs
- Cobblestone
- Sand
- Gravel
- Clay
- Coal
- Copper Ore
- Iron Ore
- Gold Ore
- Redstone
- Lapis
- Diamond
- Emerald

**Processed**
- Planks
- Stone
- Bricks
- Glass
- Copper Ingots
- Iron Ingots
- Gold Ingots
- Redstone Components

The important rule:

> Resources are earned by gameplay and spent on physical progression.

That includes:

- buildings
- building upgrades
- tools
- mine upgrades
- storage
- paths
- settlement expansion
- crafting

---

# 6. Emeralds

Emeralds become a **trade currency**.

Nothing fundamental should require emeralds.

They are primarily used for:

- Wandering Trader purchases
- rare biome materials
- special seeds
- rare decorations
- temporary boosts
- cosmetic variants
- rare blueprints
- resource shortcuts

The Wandering Trader concept fits this perfectly because Minecraft's Wandering Trader revolves around emerald trading and unusual resources.

Emeralds therefore become:

> the currency connecting your settlement economy to the outside world.

That is much more interesting than using them to upgrade mine storage.

---

# 7. Settlement Progress

Keep Settlement Progress, but change its job.

Settlement Progress becomes something like:

**Settlement XP / Reputation**

It is not spent.

It represents how developed the settlement is.

You earn it from:

- completing buildings
- building houses
- upgrading production structures
- adding villagers
- improving infrastructure
- completing story chapters

It contributes toward promotion to the next Settlement Tier.

---

# 8. World Power

World Power can remain because it already exists in the save structure, but give it one very specific purpose:

## World Power = Expansion Authority

Earn it from:

- Settlement Hub upgrades
- major story chapters
- major world milestones

Spend it only on:

- increasing chunk radius
- unlocking new regions
- creating new biome zones
- deep world expansion

Do not use World Power for:

- tools
- ordinary buildings
- mine upgrades
- Skill Tree perks

Making it the dedicated world-expansion currency gives it a genuine identity.

---

# 9. The Most Important New System: The Settlement Hub

The game needs the equivalent of Clash's Town Hall.

But don't copy a Town Hall.

Use something fitting the world.

My choice would be:

# Settlement Hub

Visually it could evolve from:

**Village Bell → Meeting Point → Village Hall → Town Hall → Grand Hall**

Its level becomes the authoritative progression gate.

This solves a massive number of problems.

Instead of seven different systems deciding what the player can access:

> Settlement Hub Level determines the era of the settlement.

The existing stages work perfectly:

1. Dwelling
2. Hamlet
3. Village
4. Small Town
5. Town
6. City
7. Large City
8. Endless World

But currently the stage automatically changes from Settlement Progress and world rank.

Change that.

The player should consciously **upgrade the Settlement Hub**.

---

# 10. Settlement Progression

| Hub | Settlement | Major progression |
|---|---|---|
| 1 | Dwelling | Starter mine, basic storage, paths, wood/stone |
| 2 | Hamlet | Farming, furnace, Wandering Trader, second builder |
| 3 | Village | Iron, smithy, villagers, professions |
| 4 | Small Town | Deep mining, Redstone, automation, second mine |
| 5 | Town | Gold, Lapis, advanced crafting, more housing |
| 6 | City | Diamond, advanced automation, biome expansion |
| 7 | Large City | Obsidian/crystal content, advanced districts |
| 8 | Endless | Prestige, world seeds, New World |

Each Hub upgrade should require a combination of:

- resources
- required buildings
- Settlement Progress
- population
- story completion

Example:

## Upgrade Hamlet → Village

Requires:

- Settlement Progress: 1,500
- Population: 4
- Mine Level 2
- Furnace Level 1
- Farm Level 1
- Storage Level 2
- 400 Cobblestone
- 250 Planks
- 40 Iron Ingots

Then the player begins:

**Village Hall Level 3 — 45 minute construction**

A builder must work on it.

When finished:

- Village stage unlocked
- Smithy unlocked
- Iron tools unlocked
- villager professions unlocked
- additional world expansion available
- new Skill Tree tier available

That is the missing Clash-style progression moment.

---

# 11. Builder System

This will bring a tremendous amount of Clash-style structure to the game.

Instead of one global construction queue:

## Give the settlement Builder Villagers.

At Dwelling:

**1 Builder**

Hamlet:

**2 Builders**

Town:

**3 Builders**

Large City:

**4 Builders**

You could eventually unlock a fifth in Endless Mode.

Each active construction consumes one Builder.

The UI should always show something like:

**Builders: 1 / 2**

This immediately creates decisions.

Do I:

- upgrade the mine?
- build another house?
- upgrade storage?
- build a furnace?
- expand the world?

That decision-making is the heart of this genre.

---

# 12. Construction Time Philosophy

The first hour must move quickly.

Do not copy Clash's multi-day early progression.

Recommended pacing:

| Progression | Typical timer |
|---|---:|
| tutorial | 0–15 sec |
| Dwelling | 10 sec–2 min |
| Hamlet | 1–10 min |
| Village | 5–30 min |
| Small Town | 15–90 min |
| Town | 1–4 hr |
| City | 2–8 hr |
| Large City | 4–16 hr |
| Endless | up to 24 hr |

Because this is a web/idle game rather than a heavily monetized mobile game, avoid multi-day timers.

The player should regularly be able to return and find meaningful progress.

---

# 13. Construction Should Become Generic

The current `constructionQueue` mostly represents world expansion projects.

Eventually construction needs to understand:

**Action**
- build
- upgrade
- expand

**Target**
- building ID
- chunk ID
- path project
- mine ID

**Builder**
- builder ID

**Resources**
- paid cost

**Time**
- start timestamp
- completion timestamp

Conceptually:

```text
ConstructionProject

id
action
targetId
targetKind

builderId

startedAt
completesAt

cost
```

Then buildings themselves have:

```text
BuildingInstance

id
kind

x
z
rotation

level

state:
complete
building
upgrading

productionState
```

That architecture will scale much better than adding special cases for every new structure.

---

# 14. Build Mode

The grid/placement foundation is already heading in the right direction.

The repo already has:

- path-aware placement
- collision checking
- footprints
- rotations/directions
- move interactions
- destroy interactions
- mine/path relationship

Build Mode should now become a complete gameplay system.

## Build Categories

### Essentials
- Settlement Hub
- Paths
- Storage
- Well

### Resource
- Mine
- Farm
- Lumber Camp
- Quarry

### Production
- Crafting Bench
- Furnace
- Sawmill
- Stonecutter
- Smithy
- Workshop

### Settlement
- Houses
- Farmhouse
- Animal Pen
- Market
- Villager Workstations

### Infrastructure
- Rail upgrades
- Warehouses
- Bridges
- advanced paths

### Decoration
- Trees
- flowers
- lanterns
- fences
- benches
- statues

---

# 15. Building Placement Flow

Player presses:

**BUILD**

Then:

1. Category tray appears.
2. Player chooses building.
3. Blueprint ghost follows cursor.
4. Tiles turn green/red.
5. Path connection is displayed.
6. Footprint is displayed.
7. Rotation available.
8. Resource requirement shown.
9. Builder availability shown.
10. Player confirms.
11. Resources deducted.
12. Builder begins construction.
13. Scaffolding/construction model appears.
14. Timer runs.
15. Building completes.
16. Settlement XP awarded.

That flow should be identical for almost every normal building.

Consistency is important.

---

# 16. Placement Rules

The current path rule is good.

Buildings should generally need:

**at least one orthogonal path connection.**

Exceptions:

- trees
- decorative plants
- natural resource nodes
- certain water objects

Production buildings should eventually receive path bonuses.

For example:

Dirt Path:
**normal**

Cobblestone Path:
**+5% worker movement**

Stone Path:
**+10% logistics speed**

Late-game railway connections could provide mine bonuses.

This makes the path system meaningful instead of purely decorative.

---

# 17. Moving Buildings

Moving a completed building should be free.

The player is building a pretty world.

Do not punish them for reorganising it.

Rules:

**Move**
- free
- no resource cost
- maybe a 2–3 second placement animation

**Cancel construction**
- refund 80–100%

**Destroy completed building**
- refund approximately 25% of base materials

Never allow destroy/refund loops to generate profit.

---

# 18. Resource Storage

This needs to become extremely important.

One of the best mechanics to borrow from Clash-style progression is:

> Production and storage are separate problems.

## Global Storage

The settlement has storage capacity.

For example:

Storage Level 1:
**500 resources**

Level 2:
**1,500**

Level 3:
**5,000**

etc.

Eventually you may split it into:

**Material Warehouse**
- dirt
- stone
- wood
- sand
- clay

**Ore Warehouse**
- coal
- copper
- iron
- gold
- redstone
- lapis
- diamond

**Granary**
- food
- seeds
- animal products

But start with one Warehouse.

---

# 19. Mine Storage Should Be Real

This is one of the biggest improvements to make to the current mine system.

Right now the mine has a storage amount and visible fill behaviour, but mining rewards are still added directly to global resources.

Instead:

## Minecart delivers to Mine Storage.

Example:

Mine Storage:

**73 / 100**

Containing:

- 52 Cobblestone
- 14 Coal
- 6 Copper
- 1 Emerald

The player taps:

**COLLECT**

Those materials move into the settlement warehouse.

When Mine Storage becomes full:

**production pauses.**

This makes storage meaningful.

Later:

**Worker Hauler**

automatically collects it.

Later:

**Resource Conveyor**

moves it automatically.

That creates a beautiful progression:

### Early
Player manually collects mine storage.

### Midgame
Villager collects it.

### Late game
Automated logistics network handles it.

That is exactly the type of progression an idle world should have.

---

# 20. The Mine Becomes a Building

Do not treat mining as a completely separate menu economy.

A mine is a production building.

Each Mine should have:

## Mine Level

Controls:

- accessible depth
- base payload
- ore table
- upgrade possibilities

## Rail Level

Controls:

- minecart speed

## Cart Capacity

Controls:

- resources per trip

## Storage Level

Controls:

- local storage

## Miner Crew

Controls:

- loading speed
- ore yield

## Ore Sorting

Controls:

- rare-resource efficiency

---

# 21. Mine Upgrade Example

## Mine Level 1 — Shallow Tunnel

Resources:

- Cobblestone
- Coal

Minecart:

1 cargo

Trip:

8 seconds

---

## Mine Level 2 — Reinforced Mine

Resources:

- Cobblestone
- Coal
- Copper
- Iron

Upgrade example:

- 250 Cobblestone
- 100 Planks
- 20 Iron

Unlock requirement:

**Settlement Hub 3**

---

## Mine Level 3 — Deep Shaft

Resources:

- Deepslate
- Iron
- Redstone
- Lapis

Requires:

**Small Town**

---

## Mine Level 4 — Deep Mine

Adds:

- Gold
- increased Redstone
- rare Emerald discovery

---

## Mine Level 5 — Diamond Depth

Adds:

- Diamond
- larger rare veins

---

## Mine Level 6 — Ancient Depth

Adds:

- Obsidian-related material
- rare crystals
- highest rare-resource table

---

# 22. Mine Resource Tables

Rather than giving every available ore every X trips, make each trip generate a small weighted cargo.

Example:

## Shallow Stone Mine

| Resource | Weight |
|---|---:|
| Cobblestone | 80% |
| Coal | 15% |
| Copper | 5% |

---

## Iron Layer

| Resource | Weight |
|---|---:|
| Deepslate | 60% |
| Coal | 15% |
| Copper | 10% |
| Iron | 15% |

---

## Redstone Layer

| Resource | Weight |
|---|---:|
| Deepslate | 50% |
| Iron | 20% |
| Redstone | 12% |
| Lapis | 8% |
| Gold | 10% |

---

## Diamond Layer

| Resource | Weight |
|---|---:|
| Deepslate | 55% |
| Iron | 15% |
| Redstone | 10% |
| Gold | 10% |
| Lapis | 7% |
| Diamond | 3% |

Emerald should remain a **separate rare bonus roll**.

This makes an emerald appearing in the minecart actually exciting.

---

# 23. Emerald Mine Chance

Keep a tiny natural emerald chance.

Something around:

**0.05–0.25% per qualifying cargo**

is fine.

But natural mining is not the main emerald source.

The main source becomes:

# trading surplus resources.

That completely fixes the current emerald economy.

---

# 24. Wandering Trader Economy

The Wandering Trader should be an event.

He should physically enter the settlement with llamas and walk toward the Settlement Bell / Market.

That immediately gives the world personality.

## First Trader

Script the first arrival.

Something like:

> "Word travels fast. Seems somebody's building a settlement out here."

This introduces trading.

Afterwards arrivals become semi-random.

---

# 25. Trader Schedule

Suggested:

Trader can arrive approximately:

**every 4–8 hours**

and remain:

**45–60 minutes**

Offline time counts.

The UI can show:

**Wandering Trader expected sometime today**

rather than an exact timer initially.

Later a Market upgrade could reveal:

**Trader arrives in 01:23:44**

---

# 26. Trader Offers

Each Trader carries:

### 3 BUY offers
Trader buys things from you.

### 3 SELL offers
Trader sells things.

### 1 Rare offer
Unlocked later.

---

# 27. Selling to the Trader

Example early offers:

| Player gives | Player receives |
|---|---:|
| 64 Dirt | 1 Emerald |
| 48 Cobblestone | 1 Emerald |
| 24 Logs | 1 Emerald |
| 16 Coal | 1 Emerald |
| 10 Iron Ingots | 2 Emeralds |
| 6 Gold Ingots | 3 Emeralds |

Each trade has limited stock.

Example:

**64 Cobblestone → 1 Emerald**

Available:

**0 / 3**

Once used three times, that offer locks.

This prevents the player converting infinite common resources.

---

# 28. Buying From the Trader

Trader sells things that provide convenience rather than mandatory progression.

Examples:

| Emerald cost | Item |
|---:|---|
| 1 | Sand bundle |
| 1 | Clay bundle |
| 2 | Rare sapling |
| 2 | Seeds |
| 3 | Lapis bundle |
| 3 | Redstone bundle |
| 4 | Biome plant |
| 5 | Decorative blueprint |
| 8 | Production boost |
| 12 | Rare cosmetic |

Trader should never sell:

**something required to progress that cannot reasonably be obtained elsewhere.**

Trader = shortcut / novelty.

Not progression hostage.

---

# 29. Trader Anti-Exploit Rules

Never generate:

**Sell 32 Sand → 2 Emeralds**

while simultaneously offering:

**1 Emerald → 32 Sand**

That creates arbitrage.

Generate offer categories first.

Then prevent overlapping commodities.

Apply:

- stock limits
- settlement-tier limits
- buy/sell price bands
- no emerald-selling offers
- no infinite refresh

---

# 30. Resource Discovery

The current Skill Tree contains nodes such as:

- Coal
- Copper
- Iron
- Lapis
- Redstone
- Gold
- Diamond
- Emerald

Those shouldn't really be purchased skills.

They're discoveries.

Change these nodes into:

# Discovery Nodes

They still appear in the tree.

But they automatically unlock when the player reaches the correct world condition.

Example:

Player upgrades Mine to depth 2.

A cart returns.

First Iron Ore appears.

Animation:

**NEW RESOURCE DISCOVERED**

### Iron

Then:

- Iron entry illuminates
- Ironworking skills become available
- Smithy progression opens

That feels far better than:

> spend 1 Crafting Point to unlock Iron.

---

# 31. Skill Tree Node Types

The existing visual skill tree can remain.

But use four logical node types.

## Discovery Node

Cost:

**FREE**

Unlocked by gameplay.

Examples:

- Coal
- Iron
- Diamond
- Forest
- Desert

---

## Skill Node

Costs:

**Crafting Points**

Examples:

- +10% yield
- worker efficiency
- manual mining
- offline efficiency

---

## Blueprint Node

Costs:

**Crafting Points**

Unlocks:

- Quarry
- automatic collection
- advanced workshop
- special production buildings

---

## Milestone Node

Automatically unlocked through:

- Settlement Hub
- story
- mine depth

Examples:

- First Villager
- Wandering Trader
- Deep Mining
- City

---

# 32. Do Not Charge For Branch Entry Nodes

The current tree charges normal progression currency for branch-entry nodes.

That effectively makes the player spend a Skill Point for permission to see another place to spend Skill Points.

Instead:

Branches become available from Settlement progression.

Example:

Dwelling unlocks:

- Harvesting
- Tools
- World

Hamlet unlocks:

- Settlement

Village unlocks:

- Automation

Small Town unlocks:

- advanced mining

Town unlocks:

- Mastery

---

# 33. Skill Tree: Harvesting Branch

Early:

**Gatherer's Rhythm I–III**
- faster active harvesting

**Resource Yield I–III**
- +5/10/15% resource yield

**Precision**
- reduced wasted mining progress

**Critical Harvest**
- small critical-resource chance

Mid:

**Combo Momentum**
- active mining combo

**Efficient Gathering**
- reduced tool penalties

**Multi-Harvest**
- active bonus affects nearby targets

Late:

**Harvest Mastery**
- major gathering efficiency bonus

This becomes a genuine playstyle branch.

---

# 34. Tools & Crafting Branch

Tools should have two different systems:

**Skills improve tools globally.**

But:

**Smithy upgrades actual tool tiers.**

So the Skill Tree does NOT directly hand the player an Iron Pickaxe.

It unlocks:

**Ironworking**

Then the Smithy crafts/upgrades the tool.

Much more logical.

---

# 35. Tool Progression

## Hands

Starter.

---

## Wooden Tools

Requires:

- Crafting Bench
- logs/planks

---

## Stone Tools

Requires:

- Cobblestone
- Tool Bench Level 2

---

## Iron Tools

Requires:

- Iron Ingots
- Smithy

---

## Diamond Tools

Requires:

- Diamond
- Smithy Level 4

---

## Late Game Tools

Possible future:

- Enchanted Diamond
- Netherite

But do not add Nether content until the primary world is strong enough.

---

# 36. Tool Families

## Pickaxe

Affects:

- clickable ore deposits
- mine bonuses
- quarry
- stone gathering

## Axe

Affects:

- logging
- tree regeneration
- Sawmill

## Shovel

Affects:

- dirt
- clay
- sand
- gravel
- path construction

## Hoe

Affects:

- crops
- farmland
- harvest efficiency

## Shears

Affects:

- leaves
- vines
- wool

## Bucket

Affects:

- water
- irrigation
- later lava/obsidian projects

---

# 37. Do Not Make Tools Annoyingly Disposable

The current Skill Tree includes tool durability.

For this particular game do not use normal Minecraft-style tool destruction.

Because this is an idle settlement game.

Logging back in and discovering:

> your workers stopped six hours ago because the pickaxe broke

would be frustrating.

Instead "durability" should represent:

**maintenance efficiency.**

For example:

Tool Durability I:

**Workers using tools gain +5% uptime**

Tool Durability III:

**+15% worker/tool efficiency**

No permanent breakage.

---

# 38. Processing Economy

Raw materials should eventually be less useful than processed materials.

That creates a second economy layer.

Examples:

Logs  
↓  
Sawmill  
↓  
Planks

Cobblestone  
↓  
Stonecutter  
↓  
Stone

Clay  
↓  
Furnace  
↓  
Bricks

Sand  
↓  
Furnace  
↓  
Glass

Iron Ore  
↓  
Furnace  
↓  
Iron Ingot

Gold Ore  
↓  
Furnace  
↓  
Gold Ingot

This creates meaningful production buildings.

---

# 39. Workshops Should Have Queues

Example Furnace:

Level 1:

**1 processing slot**

Level 2:

**2 queue slots**

Level 3:

**faster smelting**

Automation skill later:

**Auto-refill queue**

That gives the idle game another useful loop.

---

# 40. Farms and Food

Food becomes important once villagers arrive.

Do not make food another generic construction currency.

Food should mainly support:

- population
- worker efficiency
- settlement tier requirements

Example:

Village requires:

**4 population**

To support 4 population:

**Food production ≥ 4/hour**

This gives farms an important reason to exist.

---

# 41. Villager Population

Housing determines maximum population.

Example:

Starter Dwelling:

**2 population**

House Level 1:

**+2**

House Level 2:

**+3**

Large House:

**+5**

Villagers are then assigned jobs.

---

# 42. Villager Jobs

## Builder

Construction.

## Miner

Improves mine production.

## Farmer

Runs farms.

## Lumberjack

Harvests wood.

## Toolsmith

Improves Smithy production.

## Hauler

Moves mine storage to warehouse.

## Trader / Merchant

Improves Wandering Trader deals later.

This makes villagers mechanically important rather than purely cosmetic.

---

# 43. Automation Should Be Villager-Based First

Minecraft's fantasy is villagers doing work.

So early automation should not immediately become machines.

Progression:

### Phase 1
Player manually interacts.

### Phase 2
Villagers automate jobs.

### Phase 3
Redstone improves villagers and logistics.

### Phase 4
Advanced machinery handles large-scale automation.

That creates a beautiful technological progression.

---

# 44. Example Mining Progression

Early:

**Player clicks ore bonus.**

Then:

**Minecart carries stone.**

Then:

**Miner Villager improves mine.**

Then:

**Hauler Villager automatically collects storage.**

Then:

**Powered Rails reduce trip time.**

Then:

**Redstone Ore Sorter improves rare drops.**

Then:

**Resource Conveyor automatically routes materials.**

Then:

**Multiple mine sites form a mining district.**

This is exactly the kind of visible progression the game needs.

---

# 45. Second and Third Mines

The current system already supports additional mine sites.

But do not make them ordinary Skill Tree unlocks.

Make them Settlement progression milestones.

Example:

### Mine Site 1
Dwelling

### Mine Site 2
Small Town

### Mine Site 3
City

Then a skill may improve:

**Multi-Mine Coordination**

rather than literally creating another mine permit.

That keeps global progression controlled.

---

# 46. Settlement Hub Upgrade Requirements

Every Hub upgrade should require:

### Economy
resources

### Infrastructure
specific buildings

### Population
minimum villagers

### Development
Settlement Progress

### Story
chapter completion

That prevents rushing.

Example:

# Small Town

Requires:

**Settlement XP**
7,500

**Population**
12

**Buildings**
- Mine Level 3
- Farm Level 2
- Smithy Level 2
- Warehouse Level 3
- 4 Houses
- Market

**Resources**
- 2,500 Cobblestone
- 1,500 Planks
- 250 Iron
- 80 Copper

**Story**
"The Deep Shaft"

---

# 47. Settlement XP

Instead of Settlement Progress mostly coming from terrain expansion, award it from meaningful development.

Example:

| Action | Settlement XP |
|---|---:|
| path | 2 |
| decoration | 2 |
| building | 20–100 |
| building upgrade | 20–200 |
| house | 50 |
| new villager | 25 |
| mine | 100 |
| mine upgrade | 100 |
| hub upgrade | 500 |
| story chapter | 100–500 |

The world itself therefore measures your progress.

---

# 48. Skill Tree Costs

Do not use the same price for everything.

Suggested CP curve:

Early nodes:

**1 CP**

Intermediate:

**2 CP**

Strong nodes:

**3 CP**

Major blueprint:

**3–4 CP**

Capstone:

**5 CP**

Ranks should also increase.

Example:

Resource Yield:

Rank I — 1 CP  
Rank II — 2 CP  
Rank III — 3 CP

This makes player choices meaningful.

---

# 49. XP Progression

The current level formula is linear:

`100 + 150 × (level - 1)`

That works for the prototype, but eventually idle production will dramatically outscale it.

Gradually reduce Skill Point frequency.

Example:

Levels 1–10:

**1 CP every level**

Levels 11–25:

**1 CP every 2 levels**

Levels 26+:

**1 CP every 3 levels**

Story chapters can award additional CP.

That prevents the player eventually buying the entire tree almost automatically.

---

# 50. Story System

The game needs a light story.

Not a massive RPG narrative.

Its purpose is to:

- teach mechanics
- give progression meaning
- introduce systems naturally
- provide short-term objectives

Use a:

# Settlement Journal

Each chapter contains:

- dialogue
- objectives
- rewards
- system unlock

---

# 51. Prologue — A Patch of Grass

The world begins nearly empty.

A Builder Villager stands beside a small path.

Objectives:

**Gather 10 Dirt**

**Gather 10 Cobblestone**

**Construct the Crafting Bench**

Reward:

- 1 Crafting Point
- first Mine Blueprint

---

# 52. Chapter 1 — Beneath Our Feet

Objectives:

- extend the path
- place the Mine
- wait for first minecart
- collect 25 Cobblestone
- construct Storage

Reward:

- Mine Level 1 unlocked
- first Builder permanently joins settlement

This teaches the basic gameplay loop.

---

# 53. Chapter 2 — Smoke on the Horizon

The player discovers Coal.

Objectives:

- discover Coal
- construct Furnace
- smelt first material
- upgrade Storage

Reward:

**Hamlet progression unlocked**

---

# 54. Chapter 3 — A Place to Stay

Objectives:

- build first House
- build Farm
- produce food
- increase population

Reward:

First normal Villager.

Now the game visibly becomes alive.

---

# 55. Chapter 4 — The Stranger

A Wandering Trader arrives.

Dialogue introduces:

- emeralds
- selling surplus
- buying unusual resources

The player performs one trade.

Reward:

- 2 Emeralds
- Market blueprint

This is much better than the trader simply appearing randomly without context.

---

# 56. Chapter 5 — Iron Below

Player discovers Iron.

Objectives:

- collect Iron Ore
- smelt Iron
- construct Smithy
- upgrade Pickaxe

Reward:

**Village progression**

---

# 57. Chapter 6 — Red Sparks

Player discovers Redstone.

Objectives:

- build powered rail upgrade
- assign Miner
- assign Hauler
- automate collection

Reward:

**Automation branch Tier II**

---

# 58. Chapter 7 — The Deep World

Objectives:

- upgrade mine depth
- unlock Deepslate
- discover Lapis
- construct second Mine

Reward:

**Small Town**

---

# 59. Chapter 8 — Diamonds

Discover Diamond.

Objectives:

- collect Diamond
- forge Diamond Pickaxe
- build Advanced Workshop
- unlock first rare biome

Reward:

**City progression**

---

# 60. Chapter 9 — A Living World

The settlement now contains:

- villagers
- animals
- farms
- multiple mines
- industry
- paths
- trading

Objectives focus on transforming it into a full city.

Reward:

**Large City**

---

# 61. Chapter 10 — Beyond the Horizon

Introduces:

- world seeds
- optional world challenges
- prestige
- New World

This becomes the long-term replay loop.

---

# 62. Complete Resource Roadmap

## Dirt

Unlocked:

Start

Source:

- surface harvesting
- excavation

Uses:

- paths
- farming
- terrain
- early construction

---

## Logs

Unlocked:

Start / early forest

Source:

- trees
- Lumberjack

Uses:

- planks
- tools
- buildings
- storage

---

## Planks

Processed from:

Logs

Uses:

- houses
- storage
- workshops
- tools

---

## Cobblestone

Source:

Mine Level 1

Uses:

- paths
- buildings
- Furnace
- Mine upgrades

Core early-game resource.

---

## Coal

Source:

Shallow Mine

Uses:

- smelting
- fuel
- industrial upgrades

---

## Copper

Source:

Shallow/Reinforced Mine

Uses:

- infrastructure
- early mechanisms
- decorative building
- intermediate automation

---

## Iron

Source:

Mine Level 2

Uses:

- tools
- Smithy
- rails
- building upgrades
- mine upgrades

Iron should become the most important midgame resource.

---

## Sand

Source:

- Desert biome
- Trader

Uses:

- glass
- landscaping

---

## Clay

Source:

- wetlands
- Trader

Uses:

- bricks
- decorative buildings

---

## Gravel

Source:

- quarry
- mountain
- trader

Uses:

- paths
- construction
- future concrete

---

## Food

Source:

- crops
- animals

Uses:

- population support
- worker systems

---

## Redstone

Source:

Deep Mine

Uses:

- automation
- powered rail
- workshop
- logistics

This should represent the transition into technological progression.

---

## Lapis

Source:

Deep Mine

Uses:

- tool infusions
- special crafting
- later enchantment-style systems

---

## Gold

Source:

Deep Mine

Uses:

- advanced mechanisms
- high-tier crafting
- trade goods

---

## Diamond

Source:

Diamond-depth mine

Uses:

- high-tier tools
- advanced mine equipment
- major progression

---

## Emerald

Source:

- Wandering Trader buying resources
- rare mining
- story
- achievements

Uses:

- Trader purchases
- rare blueprints
- cosmetics
- convenience

Not core construction.

---

## Obsidian

Late-game.

Prefer Minecraft-like production:

water + lava interaction

rather than making it simply another Mine resource.

Requires Diamond-tier capability.

Uses:

- special structures
- endgame research
- future dimensional content

---

# 63. Biomes

Biomes should not simply be visual skins.

Every biome should bring resources.

## Meadow

- dirt
- grass
- crops
- animals

## Forest

- logs
- saplings
- leaves
- mushrooms

## Desert

- sand
- cactus
- sandstone

## Mountain

- stone
- gravel
- increased ore bonus

## Swamp

- clay
- vines
- mushrooms

## Snow

- ice
- snow
- spruce-style resources

## Crystal

- late-game rare resources

This makes world expansion economically important.

---

# 64. World Expansion

The current square chunk expansion foundation is solid.

Rather than endlessly making the central square bigger, eventually transition to:

# Regions

Example:

Central Meadow

↓ connect north

Forest Region

↓ connect east

Mountain Region

This creates a world map rather than one giant square.

Each region could be something like:

7×7

9×9

or another manageable chunk footprint.

That is probably a better long-term performance architecture too.

---

# 65. World Power

Settlement Hub upgrades grant:

**1 World Power**

Then expansion costs:

Adjacent meadow:

1

Forest:

1

Desert:

1

Mountain:

2

Swamp:

2

Snow:

2

Crystal:

3

This means the player cannot unlock every biome immediately.

They make choices.

---

# 66. Early Player Flow

## First 5 Minutes

Player:

- mines manually
- collects dirt/stone
- sees XP increase
- unlocks Crafting Point
- places Crafting Bench
- receives Mine Blueprint

Constant interaction.

Almost no waiting.

---

# 67. 5–15 Minutes

Player:

- builds path
- places mine
- watches first minecart
- manually collects mine storage
- builds chest/storage
- begins Skill Tree

The main game loop is now understood.

---

# 68. 15–30 Minutes

Player:

- upgrades Mine
- discovers Coal
- unlocks Furnace
- starts first processing
- starts first house/farm

Game transitions from mining game → settlement game.

---

# 69. 30–60 Minutes

Player:

- gains first residents
- upgrades Settlement Hub
- Wandering Trader arrives
- unlocks second Builder
- discovers first real production bottleneck

At this stage the player should have several possible goals.

---

# 70. After First Hour

The player's loop becomes:

**Collect**

↓  

**Spend**

↓  

**Build**

↓  

**Upgrade**

↓  

**Assign workers**

↓  

**Research skills**

↓  

**Expand**

↓  

**Discover**

↓  

**Return later**

That is the long-term game.

---

# 71. Offline Gameplay

Offline gameplay should primarily advance:

- mine production
- farms
- processing queues
- construction
- trader timers

But all production respects storage capacity.

Example:

Player leaves for 8 hours.

Mine storage filled after 3 hours.

The remaining 5 hours produced nothing.

That sounds harsh initially—but it creates motivation:

> upgrade mine storage.

Then:

> hire a Hauler.

Then:

> automate transport.

Excellent idle-game progression.

---

# 72. Offline Efficiency Skill

Early:

50% efficiency

Skill I:

60%

Skill II:

70%

Skill III:

80%

Automation Mastery:

90%

Never necessarily 100% until late-game.

This gives Automation a genuinely strong identity.

---

# 73. Resource Economy Balancing Rule

Do not randomly invent costs.

Balance costs against **production time**.

Example:

If a Village player's mine generates around:

200 Iron/hour

then:

Minor Iron upgrade:

30–50 Iron

Major upgrade:

100–200

Hub progression:

300–500

That translates to:

minor = minutes  
major = approximately an hour  
stage = several hours

This is much easier to balance than arbitrary values.

---

# 74. Recommended Economy Targets

## Early Minor Upgrade

5–15 minutes of production

## Early Major Building

15–30 minutes

## Midgame Minor Upgrade

20–45 minutes

## Midgame Major Upgrade

1–3 hours

## Settlement Hub Upgrade

3–8 hours of combined production

## Late Major Upgrade

4–12 hours

## Late Settlement Upgrade

8–24 hours

---

# 75. Storage Balancing Rule

Important:

> A required upgrade should generally cost no more than around 70–90% of the player's current maximum storage capacity.

That creates the familiar pattern:

Need expensive building  
→ storage is too small  
→ upgrade storage  
→ save resources  
→ build structure

That creates natural progression.

---

# 76. Remove Duplicate Upgrade Systems

One of the most important technical cleanups:

There must only be one authoritative path for each type of progression.

Final ownership should be:

### Skill Tree
perks

### Smithy
tools

### Mine
mine upgrades

### Building
building level

### Settlement Hub
global progression

### World Expansion
world size/biomes

### Trader
emerald economy

Nothing should be unlockable from two different menus.

---

# 77. Fix The Emerald/Villager Deadlock Immediately

Current:

Emerald  
→ requires First Villager

First Villager  
→ requires Emerald

This is impossible.

Change it to:

First Villager  
→ Hamlet + House

Then:

First Wandering Trader  
→ First Villager + Market/Bell

Then:

Emerald  
→ discovered when first trade completes

Natural emerald ore can unlock separately later.

That tells a far more logical story.

---

# 78. Storage Mine Upgrade Issue

The mine currently has:

- `storageCapacityLevel`
- `mineUpgradeRanks['storage-capacity']`

These should become one system.

The Mine Storage upgrade should directly control its storage capacity.

Suggested:

Base:

100

Level 2:

250

Level 3:

500

Level 4:

1,000

Level 5:

2,500

Costs should be normal construction resources.

Not Emeralds.

---

# 79. Rail Upgrades

Rail progression should use Minecraft-relevant resources.

## Basic Rails

Iron

## Improved Rails

Iron + Copper

## Powered Rails

Gold + Redstone

## Advanced Powered Rails

Gold + Redstone + advanced workshop components

Much better than:

5 Emeralds → faster railway.

---

# 80. Cart Upgrades

Keep the existing design rule of:

**one physical minecart per mine.**

That is visually cleaner.

Instead upgrade:

- cart capacity
- loading speed
- rail speed
- unloading efficiency

Additional parallel production comes from:

**additional mines.**

That is excellent visually.

---

# 81. Settlement Districts

Later stages can naturally form districts.

## Farming District

- farms
- barns
- farmhouse

## Mining District

- mines
- ore storage
- Smithy

## Industrial District

- Furnace
- Workshop
- Stonecutter
- Sawmill

## Residential District

- houses
- well
- decorations

## Market District

- Settlement Hall
- trader
- market stalls

This can be partly emergent rather than forced.

---

# 82. Happiness

Do not implement this yet.

But eventually:

Villagers can have a lightweight happiness score influenced by:

- housing
- food
- paths
- decorations

It should provide small production bonuses.

Never make it a tedious punishment system.

---

# 83. Prestige

Prestige should come very late.

Instead of:

"reset numbers for +10%"

make prestige Minecraft-themed.

# Start a New World Seed

The player leaves the finished settlement behind.

New world:

- different biome layout
- different bonuses
- different resource modifiers

Carry over:

- Mastery Points
- cosmetic blueprints
- discovered recipes
- world relics

That makes the New World mechanic fit Minecraft perfectly.

---

# 84. Final Core Loop

The complete game eventually works like this:

**Mines / farms / workers produce**

↓

**Local storage fills**

↓

**Player or automation collects**

↓

**Workshops process**

↓

**Resources fund structures**

↓

**Builders construct**

↓

**Structures improve settlement**

↓

**Settlement unlocks new technology**

↓

**Technology unlocks deeper resources**

↓

**Resources enable stronger buildings**

↓

**Settlement Hub advances**

↓

**World expands**

↓

**New biome/resources discovered**

↓

**Story advances**

↓

**repeat**

That is the equivalent of Clash's progression loop without raids.

---

# 85. The UI Should Always Answer Three Questions

At all times the player must be able to answer:

## What am I working toward?

Example:

**Village Hall Upgrade**

3 / 4 requirements completed.

---

## What is stopping me?

Example:

**Need 140 more Iron**

---

## How do I get it?

Clicking Iron:

**Produced by Mine Level 2+**

**Current rate: 73/hour**

That small UX principle will make this enormous game dramatically easier to understand.

---

# 86. "Next Goal" System

Add a small goal tracker.

Example:

### Upgrade to Village

✓ Population 4/4  
✓ Farm Level 1  
✓ Mine Level 2  
✗ 180 / 300 Iron  
✓ Settlement XP 2,000  

This gives the player direction without forcing them into menus.

---

# 87. Resource Tooltips

Every resource icon should display:

**Iron**

Stored:
438 / 1,500

Production:
+72/hour

Sources:
- Mine 1
- Mine 2

Used for:
- Smithy
- Iron Tools
- Rails
- Mine upgrades

That makes the economy understandable.

---

# 88. Proposed Game-State Architecture

Eventually the state should conceptually contain:

```text
Player
- level
- xp
- craftingPoints

Settlement
- hubLevel
- settlementXp
- worldPower
- population
- foodSupply

World
- chunks
- biomes
- paths
- placements

Builders
- builderSlots
- assignedProjects

Buildings
- instances
- levels
- construction states

Resources
- global inventory
- storage capacity

Mines
- level
- depth
- railLevel
- cartCapacity
- storage
- miners

Villagers
- job
- home
- assignment

Production
- workshop queues
- farm queues

Trader
- arrival
- departure
- offers
- purchased quantities

Story
- chapter
- activeObjectives
- completedObjectives

Skills
- ranks

Discoveries
- resources
- biomes
- recipes
```

That becomes a much stronger foundation for the scale of the game.

---

# 89. Development Roadmap

The order matters enormously.

Do **not** start adding dozens of additional buildings yet.

First rebuild the progression spine.

## Phase 1 — Progression Foundation

Implement:

- Settlement Hub levels
- builder slots
- generic construction projects
- building levels
- resource storage
- building costs
- building timers

Do this before adding more content.

---

## Phase 2 — Economy Cleanup

Fix:

- duplicate upgrade paths
- Skill Tree costs
- Emerald deadlock
- resource discovery
- World Power purpose
- Settlement XP

Remove Emeralds from ordinary mine upgrades.

---

## Phase 3 — Real Mine Economy

Implement:

- actual mine storage inventories
- collect button
- mine levels
- rail levels
- cart capacity
- weighted ore table
- mine upgrade costs
- storage fullness stopping production

This transforms mining from an animation into an economy.

---

## Phase 4 — Processing

Add:

- Sawmill
- Furnace
- Stonecutter
- Smithy

Introduce:

- planks
- ingots
- glass
- bricks

---

## Phase 5 — Settlement Life

Add:

- housing
- population
- food
- farms
- villagers
- jobs

This is when the game should fully earn its name:

**Villagers – Idle World Game.**

---

## Phase 6 — Wandering Trader

Implement:

- Trader arrival
- llamas
- rotating offers
- emerald selling
- emerald buying
- Market
- Trader tutorial chapter

---

## Phase 7 — Automation

Add:

- Miner
- Farmer
- Hauler
- powered rails
- automatic collection
- worker assignments
- Redstone automation

---

## Phase 8 — Biomes and Expansion

Add:

- Forest
- Desert
- Mountain
- Swamp
- Snow
- Crystal

Resources become tied to world exploration.

---

## Phase 9 — Story

The technical Story/Quest framework could exist earlier, but now fill it out with:

- chapters
- dialogue
- objectives
- world milestones
- rewards

---

## Phase 10 — Late Game

Add:

- Diamond tier
- advanced workshops
- rare events
- advanced trading
- Mastery
- World Seeds
- Prestige

---

# 90. What To Change In The Current Repo First

Before adding another major feature, make these changes in this exact order:

1. **Fix the Emerald ↔ First Villager circular dependency.**
2. **Remove Emeralds from normal mine upgrades.**
3. **Choose Settlement Hub Level as the authoritative global progression system.**
4. **Make Settlement stages explicit Hub upgrades rather than automatically changing from progress thresholds.**
5. **Turn material Skill Tree nodes into automatic discoveries.**
6. **Make branch-entry nodes free milestone unlocks.**
7. **Give Skill Tree ranks properly increasing CP costs.**
8. **Remove/migrate the legacy direct Speed/Tool/World upgrade routes.**
9. **Make Mine Storage contain real resources rather than only visually filling while global resources increase.**
10. **Add Builder slots.**
11. **Turn construction into a generic building/upgrade/expansion system.**
12. **Give every building a level.**
13. **Move tool progression into a Smithy/Tool Bench upgrade flow.**
14. **Make World Power exclusively control map expansion.**
15. **Add the Wandering Trader as the primary Emerald generator/sink.**
16. **Introduce Settlement objectives/story chapters.**
17. **Then begin adding villagers, farms, automation and biomes.**

---

# 91. Final Vision

The player should eventually be able to zoom out and visually see their progression history.

At the centre:

**the original tiny path.**

Beside it:

**the first mine.**

Then around that:

- houses
- farms
- villagers walking
- trees growing
- minecarts moving
- furnaces smoking
- workers hauling resources
- animals wandering
- Wandering Trader visiting
- roads spreading
- multiple mines operating
- workshops processing
- different biome regions appearing around the settlement

Every system becomes visible in the world.

That is what will make this more than a Minecraft-themed idle clicker.

It becomes:

# a world the player has actually built.

And the progression loop becomes:

**Mine → Produce → Collect → Craft → Build → Upgrade → Automate → Expand → Discover → Grow the Settlement → Repeat.**

That is the structure to use as the foundation for the complete game.
