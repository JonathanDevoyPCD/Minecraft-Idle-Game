import * as THREE from 'three';
import './style.css';
import { CloudCell, createCloudGeometry } from './cloud-geometry';
import { AudioManager } from './audio';
import {
  SAVE_KEY,
  addXp,
  advanceMineOperations,
  buySkillNode,
  canPlaceMine,
  canAffordSkillNode,
  calculateOfflineXp,
  completeConstructionProjects,
  collectOreBonus,
  dispatchMineCart,
  getExpansionChunkOrigin,
  getMineCartCount,
  getMineLayer,
  getMineTripDuration,
  getLivingEntityPlan,
  getMeadowFeaturePlan,
  getNextSettlementStage,
  getSettlementStage,
  getWorldSurfaceCells,
  getSkillNodeRank,
  loadState,
  saveState,
  unlockStarterMine,
  WORLD_DIRECTIONS,
  type BlockType,
  type LivingEntityPlan,
  type MeadowFeature,
  type MineSite,
  type PathCell,
  type WorldDirection,
} from './game';
import {
  getSkillTreeBranch,
  SKILL_TREE_BRANCH_ENTRY_IDS,
  SKILL_TREE_BRANCHES,
  SKILL_TREE_BY_ID,
  SKILL_TREE_NODES,
  type SkillNodeDefinition,
} from './skill-tree';
import { getSkillNodeIconName } from './skill-tree-icons';

const canvas = document.querySelector<HTMLCanvasElement>('#world')!;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-4, 4, 4, -4, 0.1, 100);
const cameraTarget = new THREE.Vector3(0, 0, 0);
const cameraRadius = Math.sqrt(6 * 6 + 6 * 6 + 6 * 6);
let orbitYaw = Math.PI / 4;
let orbitPitch = Math.atan2(6, Math.sqrt(6 * 6 + 6 * 6));

function updateCameraTransform(): void {
  const horizontalRadius = cameraRadius * Math.cos(orbitPitch);
  camera.position.set(
    cameraTarget.x + horizontalRadius * Math.cos(orbitYaw),
    cameraTarget.y + cameraRadius * Math.sin(orbitPitch),
    cameraTarget.z + horizontalRadius * Math.sin(orbitYaw),
  );
  camera.lookAt(cameraTarget);
}

updateCameraTransform();

scene.add(new THREE.HemisphereLight(0xcff5ff, 0x57734b, 2.4));
const sun = new THREE.DirectionalLight(0xfff4cf, 4.2);
sun.position.set(6, 10, -6);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -5;
sun.shadow.camera.right = 5;
sun.shadow.camera.top = 5;
sun.shadow.camera.bottom = -5;
scene.add(sun);

const BLOCK_SIZE = 0.9;
const shadowPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.ShadowMaterial({ color: 0x1d7288, opacity: 0.17 }),
);
shadowPlane.rotation.x = -Math.PI / 2;
shadowPlane.receiveShadow = true;
scene.add(shadowPlane);

const shadowBase = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.MeshBasicMaterial({ color: 0x2b879c, transparent: true, opacity: 0.07, depthWrite: false }),
);
shadowBase.rotation.x = -Math.PI / 2;
scene.add(shadowBase);

const world = new THREE.Group();
scene.add(world);
let state = loadState(localStorage);
const audioManager = new AudioManager();
let isResetting = false;

function loadBlockTexture(fileName: string): THREE.Texture {
  const texture = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}assets/blocks/${fileName}`);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  return texture;
}

function loadAssetTexture(path: string): THREE.Texture {
  const texture = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}assets/${path}`, (loadedTexture) => {
    const clones = loadedTexture.userData.entityTextureClones as THREE.Texture[] | undefined;
    clones?.forEach((clone) => {
      clone.image = loadedTexture.image;
      clone.needsUpdate = true;
    });
    window.dispatchEvent(new Event('idlecraft-asset-loaded'));
  });
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  return texture;
}

const grassTexture = loadBlockTexture('grass_block_top.png');
const grassSideTexture = loadBlockTexture('grass_block_side.png');
const dirtTexture = loadBlockTexture('dirt.png');
const grassMaterial = new THREE.MeshStandardMaterial({ map: grassTexture, color: 0x82bd4a, roughness: 1 });
const grassSideMaterial = new THREE.MeshStandardMaterial({ map: grassSideTexture, roughness: 1 });
const dirtMaterial = new THREE.MeshStandardMaterial({ map: dirtTexture, roughness: 1 });
const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0x858d8f, roughness: 1 });
const deepslateTexture = loadBlockTexture('deepslate.png');
const deepslateMaterial = new THREE.MeshStandardMaterial({ map: deepslateTexture, roughness: 1 });
const bedrockTexture = loadBlockTexture('bedrock.png');
const bedrockMaterial = new THREE.MeshStandardMaterial({ map: bedrockTexture, roughness: 1 });
const railTexture = loadBlockTexture('rail.png');
const poweredRailTexture = loadBlockTexture('powered_rail.png');
const oakLogTexture = loadBlockTexture('oak_log.png');
const oakLeavesTexture = loadBlockTexture('oak_leaves.png');
const oakPlanksTexture = loadBlockTexture('oak_planks.png');
const darkOakPlanksTexture = loadBlockTexture('dark_oak_planks.png');
const waterTexture = loadBlockTexture('water_still.png');
const pathTexture = loadBlockTexture('dirt_path_top.png');
const farmlandTexture = loadBlockTexture('farmland.png');
const wheatTexture = loadBlockTexture('wheat_stage3.png');
const stoneBricksTexture = loadBlockTexture('stone_bricks.png');
const cobblestoneTexture = loadBlockTexture('cobblestone.png');
const lanternTexture = loadBlockTexture('lantern.png');
const oakDoorTexture = loadBlockTexture('oak_door_bottom.png');
const minecartTexture = loadAssetTexture('items/minecart.png');
const chestMinecartTexture = loadAssetTexture('items/chest_minecart.png');
const pigEntityTexture = loadAssetTexture('entities/pig/pig.png');
const cowEntityTexture = loadAssetTexture('entities/cow/cow.png');
const sheepEntityTexture = loadAssetTexture('entities/sheep/sheep.png');
const sheepFurTexture = loadAssetTexture('entities/sheep/sheep_fur.png');
const villagerEntityTexture = loadAssetTexture('entities/villager/villager.png');
const oreTextures = {
  coal: loadBlockTexture('coal_ore.png'),
  iron: loadBlockTexture('iron_ore.png'),
  gold: loadBlockTexture('gold_ore.png'),
  diamond: loadBlockTexture('diamond_ore.png'),
} as const;

interface BlockCoordinate {
  x: number;
  y: number;
  z: number;
}

interface BlockNode {
  id: string;
  type: BlockType;
  coordinate: BlockCoordinate;
  requiredWorldRank: number;
  requiredDirection?: WorldDirection;
  mesh: THREE.Mesh;
}

function createBlockMesh(type: BlockType): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE), getBlockMaterials(type));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  world.add(mesh);
  return mesh;
}

function getBlockMaterials(type: BlockType): THREE.Material[] {
  return type === 'grass'
    ? [grassSideMaterial, grassSideMaterial, grassMaterial, dirtMaterial, grassSideMaterial, grassSideMaterial]
    : type === 'dirt'
      ? [dirtMaterial, dirtMaterial, dirtMaterial, dirtMaterial, dirtMaterial, dirtMaterial]
      : type === 'stone'
        ? [stoneMaterial, stoneMaterial, stoneMaterial, stoneMaterial, stoneMaterial, stoneMaterial]
        : type === 'deepslate'
          ? [deepslateMaterial, deepslateMaterial, deepslateMaterial, deepslateMaterial, deepslateMaterial, deepslateMaterial]
          : [bedrockMaterial, bedrockMaterial, bedrockMaterial, bedrockMaterial, bedrockMaterial, bedrockMaterial];
}

function createBlockNode(
  id: string,
  type: BlockType,
  coordinate: BlockCoordinate,
  requiredWorldRank: number,
  requiredDirection?: WorldDirection,
): BlockNode {
  const mesh = createBlockMesh(type);
  const node = {
    id,
    type,
    coordinate,
    requiredWorldRank,
    requiredDirection,
    mesh,
  } satisfies BlockNode;
  node.mesh.position.set(
    coordinate.x * BLOCK_SIZE,
    coordinate.y * BLOCK_SIZE,
    coordinate.z * BLOCK_SIZE,
  );
  return node;
}

interface GeneratedBlock {
  type: BlockType;
  coordinate: BlockCoordinate;
  requiredWorldRank: number;
  requiredDirection?: WorldDirection;
}

function generateMeadowChunk(
  origin: { x: number; z: number },
  requiredWorldRank: number,
  requiredDirection?: WorldDirection,
  seed = 0,
  skipOriginColumn = false,
): GeneratedBlock[] {
  const cells: GeneratedBlock[] = [];
  for (let localX = 0; localX < 3; localX += 1) {
    for (let localZ = 0; localZ < 3; localZ += 1) {
      const x = origin.x + localX;
      const z = origin.z + localZ;
      if (skipOriginColumn && x === 0 && z === 0) continue;
      for (const [y, type] of [[0, 'grass'], [-1, 'dirt'], [-2, 'stone'], [-3, 'deepslate'], [-4, 'deepslate'], [-5, 'bedrock']] as const) {
        const surfaceNoise = Math.abs(Math.sin(seed * 0.001 + x * 12.9898 + z * 78.233));
        const surfaceType = y === 0 && requiredWorldRank > 1 && surfaceNoise > 0.93 ? 'dirt' : type;
        cells.push({ type: surfaceType, coordinate: { x, y, z }, requiredWorldRank, requiredDirection });
      }
    }
  }
  return cells;
}

