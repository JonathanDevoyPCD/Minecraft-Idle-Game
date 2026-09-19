import { CAMERA_PITCH, CAMERA_YAW, WORLD_HALF_SPAN } from './world-config';

export interface CameraPanBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export function getCameraPanBounds(aspect: number, baseViewHeight: number, zoom: number): CameraPanBounds {
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  const halfHeight = baseViewHeight / (2 * safeZoom);
  const halfWidth = halfHeight * safeAspect;
  const sinYaw = Math.sin(CAMERA_YAW);
  const cosYaw = Math.cos(CAMERA_YAW);
  const sinPitch = Math.sin(CAMERA_PITCH);
  const halfWorldX = Math.abs(sinYaw) * halfWidth + Math.abs(cosYaw / sinPitch) * halfHeight;
  const halfWorldZ = Math.abs(cosYaw) * halfWidth + Math.abs(sinYaw / sinPitch) * halfHeight;
  const rangeX = Math.max(0, WORLD_HALF_SPAN - halfWorldX);
  const rangeZ = Math.max(0, WORLD_HALF_SPAN - halfWorldZ);
  return { minX: rangeX === 0 ? 0 : -rangeX, maxX: rangeX, minZ: rangeZ === 0 ? 0 : -rangeZ, maxZ: rangeZ };
}

export function clampCameraTarget(
  target: { x: number; z: number },
  bounds: CameraPanBounds,
): { x: number; z: number } {
  return {
    x: Math.min(bounds.maxX, Math.max(bounds.minX, target.x)),
    z: Math.min(bounds.maxZ, Math.max(bounds.minZ, target.z)),
  };
}

export function getPanTargetDelta(
  deltaX: number,
  deltaY: number,
  worldUnitsPerPixel: number,
): { x: number; z: number } {
  if (deltaX === 0 && deltaY === 0) return { x: 0, z: 0 };
  // Invert the fixed isometric ground projection so a left-drag moves the map
  // with the cursor without changing camera yaw or pitch.
  const screenX = -deltaX * worldUnitsPerPixel;
  const screenY = deltaY * worldUnitsPerPixel;
  const sinYaw = Math.sin(CAMERA_YAW);
  const cosYaw = Math.cos(CAMERA_YAW);
  const sinPitch = Math.sin(CAMERA_PITCH);
  return {
    x: sinYaw * screenX - cosYaw / sinPitch * screenY,
    z: -cosYaw * screenX - sinYaw / sinPitch * screenY,
  };
}
