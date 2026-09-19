import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { TILE_SIZE, WORLD_ENTRANCES, WORLD_HALF_SPAN, type WorldSide } from './world-config';
import { createIslandDockPlacements, getDockModelDeckTopY, getDockModelScale, ISLAND_BEACH_WIDTH } from './world-scene';

const MEASURED_DOCK_MODEL_SIZE = new THREE.Vector3(6.4696633, 4.9035251, 18.0586949);

describe('decorative island dock placement', () => {
  it('creates one outward-facing 1-by-4 dock at each configured entrance', () => {
    const placements = createIslandDockPlacements();
    const bySide = new Map(placements.map((placement) => [placement.side, placement]));

    expect(placements).toHaveLength(4);
    expect([...bySide.keys()].sort()).toEqual(['east', 'north', 'south', 'west']);
    expect(WORLD_ENTRANCES.map(({ side }) => bySide.has(side))).toEqual([true, true, true, true]);

    const expectedOutward: Record<WorldSide, [number, number]> = {
      north: [0, -1],
      east: [1, 0],
      south: [0, 1],
      west: [-1, 0],
    };
    for (const [side, [x, z]] of Object.entries(expectedOutward) as Array<[WorldSide, [number, number]]>) {
      expect(bySide.get(side)).toMatchObject({ outwardX: x, outwardZ: z });
    }
  });

  it('normalizes the measured GLB footprint to one tile wide and two tiles long per section', () => {
    const scale = getDockModelScale(MEASURED_DOCK_MODEL_SIZE);
    expect(scale.x * MEASURED_DOCK_MODEL_SIZE.x).toBeCloseTo(TILE_SIZE);
    expect(scale.z * MEASURED_DOCK_MODEL_SIZE.z).toBeCloseTo(TILE_SIZE * 2);
    expect(scale.y * MEASURED_DOCK_MODEL_SIZE.y).toBeCloseTo(0.488, 2);
  });

  it('joins two sections and leaves only one tile of the dock beyond the beach edge', () => {
    const placements = createIslandDockPlacements();
    const shoreRadius = WORLD_HALF_SPAN + ISLAND_BEACH_WIDTH;
    const dockOuterRadius = shoreRadius + TILE_SIZE;

    for (const placement of placements) {
      expect(placement.sectionCenters).toHaveLength(2);
      const inner = placement.sectionCenters[0];
      const outer = placement.sectionCenters[1];
      const sectionDistance = Math.hypot(outer.x - inner.x, outer.z - inner.z);
      const centerRadius = Math.hypot(placement.centerX, placement.centerZ);
      expect(sectionDistance).toBeCloseTo(TILE_SIZE * 2);
      expect(centerRadius + TILE_SIZE * 2).toBeCloseTo(dockOuterRadius);

      const lampDeltaX = placement.lampX - placement.centerX;
      const lampDeltaZ = placement.lampZ - placement.centerZ;
      const lampOutwardOffset = lampDeltaX * placement.outwardX + lampDeltaZ * placement.outwardZ;
      expect(lampOutwardOffset).toBeGreaterThan(TILE_SIZE);
      expect(lampOutwardOffset).toBeLessThan(TILE_SIZE * 2);
    }
  });

  it('follows changed entrance centers instead of fixed scene coordinates', () => {
    const north = createIslandDockPlacements([{ side: 'north', center: 24 }])[0];
    const defaultNorth = createIslandDockPlacements([{ side: 'north', center: WORLD_ENTRANCES[0].center }])[0];

    expect(north.centerX).not.toBe(defaultNorth.centerX);
    expect(north.centerZ).toBe(defaultNorth.centerZ);
  });

  it('uses the deck boards rather than taller support posts as the placement surface', () => {
    const model = new THREE.Group();
    const deck = new THREE.Mesh(new THREE.BoxGeometry(6, 0.4, 0.8));
    deck.position.y = 1.5;
    const supportPost = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4.8, 0.8));
    supportPost.position.set(2.6, 0, 0);
    model.add(deck, supportPost);
    model.updateMatrixWorld(true);

    expect(getDockModelDeckTopY(model, new THREE.Vector3(6, 4.8, 18))).toBeCloseTo(1.7);
  });
});