function generateWorldLayout(): GeneratedBlock[] {
  const cells: GeneratedBlock[] = [];
  // Keep the procedural starter chunk in the scene graph from the beginning;
  // updateWorldScene controls which coordinate cells are currently unlocked.
  // Keep one extra set of perimeter cells authored in the scene graph so the
  // first 7×7 upgrade can reveal them without changing the camera or mesh
  // scale. Later infinite expansion will grow this pool deliberately.
  const chunkBounds = Math.max(5, Math.floor(state.chunkSize / 2));
  for (let x = -chunkBounds; x <= chunkBounds; x += 1) {
    for (let z = -chunkBounds; z <= chunkBounds; z += 1) {
      cells.push({ type: 'grass', coordinate: { x, y: 0, z }, requiredWorldRank: 0 });
      cells.push({ type: 'dirt', coordinate: { x, y: -1, z }, requiredWorldRank: 2 });
      cells.push({ type: 'stone', coordinate: { x, y: -2, z }, requiredWorldRank: 2 });
      cells.push({ type: 'deepslate', coordinate: { x, y: -3, z }, requiredWorldRank: 2 });
      cells.push({ type: 'deepslate', coordinate: { x, y: -4, z }, requiredWorldRank: 2 });
      cells.push({ type: 'bedrock', coordinate: { x, y: -5, z }, requiredWorldRank: 2 });
    }
  }
  WORLD_DIRECTIONS.forEach((direction) => {
    const expansionNumber = 1;
    cells.push(...generateMeadowChunk(
      getExpansionChunkOrigin(expansionNumber, direction),
      expansionNumber + 1,
      direction,
      state.worldSeed,
    ));
  });
  return cells;
}

const blockNodes: BlockNode[] = generateWorldLayout().map(({ type, coordinate, requiredWorldRank, requiredDirection }) => {
  const { x, y, z } = coordinate;
  return createBlockNode(`block-${x}-${y}-${z}-${requiredDirection ?? 'core'}`, type, coordinate, requiredWorldRank, requiredDirection);
});

interface OreNode {
  id: string;
  resource: 'coal' | 'iron' | 'gold' | 'diamond';
  requiredLayer: number;
  requiredSkill: string;
  mesh: THREE.Mesh;
  basePosition: THREE.Vector3;
  pulse: number;
}

const oreNodeDefinitions: ReadonlyArray<Pick<OreNode, 'id' | 'resource' | 'requiredLayer' | 'requiredSkill'> & { position: [number, number, number] }> = [
  { id: 'ore-coal-0', resource: 'coal', requiredLayer: 1, requiredSkill: 'materials-coal', position: [-0.26, -1.9, 0.47] },
  { id: 'ore-iron-0', resource: 'iron', requiredLayer: 1, requiredSkill: 'materials-iron', position: [0.24, -2.2, 0.47] },
  { id: 'ore-gold-0', resource: 'gold', requiredLayer: 2, requiredSkill: 'materials-gold', position: [-0.25, -2.83, 0.47] },
  { id: 'ore-diamond-0', resource: 'diamond', requiredLayer: 2, requiredSkill: 'materials-diamond', position: [0.27, -3.16, 0.47] },
];

const oreNodes: OreNode[] = oreNodeDefinitions.map((definition) => {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(BLOCK_SIZE * 0.18, BLOCK_SIZE * 0.18, BLOCK_SIZE * 0.08),
    new THREE.MeshStandardMaterial({ map: oreTextures[definition.resource], roughness: 1 }),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  world.add(mesh);
  const basePosition = new THREE.Vector3(...definition.position).multiplyScalar(BLOCK_SIZE);
  mesh.position.copy(basePosition);
  return { ...definition, mesh, basePosition, pulse: 0 };
});
const oreByMesh = new Map<THREE.Object3D, OreNode>(oreNodes.map((node) => [node.mesh, node]));
const oreTargets: THREE.Mesh[] = [];

interface MeadowFeatureVisual {
  feature: MeadowFeature;
  group: THREE.Group;
  water?: THREE.Object3D;
  farmland?: THREE.Object3D;
  crops?: THREE.Object3D;
}

const meadowFeatureRoot = new THREE.Group();
world.add(meadowFeatureRoot);

const oakLogMaterial = new THREE.MeshStandardMaterial({ map: oakLogTexture, roughness: 1 });
const oakLeavesMaterial = new THREE.MeshStandardMaterial({ map: oakLeavesTexture, color: 0x4f963f, roughness: 1, transparent: true, alphaTest: 0.1 });
const oakPlanksMaterial = new THREE.MeshStandardMaterial({ map: oakPlanksTexture, roughness: 1 });
const darkOakPlanksMaterial = new THREE.MeshStandardMaterial({ map: darkOakPlanksTexture, roughness: 1 });
const waterMaterial = new THREE.MeshStandardMaterial({ map: waterTexture, color: 0x78d7e8, roughness: 0.25, transparent: true, opacity: 0.82 });
const pathMaterial = new THREE.MeshStandardMaterial({ map: pathTexture, roughness: 1 });
const farmlandMaterial = new THREE.MeshStandardMaterial({ map: farmlandTexture, roughness: 1 });
const wheatMaterial = new THREE.MeshStandardMaterial({ map: wheatTexture, roughness: 1, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide });
const stoneBricksMaterial = new THREE.MeshStandardMaterial({ map: stoneBricksTexture, roughness: 1 });
const cobblestoneMaterial = new THREE.MeshStandardMaterial({ map: cobblestoneTexture, roughness: 1 });
const lanternMaterial = new THREE.MeshStandardMaterial({ map: lanternTexture, roughness: 0.7, emissive: 0xf5ad4b, emissiveIntensity: 0.25 });
const oakDoorMaterial = new THREE.MeshStandardMaterial({ map: oakDoorTexture, roughness: 1, transparent: true, alphaTest: 0.1 });

function addFeatureCube(
  parent: THREE.Group,
  material: THREE.Material,
  size: [number, number, number],
  position: [number, number, number],
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size[0] * BLOCK_SIZE, size[1] * BLOCK_SIZE, size[2] * BLOCK_SIZE),
    material,
  );
  mesh.position.set(position[0] * BLOCK_SIZE, position[1] * BLOCK_SIZE, position[2] * BLOCK_SIZE);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addFeaturePlant(parent: THREE.Group, textureMaterial: THREE.Material): THREE.Group {
  const plant = new THREE.Group();
  const first = new THREE.Mesh(new THREE.PlaneGeometry(BLOCK_SIZE * 0.62, BLOCK_SIZE * 0.82), textureMaterial);
  const second = first.clone();
  first.rotation.y = Math.PI / 4;
  second.rotation.y = -Math.PI / 4;
  first.position.y = BLOCK_SIZE * 0.9;
  second.position.y = BLOCK_SIZE * 0.9;
  plant.add(first, second);
  parent.add(plant);
  return plant;
}

function createMeadowFeatureVisual(feature: MeadowFeature): MeadowFeatureVisual {
  const group = new THREE.Group();
  group.position.set(feature.x * BLOCK_SIZE, 0, feature.z * BLOCK_SIZE);
  meadowFeatureRoot.add(group);
  const visual: MeadowFeatureVisual = { feature, group };

  if (feature.kind === 'path') {
    const isSouthConnector = feature.id === 'path-south';
    addFeatureCube(group, pathMaterial, isSouthConnector ? [0.16, 0.05, 0.88] : [0.88, 0.05, 0.88], [0, 0.49, 0]);
  }

  if (feature.kind === 'tree') {
    addFeatureCube(group, oakLogMaterial, [0.34, 0.95, 0.34], [0, 0.96, 0]);
    addFeatureCube(group, oakLeavesMaterial, [0.88, 0.7, 0.88], [0, 1.62, 0]);
    addFeatureCube(group, oakLeavesMaterial, [0.58, 0.36, 0.58], [0, 2.1, 0]);
  }

  if (feature.kind === 'farm') {
    visual.farmland = addFeatureCube(group, farmlandMaterial, [0.88, 0.05, 0.88], [0, 0.49, 0]);
    visual.crops = addFeaturePlant(group, wheatMaterial);
  }

  if (feature.kind === 'well') {
    visual.water = addFeatureCube(group, waterMaterial, [0.42, 0.05, 0.42], [0, 0.68, 0]);
    addFeatureCube(group, cobblestoneMaterial, [0.72, 0.2, 0.72], [0, 0.59, 0]);
    [-0.24, 0.24].forEach((x) => {
      addFeatureCube(group, stoneBricksMaterial, [0.16, 0.76, 0.16], [x, 1.0, -0.24]);
      addFeatureCube(group, stoneBricksMaterial, [0.16, 0.76, 0.16], [x, 1.0, 0.24]);
    });
    addFeatureCube(group, oakPlanksMaterial, [0.78, 0.16, 0.78], [0, 1.48, 0]);
    addFeatureCube(group, lanternMaterial, [0.16, 0.24, 0.16], [0, 1.16, 0]);
  }

  if (feature.kind === 'dwelling') {
    addFeatureCube(group, oakPlanksMaterial, [1.6, 0.16, 1.6], [0, 0.55, 0]);
    addFeatureCube(group, oakPlanksMaterial, [1.34, 1.1, 1.34], [0, 1.13, 0]);
    addFeatureCube(group, darkOakPlanksMaterial, [1.6, 0.22, 1.6], [0, 1.78, 0]);
    addFeatureCube(group, darkOakPlanksMaterial, [1.3, 0.18, 1.3], [0, 1.98, 0]);
    addFeatureCube(group, oakDoorMaterial, [0.34, 0.78, 0.06], [0, 0.98, -0.66]);
    addFeatureCube(group, lanternMaterial, [0.16, 0.24, 0.16], [0.5, 1.3, -0.68]);
  }

  group.visible = false;
  return visual;
}

