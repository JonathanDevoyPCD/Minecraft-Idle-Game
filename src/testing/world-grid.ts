import {
  BORDER_SIZE,
  ENTRANCE_WIDTH,
  MAP_SEED,
  PLAYABLE_SIZE,
  TILE_SIZE,
  WORLD_CELL_COUNT,
  WORLD_ENTRANCES,
  WORLD_SIZE,
  type WorldSide,
} from './world-config';

export type WorldZone = 'playable' | 'border';

export interface WorldCell {
  worldX: number;
  worldZ: number;
  playableX?: number;
  playableZ?: number;
  buildable: boolean;
  zone: WorldZone;
}

export interface BorderDecoration {
  kind: 'tree' | 'rock';
  worldX: number;
  worldZ: number;
  offsetX: number;
  offsetZ: number;
  scale: number;
  variant: number;
}

export function createWorldGrid(): WorldCell[] {
  const cells: WorldCell[] = [];
  for (let worldZ = 0; worldZ < WORLD_SIZE; worldZ += 1) {
    for (let worldX = 0; worldX < WORLD_SIZE; worldX += 1) {
      const playableX = worldX - BORDER_SIZE;
      const playableZ = worldZ - BORDER_SIZE;
      const buildable = playableX >= 0 && playableX < PLAYABLE_SIZE && playableZ >= 0 && playableZ < PLAYABLE_SIZE;
      cells.push({
        worldX,
        worldZ,
        ...(buildable ? { playableX, playableZ } : {}),
        buildable,
        zone: buildable ? 'playable' : 'border',
      });
    }
  }
  return cells;
}

export function getWorldCell(grid: readonly WorldCell[], worldX: number, worldZ: number): WorldCell | undefined {
  if (!Number.isInteger(worldX) || !Number.isInteger(worldZ) || worldX < 0 || worldZ < 0 || worldX >= WORLD_SIZE || worldZ >= WORLD_SIZE) return undefined;
  return grid[worldZ * WORLD_SIZE + worldX];
}

export function getWorldPosition(worldX: number, worldZ: number): { x: number; z: number } {
  return {
    x: (worldX + 0.5 - WORLD_SIZE / 2) * TILE_SIZE,
    z: (worldZ + 0.5 - WORLD_SIZE / 2) * TILE_SIZE,
  };
}

export function isReservedEntranceCell(worldX: number, worldZ: number): boolean {
  const halfWidth = Math.floor(ENTRANCE_WIDTH / 2);
  return WORLD_ENTRANCES.some(({ side, center }) => {
    if (Math.abs((side === 'north' || side === 'south' ? worldX : worldZ) - center) > halfWidth) return false;
    if (side === 'north') return worldZ < BORDER_SIZE;
    if (side === 'south') return worldZ >= WORLD_SIZE - BORDER_SIZE;
    if (side === 'west') return worldX < BORDER_SIZE;
    return worldX >= WORLD_SIZE - BORDER_SIZE;
  });
}

export function createBorderDecorationPlan(grid: readonly WorldCell[], seed = MAP_SEED): BorderDecoration[] {
  const decorations: BorderDecoration[] = [];
  for (const cell of grid) {
    if (cell.zone !== 'border' || isReservedEntranceCell(cell.worldX, cell.worldZ)) continue;
    // Keep the inner playable edge open and leave one cell inside the outer
    // edge so trunks and foliage remain comfortably within the environment.
    const edgeInset = Math.min(cell.worldX, cell.worldZ, WORLD_SIZE - 1 - cell.worldX, WORLD_SIZE - 1 - cell.worldZ);
    if (edgeInset === 0 || edgeInset >= BORDER_SIZE - 1) continue;
    const roll = seededCellValue(cell.worldX, cell.worldZ, seed);
    if (roll < 0.37) continue;
    const positionRoll = seededCellValue(cell.worldZ + 91, cell.worldX + 37, seed ^ 0x5f3759df);
    const sizeRoll = seededCellValue(cell.worldX + 73, cell.worldZ + 191, seed ^ 0x45d9f3b);
    const isTree = roll >= 0.49;
    decorations.push({
      kind: isTree ? 'tree' : 'rock',
      worldX: cell.worldX,
      worldZ: cell.worldZ,
      offsetX: (positionRoll - 0.5) * TILE_SIZE * 0.3,
      offsetZ: (sizeRoll - 0.5) * TILE_SIZE * 0.3,
      scale: isTree ? 0.8 + sizeRoll * 0.42 : 0.7 + sizeRoll * 0.55,
      variant: Math.floor(positionRoll * 3),
    });
  }
  return decorations;
}

export function countWorldZones(grid: readonly WorldCell[]): { playable: number; border: number } {
  return grid.reduce((counts, cell) => {
    counts[cell.zone] += 1;
    return counts;
  }, { playable: 0, border: 0 });
}

export function validateWorldGrid(grid: readonly WorldCell[]): boolean {
  if (grid.length !== WORLD_CELL_COUNT) return false;
  return grid.every((cell, index) => {
    const worldX = index % WORLD_SIZE;
    const worldZ = Math.floor(index / WORLD_SIZE);
    const isPlayable = worldX >= BORDER_SIZE && worldX < BORDER_SIZE + PLAYABLE_SIZE
      && worldZ >= BORDER_SIZE && worldZ < BORDER_SIZE + PLAYABLE_SIZE;
    return cell.worldX === worldX && cell.worldZ === worldZ
      && cell.buildable === isPlayable
      && cell.zone === (isPlayable ? 'playable' : 'border')
      && (isPlayable ? cell.playableX === worldX - BORDER_SIZE && cell.playableZ === worldZ - BORDER_SIZE : cell.playableX === undefined && cell.playableZ === undefined);
  });
}

function seededCellValue(x: number, z: number, seed: number): number {
  let value = Math.imul(x ^ seed, 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16) ^ z, 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return ((value ^ (value >>> 16)) >>> 0) / 0x1_0000_0000;
}

export function getEntranceCells(side: WorldSide): Array<{ worldX: number; worldZ: number }> {
  const entrance = WORLD_ENTRANCES.find((candidate) => candidate.side === side);
  if (!entrance) return [];
  const halfWidth = Math.floor(ENTRANCE_WIDTH / 2);
  const cells: Array<{ worldX: number; worldZ: number }> = [];
  for (let offset = -halfWidth; offset <= halfWidth; offset += 1) {
    for (let depth = 0; depth < BORDER_SIZE; depth += 1) {
      if (side === 'north') cells.push({ worldX: entrance.center + offset, worldZ: depth });
      else if (side === 'south') cells.push({ worldX: entrance.center + offset, worldZ: WORLD_SIZE - 1 - depth });
      else if (side === 'west') cells.push({ worldX: depth, worldZ: entrance.center + offset });
      else cells.push({ worldX: WORLD_SIZE - 1 - depth, worldZ: entrance.center + offset });
    }
  }
  return cells;
}
