# Villagers - Idle World Game

An isometric idle-clicker game about growing one grass block into a living world.

## Current game systems

- Manual mining by clicking the block, pressing the button, or pressing Space
- One automatic strike per second
- XP progression using 100, 250, 400... early level requirements
- Crafting Points and the first auto-rate upgrade
- Tool progression from Bare Hands to Wooden, Stone, and Iron Pickaxes
- Context-sensitive Hand, Pickaxe, Shovel, and Axe tool forms shown in the HUD
- Tool power increases XP per strike and offline harvesting efficiency
- Dirt and cobblestone resources are collected independently by block type
- First world expansion milestone with dirt and stone neighbors
- Coordinate-based world growth from one core cell to an adjacent cell and 3×3 surface
- Skill-tree underground-layer unlock with textured, independently mineable deepslate
- Crafting Tree overlay groups world, tool, and automation unlocks
- Isometric Three.js scene with flat-colour materials, lighting, shadows, and block clouds
- Local autosave and timestamp-based offline gains
- Responsive desktop and mobile HUD
- Automated tests and GitHub Pages deployment

## Local development

```bash
npm install
npm run dev
```

Run checks with:

```bash
npm test
npm run build
```

## Cloud session saving

Villagers - Idle World Game keeps its local autosave and also syncs the current save to Supabase
when a player session is available. The browser uses only the publishable key;
the secret key and database password must never be placed in the client or in a
Vite environment variable.

Before testing cloud saves, enable **Authentication → Sign-in / Providers →
Anonymous Sign-Ins** in the `Villagers-Idle-World-Game` Supabase project. The
local Vite app and the GitHub Pages build use the same project configuration.
Optional `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` environment
variables can override the built-in publishable configuration for another
environment.

## Art note

This public build uses original flat-colour materials. External texture packs should only be committed after their licence and redistribution terms have been confirmed.