const meadowFeatureVisuals = getMeadowFeaturePlan(state.worldSeed).map(createMeadowFeatureVisual);
interface PathVisual {
  cell: PathCell;
  group: THREE.Group;
  surface: THREE.Mesh;
}

function getPathMaterial(tier: PathCell['tier']): THREE.Material {
  return tier === 'cobblestone' ? cobblestoneMaterial : tier === 'stone' ? stoneMaterial : pathMaterial;
}

function createPathVisual(cell: PathCell): PathVisual {
  const group = new THREE.Group();
  group.position.set(cell.x * BLOCK_SIZE, 0, cell.z * BLOCK_SIZE);
  meadowFeatureRoot.add(group);
  const surface = addFeatureCube(group, getPathMaterial(cell.tier), [0.88, 0.05, 0.88], [0, 0.49, 0]);
  return { cell, group, surface };
}

const pathVisuals = state.pathCells.map(createPathVisual);

function updateMeadowScene(): void {
  // The old authored 3×3 feature layout is intentionally retired. Structures,
  // farms, wells, and entities will return through the placement model so they
  // cannot silently overlap one another or clip across chunk boundaries.
  meadowFeatureVisuals.forEach((visual) => { visual.group.visible = false; });
  const visibleSurfaceCells = new Set(getWorldSurfaceCells(state).map((cell) => `${cell.x},${cell.z}`));
  pathVisuals.forEach((visual) => {
    visual.surface.material = getPathMaterial(visual.cell.tier);
    visual.group.visible = visibleSurfaceCells.has(`${visual.cell.x},${visual.cell.z}`);
  });
}

interface LivingEntityVisual {
  plan: LivingEntityPlan;
  group: THREE.Group;
}

const livingEntityRoot = new THREE.Group();
world.add(livingEntityRoot);

const villagerSkinMaterial = new THREE.MeshStandardMaterial({ color: 0x8c5d48, roughness: 1 });
const villagerRobeMaterial = new THREE.MeshStandardMaterial({ color: 0x5b4a38, roughness: 1 });
const minerRobeMaterial = new THREE.MeshStandardMaterial({ color: 0x59656b, roughness: 1 });
const farmerRobeMaterial = new THREE.MeshStandardMaterial({ color: 0x588a44, roughness: 1 });
const toolsmithRobeMaterial = new THREE.MeshStandardMaterial({ color: 0x6d7d88, roughness: 1 });
const animalBrownMaterial = new THREE.MeshStandardMaterial({ color: 0x8d5b3a, roughness: 1 });
const animalDarkMaterial = new THREE.MeshStandardMaterial({ color: 0x4b3426, roughness: 1 });
const animalWhiteMaterial = new THREE.MeshStandardMaterial({ color: 0xdad8ca, roughness: 1 });

function addEntityCube(
  parent: THREE.Group,
  material: THREE.Material,
  size: [number, number, number],
  position: [number, number, number],
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size[0] * BLOCK_SIZE, size[1] * BLOCK_SIZE, size[2] * BLOCK_SIZE),
    material,
  );
  mesh.position.set(position[0] * BLOCK_SIZE, position[1] * BLOCK_SIZE, position[2] * BLOCK_SIZE);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addTexturedEntityCube(
  parent: THREE.Group,
  texture: THREE.Texture,
  atlasSize: [number, number],
  textureOffset: [number, number],
  textureSize: [number, number, number],
  size: [number, number, number],
  position: [number, number, number],
): THREE.Mesh {
  const [atlasWidth, atlasHeight] = atlasSize;
  const [u, v] = textureOffset;
  const [width, height, depth] = textureSize;
  const regions = [
    { u: u + depth + width, v: v + depth, width: depth, height },
    { u, v: v + depth, width: depth, height },
    { u: u + depth, v, width, height: depth },
    { u: u + depth + width, v, width, height: depth },
    { u: u + depth, v: v + depth, width, height },
    { u: u + depth + width + depth, v: v + depth, width, height },
  ];
  const materials = regions.map((region) => {
    const map = texture.clone();
    map.image = texture.image;
    const clones = (texture.userData.entityTextureClones as THREE.Texture[] | undefined) ?? [];
    clones.push(map);
    texture.userData.entityTextureClones = clones;
    if (texture.image) map.needsUpdate = true;
    map.wrapS = THREE.ClampToEdgeWrapping;
    map.wrapT = THREE.ClampToEdgeWrapping;
    map.repeat.set(region.width / atlasWidth, region.height / atlasHeight);
    map.offset.set(region.u / atlasWidth, 1 - (region.v + region.height) / atlasHeight);
    const material = new THREE.MeshStandardMaterial({ map, roughness: 1, transparent: true, alphaTest: 0.1 });
    material.userData.disposeWithEntity = true;
    return material;
  });
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size[0] * BLOCK_SIZE, size[1] * BLOCK_SIZE, size[2] * BLOCK_SIZE),
    materials,
  );
  mesh.position.set(position[0] * BLOCK_SIZE, position[1] * BLOCK_SIZE, position[2] * BLOCK_SIZE);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function createLivingEntityVisual(plan: LivingEntityPlan): LivingEntityVisual {
  const group = new THREE.Group();
  group.position.set(plan.x * BLOCK_SIZE, 0, plan.z * BLOCK_SIZE);

  if (plan.kind === 'villager') {
    const robeMaterial = plan.role === 'miner'
      ? minerRobeMaterial
      : plan.role === 'farmer'
        ? farmerRobeMaterial
        : plan.role === 'toolsmith'
          ? toolsmithRobeMaterial
          : villagerRobeMaterial;
    addTexturedEntityCube(group, villagerEntityTexture, [64, 64], [0, 0], [8, 10, 8], [0.3, 0.3, 0.3], [0, 1.6, 0]);
    addEntityCube(group, robeMaterial, [0.36, 0.5, 0.28], [0, 1.16, 0]);
    addEntityCube(group, villagerSkinMaterial, [0.1, 0.34, 0.1], [-0.23, 1.18, 0]);
    addEntityCube(group, villagerSkinMaterial, [0.1, 0.34, 0.1], [0.23, 1.18, 0]);
    addEntityCube(group, villagerSkinMaterial, [0.1, 0.3, 0.1], [-0.1, 0.72, 0]);
    addEntityCube(group, villagerSkinMaterial, [0.1, 0.3, 0.1], [0.1, 0.72, 0]);
    addTexturedEntityCube(group, villagerEntityTexture, [64, 64], [0, 0], [4, 4, 4], [0.1, 0.08, 0.16], [0, 1.45, -0.17]);
  } else {
    const texture = plan.kind === 'pig' ? pigEntityTexture : plan.kind === 'cow' ? cowEntityTexture : sheepEntityTexture;
    const furTexture = plan.kind === 'sheep' ? sheepFurTexture : texture;
    const bodyTextureSize: [number, number, number] = plan.kind === 'pig' ? [8, 8, 12] : [12, 10, 16];
    const bodyOffset: [number, number] = plan.kind === 'pig' ? [28, 8] : [18, 4];
    const headTextureSize: [number, number, number] = plan.kind === 'pig' ? [8, 8, 8] : [8, 8, 6];
    addTexturedEntityCube(group, furTexture, [64, 32], bodyOffset, bodyTextureSize, plan.kind === 'sheep' ? [0.48, 0.34, 0.64] : [0.46, 0.3, 0.64], [0, 0.72, 0]);
    addTexturedEntityCube(group, texture, [64, 32], [0, 0], headTextureSize, plan.kind === 'sheep' ? [0.24, 0.26, 0.26] : [0.26, 0.26, 0.26], [0, 0.79, -0.4]);
    addTexturedEntityCube(group, texture, [64, 32], [0, 0], [4, 4, 4], plan.kind === 'pig' ? [0.18, 0.12, 0.1] : [0.18, 0.12, 0.12], [0, 0.74, -0.56]);
    [-0.17, 0.17].forEach((x) => {
      [-0.18, 0.18].forEach((z) => addEntityCube(group, plan.kind === 'pig' ? villagerSkinMaterial : animalDarkMaterial, [0.08, 0.2, 0.08], [x * 0.82, 0.55, z]));
    });
    [-0.1, 0.1].forEach((x) => addEntityCube(group, plan.kind === 'pig' ? villagerSkinMaterial : animalDarkMaterial, [0.06, 0.08, 0.08], [x, 0.96, -0.39]));
    const tail = addEntityCube(group, plan.kind === 'sheep' ? animalWhiteMaterial : plan.kind === 'pig' ? villagerSkinMaterial : animalBrownMaterial, [0.06, 0.06, 0.16], [0, 0.78, 0.36]);
    tail.rotation.x = Math.PI / 4;
    if (plan.kind === 'cow') {
      [-0.1, 0.1].forEach((x) => addEntityCube(group, animalBrownMaterial, [0.05, 0.1, 0.06], [x, 0.98, -0.39]));
    }
  }

  group.visible = false;
  livingEntityRoot.add(group);
  return { plan, group };
}

