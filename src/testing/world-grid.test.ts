import { describe, expect, it } from 'vitest';
import { BORDER_SIZE, ENTRANCE_WIDTH, PLAYABLE_SIZE, TILE_SIZE, WORLD_CELL_COUNT, WORLD_SIZE, WORLD_SPAN } from './world-config';
import { countWorldZones, createBorderDecorationPlan, createWorldGrid, getEntranceCells, getWorldCell, getWorldPosition, isReservedEntranceCell, validateWorldGrid } from './world-grid';
import { BEACH_SAND_TINT, createCoastalBandGeometry, createIslandCoastlinePoints, createPlayableGridLinePositions, createShallowWaterGeometry, DEEP_WATER_TINT, ISLAND_BEACH_WIDTH, ISLAND_COASTLINE_SEGMENTS, SHALLOW_WATER_TINT, SHORE_FOAM_TINT } from './world-scene';

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

  it('places playable grid lines on all 50-tile boundaries and nowhere in the border', () => {
    const positions = createPlayableGridLinePositions();
    const halfSpan = PLAYABLE_SIZE * TILE_SIZE / 2;
    expect(positions).toHaveLength((PLAYABLE_SIZE + 1) * 12);
    const xs = Array.from({ length: positions.length / 3 }, (_, index) => positions[index * 3]);
    const zs = Array.from({ length: positions.length / 3 }, (_, index) => positions[index * 3 + 2]);
    expect(Math.min(...xs)).toBeCloseTo(-halfSpan);
    expect(Math.max(...xs)).toBeCloseTo(halfSpan);
    expect(Math.min(...zs)).toBeCloseTo(-halfSpan);
    expect(Math.max(...zs)).toBeCloseTo(halfSpan);
  });

  it('adds a soft visual island coastline outside the unchanged 60-tile world', () => {
    const coastline = createIslandCoastlinePoints();
    expect(coastline).toHaveLength(ISLAND_COASTLINE_SEGMENTS);
    expect(WORLD_SIZE).toBe(PLAYABLE_SIZE + BORDER_SIZE * 2);
    expect(WORLD_SPAN).toBeCloseTo(54);
    coastline.forEach((point) => {
      expect(Math.hypot(point.x, point.y)).toBeGreaterThan(WORLD_SPAN / 2 + ISLAND_BEACH_WIDTH - 0.2);
    });
    expect(Math.min(...coastline.map(({ x }) => x))).toBeLessThan(-WORLD_SPAN / 2 - ISLAND_BEACH_WIDTH + 0.2);
    expect(Math.max(...coastline.map(({ x }) => x))).toBeGreaterThan(WORLD_SPAN / 2 + ISLAND_BEACH_WIDTH - 0.2);
  });

  it('builds a lightweight, continuous beach/foam band outside the playable world', () => {
    const band = createCoastalBandGeometry(-0.035, ISLAND_BEACH_WIDTH);
    expect(band.getAttribute('position').count).toBe((ISLAND_COASTLINE_SEGMENTS + 1) * 2);
    expect(band.getIndex()?.count).toBe(ISLAND_COASTLINE_SEGMENTS * 6);
    expect(band.getAttribute('uv').count).toBe(band.getAttribute('position').count);
    expect(band.boundingBox?.max.x).toBeGreaterThan(WORLD_SPAN / 2 + ISLAND_BEACH_WIDTH - 0.2);
    band.dispose();
  });

  it('uses the approved sand/foam colors and grades shallow water into deep ocean', () => {
    expect(BEACH_SAND_TINT).toBe(0xf5ebd8);
    expect(SHORE_FOAM_TINT).toBe(0xffffff);
    expect(SHALLOW_WATER_TINT).not.toBe(DEEP_WATER_TINT);

    const water = createShallowWaterGeometry();
    const colors = water.getAttribute('color');
    expect(colors.count).toBe((ISLAND_COASTLINE_SEGMENTS + 1) * 2);
    expect(colors.getY(0)).toBeGreaterThan(colors.getY(1));
    expect(colors.getZ(0)).toBeGreaterThan(colors.getZ(1));
    water.dispose();
  });
});
