import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PLAYABLE_GRID_LINE_OPACITY, PLAYABLE_SIZE, TILE_SIZE, WORLD_CENTER_CELL, WORLD_ENTRANCES, WORLD_HALF_SPAN, WORLD_SIZE, WORLD_SPAN, type WorldEntranceDefinition, type WorldSide } from './world-config';
import { createBorderDecorationPlan, getWorldPosition, type WorldCell } from './world-grid';

const SURFACE_THICKNESS = 0.72;
const PLAYABLE_SPAN = TILE_SIZE * PLAYABLE_SIZE;
const PLAYABLE_GRID_LINE_HEIGHT = 0.014;
export const ISLAND_BEACH_WIDTH = TILE_SIZE * 3.5;
export const ISLAND_COASTLINE_SEGMENTS = 128;
export const BEACH_SAND_TINT = 0xf5ebd8;
export const SHORE_FOAM_TINT = 0xffffff;
export const SHALLOW_WATER_TINT = 0x83d6dc;
export const DEEP_WATER_TINT = 0x2f86ad;
const ISLAND_COASTLINE_VARIATION = 0.12;
const OCEAN_LEVEL = -0.34;
const DOCK_SECTION_COUNT = 2;
const DOCK_SECTION_LENGTH = TILE_SIZE * 2;
const DOCK_TOTAL_LENGTH = DOCK_SECTION_COUNT * DOCK_SECTION_LENGTH;
const DOCK_WATER_OVERLAP = TILE_SIZE;
const DOCK_DECK_HEIGHT = 0.08;
const DOCK_LAMP_POLE_HEIGHT = TILE_SIZE * 1.2;

export interface IslandDockPlacement {
  side: WorldSide;
  rotationY: number;
  centerX: number;
  centerZ: number;
  outwardX: number;
  outwardZ: number;
  tangentX: number;
  tangentZ: number;
  sectionCenters: Array<{ x: number; z: number }>;
  lampX: number;
  lampZ: number;
}

export interface DockLampSupport {
  mesh: THREE.Mesh;
  centerX: number;
  centerZ: number;
  width: number;
  depth: number;
}

export interface DockLampLocalPosition {
  /** Offset across the dock from its center, in normalized world units. */
  x: number;
  /** Offset toward the outer end from the center of the complete dock. */
  z: number;
}

export interface DockDeckFinishes {
  base: THREE.MeshBasicMaterial;
  planks: THREE.MeshBasicMaterial[];
}

export function getDockModelScale(modelSize: THREE.Vector3): THREE.Vector3 {
  return new THREE.Vector3(
    TILE_SIZE / Math.max(modelSize.x, 0.001),
    DOCK_SECTION_LENGTH / Math.max(modelSize.z, 0.001),
    DOCK_SECTION_LENGTH / Math.max(modelSize.z, 0.001),
  );
}

export function getDockModelDeckBoards(root: THREE.Object3D, modelSize: THREE.Vector3): THREE.Mesh[] {
  const boards: THREE.Mesh[] = [];
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const meshBounds = new THREE.Box3().setFromObject(object);
    const meshSize = meshBounds.getSize(new THREE.Vector3());
    const isBroadDeckBoard = meshSize.x >= modelSize.x * 0.75
      && meshSize.z <= modelSize.z * 0.12
      && meshSize.y <= modelSize.y * 0.12;
    if (isBroadDeckBoard) boards.push(object);
  });

  return boards;
}

function getDockDeckLongitudinalRails(root: THREE.Object3D, modelSize: THREE.Vector3): Set<THREE.Mesh> {
  const deckRails = new Set<THREE.Mesh>();
  const modelCenter = new THREE.Box3().setFromObject(root).getCenter(new THREE.Vector3());
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const bounds = new THREE.Box3().setFromObject(object);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const isDeckLevelLongitudinalBeam = size.z >= modelSize.z * 0.75
      && size.x <= modelSize.x * 0.12
      && size.y <= modelSize.y * 0.08
      && center.y >= modelCenter.y + modelSize.y * 0.25;
    if (isDeckLevelLongitudinalBeam) deckRails.add(object);
  });
  return deckRails;
}

export function getDockModelDeckTopY(root: THREE.Object3D, modelSize: THREE.Vector3): number {
  const deckTopY = getDockModelDeckBoards(root, modelSize)
    .reduce((top, board) => Math.max(top, new THREE.Box3().setFromObject(board).max.y), Number.NEGATIVE_INFINITY);
  return Number.isFinite(deckTopY) ? deckTopY : modelSize.y / 2;
}