function updateLivingWorld(): void {
  const entityTexturesReady = [pigEntityTexture, cowEntityTexture, sheepEntityTexture, sheepFurTexture, villagerEntityTexture]
    .every((texture) => Boolean(texture.image));
  if (!entityTexturesReady) {
    livingEntityRoot.visible = false;
    return;
  }
  livingEntityRoot.visible = true;
  livingEntityRoot.children.forEach((child) => {
    child.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          if (material.userData.disposeWithEntity) {
            (material as THREE.MeshStandardMaterial).map?.dispose();
            material.dispose();
          }
        });
      }
    });
  });
  livingEntityRoot.clear();
  getLivingEntityPlan(state).forEach((plan) => {
    const visual = createLivingEntityVisual(plan);
    visual.group.visible = state.worldRank >= 2;
  });
}

window.addEventListener('idlecraft-asset-loaded', updateLivingWorld);

function updateWorldFloor(): void {
  const visibleNodes = blockNodes.filter((node) => node.mesh.visible);
  if (visibleNodes.length === 0) return;
  const minX = Math.min(...visibleNodes.map((node) => node.coordinate.x));
  const maxX = Math.max(...visibleNodes.map((node) => node.coordinate.x));
  const minZ = Math.min(...visibleNodes.map((node) => node.coordinate.z));
  const maxZ = Math.max(...visibleNodes.map((node) => node.coordinate.z));
  const minY = Math.min(...visibleNodes.map((node) => node.coordinate.y));
  const floorY = (minY - 0.5) * BLOCK_SIZE - 0.06;
  const centerX = (minX + maxX) / 2 * BLOCK_SIZE;
  const centerZ = (minZ + maxZ) / 2 * BLOCK_SIZE;
  const floorWidth = (maxX - minX + 2.4) * BLOCK_SIZE;
  const floorDepth = (maxZ - minZ + 2.4) * BLOCK_SIZE;
  shadowPlane.position.set(centerX, floorY, centerZ);
  shadowPlane.scale.set(floorWidth, floorDepth, 1);
  shadowBase.position.set(centerX, floorY - 0.015, centerZ);
  shadowBase.scale.set(floorWidth + BLOCK_SIZE, floorDepth + BLOCK_SIZE, 1);
}

function updateWorldScene(): void {
  const unlockedSurfaceCells = new Set(getWorldSurfaceCells(state).map((cell) => `${cell.x},${cell.z}`));
  blockNodes.forEach((node) => {
    const directionIndex = node.requiredWorldRank - 2;
    const directionUnlocked = !node.requiredDirection
      || state.expansionDirections[directionIndex] === node.requiredDirection;
    const isAuthoredExpansion = node.requiredDirection !== undefined;
    const surfaceCellUnlocked = unlockedSurfaceCells.has(`${node.coordinate.x},${node.coordinate.z}`);
    const layerUnlocked = node.coordinate.y === 0
      || (state.worldRank >= 2 && node.coordinate.y >= -2)
      || (state.worldRank >= 2 && state.undergroundLayer >= 1 && node.coordinate.y === -3)
      || (state.worldRank >= 2 && state.undergroundLayer >= 2 && node.coordinate.y <= -4);
    node.mesh.visible = isAuthoredExpansion
      ? state.worldRank >= node.requiredWorldRank && directionUnlocked
      : surfaceCellUnlocked && layerUnlocked;
  });
  oreTargets.length = 0;
  oreNodes.forEach((node) => {
    const visible = state.mines.length > 0
      && state.worldRank >= 2
      && state.undergroundLayer >= node.requiredLayer
      && getSkillNodeRank(state, node.requiredSkill) > 0;
    node.mesh.visible = visible;
    if (visible) oreTargets.push(node.mesh);
  });
  updateMeadowScene();
  updateLivingWorld();
  updateWorldFloor();
}

interface MineVisual {
  group: THREE.Group;
  carts: THREE.Mesh[];
}

const mineVisual: MineVisual = { group: new THREE.Group(), carts: [] };
world.add(mineVisual.group);

function createMineVisual(): void {
  const opening = new THREE.Mesh(
    new THREE.BoxGeometry(BLOCK_SIZE * 1.55, BLOCK_SIZE * 1.45, BLOCK_SIZE * 0.14),
    new THREE.MeshBasicMaterial({ color: 0x182329 }),
  );
  opening.position.set(0, BLOCK_SIZE * 0.95, BLOCK_SIZE * 0.82);
  mineVisual.group.add(opening);

  const woodMaterial = new THREE.MeshStandardMaterial({ map: oakLogTexture, roughness: 1 });
  const postGeometry = new THREE.BoxGeometry(BLOCK_SIZE * 0.2, BLOCK_SIZE * 1.25, BLOCK_SIZE * 0.2);
  [-0.72, 0.72].forEach((x) => {
    const post = new THREE.Mesh(postGeometry, woodMaterial);
    post.position.set(x * BLOCK_SIZE, BLOCK_SIZE * 1.05, BLOCK_SIZE * 0.72);
    post.castShadow = true;
    mineVisual.group.add(post);
  });
  const header = new THREE.Mesh(new THREE.BoxGeometry(BLOCK_SIZE * 1.85, BLOCK_SIZE * 0.2, BLOCK_SIZE * 0.22), woodMaterial);
  header.position.set(0, BLOCK_SIZE * 1.7, BLOCK_SIZE * 0.72);
  header.castShadow = true;
  mineVisual.group.add(header);

  const sleeperMaterial = new THREE.MeshStandardMaterial({ color: 0x855235, roughness: 1 });
  const railMaterial = new THREE.MeshStandardMaterial({ map: railTexture, roughness: 0.85 });
  const poweredMaterial = new THREE.MeshStandardMaterial({ map: poweredRailTexture, roughness: 0.85 });
  [-0.2, 0.2].forEach((x) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(BLOCK_SIZE * 0.08, BLOCK_SIZE * 0.045, BLOCK_SIZE * 3.1), railMaterial);
    rail.position.set(x * BLOCK_SIZE, BLOCK_SIZE * 0.51, BLOCK_SIZE * 2.05);
    mineVisual.group.add(rail);
  });
  for (let index = 0; index < 5; index += 1) {
    const sleeper = new THREE.Mesh(new THREE.BoxGeometry(BLOCK_SIZE * 0.78, BLOCK_SIZE * 0.05, BLOCK_SIZE * 0.12), index === 2 ? poweredMaterial : sleeperMaterial);
    sleeper.position.set(0, BLOCK_SIZE * 0.49, BLOCK_SIZE * (0.95 + index * 0.55));
    mineVisual.group.add(sleeper);
  }
  mineVisual.group.position.set(0, 0, 0);
  mineVisual.group.visible = false;
}

createMineVisual();

function syncMineCartMeshes(cartCount: number, storageCarts: number): void {
  const wanted = Math.max(1, cartCount) + storageCarts;
  while (mineVisual.carts.length < wanted) {
    const isStorage = mineVisual.carts.length >= cartCount;
    const cart = new THREE.Mesh(
      new THREE.BoxGeometry(BLOCK_SIZE * 0.48, BLOCK_SIZE * 0.26, BLOCK_SIZE * 0.42),
      new THREE.MeshStandardMaterial({ map: isStorage ? chestMinecartTexture : minecartTexture, roughness: 1 }),
    );
    cart.castShadow = true;
    mineVisual.group.add(cart);
    mineVisual.carts.push(cart);
  }
  mineVisual.carts.forEach((cart, index) => {
    cart.visible = index < wanted;
  });
}

function updateMineVisual(): void {
  const mine: MineSite | undefined = state.mines[0];
  mineVisual.group.visible = Boolean(mine);
  if (!mine) return;
  const direction = mine.direction ?? 'south';
  mineVisual.group.position.set(mine.x * BLOCK_SIZE, 0, mine.z * BLOCK_SIZE);
  mineVisual.group.rotation.y = direction === 'east'
    ? Math.PI / 2
    : direction === 'west'
      ? -Math.PI / 2
      : direction === 'north'
        ? Math.PI
        : 0;
  syncMineCartMeshes(mine.cartCount, mine.storageCarts);
  const tripDuration = getMineTripDuration(state);
  const baseProgress = mine.progressMs / tripDuration;
  const startZ = BLOCK_SIZE * 1.05;
  const endZ = BLOCK_SIZE * 2.85;
  mineVisual.carts.forEach((cart, index) => {
    if (!cart.visible) return;
    const phase = (baseProgress + index * 0.27) % 1;
    const travel = phase < 0.5 ? phase * 2 : 2 - phase * 2;
    cart.position.set((index % 2 === 0 ? -0.2 : 0.2) * BLOCK_SIZE, BLOCK_SIZE * 0.68, startZ + (endZ - startZ) * travel);
    cart.rotation.y = phase < 0.5 ? 0 : Math.PI;
  });
}

const CLOUD_BLOCK_SIZE = BLOCK_SIZE;
const CLOUD_BLOCK_HEIGHT = BLOCK_SIZE;
const viewRight = new THREE.Vector3(1, 0, -1).normalize();
const viewUp = new THREE.Vector3(-1, 2, -1).normalize();
const viewBack = new THREE.Vector3(-1, -1, -1).normalize();

const CLOUD_CELLS: readonly CloudCell[] = [
  [-1, 0, 0],
  [0, 0, 0],
  [1, 0, 0],
];

function createCloud(screenX: number, screenY: number): THREE.Group {
  const cloud = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0xf7fbf4,
    roughness: 1,
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
    side: THREE.FrontSide,
  });
  cloud.add(new THREE.Mesh(createCloudGeometry(CLOUD_CELLS, CLOUD_BLOCK_SIZE, CLOUD_BLOCK_HEIGHT), material));
  cloud.position
    .addScaledVector(viewRight, screenX)
    .addScaledVector(viewUp, screenY)
    .addScaledVector(viewBack, 4);
  scene.add(cloud);
  return cloud;
}

