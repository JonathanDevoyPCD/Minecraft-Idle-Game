import { describe, expect, it } from 'vitest';
import { CAMERA_MAX_ZOOM, CAMERA_MIN_ZOOM, getBaseCameraViewHeight } from './world-config';
import { clampCameraTarget, getCameraPanBounds, getPanTargetDelta } from './camera-math';

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
    expect(mediumZoom.maxX).toBeGreaterThanOrEqual(lowZoom.maxX);
    expect(highZoom.maxX).toBeGreaterThan(mediumZoom.maxX);
    expect(highZoom.maxZ).toBeGreaterThan(mediumZoom.maxZ);
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