export function getDockLampSupport(root: THREE.Object3D, modelSize: THREE.Vector3): DockLampSupport | null {
  const modelBounds = new THREE.Box3().setFromObject(root);
  const modelCenter = modelBounds.getCenter(new THREE.Vector3());
  const candidates: Array<DockLampSupport & { outerZ: number }> = [];

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const bounds = new THREE.Box3().setFromObject(object);
    const size = bounds.getSize(new THREE.Vector3());
    const isFullHeightSupportLeg = size.y >= modelSize.y * 0.9
      && size.x <= modelSize.x * 0.2
      && size.z <= modelSize.z * 0.08;
    if (!isFullHeightSupportLeg) return;

    const center = bounds.getCenter(new THREE.Vector3());
    candidates.push({
      mesh: object,
      centerX: center.x - modelCenter.x,
      centerZ: center.z - modelCenter.z,
      width: size.x,
      depth: size.z,
      outerZ: center.z,
    });
  });

  if (candidates.length === 0) return null;

  // Mount to the outboard leg, choosing the positive-X side consistently.
  const furthestZ = Math.max(...candidates.map(({ outerZ }) => outerZ));
  const endLegs = candidates.filter(({ outerZ }) => Math.abs(outerZ - furthestZ) <= modelSize.z * 0.01);
  const selected = endLegs.reduce((rightmost, candidate) => candidate.centerX > rightmost.centerX ? candidate : rightmost);
  return { mesh: selected.mesh, centerX: selected.centerX, centerZ: selected.centerZ, width: selected.width, depth: selected.depth };
}

export function applyDockSupportTimber(
  root: THREE.Object3D,
  modelSize: THREE.Vector3,
  support: DockLampSupport,
): DockDeckFinishes {
  const supportMaterial = Array.isArray(support.mesh.material)
    ? support.mesh.material[0]
    : support.mesh.material;

  // Warm low-poly timber palette based on the reference.
  const base = new THREE.MeshBasicMaterial({
    color: 0xcfb58b,
  });
  base.name = 'dock-light-deck-timber-finish';

  const plankColors = [
    0xd8c19b,
    0xcfb58b,
    0xe0c9a4,
  ];

  const planks = plankColors.map((color, index) => {
    const material = new THREE.MeshBasicMaterial({
      color,
    });

    material.name = `dock-light-deck-plank-${index + 1}`;
    return material;
  });

  const deckRails = getDockDeckLongitudinalRails(root, modelSize);
  const deckBoards = getDockModelDeckBoards(root, modelSize);
  const plankIndices = new Map(
    deckBoards.map((board, index) => [board, index]),
  );

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;

    const meshMaterials = Array.isArray(object.material)
      ? object.material
      : [object.material];

    if (!meshMaterials.some((material) => material.name.startsWith('Wood.'))) {
      return;
    }

    object.receiveShadow = false;

    const plankIndex = plankIndices.get(object);

    const material =
      plankIndex !== undefined
        ? planks[plankIndex % planks.length]
        : deckRails.has(object)
          ? base
          : supportMaterial;

    object.material = Array.isArray(object.material)
      ? object.material.map((source) =>
          source.name.startsWith('Wood.') ? material : source,
        )
      : material;
  });

  return { base, planks };
}

export function createIslandDockPlacements(
  entrances: readonly WorldEntranceDefinition[] = WORLD_ENTRANCES,
  lampPosition: DockLampLocalPosition = {
    x: TILE_SIZE * 0.36,
    z: DOCK_TOTAL_LENGTH / 2 - TILE_SIZE * 0.55,
  },
): IslandDockPlacement[] {
  const outerDockRadius = WORLD_HALF_SPAN + ISLAND_BEACH_WIDTH + DOCK_WATER_OVERLAP;
  const dockCenterRadius = outerDockRadius - DOCK_TOTAL_LENGTH / 2;
  const sideOrientation: Record<WorldSide, { rotationY: number; outwardX: number; outwardZ: number; tangentX: number; tangentZ: number }> = {
    north: { rotationY: Math.PI, outwardX: 0, outwardZ: -1, tangentX: -1, tangentZ: 0 },
    east: { rotationY: Math.PI / 2, outwardX: 1, outwardZ: 0, tangentX: 0, tangentZ: -1 },
    south: { rotationY: 0, outwardX: 0, outwardZ: 1, tangentX: 1, tangentZ: 0 },
    west: { rotationY: -Math.PI / 2, outwardX: -1, outwardZ: 0, tangentX: 0, tangentZ: 1 },
  };

  return entrances.map(({ side, center }) => {
    const orientation = sideOrientation[side];
    const alongX = side === 'north' || side === 'south';
    const entranceCell = alongX
      ? getWorldPosition(center, WORLD_CENTER_CELL)
      : getWorldPosition(WORLD_CENTER_CELL, center);
    const centerX = (alongX ? entranceCell.x : 0) + orientation.outwardX * dockCenterRadius;
    const centerZ = (alongX ? 0 : entranceCell.z) + orientation.outwardZ * dockCenterRadius;
    const halfSection = DOCK_SECTION_LENGTH / 2;
    const sectionCenters = [-halfSection, halfSection].map((offset) => ({
      x: centerX + orientation.outwardX * offset,
      z: centerZ + orientation.outwardZ * offset,
    }));
    return {
      side,
      ...orientation,
      centerX,
      centerZ,
      sectionCenters,
      lampX: centerX + orientation.outwardX * lampPosition.z + orientation.tangentX * lampPosition.x,
      lampZ: centerZ + orientation.outwardZ * lampPosition.z + orientation.tangentZ * lampPosition.x,
    };
  });
}