const clouds = [createCloud(-5.5, 4.5), createCloud(5.5, 4.5), createCloud(-4, 7)];

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
// Continuous zoom replaces the old six-step preset list. The very small floor
// keeps the orthographic camera numerically stable while remaining effectively
// unlimited for the world sizes this first game build can reach.
const MIN_ZOOM = 0.005;
const MAX_ZOOM = 2.4;
const ZOOM_STEP = 1.15;
let viewZoom = 0.5;
const heldCameraKeys = new Set<string>();
const PAN_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
let isOrbiting = false;
let lastOrbitX = 0;
let lastOrbitY = 0;
const initialMineResult = advanceMineOperations(state, Date.now());
const offlineXp = initialMineResult.trips > 0 ? initialMineResult.xp : calculateOfflineXp(state);
updateWorldScene();

const levelEl = document.querySelector('#level')!;
const settlementStageEl = document.querySelector('#settlement-stage')!;
const settlementProgressLabelEl = document.querySelector('#settlement-progress-label')!;
const settlementFillEl = document.querySelector<HTMLElement>('#settlement-fill')!;
const totalXpEl = document.querySelector('#total-xp')!;
const autoRateEl = document.querySelector('#auto-rate')!;
const pointsEl = document.querySelector('#upgrade-points')!;
const totalXpCard = totalXpEl.closest<HTMLElement>('.stat-card')!;
const offlineModal = document.querySelector<HTMLDivElement>('#offline-modal')!;
const zoomOutButton = document.querySelector<HTMLButtonElement>('#zoom-out')!;
const zoomInButton = document.querySelector<HTMLButtonElement>('#zoom-in')!;
const zoomLevelEl = document.querySelector('#zoom-level')!;
const constructionStatusEl = document.querySelector<HTMLElement>('#construction-status')!;
const constructionLabelEl = document.querySelector<HTMLElement>('#construction-label')!;
const constructionTimeEl = document.querySelector<HTMLElement>('#construction-time')!;
const constructionFillEl = document.querySelector<HTMLElement>('#construction-fill')!;
const mineStatusEl = document.querySelector<HTMLElement>('#mine-status')!;
const mineLabelEl = document.querySelector<HTMLElement>('#mine-label')!;
const mineRateEl = document.querySelector<HTMLElement>('#mine-rate')!;
const mineFillEl = document.querySelector<HTMLElement>('#mine-fill')!;
const currentToolEl = document.querySelector('#current-tool')!;
const currentToolHintEl = document.querySelector('#current-tool-hint')!;
const mineButton = document.querySelector<HTMLButtonElement>('#mine-button')!;
const mineActionTitleEl = document.querySelector<HTMLElement>('#mine-action-title')!;
const mineActionHintEl = document.querySelector<HTMLElement>('#mine-action-hint')!;
const toolIconGroups = document.querySelectorAll<SVGGElement>('[data-tool-icon]');
const musicVolumeSlider = document.querySelector<HTMLInputElement>('#music-volume-slider')!;
const sfxVolumeSlider = document.querySelector<HTMLInputElement>('#sfx-volume-slider')!;
const musicToggle = document.querySelector<HTMLButtonElement>('#music-toggle')!;
const sfxToggle = document.querySelector<HTMLButtonElement>('#sfx-toggle')!;
const skillTreeButton = document.querySelector<HTMLButtonElement>('#skill-tree-button')!;
const skillTreeOverlay = document.querySelector<HTMLElement>('#skill-tree-overlay')!;
const skillTreeClose = document.querySelector<HTMLButtonElement>('#skill-tree-close')!;
const skillTreeViewport = document.querySelector<HTMLElement>('#skill-tree-viewport')!;
const skillTreeGraph = document.querySelector<HTMLElement>('#skill-tree-graph')!;
const skillTreeSummary = document.querySelector<HTMLElement>('#skill-tree-summary')!;
const skillTreeInspector = document.querySelector<HTMLElement>('#skill-tree-inspector')!;
const skillTreeInspectorImage = document.querySelector<HTMLImageElement>('#skill-tree-inspector-image')!;
const skillTreeInspectorBranch = document.querySelector<HTMLElement>('#skill-tree-inspector-branch')!;
const skillTreeInspectorTitle = document.querySelector<HTMLElement>('#skill-tree-inspector-title')!;
const skillTreeInspectorDescription = document.querySelector<HTMLElement>('#skill-tree-inspector-description')!;
const skillTreeInspectorEffect = document.querySelector<HTMLElement>('#skill-tree-inspector-effect')!;
const skillTreeInspectorConsequence = document.querySelector<HTMLElement>('#skill-tree-inspector-consequence')!;
const skillTreeInspectorPrerequisites = document.querySelector<HTMLElement>('#skill-tree-inspector-prerequisites')!;
const skillTreeInspectorState = document.querySelector<HTMLElement>('#skill-tree-inspector-state')!;
const skillTreeInspectorCost = document.querySelector<HTMLElement>('#skill-tree-inspector-cost')!;
const skillTreeInspectorClose = document.querySelector<HTMLButtonElement>('#skill-tree-inspector-close')!;
const skillTreePurchaseButton = document.querySelector<HTMLButtonElement>('#skill-tree-purchase')!;
const skillTreeZoomOutButton = document.querySelector<HTMLButtonElement>('#skill-tree-zoom-out')!;
const skillTreeZoomInButton = document.querySelector<HTMLButtonElement>('#skill-tree-zoom-in')!;
const skillTreeZoomLevel = document.querySelector<HTMLElement>('#skill-tree-zoom-level')!;
const skillTreeBranchLegend = document.querySelector<HTMLElement>('#skill-tree-branch-legend')!;
let hoveredOre: OreNode | null = null;
let placingMine = false;
let xpFlashTimeout = 0;
const SKILL_TREE_STAGE_SIZE = 1600;
const SKILL_TREE_CENTER = SKILL_TREE_STAGE_SIZE / 2;
const SKILL_TREE_MIN_ZOOM = 0.18;
const SKILL_TREE_MAX_ZOOM = 4;
const SKILL_TREE_ZOOM_STEP = 1.15;
let skillTreeZoom = 0.34;
let skillTreePanX = 0;
let skillTreePanY = 0;
let isPanningSkillTree = false;
let lastSkillTreePanX = 0;
let lastSkillTreePanY = 0;
let selectedSkillNodeId: string | null = null;

if (offlineXp > 0) {
  addXp(state, offlineXp);
  document.querySelector('#offline-xp')!.textContent = `${offlineXp.toLocaleString()} XP`;
  offlineModal.hidden = false;
}

function updateCurrentTool(): void {
  if (hoveredOre) {
    currentToolEl.textContent = 'Bonus Ore';
    currentToolHintEl.textContent = `Click for +1 ${hoveredOre.resource}`;
  } else if (state.mines.length > 0) {
    const mine = state.mines[0];
    currentToolEl.textContent = `${mine.cartCount} Mine Cart${mine.cartCount === 1 ? '' : 's'}`;
    currentToolHintEl.textContent = `${getMineLayer(state) === 0 ? 'Stone' : 'Deepstone'} layer · passive mining`;
  } else {
    currentToolEl.textContent = 'Mine Cart';
    currentToolHintEl.textContent = 'Unlock a mine entrance';
  }
  toolIconGroups.forEach((group) => { group.style.display = 'none'; });
}

function updateAudioUi(): void {
  const settings = audioManager.getSettings();
  musicVolumeSlider.value = String(Math.round(settings.musicVolume * 100));
  sfxVolumeSlider.value = String(Math.round(settings.sfxVolume * 100));
  musicToggle.setAttribute('aria-pressed', String(settings.musicMuted));
  musicToggle.setAttribute('aria-label', settings.musicMuted ? 'Unmute music' : 'Mute music');
  musicToggle.title = settings.musicMuted ? 'Unmute music' : 'Mute music';
  musicToggle.textContent = settings.musicMuted ? '♫̸' : '♫';
  sfxToggle.setAttribute('aria-pressed', String(settings.sfxMuted));
  sfxToggle.setAttribute('aria-label', settings.sfxMuted ? 'Unmute sound effects' : 'Mute sound effects');
  sfxToggle.title = settings.sfxMuted ? 'Unmute sound effects' : 'Mute sound effects';
  sfxToggle.textContent = settings.sfxMuted ? '✦̸' : '✦';
}

function getSkillNodeState(node: SkillNodeDefinition): 'locked' | 'available' | 'ready' | 'maxed' {
  if (getSkillNodeRank(state, node.id) >= node.maxRank) return 'maxed';
  if (!node.prerequisites.every((prerequisite) => getSkillNodeRank(state, prerequisite) > 0)) return 'locked';
  return canAffordSkillNode(state, node) ? 'ready' : 'available';
}

function isSkillNodeVisible(node: SkillNodeDefinition): boolean {
  if (getSkillNodeRank(state, node.id) > 0) return true;
  if (SKILL_TREE_BRANCH_ENTRY_IDS[node.branch] === node.id) return true;
  return node.prerequisites.length > 0
    && node.prerequisites.every((prerequisite) => getSkillNodeRank(state, prerequisite) > 0);
}

function getSkillNodeTitle(id: string): string {
  return SKILL_TREE_NODES.find((node) => node.id === id)?.title ?? id;
}

