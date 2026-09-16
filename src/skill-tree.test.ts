import { describe, expect, it } from 'vitest';
import { getSkillNodeCraftingPointCost, SKILL_TREE_BRANCHES, SKILL_TREE_BRANCH_ENTRY_IDS, SKILL_TREE_BY_ID, SKILL_TREE_NODES } from './skill-tree';

describe('Villagers - Idle World Game skill tree model', () => {
  it('contains all seven planned branches', () => {
    expect(SKILL_TREE_BRANCHES).toHaveLength(7);
    expect(new Set(SKILL_TREE_NODES.map((node) => node.branch))).toEqual(
      new Set(SKILL_TREE_BRANCHES.map((branch) => branch.id)),
    );
  });

  it('keeps node IDs unique and prerequisites resolvable', () => {
    expect(new Set(SKILL_TREE_NODES.map((node) => node.id)).size).toBe(SKILL_TREE_NODES.length);
    SKILL_TREE_NODES.forEach((node) => {
      node.prerequisites.forEach((prerequisite) => {
        expect(SKILL_TREE_BY_ID.has(prerequisite), `${node.id} -> ${prerequisite}`).toBe(true);
      });
    });
  });

  it('starts each branch with a free Hub-gated entry node', () => {
    const entryIds = Object.values(SKILL_TREE_BRANCH_ENTRY_IDS);
    expect(entryIds).toHaveLength(7);
    expect(new Set(entryIds).size).toBe(7);

    SKILL_TREE_BRANCHES.forEach((branch) => {
      const entryId = SKILL_TREE_BRANCH_ENTRY_IDS[branch.id];
      const entry = SKILL_TREE_BY_ID.get(entryId);
      expect(entry?.branch).toBe(branch.id);
      expect(entry?.prerequisites).toEqual([]);
      expect(entry?.kind).toBe('milestone');
      expect(entry?.cost.craftingPoints).toBe(0);
      expect(entry?.milestone?.trigger).toBe('settlement-hub');
      expect(entry?.milestone?.required).toBeGreaterThanOrEqual(1);

      const firstRealNode = SKILL_TREE_NODES.find(
        (node) => node.branch === branch.id && node.id !== entryId,
      );
      expect(firstRealNode?.prerequisites).toContain(entryId);
    });
  });

  it('supports branching and cross-branch specializations', () => {
    const woodenTools = SKILL_TREE_NODES.filter((node) => node.prerequisites.includes('tools-tool-bench'));
    expect(woodenTools.map((node) => node.id)).toEqual(expect.arrayContaining([
      'tools-wooden-shovel',
      'tools-wooden-pickaxe',
      'tools-wooden-axe',
    ]));
    expect(SKILL_TREE_BY_ID.get('harvesting-chain-mining')?.prerequisites).toContain('automation-target-queue');
    expect(SKILL_TREE_BY_ID.get('tools-iron-pickaxe')?.prerequisites).toContain('materials-iron');
  });

  it('marks each branch capstone as a distinct node', () => {
    const capstones = SKILL_TREE_NODES.filter((node) => node.kind === 'capstone');
    expect(capstones.map((node) => node.id)).toEqual(expect.arrayContaining([
      'harvesting-mastery',
      'tools-mastery',
      'automation-mastery',
      'world-core',
      'life-living-world',
      'mastery-new-game-plus',
    ]));
    expect(capstones.length).toBeGreaterThanOrEqual(6);
  });

  it('models natural materials as free discovery nodes', () => {
    const discoveryIds = [
      'materials-dirt-grass',
      'materials-stone',
      'materials-coal',
      'materials-copper',
      'materials-iron',
      'materials-lapis',
      'materials-redstone',
      'materials-gold',
      'materials-diamond',
      'materials-emerald',
      'materials-obsidian',
    ];
    discoveryIds.forEach((id) => {
      const node = SKILL_TREE_BY_ID.get(id);
      expect(node?.kind, id).toBe('discovery');
      expect(node?.cost.craftingPoints, id).toBe(0);
      expect(node?.discovery, id).toBeDefined();
    });
  });

  it('scales Crafting Point costs by purchased rank', () => {
    const rankedNode = SKILL_TREE_BY_ID.get('harvesting-resource-yield');
    const capstone = SKILL_TREE_BY_ID.get('harvesting-mastery');
    const discovery = SKILL_TREE_BY_ID.get('materials-dirt-grass');

    expect(rankedNode).toBeDefined();
    expect([0, 1, 2].map((rank) => getSkillNodeCraftingPointCost(rankedNode!, rank))).toEqual([1, 2, 3]);
    expect(getSkillNodeCraftingPointCost(capstone!, 0)).toBe(5);
    expect(getSkillNodeCraftingPointCost(discovery!, 0)).toBe(0);
  });
});
