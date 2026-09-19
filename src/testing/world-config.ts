export const TILE_SIZE = 0.9;
export const PLAYABLE_SIZE = 50;
export const BORDER_SIZE = 5;
export const WORLD_SIZE = PLAYABLE_SIZE + BORDER_SIZE * 2;
export const WORLD_CELL_COUNT = WORLD_SIZE * WORLD_SIZE;
export const WORLD_SPAN = WORLD_SIZE * TILE_SIZE;
export const WORLD_HALF_SPAN = WORLD_SPAN / 2;
export const WORLD_CENTER_CELL = Math.floor(WORLD_SIZE / 2);
export const ENTRANCE_WIDTH = 3;
export const MAP_SEED = 184731;

export type WorldSide = 'north' | 'east' | 'south' | 'west';

export interface WorldEntranceDefinition {
  side: WorldSide;
  center: number;
}

export const WORLD_ENTRANCES: readonly WorldEntranceDefinition[] = [
  { side: 'north', center: WORLD_CENTER_CELL },
  { side: 'east', center: WORLD_CENTER_CELL },
  { side: 'south', center: WORLD_CENTER_CELL },
  { side: 'west', center: WORLD_CENTER_CELL },
];

export const CAMERA_YAW = Math.PI / 4;
export const CAMERA_PITCH = Math.atan2(6, Math.sqrt(6 * 6 + 6 * 6));
export const CAMERA_MIN_ZOOM = 0.78;
export const CAMERA_MAX_ZOOM = 5;
export const CAMERA_START_ZOOM = 1;
export const CAMERA_ZOOM_SMOOTHING = 12;

export const MAP_PROJECTED_WIDTH = WORLD_SPAN * (Math.abs(Math.sin(CAMERA_YAW)) + Math.abs(Math.cos(CAMERA_YAW)));
export const MAP_PROJECTED_HEIGHT = MAP_PROJECTED_WIDTH * Math.sin(CAMERA_PITCH);

export function getBaseCameraViewHeight(aspect: number): number {
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  return Math.max(MAP_PROJECTED_HEIGHT, MAP_PROJECTED_WIDTH / safeAspect) * 1.2;
}