function setSkillTreeBranchFocus(branchId: string | null): void {
  if (!branchId) {
    skillTreeViewport.classList.remove('has-branch-focus');
    delete skillTreeViewport.dataset.focusedBranch;
    skillTreeGraph.querySelectorAll<HTMLElement>('.is-branch-focused').forEach((element) => {
      element.classList.remove('is-branch-focused');
    });
    return;
  }

  skillTreeViewport.classList.add('has-branch-focus');
  skillTreeViewport.dataset.focusedBranch = branchId;
  skillTreeGraph.querySelectorAll<HTMLElement>('.skill-tree-orb, .skill-tree-edge').forEach((element) => {
    element.classList.toggle('is-branch-focused', element.dataset.branch === branchId);
  });
}

function renderSkillTreeBranchLegend(): void {
  skillTreeBranchLegend.replaceChildren();
  const compactBranchTitles: Record<string, string> = {
    harvesting: 'Harvesting',
    'tools-crafting': 'Tools & Crafting',
    'materials-deep-mining': 'Materials',
    automation: 'Automation',
    'world-growth-biomes': 'World Growth',
    'life-settlement': 'Life & Settlement',
    'mastery-long-term': 'Mastery',
  };
  SKILL_TREE_BRANCHES.forEach((branch) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'skill-tree-branch-tab';
    button.dataset.branch = branch.id;
    button.style.setProperty('--branch-colour', branch.colour);
    button.textContent = compactBranchTitles[branch.id] ?? branch.title;
    button.setAttribute('aria-label', `${branch.title} branch`);
    button.title = branch.title;
    button.addEventListener('pointerenter', () => setSkillTreeBranchFocus(branch.id));
    button.addEventListener('pointerleave', () => setSkillTreeBranchFocus(null));
    button.addEventListener('focus', () => setSkillTreeBranchFocus(branch.id));
    button.addEventListener('blur', () => setSkillTreeBranchFocus(null));
    skillTreeBranchLegend.append(button);
  });
}

function updateSkillTreeView(): void {
  skillTreeGraph.style.transform = `translate(calc(-50% + ${skillTreePanX}px), calc(-50% + ${skillTreePanY}px)) scale(${skillTreeZoom})`;
  skillTreeZoomLevel.textContent = `${Math.round(skillTreeZoom * 100)}%`;
  skillTreeZoomOutButton.disabled = skillTreeZoom <= SKILL_TREE_MIN_ZOOM;
  skillTreeZoomInButton.disabled = skillTreeZoom >= SKILL_TREE_MAX_ZOOM;
}

function fitSkillTreeView(): void {
  const viewportSize = Math.min(skillTreeViewport.clientWidth, skillTreeViewport.clientHeight);
  skillTreeZoom = THREE.MathUtils.clamp((viewportSize - 24) / 1414, SKILL_TREE_MIN_ZOOM, 0.8);
  skillTreePanX = 0;
  skillTreePanY = 0;
  updateSkillTreeView();
}

function changeSkillTreeZoom(direction: number): void {
  const nextZoom = direction > 0
    ? skillTreeZoom * SKILL_TREE_ZOOM_STEP
    : skillTreeZoom / SKILL_TREE_ZOOM_STEP;
  skillTreeZoom = THREE.MathUtils.clamp(nextZoom, SKILL_TREE_MIN_ZOOM, SKILL_TREE_MAX_ZOOM);
  updateSkillTreeView();
}

function renderSkillTree(): void {
  setSkillTreeBranchFocus(null);
  skillTreeGraph.replaceChildren();
  skillTreeInspector.hidden = true;
  skillTreeViewport.classList.remove('has-inspector');
  const purchasedRanks = SKILL_TREE_NODES.reduce((total, node) => total + getSkillNodeRank(state, node.id), 0);
  const discoveredNodes = SKILL_TREE_NODES.filter(isSkillNodeVisible).length;
  skillTreeSummary.textContent = `${discoveredNodes} discovered · ${purchasedRanks} ranks · ${state.craftingPoints} CP · ${state.worldPower} World Power`;

  skillTreeGraph.style.width = `${SKILL_TREE_STAGE_SIZE}px`;
  skillTreeGraph.style.height = `${SKILL_TREE_STAGE_SIZE}px`;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('skill-tree-connections');
  svg.setAttribute('viewBox', `0 0 ${SKILL_TREE_STAGE_SIZE} ${SKILL_TREE_STAGE_SIZE}`);
  svg.setAttribute('aria-hidden', 'true');
  skillTreeGraph.append(svg);

  const positions = new Map<string, { x: number; y: number }>();
  const branchAngles = SKILL_TREE_BRANCHES.map((_, index) => -Math.PI / 2 + index * (Math.PI * 2 / SKILL_TREE_BRANCHES.length));
  const branchById = new Map(SKILL_TREE_BRANCHES.map((branch) => [branch.id, branch]));

  SKILL_TREE_BRANCHES.forEach((branch, branchIndex) => {
    const angle = branchAngles[branchIndex];
    const nodes = getSkillTreeBranch(branch.id);
    const depthById = new Map<string, number>();
    const getBranchDepth = (node: SkillNodeDefinition): number => {
      const cachedDepth = depthById.get(node.id);
      if (cachedDepth !== undefined) return cachedDepth;
      const sameBranchPrerequisites = node.prerequisites
        .map((prerequisiteId) => SKILL_TREE_BY_ID.get(prerequisiteId))
        .filter((prerequisite): prerequisite is SkillNodeDefinition => prerequisite?.branch === branch.id);
      const depth = sameBranchPrerequisites.length > 0
        ? Math.max(...sameBranchPrerequisites.map(getBranchDepth)) + 1
        : 0;
      depthById.set(node.id, depth);
      return depth;
    };
    const nodesByDepth = new Map<number, SkillNodeDefinition[]>();
    nodes.forEach((node) => {
      const depth = getBranchDepth(node);
      const depthNodes = nodesByDepth.get(depth) ?? [];
      depthNodes.push(node);
      nodesByDepth.set(depth, depthNodes);
    });
    nodesByDepth.forEach((depthNodes, depth) => {
      const radius = 220 + depth * 96;
      depthNodes.forEach((node, depthIndex) => {
        const spread = depthNodes.length === 1 ? 0 : (depthIndex - (depthNodes.length - 1) / 2) * 0.17;
        const nodeAngle = angle + spread;
        positions.set(node.id, {
          x: SKILL_TREE_CENTER + Math.cos(nodeAngle) * radius,
          y: SKILL_TREE_CENTER + Math.sin(nodeAngle) * radius,
        });
      });
    });
  });

  const drawEdge = (from: { x: number; y: number }, to: { x: number; y: number }, colour: string, stateName: string, branchId: string) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.classList.add('skill-tree-edge');
    path.dataset.state = stateName;
    path.dataset.branch = branchId;
    path.setAttribute('d', `M ${from.x} ${from.y} L ${to.x} ${to.y}`);
    path.style.setProperty('--branch-colour', colour);
    svg.append(path);
  };

  const core = document.createElement('div');
  core.className = 'skill-tree-core';
  core.style.left = `${SKILL_TREE_CENTER}px`;
  core.style.top = `${SKILL_TREE_CENTER}px`;
  core.innerHTML = '<span class="skill-tree-core-glyph">✦</span><span>WORLD CORE</span>';
  skillTreeGraph.append(core);

  SKILL_TREE_BRANCHES.forEach((branch) => {
    const branchNodes = getSkillTreeBranch(branch.id);
    const firstNode = positions.get(branchNodes[0]?.id ?? '');
    if (firstNode) {
      const branchAngle = branchAngles[SKILL_TREE_BRANCHES.indexOf(branch)];
      drawEdge(
        { x: SKILL_TREE_CENTER + Math.cos(branchAngle) * 78, y: SKILL_TREE_CENTER + Math.sin(branchAngle) * 78 },
        firstNode,
        branch.colour,
        getSkillNodeState(branchNodes[0]),
        branch.id,
      );
    }
  });

  SKILL_TREE_NODES.forEach((node) => {
    if (!isSkillNodeVisible(node)) return;
    const position = positions.get(node.id);
    const branch = branchById.get(node.branch);
    if (!position || !branch) return;
    const stateName = getSkillNodeState(node);
    node.prerequisites.forEach((prerequisiteId) => {
      const prerequisite = SKILL_TREE_BY_ID.get(prerequisiteId);
      // Cross-branch prerequisites remain enforced in the progression model
      // and are listed in the inspector, but do not draw disruptive lines
      // through unrelated branch lanes in the overview graph.
      if (!prerequisite || prerequisite.branch !== node.branch) return;
      const prerequisitePosition = positions.get(prerequisiteId);
      if (prerequisitePosition) drawEdge(prerequisitePosition, position, branch.colour, stateName, branch.id);
    });

    const nodeOrb = document.createElement('button');
    nodeOrb.type = 'button';
    nodeOrb.className = `skill-tree-orb skill-tree-orb--${node.kind}`;
    nodeOrb.dataset.state = stateName;
    nodeOrb.dataset.skillNodeId = node.id;
    nodeOrb.dataset.branch = branch.id;
    nodeOrb.style.left = `${position.x}px`;
    nodeOrb.style.top = `${position.y}px`;
    nodeOrb.style.setProperty('--branch-colour', branch.colour);
    const rank = getSkillNodeRank(state, node.id);
    nodeOrb.setAttribute('aria-label', `${node.title}. ${node.description}. Rank ${rank} of ${node.maxRank}. ${stateName}. Cost ${node.cost.craftingPoints} Crafting Points.`);
    nodeOrb.title = `${node.title} · ${node.effect}${node.prerequisites.length > 0 ? ` · Requires ${node.prerequisites.map(getSkillNodeTitle).join(', ')}` : ''}`;

    const icon = document.createElement('img');
    icon.className = 'skill-tree-orb-icon';
    icon.src = `${import.meta.env.BASE_URL}assets/skill-tree/${getSkillNodeIconName(node)}`;
    icon.alt = '';
    icon.draggable = false;
    const label = document.createElement('span');
    label.className = 'skill-tree-orb-label';
    label.textContent = node.title;
    nodeOrb.append(icon, label);
    nodeOrb.addEventListener('click', () => showSkillNodeDetails(node, branch));
    skillTreeGraph.append(nodeOrb);
  });

  renderSkillTreeBranchLegend();
  updateSkillTreeView();
}

