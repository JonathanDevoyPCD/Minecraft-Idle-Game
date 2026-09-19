import { describe, expect, it } from 'vitest';
import { CAMERA_MAX_ZOOM, CAMERA_MIN_ZOOM, getBaseCameraViewHeight, WORLD_HALF_SPAN } from './world-config';
import { clampCameraTarget, getCameraPanBounds, getGroundPlaneViewportCorners, getPanTargetDelta, smoothlyClampCameraTarget } from './camera-math';

describe('testing world camera math', () => {
  it('keeps a wide initial isometric view centered and fits the map at desktop aspects', () => {
    for (const aspect of [4 / 3, 16 / 9, 21 / 9]) {
      const viewHeight = getBaseCameraViewHeight(aspect);
      const bounds = getCameraPanBounds(aspect, viewHeight, 1);
      expect(bounds.minX).toBe(0);
      expect(bounds.maxX).toBe(0);
      expect(bounds.minZ).toBe(0);
      expect(bounds.maxZ).toBe(0);
    }
  });

  it('reduces pan range at low zoom and opens more map at high zoom', () => {
    const aspect = 16 / 9;
    const height = getBaseCameraViewHeight(aspect);
    const lowZoom = getCameraPanBounds(aspect, height, CAMERA_MIN_ZOOM);
    const mediumZoom = getCameraPanBounds(aspect, height, 2.5);
    const highZoom = getCameraPanBounds(aspect, height, CAMERA_MAX_ZOOM);
    expect(lowZoom.maxX).toBe(0);
    expect(mediumZoom.maxX).toBeGreaterThan(lowZoom.maxX);
    expect(highZoom.maxX).toBeGreaterThan(mediumZoom.maxX);
    expect(highZoom.maxZ).toBeGreaterThan(mediumZoom.maxZ);
  });

  it('retains useful medium-zoom panning on a 4:3 desktop viewport', () => {
    const aspect = 4 / 3;
    const height = getBaseCameraViewHeight(aspect);
    const mediumZoom = getCameraPanBounds(aspect, height, 2.5);
    const closeZoom = getCameraPanBounds(aspect, height, CAMERA_MAX_ZOOM);
    expect(mediumZoom.maxX).toBeGreaterThan(3);
    expect(mediumZoom.maxZ).toBeGreaterThan(3);
    expect(closeZoom.maxX).toBeGreaterThan(mediumZoom.maxX);
    expect(closeZoom.maxZ).toBeGreaterThan(mediumZoom.maxZ);
  });

  it('projects all four safe-frame frustum corners onto ground before deriving pan limits', () => {
    const aspect = 16 / 9;
    const height = getBaseCameraViewHeight(aspect);
    const zoom = 2.5;
    const corners = getGroundPlaneViewportCorners(aspect, height, zoom);
    const bounds = getCameraPanBounds(aspect, height, zoom);
    expect(corners).toHaveLength(4);
    expect(bounds.maxX).toBeGreaterThan(0);
    expect(bounds.maxZ).toBeGreaterThan(0);
    corners.forEach(({ x, z }) => {
      expect(bounds.maxX + x).toBeLessThanOrEqual(WORLD_HALF_SPAN + 1e-8);
      expect(bounds.maxX + x).toBeGreaterThanOrEqual(-WORLD_HALF_SPAN - 1e-8);
      expect(bounds.maxZ + z).toBeLessThanOrEqual(WORLD_HALF_SPAN + 1e-8);
      expect(bounds.maxZ + z).toBeGreaterThanOrEqual(-WORLD_HALF_SPAN - 1e-8);
    });
  });

  it('smoothly returns a target into bounds after zooming out near an edge', () => {
    const bounds = { minX: -3, maxX: 3, minZ: -4, maxZ: 4 };
    const start = { x: 15, z: -12 };
    const firstStep = smoothlyClampCameraTarget(start, bounds, 1 / 60, 9);
    expect(firstStep.x).toBeLessThan(start.x);
    expect(firstStep.x).toBeGreaterThan(bounds.maxX);
    expect(firstStep.z).toBeGreaterThan(start.z);
    expect(firstStep.z).toBeLessThan(bounds.minZ);
    let target = start;
    for (let frame = 0; frame < 180; frame += 1) {
      target = smoothlyClampCameraTarget(target, bounds, 1 / 60, 9);
    }
    expect(target.x).toBeCloseTo(bounds.maxX, 4);
    expect(target.z).toBeCloseTo(bounds.minZ, 4);
  });

  it('hard clamps pan and maps pointer drag to fixed-orientation ground movement', () => {
    const bounds = { minX: -10, maxX: 10, minZ: -8, maxZ: 8 };
    expect(clampCameraTarget({ x: 20, z: -20 }, bounds)).toEqual({ x: 10, z: -8 });
    const right = getPanTargetDelta(120, 0, 0.1);
    const left = getPanTargetDelta(-120, 0, 0.1);
    const down = getPanTargetDelta(0, 120, 0.1);
    const up = getPanTargetDelta(0, -120, 0.1);
    expect(right.x).toBeLessThan(0);
    expect(right.z).toBeGreaterThan(0);
    expect(left.x).toBeGreaterThan(0);
    expect(left.z).toBeLessThan(0);
    expect(down.x).toBeLessThan(0);
    expect(down.z).toBeLessThan(0);
    expect(up.x).toBeGreaterThan(0);
    expect(up.z).toBeGreaterThan(0);
    expect(left.x).toBeCloseTo(-right.x);
    expect(left.z).toBeCloseTo(-right.z);
    expect(up.x).toBeCloseTo(-down.x);
    expect(up.z).toBeCloseTo(-down.z);
    expect(getPanTargetDelta(0, 0, 1)).toEqual({ x: 0, z: 0 });
  });
});
