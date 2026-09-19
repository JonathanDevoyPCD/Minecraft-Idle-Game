import {
  CAMERA_PAN_SAFE_FRAME_RATIO,
  CAMERA_PAN_RANGE_MULTIPLIER,
  CAMERA_PITCH,
  CAMERA_YAW,
  WORLD_HALF_SPAN,
  CAMERA_PAN_BOUNDARY_PADDING,
} from './world-config';

export interface CameraPanBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface GroundPlanePoint {
  x: number;
  z: number;
}

export function getGroundPlaneViewportCorners(
  aspect: number,
  baseViewHeight: number,
  zoom: number,
  frameRatio = CAMERA_PAN_SAFE_FRAME_RATIO,
): GroundPlanePoint[] {
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  const safeViewHeight = Number.isFinite(baseViewHeight) && baseViewHeight > 0 ? baseViewHeight : 1;
  const safeFrameRatio = Number.isFinite(frameRatio) ? Math.max(0, Math.min(1, frameRatio)) : CAMERA_PAN_SAFE_FRAME_RATIO;
  const halfHeight = safeViewHeight / (2 * safeZoom) * safeFrameRatio;
  const halfWidth = halfHeight * safeAspect;
  const sinYaw = Math.sin(CAMERA_YAW);
  const cosYaw = Math.cos(CAMERA_YAW);
  const sinPitch = Math.sin(CAMERA_PITCH);

  // Intersect each corner ray with y=0. The central safe frame, rather than
  // the viewport's extreme top corners, determines map pan limits; at this
  // shallow isometric pitch those extreme rays project far outside the map
  // even when the visible map itself still fills the screen.
  return [
    [-halfWidth, -halfHeight],
    [halfWidth, -halfHeight],
    [halfWidth, halfHeight],
    [-halfWidth, halfHeight],
  ].map(([screenX, screenY]) => ({
    x: sinYaw * screenX - cosYaw / sinPitch * screenY,
    z: -cosYaw * screenX - sinYaw / sinPitch * screenY,
  }));
}

export function getCameraPanBounds(
  aspect: number,
  baseViewHeight: number,
  zoom: number,
  worldHalfSpan = WORLD_HALF_SPAN + CAMERA_PAN_BOUNDARY_PADDING,
  panRangeMultiplier = CAMERA_PAN_RANGE_MULTIPLIER,
): CameraPanBounds {
  const corners = getGroundPlaneViewportCorners(aspect, baseViewHeight, zoom);
  const minFootprintX = Math.min(...corners.map(({ x }) => x));
  const maxFootprintX = Math.max(...corners.map(({ x }) => x));
  const minFootprintZ = Math.min(...corners.map(({ z }) => z));
  const maxFootprintZ = Math.max(...corners.map(({ z }) => z));
  const minX = -worldHalfSpan - minFootprintX;
  const maxX = worldHalfSpan - maxFootprintX;
  const minZ = -worldHalfSpan - minFootprintZ;
  const maxZ = worldHalfSpan - maxFootprintZ;
  const safeRangeMultiplier = Number.isFinite(panRangeMultiplier) ? Math.max(0, panRangeMultiplier) : 1;

  // When the safe frame is wider than the full world, keep the camera centered
  // instead of allowing a pan that would strand the world off-screen.
  // The multiplier deliberately expands/contracts travel around that center;
  // higher values can expose more of the surrounding background at map edges.
  const scaleRange = (minimum: number, maximum: number): [number, number] => {
    if (minimum > maximum) return [0, 0];
    const center = (minimum + maximum) / 2;
    const halfRange = (maximum - minimum) / 2 * safeRangeMultiplier;
    return [center - halfRange, center + halfRange];
  };
  const [panMinX, panMaxX] = scaleRange(minX, maxX);
  const [panMinZ, panMaxZ] = scaleRange(minZ, maxZ);
  return {
    minX: panMinX,
    maxX: panMaxX,
    minZ: panMinZ,
    maxZ: panMaxZ,
  };
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

export function smoothlyClampCameraTarget(
  target: { x: number; z: number },
  bounds: CameraPanBounds,
  deltaSeconds: number,
  smoothing: number,
): { x: number; z: number } {
  const clamped = clampCameraTarget(target, bounds);
  if (deltaSeconds <= 0 || smoothing <= 0) return clamped;
  const amount = 1 - Math.exp(-smoothing * Math.min(deltaSeconds, 0.1));
  return {
    x: target.x + (clamped.x - target.x) * amount,
    z: target.z + (clamped.z - target.z) * amount,
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