function showSkillNodeDetails(node: SkillNodeDefinition, branch: typeof SKILL_TREE_BRANCHES[number]): void {
  const stateName = getSkillNodeState(node);
  const rank = getSkillNodeRank(state, node.id);
  skillTreeInspectorImage.src = `${import.meta.env.BASE_URL}assets/skill-tree/${getSkillNodeIconName(node)}`;
  skillTreeInspectorBranch.textContent = branch.title;
  skillTreeInspectorTitle.textContent = node.title;
  skillTreeInspectorDescription.textContent = node.description;
  skillTreeInspectorEffect.textContent = `${node.effect} · Rank ${rank}/${node.maxRank}`;
  skillTreeInspectorConsequence.textContent = `World impact: ${node.worldConsequence}`;
  skillTreeInspectorPrerequisites.textContent = node.prerequisites.length > 0
    ? `Requires ${node.prerequisites.map(getSkillNodeTitle).join(' · ')}`
    : 'Starting point for this branch';
  skillTreeInspectorState.textContent = stateName === 'ready' ? 'READY' : stateName.toUpperCase();
  const resourceCost = Object.entries(node.cost.resources).map(([resource, amount]) => `${amount} ${resource}`).join(' · ');
  const worldPowerCost = (node.cost.worldPower ?? 0) > 0 ? `${node.cost.worldPower} World Power` : '';
  skillTreeInspectorCost.textContent = [node.cost.craftingPoints > 0 ? `${node.cost.craftingPoints} CP` : '', resourceCost, worldPowerCost].filter(Boolean).join(' · ') || 'No cost';
  skillTreeInspector.dataset.state = stateName;
  skillTreePurchaseButton.disabled = stateName !== 'ready';
  skillTreePurchaseButton.textContent = stateName === 'ready'
    ? rank > 0 ? `Upgrade Rank ${rank + 1}` : 'Unlock Node'
    : stateName === 'maxed' ? 'Fully Unlocked' : stateName === 'locked' ? 'Requires Previous Nodes' : 'Need More Resources';
  selectedSkillNodeId = node.id;
  skillTreeViewport.classList.add('has-inspector');
  skillTreeInspector.hidden = false;
}

function updateConstructionUi(now = Date.now()): void {
  const project = state.constructionQueue[0];
  if (!project) {
    constructionStatusEl.hidden = true;
    return;
  }
  const duration = Math.max(1, project.completesAt - project.startedAt);
  const elapsed = Math.max(0, Math.min(duration, now - project.startedAt));
  const remainingSeconds = Math.max(0, Math.ceil((project.completesAt - now) / 1000));
  const label = project.kind === 'adjacent-cell'
    ? 'Preparing perimeter'
    : project.kind === 'chunk-upgrade'
      ? `Expanding to ${state.chunkSize + 2}×${state.chunkSize + 2} chunk`
      : 'Expanding chunk';
  constructionLabelEl.textContent = label;
  constructionTimeEl.textContent = now < project.startedAt
    ? `Queued · starts in ${Math.ceil((project.startedAt - now) / 1000)}s`
    : `${remainingSeconds}s remaining`;
  constructionFillEl.style.width = `${elapsed / duration * 100}%`;
  constructionStatusEl.hidden = false;
}

function updateMineUi(): void {
  const mine = state.mines[0];
  if (!mine) {
    const available = state.availableMineSites > 0;
    mineStatusEl.hidden = !available && state.mines.length === 0;
    mineLabelEl.textContent = available ? 'Free mine blueprint ready' : 'Mine entrance locked';
    mineRateEl.textContent = available ? 'Place beside a path' : 'Unlock another mine';
    mineFillEl.style.width = '0%';
    mineButton.disabled = !available;
    mineActionTitleEl.textContent = placingMine ? 'CHOOSE MINE SITE' : 'PLACE FREE MINE';
    mineActionHintEl.textContent = placingMine ? 'Click a path-side plot' : 'Click to choose a location';
    mineButton.classList.toggle('is-placement-mode', placingMine);
    currentToolHintEl.textContent = available ? 'Place your free mine beside a path' : 'Unlock a mine entrance';
    updateMineVisual();
    return;
  }
  const tripDuration = getMineTripDuration(state);
  const cartCount = getMineCartCount(state);
  const tripsPerMinute = cartCount * 60_000 / tripDuration;
  mineStatusEl.hidden = false;
  mineLabelEl.textContent = `${cartCount} cart${cartCount === 1 ? '' : 's'} · ${getMineLayer(state) === 0 ? 'Stone Layer' : 'Deepstone Layer'}`;
  mineRateEl.textContent = `${tripsPerMinute.toFixed(1)} trips/min`;
  mineFillEl.style.width = `${Math.min(100, mine.progressMs / tripDuration * 100)}%`;
  mineButton.disabled = false;
  mineActionTitleEl.textContent = 'DISPATCH CART';
  mineActionHintEl.textContent = 'Click or press SPACE';
  mineButton.classList.remove('is-placement-mode');
  updateMineVisual();
}

function purchaseSelectedSkillNode(): void {
  if (!selectedSkillNodeId) return;
  const node = SKILL_TREE_NODES.find((entry) => entry.id === selectedSkillNodeId);
  if (!node || !buySkillNode(state, node.id)) return;
  updateWorldScene();
  updateUi();
  saveState(localStorage, state);
  renderSkillTree();
  const branch = SKILL_TREE_BRANCHES.find((entry) => entry.id === node.branch);
  if (branch) showSkillNodeDetails(node, branch);
}

function updateUi(): void {
  const rate = state.mines.length > 0 ? getMineCartCount(state) * 1000 / getMineTripDuration(state) : 0;
  const settlementStage = getSettlementStage(state);
  const nextSettlementStage = getNextSettlementStage(state);
  levelEl.textContent = String(state.level);
  settlementStageEl.textContent = settlementStage.name;
  if (nextSettlementStage) {
    settlementProgressLabelEl.textContent = `${state.settlementProgress.toLocaleString()} / ${nextSettlementStage.requiredProgress.toLocaleString()} Growth`;
    const stageSpan = Math.max(1, nextSettlementStage.requiredProgress - settlementStage.requiredProgress);
    const stageProgress = Math.max(0, state.settlementProgress - settlementStage.requiredProgress);
    settlementFillEl.style.width = `${Math.min(100, stageProgress / stageSpan * 100)}%`;
  } else {
    settlementProgressLabelEl.textContent = `${state.settlementProgress.toLocaleString()} Growth`;
    settlementFillEl.style.width = '100%';
  }
  totalXpEl.textContent = state.totalXp.toLocaleString();
  autoRateEl.textContent = rate.toFixed(2);
  pointsEl.textContent = `${state.craftingPoints} CP`;
  updateCurrentTool();
  updateConstructionUi();
  updateMineUi();
}

function updateConstructionState(now: number): void {
  const completed = completeConstructionProjects(state, now);
  if (completed.length > 0) {
    updateWorldScene();
    updateUi();
    saveState(localStorage, state);
  }
  updateConstructionUi(now);
  updateMineUi();
}

function flashXpCard(): void {
  totalXpCard.classList.remove('is-gaining');
  void totalXpCard.offsetWidth;
  totalXpCard.classList.add('is-gaining');
  window.clearTimeout(xpFlashTimeout);
  xpFlashTimeout = window.setTimeout(() => totalXpCard.classList.remove('is-gaining'), 480);
}

function getOreAtPointer(event: PointerEvent): OreNode | null {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(oreTargets, false)[0];
  return hit ? oreByMesh.get(hit.object) ?? null : null;
}

function getMinePlacementAtPointer(event: PointerEvent): { x: number; z: number; direction: WorldDirection } | null {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const surfaceMeshes = blockNodes.filter((node) => node.mesh.visible && node.coordinate.y === 0).map((node) => node.mesh);
  const hit = raycaster.intersectObjects(surfaceMeshes, false)[0];
  if (!hit) return null;
  const x = Math.round(hit.point.x / BLOCK_SIZE);
  const z = Math.round(hit.point.z / BLOCK_SIZE);
  const directions: WorldDirection[] = ['south', 'east', 'north', 'west'];
  const direction = directions.find((candidate) => canPlaceMine(state, x, z, candidate));
  return direction ? { x, z, direction } : null;
}

function setHoveredOre(nextOre: OreNode | null): void {
  if (nextOre === hoveredOre) return;
  hoveredOre = nextOre;
  updateCurrentTool();
}

function collectOreNode(node: OreNode): void {
  if (!node.mesh.visible) return;
  collectOreBonus(state, node.resource);
  node.pulse = 1;
  audioManager.playMiningSound('stone');
  flashXpCard();
  const levelUps = addXp(state, 1);
  if (levelUps > 0) {
    document.body.classList.add('level-up');
    window.setTimeout(() => document.body.classList.remove('level-up'), 900);
  }
  updateUi();
  saveState(localStorage, state);
}

function dispatchCart(): void {
  const result = dispatchMineCart(state);
  if (result.trips <= 0) return;
  addXp(state, result.xp);
  flashXpCard();
  audioManager.playMiningSound('stone');
  updateUi();
  saveState(localStorage, state);
}