export interface WorldSceneResources {
  dispose: () => void;
  update: (elapsedSeconds: number) => void;
}

function coastlineVariation(angle: number): number {
  return ISLAND_COASTLINE_VARIATION * (
    0.62 * Math.sin(angle * 5 + 0.7) +
    0.38 * Math.sin(angle * 9 - 1.1)
  );
}

function squareRadius(angle: number): number {
  return (WORLD_SPAN / 2) / Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle)));
}

function offsetRadius(angle: number, offset: number): number {
  const shorelineBlend = THREE.MathUtils.clamp(offset / ISLAND_BEACH_WIDTH, 0, 1);
  return squareRadius(angle) + offset + coastlineVariation(angle) * shorelineBlend;
}

export function createIslandCoastlinePoints(segments = ISLAND_COASTLINE_SEGMENTS): THREE.Vector2[] {
  return Array.from({ length: segments }, (_, index) => {
    const angle = (index / segments) * Math.PI * 2;
    const radius = offsetRadius(angle, ISLAND_BEACH_WIDTH);
    return new THREE.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius);
  });
}

export function createCoastalBandGeometry(
  innerOffset: number,
  outerOffset: number,
  segments = ISLAND_COASTLINE_SEGMENTS,
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let index = 0; index <= segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const innerRadius = offsetRadius(angle, innerOffset);
    const outerRadius = offsetRadius(angle, outerOffset);
    positions.push(cosine * innerRadius, 0, sine * innerRadius);
    positions.push(cosine * outerRadius, 0, sine * outerRadius);
    uvs.push(index / segments, 0, index / segments, 1);

    if (index < segments) {
      const inner = index * 2;
      const outer = inner + 1;
      const nextInner = inner + 2;
      const nextOuter = inner + 3;
      indices.push(inner, nextInner, nextOuter, inner, nextOuter, outer);
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

export function createShallowWaterGeometry(): THREE.BufferGeometry {
  const geometry = createCoastalBandGeometry(ISLAND_BEACH_WIDTH + 0.02, ISLAND_BEACH_WIDTH + 8);
  const shallowColor = new THREE.Color(SHALLOW_WATER_TINT);
  const deepColor = new THREE.Color(DEEP_WATER_TINT);
  const colors: number[] = [];

  for (let index = 0; index <= ISLAND_COASTLINE_SEGMENTS; index += 1) {
    colors.push(shallowColor.r, shallowColor.g, shallowColor.b, deepColor.r, deepColor.g, deepColor.b);
  }

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}

function createShorelineFoamMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uFoamColor: { value: new THREE.Color(SHORE_FOAM_TINT) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uFoamColor;
      varying vec2 vUv;

      void main() {
        float along = vUv.x * 6.2831853;
        float contour = sin(along * 5.0 - uTime * 0.52)
          + 0.38 * sin(along * 17.0 + uTime * 0.31)
          + 0.22 * sin(along * 31.0 - uTime * 0.18);
        float washFront = 0.49 + contour * 0.075 + 0.115 * sin(uTime * 0.46);
        float radialDistance = vUv.y - washFront;
        float shorewardWash = 1.0 - smoothstep(0.13, 0.52, abs(radialDistance + 0.14));
        float foamCrest = 1.0 - smoothstep(0.025, 0.14, abs(radialDistance));
        float brokenCrest = smoothstep(-0.22, 0.38, sin(along * 12.0 + sin(along * 3.0 + uTime * 0.2) * 0.72 - uTime * 0.43));
        float foamFingers = 1.0 - smoothstep(0.035, 0.17, abs(radialDistance + 0.15 + 0.035 * sin(along * 23.0 + uTime * 0.36)));
        float fingerBreakup = smoothstep(-0.16, 0.54, sin(along * 27.0 + sin(along * 5.0 - uTime * 0.28) * 0.42 - uTime * 0.58));
        float pulse = 0.86 + 0.14 * sin(uTime * 0.58 + along * 2.0);
        float alpha = max(shorewardWash * 0.44, max(foamCrest * brokenCrest, foamFingers * fingerBreakup * 0.48)) * pulse;
        if (alpha < 0.025) discard;
        gl_FragColor = vec4(uFoamColor, alpha);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

function createCoastlineShape(): THREE.Shape {
  const points = createIslandCoastlinePoints();
  const shape = new THREE.Shape();
  // ExtrudeGeometry is rotated onto the X/Z ground plane below, so invert its
  // local Y to keep this outline aligned with the beach and foam meshes.
  shape.moveTo(points[0].x, -points[0].y);
  for (const point of points.slice(1)) shape.lineTo(point.x, -point.y);
  shape.closePath();
  return shape;
}

export function createPlayableGridLinePositions(): Float32Array {
  const halfSpan = PLAYABLE_SPAN / 2;
  const positions: number[] = [];

  for (let index = 0; index <= PLAYABLE_SIZE; index += 1) {
    const coordinate = -halfSpan + index * TILE_SIZE;
    positions.push(
      coordinate, PLAYABLE_GRID_LINE_HEIGHT, -halfSpan,
      coordinate, PLAYABLE_GRID_LINE_HEIGHT, halfSpan,
      -halfSpan, PLAYABLE_GRID_LINE_HEIGHT, coordinate,
      halfSpan, PLAYABLE_GRID_LINE_HEIGHT, coordinate,
    );
  }

  return new Float32Array(positions);
}

function loadGrassTexture(fileName: string, repeatX: number, repeatY: number): THREE.Texture {
  const texture = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}assets/blocks/${fileName}`);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  return texture;
}

function loadSandTexture(): THREE.Texture {
  const texture = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}assets/skill-tree/sand.png`);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(18, 1);
  return texture;
}

function placeInstances(
  mesh: THREE.InstancedMesh,
  count: number,
  getTransform: (index: number, object: THREE.Object3D) => void,
): void {
  const object = new THREE.Object3D();
  for (let index = 0; index < count; index += 1) {
    getTransform(index, object);
    object.updateMatrix();
    mesh.setMatrixAt(index, object.matrix);
  }
  mesh.count = count;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
}

function addBorderDressing(
  scene: THREE.Scene,
  grid: readonly WorldCell[],
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  textures: THREE.Texture[],
): void {
  const plan = createBorderDecorationPlan(grid);
  const treePlan = plan.filter((decoration) => decoration.kind === 'tree');
  const rockPlan = plan.filter((decoration) => decoration.kind === 'rock');
  if (treePlan.length > 0) {
    const trunkGeometry = new THREE.BoxGeometry(TILE_SIZE * 0.26, TILE_SIZE * 1.1, TILE_SIZE * 0.26);
    const lowerCanopyGeometry = new THREE.BoxGeometry(TILE_SIZE * 1.05, TILE_SIZE * 0.86, TILE_SIZE * 0.96);
    const upperCanopyGeometry = new THREE.BoxGeometry(TILE_SIZE * 0.78, TILE_SIZE * 0.68, TILE_SIZE * 0.74);
    geometries.push(trunkGeometry, lowerCanopyGeometry, upperCanopyGeometry);

    const trunkTexture = loadGrassTexture('oak_log.png', 1, 1);
    const leavesTexture = loadGrassTexture('oak_leaves.png', 1, 1);
    textures.push(trunkTexture, leavesTexture);
    const trunkMaterial = new THREE.MeshStandardMaterial({
      map: trunkTexture,
      roughness: 1,
    });
    const leavesMaterial = new THREE.MeshStandardMaterial({
      map: leavesTexture,
      color: 0x87b64b,
      roughness: 1,
      alphaTest: 0.12,
    });
    materials.push(trunkMaterial, leavesMaterial);
    const trunkInstances = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, treePlan.length);
    const lowerCanopyInstances = new THREE.InstancedMesh(lowerCanopyGeometry, leavesMaterial, treePlan.length);
    const upperCanopyInstances = new THREE.InstancedMesh(upperCanopyGeometry, leavesMaterial, treePlan.length);
    for (const mesh of [trunkInstances, lowerCanopyInstances, upperCanopyInstances]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = true;
      mesh.userData.worldDecoration = true;
    }

    placeInstances(trunkInstances, treePlan.length, (index, object) => {
      const decoration = treePlan[index];
      const position = getWorldPosition(decoration.worldX, decoration.worldZ);
      object.position.set(position.x + decoration.offsetX, TILE_SIZE * 0.55, position.z + decoration.offsetZ);
      object.scale.setScalar(decoration.scale);
    });
    placeInstances(lowerCanopyInstances, treePlan.length, (index, object) => {
      const decoration = treePlan[index];
      const position = getWorldPosition(decoration.worldX, decoration.worldZ);
      object.position.set(position.x + decoration.offsetX, TILE_SIZE * 1.42 * decoration.scale, position.z + decoration.offsetZ);
      object.scale.set(decoration.scale, decoration.scale, decoration.scale);
    });
    placeInstances(upperCanopyInstances, treePlan.length, (index, object) => {
      const decoration = treePlan[index];
      const position = getWorldPosition(decoration.worldX, decoration.worldZ);
      object.position.set(position.x + decoration.offsetX, TILE_SIZE * 1.92 * decoration.scale, position.z + decoration.offsetZ);
      object.scale.set(decoration.scale, decoration.scale, decoration.scale);
    });
    scene.add(trunkInstances, lowerCanopyInstances, upperCanopyInstances);
  }

  if (rockPlan.length > 0) {
    const rockGeometry = new THREE.DodecahedronGeometry(TILE_SIZE * 0.34, 0);
    geometries.push(rockGeometry);
    const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x858b79, roughness: 1, flatShading: true });
    materials.push(rockMaterial);
    const rockInstances = new THREE.InstancedMesh(rockGeometry, rockMaterial, rockPlan.length);
    rockInstances.castShadow = true;
    rockInstances.receiveShadow = true;
    rockInstances.userData.worldDecoration = true;
    placeInstances(rockInstances, rockPlan.length, (index, object) => {
      const decoration = rockPlan[index];
      const position = getWorldPosition(decoration.worldX, decoration.worldZ);
      object.position.set(position.x + decoration.offsetX, TILE_SIZE * 0.18, position.z + decoration.offsetZ);
      object.rotation.set(decoration.variant * 0.2, decoration.variant * 0.8, decoration.variant * 0.12);
      object.scale.set(decoration.scale * 1.1, decoration.scale * 0.62, decoration.scale);
    });
    scene.add(rockInstances);
  }

}

