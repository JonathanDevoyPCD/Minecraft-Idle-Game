import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { TILE_SIZE, WORLD_ENTRANCES, WORLD_HALF_SPAN, type WorldSide } from './world-config';
import {
  applyDockSupportTimber,
  createIslandDockPlacements,
  createDockDeckGapBacking,
  getDockLampSupport,
  getDockModelDeckBoards,
  getDockModelDeckTopY,
  getDockModelScale,
  ISLAND_BEACH_WIDTH,
} from './world-scene';

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

  it('selects the positive-X support at the outward dock end for the lamp mount', () => {
    const model = new THREE.Group();
    const legGeometry = new THREE.BoxGeometry(0.8, 4.8, 0.7);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0xc8a382 });
    for (const x of [-2.6, 2.6]) {
      for (const z of [-8, 0, 8]) {
        const leg = new THREE.Mesh(legGeometry, legMaterial);
        leg.position.set(x, 0, z);
        model.add(leg);
      }
    }
    model.updateMatrixWorld(true);

    const support = getDockLampSupport(model, new THREE.Vector3(6, 4.8, 18));
    expect(support).not.toBeNull();
    expect(support?.centerX).toBeCloseTo(2.6);
    expect(support?.centerZ).toBeCloseTo(8);
    expect(support?.width).toBeCloseTo(0.8);
    expect(support?.depth).toBeCloseTo(0.7);
    expect(support?.mesh.material).toBe(legMaterial);
  });

  it('replaces every broad deck board material with the dock leg timber', () => {
    const model = new THREE.Group();
    const lightTimber = new THREE.MeshStandardMaterial({ color: 0xc8a382 });
    lightTimber.name = 'Wood.001';
    const darkDeckTimber = new THREE.MeshStandardMaterial({ color: 0x282820 });
    darkDeckTimber.name = 'Wood.004';
    const metalTrim = new THREE.MeshStandardMaterial({ color: 0x252a31 });
    metalTrim.name = 'Iron';
    const supportMesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4.8, 0.7), lightTimber);
    supportMesh.position.set(2.6, 0, 8);
    const firstBoard = new THREE.Mesh(new THREE.BoxGeometry(6, 0.4, 0.8), darkDeckTimber);
    firstBoard.position.y = 1.5;
    firstBoard.receiveShadow = true;
    const secondBoard = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 0.8), darkDeckTimber);
    secondBoard.position.set(0, 1.4, 1);
    secondBoard.receiveShadow = true;
    const deckBeam = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 18), darkDeckTimber);
    deckBeam.position.y = 1.2;
    deckBeam.receiveShadow = true;
    const lowerWoodTrim = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 2), darkDeckTimber);
    lowerWoodTrim.position.y = -1.5;
    lowerWoodTrim.receiveShadow = true;
    const metalTrimMesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 1), metalTrim);
    metalTrimMesh.position.y = -1.8;
    model.add(supportMesh, firstBoard, secondBoard, deckBeam, lowerWoodTrim, metalTrimMesh);
    model.updateMatrixWorld(true);

    const modelSize = new THREE.Vector3(6, 4.8, 18);
    const support = { mesh: supportMesh, centerX: 0, centerZ: 0, width: 0.8, depth: 0.7 };
    expect(getDockModelDeckBoards(model, modelSize)).toEqual([firstBoard, secondBoard]);
    const deckFinishes = applyDockSupportTimber(model, modelSize, support);
    expect(deckFinishes.planks).toHaveLength(3);
    expect(deckFinishes.planks.every(({ color }) => color.r >= lightTimber.color.r && color.g >= lightTimber.color.g && color.b >= lightTimber.color.b)).toBe(true);
    expect(deckFinishes.planks).toContain(firstBoard.material);
    expect(deckFinishes.planks).toContain(secondBoard.material);
    expect((deckBeam.material as THREE.Material)).toBe(deckFinishes.base);
    expect((supportMesh.material as THREE.Material)).toBe(lightTimber);
    expect((lowerWoodTrim.material as THREE.Material)).toBe(lightTimber);
    expect(metalTrimMesh.material).toBe(metalTrim);
    expect(firstBoard.receiveShadow).toBe(false);
    expect(secondBoard.receiveShadow).toBe(false);
    expect(deckBeam.receiveShadow).toBe(false);
    expect(lowerWoodTrim.receiveShadow).toBe(false);
  });

  it('places the lamp pole over the selected support leg in every dock orientation', () => {
    const modelScale = getDockModelScale(MEASURED_DOCK_MODEL_SIZE);
    const lampAcross = 2.6 * modelScale.x;
    const lampOutward = TILE_SIZE + 8 * modelScale.z;
    const placements = createIslandDockPlacements(WORLD_ENTRANCES, { x: lampAcross, z: lampOutward });

    for (const placement of placements) {
      const deltaX = placement.lampX - placement.centerX;
      const deltaZ = placement.lampZ - placement.centerZ;
      expect(deltaX * placement.tangentX + deltaZ * placement.tangentZ).toBeCloseTo(lampAcross);
      expect(deltaX * placement.outwardX + deltaZ * placement.outwardZ).toBeCloseTo(lampOutward);
    }
  });

  it('fills deck-board gaps with a shadowless backing in the same light timber', () => {
    const timber = new THREE.MeshStandardMaterial({ color: 0xc8a382 });
    const deckSurfaceY = 0.42;
    const deckWidth = 0.81;
    const backing = createDockDeckGapBacking(timber, deckSurfaceY, deckWidth);
    backing.geometry.computeBoundingBox();
    const measured = backing.geometry.boundingBox?.getSize(new THREE.Vector3());
    expect(measured?.x).toBeCloseTo(deckWidth * 0.99);
    expect(measured?.z).toBeCloseTo(TILE_SIZE * 4 * 0.985);
    expect(backing.position.y + (measured?.y ?? 0) / 2).toBeCloseTo(deckSurfaceY - TILE_SIZE * 0.03);
    expect(backing.material).toBe(timber);
    expect(backing.castShadow).toBe(false);
    expect(backing.receiveShadow).toBe(false);
  });
});
