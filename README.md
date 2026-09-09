# IdleCraft

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

## Art note

This public build uses original flat-colour materials. External texture packs should only be committed after their licence and redistribution terms have been confirmed.