interface DockLampResources {
  geometries: {
    pole: THREE.BoxGeometry;
    arm: THREE.BoxGeometry;
    lanternCore: THREE.BoxGeometry;
    lanternTop: THREE.BoxGeometry;
    lanternBottom: THREE.BoxGeometry;
    lanternFrame: THREE.BoxGeometry;
    handle: THREE.BoxGeometry;
  };
  wood: THREE.Material;
  frame: THREE.MeshStandardMaterial;
  light: THREE.MeshStandardMaterial;
}

function addBoxPart(
  group: THREE.Group,
  geometry: THREE.BoxGeometry,
  material: THREE.Material,
  name: string,
  x: number,
  y: number,
  z: number,
): void {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
}

function createDockLampResources(
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  wood: THREE.Material,
  poleWidth: number,
  poleDepth: number,
): DockLampResources {
  const lanternSize = TILE_SIZE * 0.31;
  const lanternHeight = TILE_SIZE * 0.29;
  const frameThickness = TILE_SIZE * 0.045;
  const frame = new THREE.MeshStandardMaterial({ color: 0x374149, roughness: 0.82, metalness: 0.08 });
  const light = new THREE.MeshStandardMaterial({
    color: 0xf8fcff,
    emissive: 0xffffff,
    emissiveIntensity: 1.35,
    roughness: 0.42,
    toneMapped: false,
  });
  const resources: DockLampResources = {
    geometries: {
      pole: new THREE.BoxGeometry(poleWidth, DOCK_LAMP_POLE_HEIGHT, poleDepth),
      arm: new THREE.BoxGeometry(poleWidth * 0.86, poleDepth * 0.86, TILE_SIZE * 0.62),
      lanternCore: new THREE.BoxGeometry(lanternSize * 0.57, lanternHeight * 0.64, lanternSize * 0.57),
      lanternTop: new THREE.BoxGeometry(lanternSize, frameThickness, lanternSize),
      lanternBottom: new THREE.BoxGeometry(lanternSize * 0.82, frameThickness, lanternSize * 0.82),
      lanternFrame: new THREE.BoxGeometry(frameThickness, lanternHeight, frameThickness),
      handle: new THREE.BoxGeometry(frameThickness * 1.1, TILE_SIZE * 0.1, frameThickness * 1.1),
    },
    wood,
    frame,
    light,
  };
  geometries.push(...Object.values(resources.geometries));
  materials.push(frame, light);
  return resources;
}

