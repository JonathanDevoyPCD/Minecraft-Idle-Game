import { describe, expect, it } from 'vitest';
import { BORDER_SIZE, ENTRANCE_WIDTH, PLAYABLE_SIZE, WORLD_CELL_COUNT, WORLD_SIZE } from './world-config';
import { countWorldZones, createBorderDecorationPlan, createWorldGrid, getEntranceCells, getWorldCell, getWorldPosition, isReservedEntranceCell, validateWorldGrid } from './world-grid';

describe('testing world foundation grid', () => {
  it('creates a deterministic 60 by 60 grid with a 50 by 50 buildable center', () => {
    const grid = createWorldGrid();
    expect(grid).toHaveLength(WORLD_CELL_COUNT);
    expect(WORLD_SIZE).toBe(60);
    expect(PLAYABLE_SIZE).toBe(50);
    expect(BORDER_SIZE).toBe(5);
    expect(countWorldZones(grid)).toEqual({ playable: 2500, border: 1100 });
    expect(validateWorldGrid(grid)).toBe(true);
    expect(getWorldCell(grid, 5, 5)).toMatchObject({ playableX: 0, playableZ: 0, buildable: true, zone: 'playable' });
    expect(getWorldCell(grid, 54, 54)).toMatchObject({ playableX: 49, playableZ: 49, buildable: true, zone: 'playable' });
    expect(getWorldCell(grid, 4, 5)).toMatchObject({ buildable: false, zone: 'border' });
    expect(getWorldCell(grid, 55, 55)).toMatchObject({ buildable: false, zone: 'border' });
    expect(getWorldCell(grid, -1, 0)).toBeUndefined();
  });

  it('reserves three-cell entrance corridors through each border without making them buildable', () => {
    const grid = createWorldGrid();
    for (const side of ['north', 'east', 'south', 'west'] as const) {
      const cells = getEntranceCells(side);
      expect(cells).toHaveLength(ENTRANCE_WIDTH * BORDER_SIZE);
      cells.forEach(({ worldX, worldZ }) => {
        expect(isReservedEntranceCell(worldX, worldZ)).toBe(true);
        expect(getWorldCell(grid, worldX, worldZ)).toMatchObject({ buildable: false, zone: 'border' });
      });
    }
  });

  it('creates stable border dressing data outside reserved entrances and playable cells', () => {
    const grid = createWorldGrid();
    const first = createBorderDecorationPlan(grid);
    expect(first.length).toBeGreaterThan(50);
    expect(createBorderDecorationPlan(grid)).toEqual(first);
    first.forEach(({ worldX, worldZ }) => {
      expect(getWorldCell(grid, worldX, worldZ)?.zone).toBe('border');
      expect(isReservedEntranceCell(worldX, worldZ)).toBe(false);
    });
  });

  it('converts logical cells to stable centered world positions at the project tile scale', () => {
    expect(getWorldPosition(29, 29)).toEqual({ x: -0.45, z: -0.45 });
    expect(getWorldPosition(30, 30)).toEqual({ x: 0.45, z: 0.45 });
  });
});
