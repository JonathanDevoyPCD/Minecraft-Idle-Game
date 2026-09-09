import { describe, expect, it } from 'vitest';
import { SKILL_TREE_BRANCHES, SKILL_TREE_BY_ID, SKILL_TREE_NODES } from './skill-tree';

describe('IdleCraft skill tree model', () => {
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
});