function createDockLamp(
  placement: IslandDockPlacement,
  lamp: DockLampResources,
  parent: THREE.Group,
  deckSurfaceOffsetY: number,
): void {
  const group = new THREE.Group();
  group.name = `island-dock-${placement.side}-lamp`;
  const poleHeight = DOCK_LAMP_POLE_HEIGHT;
  const lanternCenterY = poleHeight * 0.64;
  const lanternCenterZ = TILE_SIZE * 0.53;
  const lanternSize = TILE_SIZE * 0.31;
  const lanternHeight = TILE_SIZE * 0.29;
  const frameThickness = TILE_SIZE * 0.045;
  const frameOffset = lanternSize / 2 - frameThickness / 2;

  addBoxPart(group, lamp.geometries.pole, lamp.wood, 'oak-lamp-post', 0, poleHeight / 2, 0);
  addBoxPart(group, lamp.geometries.arm, lamp.wood, 'oak-lamp-arm', 0, poleHeight * 0.88, TILE_SIZE * 0.31);
  addBoxPart(group, lamp.geometries.lanternCore, lamp.light, 'white-emissive-lantern-core', 0, lanternCenterY, lanternCenterZ);
  addBoxPart(group, lamp.geometries.lanternTop, lamp.frame, 'lantern-dark-top-cap', 0, lanternCenterY + lanternHeight / 2, lanternCenterZ);
  addBoxPart(group, lamp.geometries.lanternBottom, lamp.frame, 'lantern-dark-bottom-cap', 0, lanternCenterY - lanternHeight / 2, lanternCenterZ);
  for (const xSign of [-1, 1]) {
    for (const zSign of [-1, 1]) {
      addBoxPart(
        group,
        lamp.geometries.lanternFrame,
        lamp.frame,
        'lantern-dark-corner-frame',
        xSign * frameOffset,
        lanternCenterY,
        lanternCenterZ + zSign * frameOffset,
      );
    }
  }
  addBoxPart(group, lamp.geometries.handle, lamp.frame, 'lantern-top-handle', 0, lanternCenterY + lanternHeight / 2 + TILE_SIZE * 0.075, lanternCenterZ);

  const lightSource = new THREE.PointLight(0xf8fcff, 1.65, TILE_SIZE * 6, 2);
  lightSource.name = `island-dock-${placement.side}-white-point-light`;
  lightSource.position.set(0, lanternCenterY, lanternCenterZ);
  lightSource.castShadow = false;
  group.add(lightSource);

  const dockBaseY = DOCK_DECK_HEIGHT - deckSurfaceOffsetY;
  const worldOffsetX = placement.lampX - placement.centerX;
  const worldOffsetZ = placement.lampZ - placement.centerZ;
  group.position.set(
    worldOffsetX * placement.tangentX + worldOffsetZ * placement.tangentZ,
    DOCK_DECK_HEIGHT - dockBaseY,
    worldOffsetX * placement.outwardX + worldOffsetZ * placement.outwardZ,
  );
  parent.add(group);
}