function beginOrbit(event: PointerEvent): void {
  event.preventDefault();
  isOrbiting = true;
  lastOrbitX = event.clientX;
  lastOrbitY = event.clientY;
  canvas.classList.add('is-orbiting');
  try {
    canvas.setPointerCapture(event.pointerId);
  } catch {
    // Synthetic pointer events used by some browsers do not have a capture target.
  }
}

function updateHoverTarget(event: PointerEvent): void {
  setHoveredOre(getOreAtPointer(event));
}

canvas.addEventListener('pointerdown', (event) => {
  if (event.button === 0) {
    if (placingMine) {
      const placement = getMinePlacementAtPointer(event);
      if (placement && unlockStarterMine(state, Date.now(), placement.x, placement.z, placement.direction)) {
        placingMine = false;
        canvas.classList.remove('is-placing-mine');
        updateWorldScene();
        updateUi();
        saveState(localStorage, state);
      }
      return;
    }
    const ore = hoveredOre ?? getOreAtPointer(event);
    if (ore) {
      setHoveredOre(ore);
      collectOreNode(ore);
    } else {
      beginOrbit(event);
    }
    return;
  }
  if (event.button === 1) beginOrbit(event);
});
canvas.addEventListener('pointermove', (event) => {
  if (!isOrbiting) {
    updateHoverTarget(event);
    return;
  }
  const deltaX = event.clientX - lastOrbitX;
  const deltaY = event.clientY - lastOrbitY;
  lastOrbitX = event.clientX;
  lastOrbitY = event.clientY;
  orbitYaw += deltaX * 0.008;
  orbitPitch = THREE.MathUtils.clamp(orbitPitch + deltaY * 0.006, 0.18, 1.35);
  updateCameraTransform();
});
canvas.addEventListener('pointerenter', updateHoverTarget);
canvas.addEventListener('pointerleave', () => {
  setHoveredOre(null);
});
function endOrbit(event: PointerEvent): void {
  if (!isOrbiting) return;
  isOrbiting = false;
  try {
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  } catch {
    // See the pointerdown note above.
  }
  canvas.classList.remove('is-orbiting');
  updateHoverTarget(event);
}
canvas.addEventListener('pointerup', endOrbit);
canvas.addEventListener('pointercancel', endOrbit);
canvas.addEventListener('contextmenu', (event) => event.preventDefault());

function setSkillTreeOpen(open: boolean): void {
  skillTreeOverlay.hidden = !open;
  skillTreeButton.setAttribute('aria-expanded', String(open));
  if (open) {
    renderSkillTree();
    fitSkillTreeView();
    skillTreeClose.focus();
  }
  else skillTreeButton.focus();
}

skillTreeButton.addEventListener('click', () => setSkillTreeOpen(true));
skillTreeClose.addEventListener('click', () => setSkillTreeOpen(false));
skillTreeOverlay.addEventListener('click', (event) => {
  if (event.target === skillTreeOverlay) setSkillTreeOpen(false);
});

skillTreeZoomOutButton.addEventListener('click', () => changeSkillTreeZoom(-1));
skillTreeZoomInButton.addEventListener('click', () => changeSkillTreeZoom(1));
skillTreeInspectorClose.addEventListener('click', () => {
  skillTreeInspector.hidden = true;
  skillTreeViewport.classList.remove('has-inspector');
  selectedSkillNodeId = null;
});
skillTreePurchaseButton.addEventListener('click', purchaseSelectedSkillNode);
skillTreeViewport.addEventListener('wheel', (event) => {
  event.preventDefault();
  changeSkillTreeZoom(event.deltaY < 0 ? 1 : -1);
}, { passive: false });
skillTreeViewport.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 && event.button !== 1) return;
  if ((event.target as Element).closest('.skill-tree-orb, .skill-tree-inspector')) return;
  event.preventDefault();
  isPanningSkillTree = true;
  lastSkillTreePanX = event.clientX;
  lastSkillTreePanY = event.clientY;
  skillTreeViewport.classList.add('is-panning');
  skillTreeViewport.setPointerCapture(event.pointerId);
});
skillTreeViewport.addEventListener('pointermove', (event) => {
  if (!isPanningSkillTree) return;
  skillTreePanX += event.clientX - lastSkillTreePanX;
  skillTreePanY += event.clientY - lastSkillTreePanY;
  lastSkillTreePanX = event.clientX;
  lastSkillTreePanY = event.clientY;
  updateSkillTreeView();
});
function endSkillTreePan(event: PointerEvent): void {
  if (!isPanningSkillTree) return;
  isPanningSkillTree = false;
  skillTreeViewport.classList.remove('is-panning');
  if (skillTreeViewport.hasPointerCapture(event.pointerId)) skillTreeViewport.releasePointerCapture(event.pointerId);
}
skillTreeViewport.addEventListener('pointerup', endSkillTreePan);
skillTreeViewport.addEventListener('pointercancel', endSkillTreePan);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !skillTreeOverlay.hidden) setSkillTreeOpen(false);
});

mineButton.addEventListener('click', () => {
  if (state.mines.length === 0 && state.availableMineSites > 0) {
    placingMine = !placingMine;
    canvas.classList.toggle('is-placing-mine', placingMine);
    updateUi();
    return;
  }
  dispatchCart();
});
musicVolumeSlider.addEventListener('input', () => audioManager.setMusicVolume(Number(musicVolumeSlider.value) / 100));
sfxVolumeSlider.addEventListener('input', () => audioManager.setSfxVolume(Number(sfxVolumeSlider.value) / 100));
musicToggle.addEventListener('click', () => {
  audioManager.toggleMusic();
  updateAudioUi();
});
sfxToggle.addEventListener('click', () => {
  audioManager.toggleSfx();
  updateAudioUi();
});
document.addEventListener('keydown', (event) => {
  if (event.code === 'Space' && !event.repeat) {
    event.preventDefault();
    dispatchCart();
  }
  if (PAN_KEYS.has(event.code)) {
    event.preventDefault();
    heldCameraKeys.add(event.code);
  }
});
document.addEventListener('keyup', (event) => heldCameraKeys.delete(event.code));
window.addEventListener('blur', () => heldCameraKeys.clear());

document.querySelector('#offline-close')!.addEventListener('click', () => {
  offlineModal.hidden = true;
});

document.querySelector('#reset-button')!.addEventListener('click', () => {
  if (window.confirm('Reset all IdleCraft progress?')) {
    isResetting = true;
    localStorage.removeItem(SAVE_KEY);
    window.location.reload();
  }
});

function updateViewControls(): void {
  camera.zoom = viewZoom;
  camera.updateProjectionMatrix();
  zoomLevelEl.textContent = `${Math.round(viewZoom * 100)}%`;
  zoomOutButton.disabled = viewZoom <= MIN_ZOOM;
  zoomInButton.disabled = viewZoom >= MAX_ZOOM;
}

function changeZoom(direction: number): void {
  const nextZoom = direction > 0 ? viewZoom * ZOOM_STEP : viewZoom / ZOOM_STEP;
  viewZoom = THREE.MathUtils.clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
  updateViewControls();
}

zoomOutButton.addEventListener('click', () => changeZoom(-1));
zoomInButton.addEventListener('click', () => changeZoom(1));
canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  changeZoom(event.deltaY < 0 ? 1 : -1);
}, { passive: false });

function resize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  const aspect = width / height;
  const viewHeight = width < 700 ? 9.6 : width < 900 ? 10.4 : 8.4;
  camera.left = -viewHeight * aspect / 2;
  camera.right = viewHeight * aspect / 2;
  camera.top = viewHeight / 2;
  camera.bottom = -viewHeight / 2;
  updateViewControls();
}

window.addEventListener('resize', resize);
window.addEventListener('beforeunload', () => {
  if (!isResetting) saveState(localStorage, state);
});
window.setInterval(() => saveState(localStorage, state), 5000);
resize();
updateUi();
updateAudioUi();

const clock = new THREE.Clock();
function updateCameraPan(delta: number): void {
  let x = 0;
  let z = 0;
  if (heldCameraKeys.has('KeyA') || heldCameraKeys.has('ArrowLeft')) x -= 1;
  if (heldCameraKeys.has('KeyD') || heldCameraKeys.has('ArrowRight')) x += 1;
  if (heldCameraKeys.has('KeyW') || heldCameraKeys.has('ArrowUp')) z -= 1;
  if (heldCameraKeys.has('KeyS') || heldCameraKeys.has('ArrowDown')) z += 1;
  if (x === 0 && z === 0) return;
  const length = Math.hypot(x, z);
  const panSpeed = 3.5 / Math.max(viewZoom, 0.12);
  cameraTarget.x += x / length * panSpeed * delta;
  cameraTarget.z += z / length * panSpeed * delta;
  updateCameraTransform();
}

function render(_now: number): void {
  const delta = Math.min(clock.getDelta(), 0.05);
  updateCameraPan(delta);
  const wallClockNow = Date.now();
  updateConstructionState(wallClockNow);
  const mineResult = advanceMineOperations(state, wallClockNow);
  if (mineResult.trips > 0) {
    addXp(state, mineResult.xp);
    flashXpCard();
    audioManager.playMiningSound('stone');
    updateUi();
    saveState(localStorage, state);
  }
  oreNodes.forEach((node) => {
    node.pulse = Math.max(0, node.pulse - delta * 4);
    const pulse = Math.sin(node.pulse * Math.PI);
    node.mesh.scale.setScalar(1 + pulse * 0.28);
  });
  clouds.forEach((cloud, index) => {
    cloud.position.x += delta * (0.045 + index * 0.012);
    if (cloud.position.x > 6) cloud.position.x = -6;
  });
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}
requestAnimationFrame(render);