export function createDockDeckGapBacking(
  wood: THREE.Material,
  deckSurfaceY: number,
  deckWidth: number,
): THREE.Mesh {
  const thickness = TILE_SIZE * 0.025;
  const backing = new THREE.Mesh(
    new THREE.BoxGeometry(deckWidth * 0.99, thickness, DOCK_TOTAL_LENGTH * 0.985),
    wood,
  );
  backing.name = 'light-timber-underlay-fills-deck-board-gaps';
  backing.position.y = deckSurfaceY - TILE_SIZE * 0.03 - thickness / 2;
  backing.castShadow = false;
  backing.receiveShadow = false;
  return backing;
}

function disposeGltfResources(root: THREE.Object3D): void {
  const disposedGeometries = new Set<THREE.BufferGeometry>();
  const disposedMaterials = new Set<THREE.Material>();
  const disposedTextures = new Set<THREE.Texture>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    disposedGeometries.add(object.geometry);
    const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
    meshMaterials.forEach((material) => {
      disposedMaterials.add(material);
      Object.values(material).forEach((value) => {
        if (value instanceof THREE.Texture) disposedTextures.add(value);
      });
    });
  });
  disposedGeometries.forEach((geometry) => geometry.dispose());
  disposedMaterials.forEach((material) => material.dispose());
  disposedTextures.forEach((texture) => texture.dispose());
}

function addDockAreas(
  scene: THREE.Scene,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  textures: THREE.Texture[],
  isDisposed: () => boolean,
): void {
  const loader = new GLTFLoader();
  loader.load(
    `${import.meta.env.BASE_URL}assets/models/environment/dock/low-poly_island_dock_platform.glb`,
    (gltf) => {
      if (isDisposed()) {
        disposeGltfResources(gltf.scene);
        return;
      }

      const bounds = new THREE.Box3().setFromObject(gltf.scene);
      const modelSize = bounds.getSize(new THREE.Vector3());
      const modelCenter = bounds.getCenter(new THREE.Vector3());
      const modelScale = getDockModelScale(modelSize);
      const lampSupport = getDockLampSupport(gltf.scene, modelSize);
      if (!lampSupport) {
        disposeGltfResources(gltf.scene);
        console.error('Could not locate a dock support leg for its mounted lamp.');
        return;
      }
      const sourceMaterials = new Set<THREE.Material>();
      const sharedGeometries = new Set<THREE.BufferGeometry>();
      const sharedTextures = new Set<THREE.Texture>();
      gltf.scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.castShadow = true;
        sharedGeometries.add(object.geometry);
        const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
        meshMaterials.forEach((material) => {
          sourceMaterials.add(material);
          Object.values(material).forEach((value) => {
            if (value instanceof THREE.Texture) sharedTextures.add(value);
          });
        });
      });
      const supportMaterial = Array.isArray(lampSupport.mesh.material) ? lampSupport.mesh.material[0] : lampSupport.mesh.material;
      const deckFinishes = applyDockSupportTimber(gltf.scene, modelSize, lampSupport);
      const deckBoards = getDockModelDeckBoards(gltf.scene, modelSize);
      const deckWidth = Math.max(...deckBoards.map((board) => new THREE.Box3().setFromObject(board).getSize(new THREE.Vector3()).x)) * modelScale.x;
      const deckSurfaceOffsetY = (getDockModelDeckTopY(gltf.scene, modelSize) - modelCenter.y) * modelScale.y;
      const dockBaseY = DOCK_DECK_HEIGHT - deckSurfaceOffsetY;
      sourceMaterials.add(deckFinishes.base);
      deckFinishes.planks.forEach((material) => sourceMaterials.add(material));
      geometries.push(...sharedGeometries);
      materials.push(...sourceMaterials);
      textures.push(...sharedTextures);

      const lamp = createDockLampResources(
        geometries,
        materials,
        supportMaterial,
        lampSupport.width * modelScale.x,
        lampSupport.depth * modelScale.z,
      );
      const lampPosition = {
        x: lampSupport.centerX * modelScale.x,
        z: DOCK_SECTION_LENGTH / 2 + lampSupport.centerZ * modelScale.z,
      };
      for (const placement of createIslandDockPlacements(WORLD_ENTRANCES, lampPosition)) {
        const dock = new THREE.Group();
        dock.name = `island-dock-${placement.side}`;
        dock.position.set(placement.centerX, dockBaseY, placement.centerZ);
        dock.rotation.y = placement.rotationY;
        const deckBacking = createDockDeckGapBacking(deckFinishes.base, deckSurfaceOffsetY, deckWidth);
        dock.add(deckBacking);
        geometries.push(deckBacking.geometry);
        for (const [index, localZ] of [-DOCK_SECTION_LENGTH / 2, DOCK_SECTION_LENGTH / 2].entries()) {
          const section = new THREE.Group();
          section.name = `island-dock-${placement.side}-section-${index + 1}`;
          section.position.z = localZ;
          const model = gltf.scene.clone(true);
          model.scale.copy(modelScale);
          model.position.set(
            -modelCenter.x * modelScale.x,
            -modelCenter.y * modelScale.y,
            -modelCenter.z * modelScale.z,
          );
          model.traverse((object) => {
            if (!(object instanceof THREE.Mesh)) return;
            object.receiveShadow = false;
            const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
            if (!meshMaterials.some((material) => material.name.startsWith('Wood.'))) return;
            object.material = Array.isArray(object.material)
              ? object.material.map((material) => material.name.startsWith('Wood.') ? supportMaterial : material)
              : supportMaterial;
          });
          section.add(model);
          dock.add(section);
        }
        createDockLamp(placement, lamp, dock, deckSurfaceOffsetY);
        scene.add(dock);
      }
    },
    undefined,
    (error) => {
      if (!isDisposed()) console.error('Could not load the decorative island dock model.', error);
    },
  );
}

export function createWorldScene(scene: THREE.Scene, grid: readonly WorldCell[]): WorldSceneResources {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];
  let disposed = false;

  const worldTexture = loadGrassTexture('grass_block_top.png', WORLD_SIZE, WORLD_SIZE);
  const clearingTexture = loadGrassTexture('grass_block_top.png', PLAYABLE_SIZE, PLAYABLE_SIZE);
  const sideTexture = loadGrassTexture('grass_block_side.png', WORLD_SIZE, 1);
  const dirtTexture = loadGrassTexture('dirt.png', WORLD_SIZE, 1);
  const sandTexture = loadSandTexture();
  textures.push(worldTexture, clearingTexture, sideTexture, dirtTexture, sandTexture);

  const worldTopMaterial = new THREE.MeshStandardMaterial({ map: worldTexture, color: 0x789d4c, roughness: 1 });
  const clearingMaterial = new THREE.MeshStandardMaterial({ map: clearingTexture, color: 0x8abd51, roughness: 1 });
  const sideMaterial = new THREE.MeshStandardMaterial({ map: sideTexture, roughness: 1 });
  const dirtMaterial = new THREE.MeshStandardMaterial({ map: dirtTexture, roughness: 1 });
  const sandMaterial = new THREE.MeshStandardMaterial({ map: sandTexture, color: BEACH_SAND_TINT, roughness: 1, side: THREE.DoubleSide });
  const islandSideMaterial = new THREE.MeshStandardMaterial({ map: dirtTexture, color: 0xc0a66d, roughness: 1 });
  const oceanMaterial = new THREE.MeshBasicMaterial({ color: DEEP_WATER_TINT, toneMapped: false });
  const shallowWaterMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  const foamMaterial = createShorelineFoamMaterial();
  const gridLineMaterial = new THREE.LineBasicMaterial({
    color: 0x344d27,
    transparent: true,
    opacity: PLAYABLE_GRID_LINE_OPACITY,
    depthWrite: false,
  });
  materials.push(worldTopMaterial, clearingMaterial, sideMaterial, dirtMaterial, sandMaterial, islandSideMaterial, oceanMaterial, shallowWaterMaterial, foamMaterial, gridLineMaterial);

  const oceanGeometry = new THREE.PlaneGeometry(WORLD_SPAN * 7, WORLD_SPAN * 7);
  geometries.push(oceanGeometry);
  const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.y = OCEAN_LEVEL;
  ocean.receiveShadow = false;
  ocean.name = 'surrounding-calm-ocean';
  scene.add(ocean);

  const islandBodyGeometry = new THREE.ExtrudeGeometry(createCoastlineShape(), {
    depth: SURFACE_THICKNESS,
    bevelEnabled: false,
    curveSegments: 1,
  });
  geometries.push(islandBodyGeometry);
  const islandBody = new THREE.Mesh(islandBodyGeometry, [sandMaterial, islandSideMaterial]);
  islandBody.rotation.x = -Math.PI / 2;
  islandBody.position.y = -SURFACE_THICKNESS - 0.012;
  islandBody.receiveShadow = true;
  islandBody.name = 'natural-island-coast-skirt';
  scene.add(islandBody);

  const shallowWaterGeometry = createShallowWaterGeometry();
  geometries.push(shallowWaterGeometry);
  const shallowWater = new THREE.Mesh(shallowWaterGeometry, shallowWaterMaterial);
  shallowWater.position.y = OCEAN_LEVEL + 0.002;
  shallowWater.name = 'shallow-to-deep-water-transition';
  scene.add(shallowWater);

  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(WORLD_SPAN, SURFACE_THICKNESS, WORLD_SPAN),
    [dirtMaterial, dirtMaterial, worldTopMaterial, dirtMaterial, sideMaterial, sideMaterial],
  );
  geometries.push(ground.geometry);
  ground.position.y = -SURFACE_THICKNESS / 2;
  ground.receiveShadow = true;
  ground.name = '60-by-60-world-slab';
  scene.add(ground);

  const beachGeometry = createCoastalBandGeometry(-0.035, ISLAND_BEACH_WIDTH);
  geometries.push(beachGeometry);
  const beach = new THREE.Mesh(beachGeometry, sandMaterial);
  beach.position.y = 0.004;
  beach.receiveShadow = true;
  beach.name = 'textured-sand-beach';
  scene.add(beach);

  const foamGeometry = createCoastalBandGeometry(ISLAND_BEACH_WIDTH - 0.32, ISLAND_BEACH_WIDTH + 0.93);
  geometries.push(foamGeometry);
  const foam = new THREE.Mesh(foamGeometry, foamMaterial);
  foam.position.y = 0.014;
  foam.name = 'stylized-animated-shoreline-foam-v2';
  scene.add(foam);

  const clearing = new THREE.Mesh(new THREE.PlaneGeometry(PLAYABLE_SPAN, PLAYABLE_SPAN), clearingMaterial);
  geometries.push(clearing.geometry);
  clearing.rotation.x = -Math.PI / 2;
  clearing.position.set(0, 0.006, 0);
  clearing.receiveShadow = true;
  clearing.name = '50-by-50-playable-clearing';
  scene.add(clearing);

  const gridLineGeometry = new THREE.BufferGeometry();
  geometries.push(gridLineGeometry);
  gridLineGeometry.setAttribute('position', new THREE.BufferAttribute(createPlayableGridLinePositions(), 3));
  gridLineGeometry.computeBoundingSphere();
  const playableGridLines = new THREE.LineSegments(gridLineGeometry, gridLineMaterial);
  playableGridLines.name = '50-by-50-playable-grid-lines';
  playableGridLines.renderOrder = 1;
  scene.add(playableGridLines);

  addBorderDressing(scene, grid, geometries, materials, textures);
  addDockAreas(scene, geometries, materials, textures, () => disposed);

  return {
    update: (elapsedSeconds) => {
      foamMaterial.uniforms.uTime.value = elapsedSeconds % 240;
    },
    dispose: () => {
      disposed = true;
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
      for (const texture of textures) texture.dispose();
    },
  };
}
