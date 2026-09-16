import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import './style.css';
import { AudioManager } from './audio';
import {
  SAVE_KEY,
  DEFAULT_MINE_RAIL_LENGTH,
  DIRT_PATH_BUILD_COST,
  MINE_RAIL_LENGTHS,
  addXp,
  advanceMineOperations,
  buyMineStorageUpgrade,
  buyMineUpgrade,
  buildPathCell,
  buySkillNode,
  canBuildPathCell,
  canMovePathCell,
  canMoveWorldPlacement,
  canPlaceMine,
  canAffordSkillNode,
  calculateOfflineXp,
  completeConstructionProjects,
  CONSTRUCTION_DURATIONS_MS,
  collectOreBonus,
  dispatchMineCart,
  destroyPathCell,
  destroyWorldPlacement,
  getExpansionChunkOrigin,
  getChunkBounds,
  getMineFootprint,
  getMineRailPathConnection,
  getMineCartCount,
  getMineUpgradeCost,
  getMineUpgradeDefinition,
  getMineUpgradeRank,
  getAvailableMineSites,
  getBuildItemUnlockStatus,
  getMineSiteCapacity,
  getMineLayer,
  getMineStorageCapacity,
  getMineStorageFillDuration,
  getMineStorageFillState,
  getMineStorageUpgradeCost,
  getMineTripDuration,
  getActiveBuilderCount,
  addSettlementResource,
  getBuilderSlotCount,
  getAvailableBuilderSlots,
  getSettlementStorageCapacity,
  getSettlementStorageUpgradeStatus,
  getStoredResourceTotal,
  getSettlementHubUpgrade,
  getSettlementHubUpgradeStatus,
  getSettlementStageIndex,
  getLivingEntityPlan,
  getMineCargoKind,
  getMeadowFeaturePlan,
  getNextPathTier,
  getNextSettlementStage,
  getSettlementNextGoal,
  getSettlementStage,
  getWorldSurfaceCells,
  getSkillNodeRank,
  isTraderUnlocked,
  movePathCell,
  moveWorldPlacement,
  queueSettlementHubUpgrade,
  queueSettlementStorageUpgrade,
  // debugUnlockFullSkillTree,
  loadState,
  saveState as saveLocalState,
  PATH_TIERS,
  unlockStarterMine,
  upgradePathCell,
  WORLD_DIRECTIONS,
  type BlockType,
  type BuildItemId,
  type LivingEntityPlan,
  type MineCargoKind,
  type MineRailLength,
  type MineStorageFillState,
  type MineUpgradeId,
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
import { playerSaveSync } from './player-save';

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
const hasLocalSave = localStorage.getItem(SAVE_KEY) !== null;
let state = loadState(localStorage);
const audioManager = new AudioManager();
let isResetting = false;

function saveState(storage: Storage, currentState: typeof state, now = Date.now()): void {
  saveLocalState(storage, currentState, now);
  if (storage === localStorage && currentState === state) playerSaveSync.queue(currentState);
}

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

interface PathPlacementPreview {
  x: number;
  z: number;
  valid: boolean;
  upgrade: boolean;
}

function getPathMaterial(tier: PathCell['tier']): THREE.Material {
  return tier === 'cobblestone' ? cobblestoneMaterial : tier === 'stone' ? stoneMaterial : pathMaterial;
}

function createPathVisual(cell: PathCell): PathVisual {
  const group = new THREE.Group();
  group.position.set(cell.x * BLOCK_SIZE, 0, cell.z * BLOCK_SIZE);
  meadowFeatureRoot.add(group);
  const surface = addFeatureCube(group, getPathMaterial(cell.tier), [1, 0.05, 1], [0, 0.49, 0]);
  return { cell, group, surface };
}

const pathVisuals = state.pathCells.map(createPathVisual);
const pathGhostGroup = new THREE.Group();
const pathGhostMaterial = new THREE.MeshStandardMaterial({
  color: 0x78c56d,
  transparent: true,
  opacity: 0.58,
  depthWrite: false,
  emissive: 0x315b39,
  emissiveIntensity: 0.4,
});
addFeatureCube(pathGhostGroup, pathGhostMaterial, [1, 0.06, 1], [0, 0.52, 0]);
pathGhostGroup.visible = false;
meadowFeatureRoot.add(pathGhostGroup);

function ensurePathVisual(cell: PathCell): void {
  if (pathVisuals.some((visual) => visual.cell.x === cell.x && visual.cell.z === cell.z)) return;
  pathVisuals.push(createPathVisual(cell));
}

function updatePathGhostVisual(preview: PathPlacementPreview | null): void {
  const visible = (buildMode === 'path' || buildMode === 'path-upgrade') && Boolean(preview);
  pathGhostGroup.visible = visible;
  if (!visible || !preview) return;
  pathGhostGroup.position.set(preview.x * BLOCK_SIZE, 0, preview.z * BLOCK_SIZE);
  const colour = preview.valid
    ? preview.upgrade ? 0x8fb7df : 0x78c56d
    : 0xd56256;
  pathGhostMaterial.color.setHex(colour);
  pathGhostMaterial.emissive.setHex(preview.valid ? preview.upgrade ? 0x274861 : 0x315b39 : 0x5f2020);
}

function updateMeadowScene(): void {
  // The old authored 3×3 feature layout is intentionally retired. Structures,
  // farms, wells, and entities will return through the placement model so they
  // cannot silently overlap one another or clip across chunk boundaries.
  meadowFeatureVisuals.forEach((visual) => { visual.group.visible = false; });
  state.pathCells.forEach(ensurePathVisual);
  const visibleSurfaceCells = new Set(getWorldSurfaceCells(state).map((cell) => `${cell.x},${cell.z}`));
  pathVisuals.forEach((visual) => {
    const currentCell = state.pathCells.find((cell) => cell.x === visual.cell.x && cell.z === visual.cell.z)
      ?? state.pathCells.find((cell) => cell === visual.cell);
    if (currentCell && currentCell !== visual.cell) {
      visual.cell = currentCell;
      visual.group.position.set(currentCell.x * BLOCK_SIZE, 0, currentCell.z * BLOCK_SIZE);
    }
    visual.surface.material = getPathMaterial(currentCell?.tier ?? visual.cell.tier);
    visual.group.visible = Boolean(currentCell && visibleSurfaceCells.has(`${currentCell.x},${currentCell.z}`));
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
    visual.group.visible = getSettlementStageIndex(state) >= 2;
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
  carts: THREE.Group[];
  ghost: boolean;
  pathConnector: THREE.Group;
  storage: THREE.Group;
  storageVisualKey?: string;
  railSegments: THREE.Group[];
  cargoKind: MineCargoKind | null;
}

let railStraightTemplate: THREE.Group | null = null;
let railEndTemplate: THREE.Group | null = null;
let mineEntranceTemplate: THREE.Group | null = null;
let cartEmptyTemplate: THREE.Group | null = null;
let cartContentsTemplate: THREE.Group | null = null;

interface MinePlacementPreview {
  x: number;
  z: number;
  direction: WorldDirection;
  railLength: MineRailLength;
  valid: boolean;
}

function makeMineVisual(ghost = false): MineVisual {
  return {
    group: new THREE.Group(),
    carts: [],
    ghost,
    pathConnector: new THREE.Group(),
    storage: new THREE.Group(),
    railSegments: [],
    cargoKind: null,
  };
}

const mineVisual = makeMineVisual();
const mineVisuals = new Map<string, MineVisual>();
const mineGhostVisual: MineVisual = makeMineVisual(true);
world.add(mineVisual.group, mineGhostVisual.group);

function createMineMaterial(
  colour: number,
  map: THREE.Texture | undefined,
  ghost: boolean,
): THREE.MeshStandardMaterial {
  const parameters: THREE.MeshStandardMaterialParameters = {
    color: ghost ? 0x78c56d : colour,
    roughness: 0.92,
    transparent: ghost,
    opacity: ghost ? 0.5 : 1,
    depthWrite: !ghost,
    emissive: ghost ? 0x315b39 : 0x000000,
    emissiveIntensity: ghost ? 0.25 : 0,
  };
  if (!ghost && map) parameters.map = map;
  return new THREE.MeshStandardMaterial(parameters);
}

function addMinePart(
  parent: THREE.Group,
  material: THREE.Material,
  size: [number, number, number],
  position: [number, number, number],
  rotation: [number, number, number] = [0, 0, 0],
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size[0] * BLOCK_SIZE, size[1] * BLOCK_SIZE, size[2] * BLOCK_SIZE),
    material,
  );
  mesh.position.set(position[0] * BLOCK_SIZE, position[1] * BLOCK_SIZE, position[2] * BLOCK_SIZE);
  mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  const ghost = Boolean(parent.userData.isGhost);
  mesh.castShadow = !ghost;
  mesh.receiveShadow = !ghost;
  parent.add(mesh);
  return mesh;
}

const mineCargoColors: Record<MineCargoKind, number> = {
  stone: 0x7c8587,
  coal: 0x303638,
  iron: 0xd6b8a4,
  gold: 0xf2c14d,
  diamond: 0x71e4f1,
};

const mineStorageOrePositions: ReadonlyArray<[number, number, number, number]> = [
  [-0.09, 0.28, -0.1, 0.18],
  [0.02, 0.29, -0.08, -0.24],
  [0.09, 0.28, 0.02, 0.12],
  [-0.03, 0.3, 0.09, 0.36],
];

function createMineStorageVisual(
  fillState: MineStorageFillState,
  cargoKind: MineCargoKind,
  ghost: boolean,
): THREE.Group {
  const storage = new THREE.Group();
  storage.userData.isGhost = ghost;
  storage.userData.isMineStorage = true;
  // Keep the temporary box centered on the Rail End/path block. The authored
  // Mine Storage model can replace this group later without changing its slot.
  storage.position.set(0, 0, 0);

  const woodMaterial = createMineMaterial(0x71472c, oakPlanksTexture, ghost);
  const darkWoodMaterial = createMineMaterial(0x3e281d, darkOakPlanksTexture, ghost);
  addMinePart(storage, darkWoodMaterial, [0.42, 0.08, 0.34], [0, 0.04, 0]);
  addMinePart(storage, woodMaterial, [0.06, 0.28, 0.38], [-0.22, 0.16, 0]);
  addMinePart(storage, woodMaterial, [0.06, 0.28, 0.38], [0.22, 0.16, 0]);
  addMinePart(storage, woodMaterial, [0.38, 0.28, 0.06], [0, 0.16, -0.16]);
  addMinePart(storage, woodMaterial, [0.38, 0.28, 0.06], [0, 0.16, 0.16]);
  addMinePart(storage, darkWoodMaterial, [0.48, 0.06, 0.06], [0, 0.3, -0.19]);
  addMinePart(storage, darkWoodMaterial, [0.48, 0.06, 0.06], [0, 0.3, 0.19]);

  const oreCount = fillState === 'empty' ? 0 : fillState === 'low' ? 2 : fillState === 'medium' ? 3 : 4;
  if (oreCount > 0) {
    const oreMaterial = createMineMaterial(
      mineCargoColors[cargoKind],
      cargoKind === 'stone' ? undefined : oreTextures[cargoKind],
      ghost,
    );
    mineStorageOrePositions.slice(0, oreCount).forEach(([x, y, z, rotation]) => {
      const ore = new THREE.Mesh(new THREE.DodecahedronGeometry(BLOCK_SIZE * 0.055, 0), oreMaterial);
      ore.position.set(x * BLOCK_SIZE, y * BLOCK_SIZE, z * BLOCK_SIZE);
      ore.rotation.set(rotation, rotation * 0.7, rotation * 1.2);
      ore.castShadow = !ghost;
      storage.add(ore);
    });
  }
  return storage;
}

function disposeObjectResources(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
    meshMaterials.forEach((material) => materials.add(material));
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

function updateMineStorageVisual(visual: MineVisual, mine: MineSite): void {
  const capacity = getMineStorageCapacity(mine);
  const fillState = getMineStorageFillState(mine.storageAmount, capacity);
  const cargoKind = getMineCargoKind(state);
  const storageVisualKey = `${fillState}:${cargoKind}:${visual.ghost}`;
  if (visual.storageVisualKey !== storageVisualKey) {
    visual.storage.children.forEach(disposeObjectResources);
    visual.storage.clear();
    visual.storage.add(createMineStorageVisual(fillState, cargoKind, visual.ghost));
    visual.storageVisualKey = storageVisualKey;
  }
  visual.storage.userData.storageState = fillState;
  visual.storage.userData.storageAmount = mine.storageAmount;
  visual.storage.userData.storageCapacity = capacity;
  visual.storage.visible = !visual.ghost;
}

function createMineCargoVisual(kind: MineCargoKind, ghost: boolean): THREE.Group {
  const cargo = new THREE.Group();
  cargo.userData.isGhost = ghost;
  cargo.userData.isMineCargo = true;
  cargo.visible = !ghost;

  if (cartContentsTemplate) {
    const authoredContents = prepareAuthoredModel(cartContentsTemplate, ghost);
    // cart-contents-1.glb shares the cart's bottom-centered origin. Keep it
    // inside the cart and let the rock accents emerge from its upper half.
    authoredContents.position.set(0, BLOCK_SIZE * 0.5, 0);
    cargo.add(authoredContents);
  }

  const rockMaterial = createMineMaterial(0x6c7678, undefined, ghost);
  const rockPositions: Array<[number, number, number, number]> = [
    [-0.1, 0.86, -0.12, 0.18],
    [0.03, 0.85, -0.1, -0.24],
    [0.1, 0.86, 0.02, 0.12],
    [-0.04, 0.87, 0.1, 0.36],
    [0.07, 0.85, 0.13, -0.1],
  ];
  rockPositions.forEach(([x, y, z, rotation]) => {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(BLOCK_SIZE * 0.07, 0), rockMaterial);
    rock.position.set(x * BLOCK_SIZE, y * BLOCK_SIZE, z * BLOCK_SIZE);
    rock.rotation.set(rotation, rotation * 0.7, rotation * 1.2);
    rock.castShadow = !ghost;
    cargo.add(rock);
  });
  if (kind !== 'stone') {
    const oreMaterial = new THREE.MeshStandardMaterial({
      color: mineCargoColors[kind],
      emissive: kind === 'diamond' ? 0x124f59 : 0x000000,
      emissiveIntensity: kind === 'diamond' ? 0.35 : 0,
      map: oreTextures[kind],
      roughness: 0.72,
      transparent: ghost,
      opacity: ghost ? 0.5 : 1,
      depthWrite: !ghost,
    });
    [[-0.08, 0.9, -0.06], [0.06, 0.89, 0.08]].forEach(([x, y, z], index) => {
      const ore = new THREE.Mesh(
        new THREE.BoxGeometry(BLOCK_SIZE * 0.07, BLOCK_SIZE * 0.08, BLOCK_SIZE * 0.07),
        oreMaterial,
      );
      ore.position.set(x * BLOCK_SIZE, y * BLOCK_SIZE, z * BLOCK_SIZE);
      ore.rotation.set(0.18 * index, -0.24, 0.12);
      ore.castShadow = !ghost;
      cargo.add(ore);
    });
  }
  return cargo;
}

function createMineCartBody(ghost: boolean, storage: boolean): THREE.Group {
  const body = new THREE.Group();
  body.userData.isGhost = ghost;
  body.userData.isMineCartBody = true;

  if (cartEmptyTemplate) {
    const authoredCart = prepareAuthoredModel(cartEmptyTemplate, ghost);
    // cart-empty.glb uses a bottom-centered origin. Place that origin on the
    // turf surface, level with the authored rail modules.
    authoredCart.position.set(0, BLOCK_SIZE * 0.5, 0);
    body.add(authoredCart);
  } else {
    createProceduralMineCartBody(body, ghost, storage);
  }

  if (storage) {
    const woodMaterial = createMineMaterial(0x95643b, oakPlanksTexture, ghost);
    addMinePart(body, woodMaterial, [0.46, 0.22, 0.48], [0, 1.05, 0]);
  }
  return body;
}

function createProceduralMineCartBody(body: THREE.Group, ghost: boolean, storage: boolean): void {
  const bodyMaterial = createMineMaterial(storage ? 0x9f7951 : 0xb8c0c0, undefined, ghost);
  const darkMaterial = createMineMaterial(0x182126, undefined, ghost);
  const wheelMaterial = createMineMaterial(0x20282b, undefined, ghost);
  addMinePart(body, bodyMaterial, [0.62, 0.3, 0.68], [0, 0.72, 0]);
  addMinePart(body, darkMaterial, [0.46, 0.05, 0.5], [0, 0.9, 0]);
  addMinePart(body, bodyMaterial, [0.68, 0.08, 0.08], [0, 0.94, -0.3]);
  addMinePart(body, bodyMaterial, [0.68, 0.08, 0.08], [0, 0.94, 0.3]);
  addMinePart(body, bodyMaterial, [0.08, 0.08, 0.52], [-0.3, 0.94, 0]);
  addMinePart(body, bodyMaterial, [0.08, 0.08, 0.52], [0.3, 0.94, 0]);

  [-0.3, 0.3].forEach((x) => {
    [-0.2, 0.2].forEach((z) => {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(BLOCK_SIZE * 0.09, BLOCK_SIZE * 0.09, BLOCK_SIZE * 0.08, 8),
        wheelMaterial,
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x * BLOCK_SIZE, BLOCK_SIZE * 0.49, z * BLOCK_SIZE);
      wheel.castShadow = !ghost;
      body.add(wheel);
    });
  });
}

function createMineCartVisual(ghost: boolean, storage: boolean, cargoKind: MineCargoKind | null): THREE.Group {
  const cart = new THREE.Group();
  cart.userData.isGhost = ghost;
  cart.userData.cargoKind = cargoKind;
  cart.userData.isStorageCart = storage;
  cart.add(createMineCartBody(ghost, storage));
  if (!storage && cargoKind) cart.add(createMineCargoVisual(cargoKind, ghost));
  return cart;
}

function prepareAuthoredModel(template: THREE.Group, ghost: boolean): THREE.Group {
  const model = template.clone(true);
  // The authored GLB is modeled in one Blender unit per block. Keep its
  // bottom-centered origin on the turf while matching the game's 0.9-unit
  // block grid so a module never spills into the neighboring block.
  model.scale.setScalar(BLOCK_SIZE);
  model.userData.isGhost = ghost;
  model.traverse((object) => {
    // GLTFLoader keeps the authored scene hierarchy intact. Explicitly make
    // every exported object visible so a hidden Blender node cannot make the
    // in-game model appear to be only a fragment.
    object.visible = true;
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = !ghost;
    object.receiveShadow = !ghost;
    if (!ghost) return;
    const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material];
    const ghostMaterials = sourceMaterials.map((sourceMaterial) => {
      const material = sourceMaterial.clone();
      if (material instanceof THREE.MeshStandardMaterial) {
        material.map = null;
        material.color.set(0x78c56d);
        material.emissive.set(0x315b39);
        material.emissiveIntensity = 0.25;
        material.transparent = true;
        material.opacity = 0.5;
        material.depthWrite = false;
      }
      return material;
    });
    object.material = Array.isArray(object.material) ? ghostMaterials : ghostMaterials[0];
  });
  return model;
}

function placeAuthoredModelOnBlock(model: THREE.Group): void {
  // MineEntrance.glb is authored with its origin at the bottom-center of the
  // one-block module. Keep that origin exact so the entrance's built-in rails
  // line up with the first external rail module without a bounds-based shift.
  // World cubes are centered at y=0, so their top face is half a block above
  // the mine group's origin.
  model.position.set(0, BLOCK_SIZE * 0.5, 0);
}

function createRailModelInstance(ghost: boolean): THREE.Group | null {
  if (!railStraightTemplate) return null;
  return prepareAuthoredModel(railStraightTemplate, ghost);
}

function installRailModel(parent: THREE.Group, ghost: boolean): void {
  parent.clear();
  const straight = createRailModelInstance(ghost);
  if (straight) parent.add(straight);
  parent.userData.railModelKind = 'straight';
}

function installRailEndModel(parent: THREE.Group, ghost: boolean): void {
  parent.clear();
  if (!railEndTemplate) return;
  const railEnd = prepareAuthoredModel(railEndTemplate, ghost);
  // The Rail End faces the opposite way in its authored file. Rotating it
  // makes its near edge meet the last regular rail on the neighboring block.
  railEnd.rotation.y = Math.PI;
  parent.add(railEnd);
  parent.userData.railModelKind = 'end-only';
}

function extractAuthoredModel(scene: THREE.Group, objectName: string): THREE.Group {
  const model = new THREE.Group();
  const authoredObject = scene.getObjectByName(objectName);
  if (authoredObject) model.add(authoredObject.clone(true));
  return model;
}

function installMineEntranceModel(visual: MineVisual): void {
  if (!mineEntranceTemplate) return;
  visual.group.children
    .filter((child) => child.userData.isMineEntrance)
    .forEach((child) => visual.group.remove(child));
  const entrance = prepareAuthoredModel(mineEntranceTemplate, visual.ghost);
  // MineEntrance.glb is authored facing the opposite direction from the
  // mine's forward rail, so apply the required local 180-degree correction.
  entrance.rotation.set(0, Math.PI, 0);
  // The authored entrance is presented as the opposite-handed side in the
  // game view. Mirror it across its local width before placing it on the tile.
  entrance.scale.x *= -1;
  placeAuthoredModelOnBlock(entrance);
  entrance.userData.isMineEntrance = true;
  visual.group.add(entrance);
}

function createMineVisual(visual: MineVisual): void {
  visual.group.userData.isGhost = visual.ghost;
  for (let index = 0; index < 4; index += 1) {
    const segment = new THREE.Group();
    segment.userData.isGhost = visual.ghost;
    if (railStraightTemplate) installRailModel(segment, visual.ghost);
    segment.position.z = (MINE_RAIL_START_Z + index * MINE_RAIL_SPACING) * BLOCK_SIZE;
    segment.position.y = BLOCK_SIZE * 0.5;
    segment.visible = false;
    visual.group.add(segment);
    visual.railSegments.push(segment);
  }
  visual.pathConnector.userData.isGhost = visual.ghost;
  const forwardConnector = new THREE.Group();
  forwardConnector.userData.connectorDirection = 'forward';
  if (railEndTemplate) installRailEndModel(forwardConnector, visual.ghost);
  visual.pathConnector.add(forwardConnector);
  visual.storage.userData.isGhost = visual.ghost;
  visual.pathConnector.add(visual.storage);
  visual.group.add(visual.pathConnector);
  visual.pathConnector.visible = false;
  visual.group.position.set(0, 0, 0);
  visual.group.visible = false;
  installMineEntranceModel(visual);
}

const MINE_RAIL_START_Z = 0;
const MINE_RAIL_SPACING = 1;

function getMineRailCenterZ(index: number): number {
  return MINE_RAIL_START_Z + index * MINE_RAIL_SPACING;
}

createMineVisual(mineVisual);
createMineVisual(mineGhostVisual);

function refreshAuthoredMineModels(): void {
  const visuals = [mineVisual, mineGhostVisual, ...mineVisuals.values()];
  visuals.forEach((visual) => {
    installMineEntranceModel(visual);
    visual.railSegments.forEach((segment) => installRailModel(segment, visual.ghost));
    const connector = visual.pathConnector.children[0];
    if (connector instanceof THREE.Group && railEndTemplate) installRailEndModel(connector, visual.ghost);
  });
  updateMineVisual();
}

function refreshMineCartModels(): void {
  const visuals = [mineVisual, mineGhostVisual, ...mineVisuals.values()];
  visuals.forEach((visual) => {
    visual.carts.forEach((cart) => {
      const previousBody = cart.children.find((child) => child.userData.isMineCartBody);
      if (previousBody) cart.remove(previousBody);
      cart.add(createMineCartBody(visual.ghost, Boolean(cart.userData.isStorageCart)));
      const previousCargo = cart.children.find((child) => child.userData.isMineCargo);
      if (previousCargo) cart.remove(previousCargo);
      const cargoKind = cart.userData.cargoKind as MineCargoKind | null;
      if (!cart.userData.isStorageCart && cargoKind) {
        cart.add(createMineCargoVisual(cargoKind, visual.ghost));
      }
    });
  });
  updateMineVisual();
}

const authoredModelLoader = new GLTFLoader();
const authoredModelBase = `${import.meta.env.BASE_URL}assets/models/`;
authoredModelLoader.load(`${authoredModelBase}rail-straight.glb`, (gltf) => {
  railStraightTemplate = gltf.scene;
  refreshAuthoredMineModels();
}, undefined, () => console.warn('Villagers - Idle World Game: rail-straight.glb could not be loaded.'));
authoredModelLoader.load(`${authoredModelBase}rail-end.glb`, (gltf) => {
  // The exported Blender scene also contains the mine, cart, straight rail,
  // and a floor plane. Use only the named Rail End object in this slot.
  railEndTemplate = extractAuthoredModel(gltf.scene, 'rail-end');
  refreshAuthoredMineModels();
}, undefined, () => console.warn('Villagers - Idle World Game: rail-end.glb could not be loaded.'));
authoredModelLoader.load(`${authoredModelBase}cart-empty.glb`, (gltf) => {
  cartEmptyTemplate = extractAuthoredModel(gltf.scene, 'cartEmpty');
  refreshMineCartModels();
}, undefined, () => console.warn('Villagers - Idle World Game: cart-empty.glb could not be loaded.'));
authoredModelLoader.load(`${authoredModelBase}cart-contents-1.glb`, (gltf) => {
  cartContentsTemplate = extractAuthoredModel(gltf.scene, 'cartContents');
  refreshMineCartModels();
}, undefined, () => console.warn('Villagers - Idle World Game: cart-contents-1.glb could not be loaded.'));
authoredModelLoader.load(`${authoredModelBase}MineEntrance.glb`, (gltf) => {
  mineEntranceTemplate = gltf.scene;
  refreshAuthoredMineModels();
}, undefined, () => console.warn('Villagers - Idle World Game: MineEntrance.glb could not be loaded.'));

function syncMineCartMeshes(visual: MineVisual): void {
  // There is exactly one physical cart per mine. Storage upgrades affect the
  // box capacity, not the number of carts rendered on the route.
  const wanted = 1;
  const cargoKind = visual.ghost ? 'stone' : getMineCargoKind(state);
  if (visual.cargoKind !== cargoKind) {
    visual.carts.forEach((cart) => visual.group.remove(cart));
    visual.carts = [];
    visual.cargoKind = cargoKind;
  }
  while (visual.carts.length < wanted) {
    const cart = createMineCartVisual(visual.ghost, false, cargoKind);
    visual.group.add(cart);
    visual.carts.push(cart);
  }
  visual.carts.forEach((cart, index) => {
    cart.visible = index < wanted;
  });
}

function setMineGhostValid(valid: boolean): void {
  mineGhostVisual.group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      if (!(material instanceof THREE.MeshStandardMaterial)) return;
      material.color.set(valid ? 0x79c56d : 0xd86c62);
      material.emissive.set(valid ? 0x315b39 : 0x6b2c2c);
    });
  });
}

function setMineRotation(group: THREE.Group, direction: WorldDirection): void {
  group.rotation.y = direction === 'east'
    ? Math.PI / 2
    : direction === 'west'
      ? -Math.PI / 2
      : direction === 'north'
        ? Math.PI
        : 0;
}

function getMinePathConnection(
  x: number,
  z: number,
  direction: WorldDirection,
  railLength: MineRailLength,
): { index: number } | null {
  const connection = getMineRailPathConnection(state, x, z, direction, railLength);
  return connection ? { index: connection.railIndex } : null;
}

function updateMinePathConnector(
  visual: MineVisual,
  x: number,
  z: number,
  direction: WorldDirection,
  railLength: MineRailLength,
): void {
  const connection = getMinePathConnection(x, z, direction, railLength);
  visual.pathConnector.visible = Boolean(connection);
  if (!connection) return;
  const terminalZ = getMineRailCenterZ(connection.index);
  // Center the Rail End on the neighboring path block. Its rotated near edge
  // is authored to meet the final regular rail without adding a path rail.
  visual.pathConnector.position.set(
    0,
    BLOCK_SIZE * 0.5,
    (terminalZ + 1) * BLOCK_SIZE,
  );
  visual.pathConnector.rotation.y = 0;
}

function updateMineRailLength(
  visual: MineVisual,
  x: number,
  z: number,
  direction: WorldDirection,
  railLength: MineRailLength,
): number {
  const connection = getMinePathConnection(x, z, direction, railLength);
  const connectionIndex = connection?.index ?? railLength - 1;
  visual.railSegments.forEach((segment, index) => {
    const expectedModelKind = 'straight';
    if (segment.userData.railModelKind !== expectedModelKind) {
      installRailModel(segment, visual.ghost);
    }
    // The MineEntrance GLB includes the rail module on its own tile. Start
    // the separate modular rail assets on the next tile so they do not stack
    // underneath the entrance.
    segment.visible = index > 0 && index < railLength && index <= connectionIndex;
  });
  return connectionIndex;
}

function setMineCartCargoVisible(cart: THREE.Group, visible: boolean): void {
  const cargo = cart.children.find((child) => child.userData.isMineCargo);
  if (cargo) cargo.visible = visible;
}

function isMineAnimationPaused(mineId: string): boolean {
  return (selectedMoveItem?.kind === 'mine' && selectedMoveItem.id === mineId)
    || (pendingDestroyItem?.kind === 'mine' && pendingDestroyItem.id === mineId);
}

function updateMineCartAnimation(visual: MineVisual, mine: MineSite, connectionIndex: number, now = Date.now()): void {
  if (isMineAnimationPaused(mine.id)) return;
  const tripDuration = getMineTripDuration(state);
  // Mine production is intentionally simulated on a slower cadence to reduce
  // CPU and save churn. Project that state forward for the visual only so the
  // cart continues moving continuously between simulation ticks.
  const projectedProgressMs = mine.progressMs + Math.max(0, now - mine.lastUpdatedAt);
  const baseProgress = (projectedProgressMs % tripDuration) / tripDuration;
  const startZ = BLOCK_SIZE * getMineRailCenterZ(connectionIndex);
  const endZ = BLOCK_SIZE * getMineRailCenterZ(0);
  visual.carts.forEach((cart, index) => {
    if (!cart.visible) return;
    const phase = (baseProgress + index * 0.27) % 1;
    const travellingToMine = phase < 0.5;
    const travel = travellingToMine ? phase * 2 : 1 - (phase - 0.5) * 2;
    const lane = mine.cartCount > 1 ? (index % 2 === 0 ? -0.2 : 0.2) : 0;
    cart.position.set(lane * BLOCK_SIZE, 0, startZ + (endZ - startZ) * travel);
    cart.rotation.y = travellingToMine ? Math.PI : 0;
    setMineCartCargoVisible(cart, phase >= 0.5);
  });
}

function updateSingleMineVisual(visual: MineVisual, mine: MineSite): void {
  visual.group.visible = true;
  visual.group.userData.placementId = mine.id;
  mine.cartCount = 1;
  mine.storageCarts = 0;
  const direction = mine.direction ?? 'south';
  const railLength = mine.railLength ?? DEFAULT_MINE_RAIL_LENGTH;
  visual.group.position.set(mine.x * BLOCK_SIZE, 0, mine.z * BLOCK_SIZE);
  setMineRotation(visual.group, direction);
  updateMinePathConnector(visual, mine.x, mine.z, direction, railLength);
  updateMineStorageVisual(visual, mine);
  const connectionIndex = updateMineRailLength(visual, mine.x, mine.z, direction, railLength);
  syncMineCartMeshes(visual);
  const isMovePreview = selectedMoveItem?.kind === 'mine' && selectedMoveItem.id === mine.id;
  const isDestroyPreview = pendingDestroyItem?.kind === 'mine' && pendingDestroyItem.id === mine.id;
  if (isMovePreview && moveHoverCell) {
    // Keep the selected mine at the last valid placement cell after any
    // routine UI/model refresh. The underlying state remains at the source
    // cell until the player confirms the move.
    visual.group.position.set(moveHoverCell.x * BLOCK_SIZE, 0, moveHoverCell.z * BLOCK_SIZE);
  }
  if (isMovePreview || isDestroyPreview) return;
  updateMineCartAnimation(visual, mine, connectionIndex);
}

function restoreActionVisual(mesh: THREE.Mesh): void {
  const original = mesh.userData.actionOriginalMaterial as THREE.Material | THREE.Material[] | undefined;
  if (!original) return;
  const current = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  current.forEach((material) => {
    if (material !== original && !Array.isArray(original)) material.dispose();
    if (Array.isArray(original) && !original.includes(material)) material.dispose();
  });
  mesh.material = original;
  delete mesh.userData.actionOriginalMaterial;
  delete mesh.userData.actionVisualMode;
}

function setActionVisual(root: THREE.Object3D, mode: ActionVisualMode): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const currentMode = object.userData.actionVisualMode as ActionVisualMode | undefined;
    if (currentMode === mode) return;
    restoreActionVisual(object);
    if (mode === 'none') return;

    const original = object.material;
    const sourceMaterials = Array.isArray(original) ? original : [original];
    const ghost = mode === 'move' || mode === 'move-invalid' || mode === 'destroy';
    const isRedGhost = mode === 'move-invalid' || mode === 'destroy';
    const colour = isRedGhost ? 0xd85c55 : mode === 'move' ? 0xf0d833 : 0xf4c95d;
    const opacity = mode === 'hover' ? 0.88 : 0.58;
    const highlighted = sourceMaterials.map((source) => {
      const material = source.clone();
      material.userData.actionClone = true;
      if ('color' in material && material.color instanceof THREE.Color) material.color.setHex(colour);
      if (material instanceof THREE.MeshStandardMaterial) {
        material.emissive.setHex(isRedGhost ? 0x6c1717 : mode === 'move' ? 0x8b7900 : 0x785c12);
        material.emissiveIntensity = ghost ? 0.32 : 0.16;
        if (ghost) material.map = null;
      }
      material.transparent = true;
      material.opacity = opacity;
      material.depthWrite = false;
      return material;
    });
    object.userData.actionOriginalMaterial = original;
    object.userData.actionVisualMode = mode;
    object.material = Array.isArray(original) ? highlighted : highlighted[0];
  });
}

function samePlacedItem(a: PlacedItemTarget | null, b: PlacedItemTarget | null): boolean {
  if (!a || !b || a.kind !== b.kind) return false;
  return a.kind === 'mine'
    ? a.id === (b as Extract<PlacedItemTarget, { kind: 'mine' }>).id
    : a.x === (b as Extract<PlacedItemTarget, { kind: 'path' }>).x && a.z === (b as Extract<PlacedItemTarget, { kind: 'path' }>).z;
}

function syncPlacementActionVisuals(): void {
  const movePreviewValid = selectedMoveItem && moveHoverCell
    ? selectedMoveItem.kind === 'mine'
      ? canMoveWorldPlacement(state, selectedMoveItem.id, moveHoverCell.x, moveHoverCell.z)
      : canMovePathCell(state, selectedMoveItem.x, selectedMoveItem.z, moveHoverCell.x, moveHoverCell.z)
    : false;
  const modeFor = (target: PlacedItemTarget): ActionVisualMode => {
    if (pendingDestroyItem && samePlacedItem(pendingDestroyItem, target)) return 'destroy';
    if (selectedMoveItem && samePlacedItem(selectedMoveItem, target)) return movePreviewValid ? 'move' : 'move-invalid';
    if (hoveredPlacedItem && samePlacedItem(hoveredPlacedItem, target)) return 'hover';
    return 'none';
  };

  mineVisuals.forEach((visual, id) => setActionVisual(visual.group, modeFor({ kind: 'mine', id })));
  pathVisuals.forEach((visual) => {
    const target = { kind: 'path', x: visual.cell.x, z: visual.cell.z } as const;
    setActionVisual(visual.surface, modeFor(target));
    const preview = selectedMoveItem?.kind === 'path' && samePlacedItem(selectedMoveItem, target) ? moveHoverCell : null;
    const x = preview?.x ?? visual.cell.x;
    const z = preview?.z ?? visual.cell.z;
    visual.group.position.set(x * BLOCK_SIZE, 0, z * BLOCK_SIZE);
  });

  const selectedMine = selectedMoveItem?.kind === 'mine' ? selectedMoveItem : null;
  if (selectedMine) {
    const visual = mineVisuals.get(selectedMine.id);
    const mine = state.mines.find((candidate) => candidate.id === selectedMine.id);
    const x = moveHoverCell?.x ?? mine?.x;
    const z = moveHoverCell?.z ?? mine?.z;
    if (visual && x !== undefined && z !== undefined) visual.group.position.set(x * BLOCK_SIZE, 0, z * BLOCK_SIZE);
  }
}

function updateMineVisual(): void {
  const activeIds = new Set(state.mines.map((mine) => mine.id));
  state.mines.forEach((mine, index) => {
    let visual = mineVisuals.get(mine.id);
    if (!visual) {
      visual = index === 0 && !Array.from(mineVisuals.values()).includes(mineVisual)
        ? mineVisual
        : makeMineVisual();
      if (visual === mineVisual) world.add(mineVisual.group);
      else world.add(visual.group);
      if (visual !== mineVisual) createMineVisual(visual);
      mineVisuals.set(mine.id, visual);
    }
    updateSingleMineVisual(visual, mine);
  });
  mineVisuals.forEach((visual, id) => {
    if (!activeIds.has(id)) visual.group.visible = false;
  });
}

function updateMineCartAnimations(now = Date.now()): void {
  state.mines.forEach((mine) => {
    const visual = mineVisuals.get(mine.id);
    if (!visual || !visual.group.visible) return;
    const direction = mine.direction ?? 'south';
    const railLength = mine.railLength ?? DEFAULT_MINE_RAIL_LENGTH;
    const connectionIndex = getMinePathConnection(mine.x, mine.z, direction, railLength)?.index ?? railLength - 1;
    updateMineCartAnimation(visual, mine, connectionIndex, now);
  });
}

function updateMineGhostVisual(preview: MinePlacementPreview | null): void {
  const visible = buildMode === 'mine' && getAvailableMineSites(state) > 0 && Boolean(preview);
  mineGhostVisual.group.visible = visible;
  if (!visible || !preview) return;
  mineGhostVisual.group.position.set(preview.x * BLOCK_SIZE, 0, preview.z * BLOCK_SIZE);
  setMineRotation(mineGhostVisual.group, preview.direction);
  updateMinePathConnector(mineGhostVisual, preview.x, preview.z, preview.direction, preview.railLength);
  mineGhostVisual.storage.visible = false;
  const connectionIndex = updateMineRailLength(mineGhostVisual, preview.x, preview.z, preview.direction, preview.railLength);
  syncMineCartMeshes(mineGhostVisual);
  mineGhostVisual.carts[0].position.set(
    0,
    0,
    BLOCK_SIZE * getMineRailCenterZ(connectionIndex),
  );
  mineGhostVisual.carts[0].rotation.y = 0;
  setMineCartCargoVisible(mineGhostVisual.carts[0], false);
  setMineGhostValid(preview.valid);
}

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
const builderCountEl = document.querySelector('#builder-count')!;
const settlementFillEl = document.querySelector<HTMLElement>('#settlement-fill')!;
const settlementHubButton = document.querySelector<HTMLButtonElement>('#settlement-hub-button')!;
const settlementHubTitle = document.querySelector<HTMLElement>('#settlement-hub-title')!;
const settlementHubDescription = document.querySelector<HTMLElement>('#settlement-hub-description')!;
const settlementHubStage = document.querySelector<HTMLElement>('#settlement-hub-stage')!;
const settlementHubNextStage = document.querySelector<HTMLElement>('#settlement-hub-next-stage')!;
const settlementHubRequirements = document.querySelector<HTMLElement>('#settlement-hub-requirements')!;
const settlementHubUpgradeButton = document.querySelector<HTMLButtonElement>('#settlement-hub-upgrade')!;
const settlementHubStatus = document.querySelector<HTMLElement>('#settlement-hub-status')!;
const nextGoalTitleEl = document.querySelector<HTMLElement>('#next-goal-title')!;
const nextGoalDetailEl = document.querySelector<HTMLElement>('#next-goal-detail')!;
const totalXpEl = document.querySelector('#total-xp')!;
const resourceEmeraldEl = document.querySelector('#resource-emerald')!;
const resourceDiamondEl = document.querySelector('#resource-diamond')!;
const resourceGoldEl = document.querySelector('#resource-gold')!;
const resourceStorageEl = document.querySelector('#resource-storage')!;
const resourceModalEmeraldEl = document.querySelector('#resource-modal-emerald')!;
const resourceModalDiamondEl = document.querySelector('#resource-modal-diamond')!;
const resourceModalGoldEl = document.querySelector('#resource-modal-gold')!;
const resourceModalCobblestoneEl = document.querySelector('#resource-modal-cobblestone')!;
const resourceModalStorageEl = document.querySelector('#resource-modal-storage')!;
const resourceXpFillEl = document.querySelector<HTMLElement>('#resource-xp-fill')!;
const resourceEmeraldFillEl = document.querySelector<HTMLElement>('#resource-emerald-fill')!;
const resourceDiamondFillEl = document.querySelector<HTMLElement>('#resource-diamond-fill')!;
const resourceGoldFillEl = document.querySelector<HTMLElement>('#resource-gold-fill')!;
const autoRateEl = document.querySelector('#auto-rate')!;
const pointsEl = document.querySelector('#upgrade-points')!;
const totalXpCard = totalXpEl.closest<HTMLElement>('.resource-brief')!;
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
const pathButton = document.querySelector<HTMLButtonElement>('#path-button')!;
const pathUpgradeButton = document.querySelector<HTMLButtonElement>('#path-upgrade-button')!;
const buildStatusEl = document.querySelector<HTMLElement>('#build-status')!;
const buildDrawer = document.querySelector<HTMLElement>('#build-drawer')!;
const actualToggle = document.querySelector<HTMLButtonElement>('#actual-toggle')!;
const buildBackButton = document.querySelector<HTMLButtonElement>('#build-back-button')!;
const buildCategoryButtons = document.querySelectorAll<HTMLButtonElement>('[data-build-category]');
const buildActionButtons = document.querySelectorAll<HTMLButtonElement>('[data-build-action]');
const buildCategoryItemButtons = document.querySelectorAll<HTMLButtonElement>('[data-build-item]');
const toolIconGroups = document.querySelectorAll<SVGGElement>('[data-tool-icon]');
const musicVolumeSlider = document.querySelector<HTMLInputElement>('#music-volume-slider')!;
const sfxVolumeSlider = document.querySelector<HTMLInputElement>('#sfx-volume-slider')!;
const musicToggle = document.querySelector<HTMLButtonElement>('#music-toggle')!;
const sfxToggle = document.querySelector<HTMLButtonElement>('#sfx-toggle')!;
const skillTreeButton = document.querySelector<HTMLButtonElement>('#skill-tree-button')!;
const skillTreePointsLabel = document.querySelector<HTMLElement>('#skill-tree-points-label');
const miningMenuRate = document.querySelector<HTMLElement>('#mining-menu-rate');
const miningDrawer = document.querySelector<HTMLElement>('#mining-drawer')!;
const miningActualToggle = document.querySelector<HTMLButtonElement>('#mining-actual-toggle')!;
const miningCategoryButtons = document.querySelectorAll<HTMLButtonElement>('[data-mining-category]');
const miningMineList = document.querySelector<HTMLElement>('#mining-mine-list')!;
const miningStorageList = document.querySelector<HTMLElement>('#mining-storage-list')!;
const railUpgradeStatus = document.querySelector<HTMLElement>('#rail-upgrade-status')!;
const storageUpgradeStatus = document.querySelector<HTMLElement>('#storage-upgrade-status')!;
const miningUpgradeButtons = document.querySelectorAll<HTMLButtonElement>('[data-mining-upgrade]');
const app = document.querySelector<HTMLElement>('#app')!;
const buildModeToggle = document.querySelector<HTMLElement>('#build-mode-toggle')!;
const miningModeToggle = document.querySelector<HTMLElement>('#mining-mode-toggle')!;
const resourcesButton = document.querySelector<HTMLButtonElement>('#resources-button')!;
const tradingButton = document.querySelector<HTMLButtonElement>('#trading-button')!;
const traderEmeraldButton = document.querySelector<HTMLButtonElement>('#trader-emerald-button')!;
const traderEmeraldStatus = document.querySelector<HTMLElement>('#trader-emerald-status')!;
const storyButton = document.querySelector<HTMLButtonElement>('#story-button')!;
const placementDestroyModal = document.querySelector<HTMLElement>('#placement-destroy-modal')!;
const placementDestroyTitle = document.querySelector<HTMLElement>('#placement-destroy-title')!;
const placementDestroyMessage = document.querySelector<HTMLElement>('#placement-destroy-message')!;
const placementDestroyCancel = document.querySelector<HTMLButtonElement>('#placement-destroy-cancel')!;
const placementDestroyConfirm = document.querySelector<HTMLButtonElement>('#placement-destroy-confirm')!;
const pauseMenuButton = document.querySelector<HTMLButtonElement>('#pause-menu-button')!;
const resumeButton = document.querySelector<HTMLButtonElement>('#resume-button')!;
// Debug Menu temporarily disabled. Keep the wiring commented out for later.
// const debugMenuButton = document.querySelector<HTMLButtonElement>('#debug-menu-button')!;
// const debugUnlockSkillTreeButton = document.querySelector<HTMLButtonElement>('#debug-unlock-skill-tree')!;
// const debugStatus = document.querySelector<HTMLElement>('#debug-status')!;
const storyStageLabel = document.querySelector<HTMLElement>('#story-stage-label');
const worldModals = document.querySelectorAll<HTMLElement>('.world-modal');
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
type BuildMode = 'mine' | 'path' | 'path-upgrade' | null;
type BuildAction = 'move' | 'destroy' | null;
type PlacedItemTarget = { kind: 'mine'; id: string } | { kind: 'path'; x: number; z: number };
type ActionVisualMode = 'none' | 'hover' | 'move' | 'move-invalid' | 'destroy';
type BuildDrawerCategory = 'root' | 'mining' | 'paths' | 'farm' | 'smithing' | 'houses' | 'animals' | 'science';
type BuildDrawerView = 'categories' | 'items';
type MiningDrawerCategory = 'mines' | 'rails' | 'storage';
let buildMode: BuildMode = null;
let buildAction: BuildAction = null;
let selectedMoveItem: PlacedItemTarget | null = null;
let hoveredPlacedItem: PlacedItemTarget | null = null;
let pendingDestroyItem: PlacedItemTarget | null = null;
let moveHoverCell: { x: number; z: number } | null = null;
let buildDrawerCategory: BuildDrawerCategory = 'root';
let buildDrawerView: BuildDrawerView = 'categories';
let miningDrawerCategory: MiningDrawerCategory = 'mines';
let miningDrawerView: BuildDrawerView = 'categories';
let minePlacementPreview: MinePlacementPreview | null = null;
let pathPlacementPreview: PathPlacementPreview | null = null;
let selectedMineRailLength: MineRailLength = DEFAULT_MINE_RAIL_LENGTH;
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
type DrawerKind = 'build' | 'mining' | null;
let activeDrawer: DrawerKind = null;
const TRADER_EMERALD_COST = 25;

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
  const duration = Math.max(1, project.completesAt - project.startedAt || project.durationMs || CONSTRUCTION_DURATIONS_MS[project.kind]);
  const elapsed = project.builderId ? Math.max(0, Math.min(duration, now - project.startedAt)) : 0;
  const remainingSeconds = project.builderId ? Math.max(0, Math.ceil((project.completesAt - now) / 1000)) : 0;
  let label = project.targetKind === 'hub'
    ? 'Upgrading Settlement Hub'
    : project.targetKind === 'storage'
      ? 'Upgrading Settlement Storage'
    : project.kind === 'adjacent-cell'
    ? 'Preparing perimeter'
    : project.kind === 'chunk-upgrade'
      ? `Expanding to ${state.chunkSize + 2}×${state.chunkSize + 2} chunk`
      : 'Expanding chunk';
  const targetPlacement = project.targetKind === 'building'
    ? state.placements.find((placement) => placement.id === project.targetId)
    : undefined;
  if (targetPlacement) label = `${project.action === 'upgrade' ? 'Upgrading' : 'Building'} ${targetPlacement.kind.replace('-', ' ')}`;
  constructionLabelEl.textContent = label;
  constructionTimeEl.textContent = !project.builderId
    ? 'Queued - waiting for builder'
    : now < project.startedAt
    ? `Queued · starts in ${Math.ceil((project.startedAt - now) / 1000)}s`
    : `${remainingSeconds}s remaining`;
  constructionFillEl.style.width = `${elapsed / duration * 100}%`;
  constructionStatusEl.hidden = false;
}

function updateMineUi(): void {
  const mine = state.mines[0];
  const placingMine = buildMode === 'mine';
  const availableMineSites = getAvailableMineSites(state);
  if (!mine) {
    const available = availableMineSites > 0;
    mineStatusEl.hidden = !available && state.mines.length === 0;
    mineLabelEl.textContent = available ? 'Free mine blueprint ready' : 'Mine entrance locked';
    const railLabel = selectedMineRailLength === 4 ? 'Long' : selectedMineRailLength === 3 ? 'Medium' : 'Short';
    mineRateEl.textContent = placingMine ? `Green preview = ${railLabel.toLowerCase()} straight path connection` : available ? 'Attach rail end to a path' : 'Unlock another mine';
    mineFillEl.style.width = '0%';
    mineButton.disabled = !available;
    mineButton.title = placingMine ? `${railLabel} rail auto-selected · click the world to place` : 'Place free mine';
    mineButton.classList.toggle('is-placement-mode', placingMine);
    currentToolHintEl.textContent = placingMine ? `Preview a ${railLabel.toLowerCase()} rail run · length auto-selected` : available ? 'Place your free mine rail directly into a path' : 'Unlock a mine entrance';
    updateMineVisual();
    return;
  }
  const tripDuration = getMineTripDuration(state);
  const cartCount = getMineCartCount(state);
  const tripsPerMinute = cartCount * 60_000 / tripDuration;
  mineStatusEl.hidden = false;
  const railLabel = mine.railLength === 4 ? 'Long' : mine.railLength === 3 ? 'Medium' : 'Short';
  mineLabelEl.textContent = `${state.mines.length}/${getMineSiteCapacity(state)} mine${getMineSiteCapacity(state) === 1 ? '' : 's'} · ${cartCount} cart${cartCount === 1 ? '' : 's'} · ${railLabel} rail`;
  mineRateEl.textContent = `${tripsPerMinute.toFixed(1)} trips/min${availableMineSites > 0 ? ` · ${availableMineSites} slot${availableMineSites === 1 ? '' : 's'} ready` : ''}`;
  mineFillEl.style.width = `${Math.min(100, mine.progressMs / tripDuration * 100)}%`;
  mineButton.disabled = false;
  mineButton.title = 'Dispatch cart';
  mineButton.classList.remove('is-placement-mode');
  updateMineVisual();
}

function updateBuildUi(): void {
  syncBuildModeDrawer();
  document.querySelectorAll<HTMLButtonElement>('[data-rail-length]').forEach((button) => {
    button.disabled = buildMode !== 'mine';
    button.setAttribute('aria-pressed', String(Number(button.dataset.railLength) === (buildMode === 'mine' ? selectedMineRailLength : state.mines[0]?.railLength ?? selectedMineRailLength)));
  });
  const dirt = state.resources.dirt ?? 0;
  pathButton.classList.toggle('is-placement-mode', buildMode === 'path');
  pathUpgradeButton.classList.toggle('is-placement-mode', buildMode === 'path-upgrade');
  mineButton.classList.toggle('is-placement-mode', buildMode === 'mine');
  pathButton.setAttribute('aria-pressed', String(buildMode === 'path'));
  pathUpgradeButton.setAttribute('aria-pressed', String(buildMode === 'path-upgrade'));
  mineButton.setAttribute('aria-pressed', String(buildMode === 'mine'));
  buildDrawer.dataset.category = buildDrawerCategory;
  buildBackButton.hidden = false;
  const buildCategoryItems: Partial<Record<Exclude<BuildDrawerCategory, 'root'>, BuildItemId>> = {
    mining: 'mine',
    paths: 'path',
    farm: 'farm',
    smithing: 'smithing',
    houses: 'houses',
    animals: 'animals',
  };
  buildCategoryButtons.forEach((button) => {
    const category = button.dataset.buildCategory as Exclude<BuildDrawerCategory, 'root'> | undefined;
    const itemId = category ? buildCategoryItems[category] : undefined;
    const unlock = itemId ? getBuildItemUnlockStatus(state, itemId) : { unlocked: true, missing: [] };
    const isSelected = buildDrawerView === 'categories' && button.dataset.buildCategory === buildDrawerCategory;
    button.disabled = !unlock.unlocked;
    button.title = unlock.unlocked
      ? `Open ${button.textContent?.trim() ?? 'build'} category`
      : `Locked: ${unlock.missing.map((entry) => entry.label).join(' · ')}`;
    button.setAttribute('aria-pressed', String(isSelected));
    button.classList.toggle('selected', isSelected);
  });
  buildActionButtons.forEach((button) => {
    const action = button.dataset.buildAction as Exclude<BuildAction, null> | undefined;
    const isActive = action !== undefined && action === buildAction;
    button.setAttribute('aria-pressed', String(isActive));
    button.classList.toggle('selected', isActive);
  });
  const activeBuildItem = buildMode === 'mine' ? 'mine' : buildMode === 'path' ? 'path' : buildMode === 'path-upgrade' ? 'path-upgrade' : null;
  buildCategoryItemButtons.forEach((button) => {
    const item = button.dataset.buildItem;
    const itemCategory = button.dataset.buildItemCategory as BuildDrawerCategory | undefined;
    const isVisible = !itemCategory || itemCategory === buildDrawerCategory;
    const isEmpty = item?.startsWith('empty-') ?? false;
    const itemUnlock = item && !isEmpty && item !== 'back'
      ? getBuildItemUnlockStatus(state, item as BuildItemId)
      : { unlocked: true, missing: [] };
    const isMineLocked = item === 'mine' && (getAvailableMineSites(state) <= 0 || !itemUnlock.unlocked);
    button.hidden = !isVisible;
    button.disabled = isEmpty || isMineLocked;
    if (item === 'mine') {
      if (isMineLocked) {
        button.title = itemUnlock.missing.length > 0
          ? `Locked: ${itemUnlock.missing.map((entry) => entry.label).join(' · ')}`
          : 'Reach the next Settlement Hub milestone to unlock another mine site';
      } else {
        const available = getAvailableMineSites(state);
        button.title = `${available} mine blueprint${available === 1 ? '' : 's'} available`;
      }
    }
    button.setAttribute('aria-pressed', String(item === activeBuildItem));
    button.classList.toggle('selected', item === activeBuildItem);
  });
  if (buildAction === 'move') {
    buildStatusEl.textContent = selectedMoveItem
      ? 'Choose an open block for the selected item · Esc cancels'
      : 'Select a placed item to move · Esc cancels';
    return;
  }
  if (buildAction === 'destroy') {
    buildStatusEl.textContent = 'Select a placed item to destroy · Esc cancels';
    return;
  }
  if (buildDrawerCategory === 'root') {
    buildStatusEl.textContent = 'Choose a build category';
    return;
  }
  if (buildDrawerCategory === 'mining') {
    buildStatusEl.textContent = buildMode === 'mine'
      ? 'Place the mine rail endpoint directly against a path · rail length auto-selected'
      : state.mines.length > 0 ? 'Select Mine to dispatch a cart' : 'Select Mine to place your free mine';
    return;
  }
  if (buildMode === 'path') {
    buildStatusEl.textContent = dirt >= DIRT_PATH_BUILD_COST
      ? `Place connected path · ${DIRT_PATH_BUILD_COST} dirt each · Esc cancels`
      : `Need ${DIRT_PATH_BUILD_COST} dirt per path · Esc cancels`;
    return;
  }
  if (buildMode === 'path-upgrade') {
    buildStatusEl.textContent = 'Select a path tile to upgrade · Esc cancels';
    return;
  }
  buildStatusEl.textContent = `Build connected paths · ${DIRT_PATH_BUILD_COST} dirt each`;
}

function syncBuildModeDrawer(): void {
  const isOpen = activeDrawer === 'build';
  buildModeToggle.classList.toggle('is-expanded', isOpen);
  buildModeToggle.setAttribute('aria-expanded', String(isOpen));
  actualToggle.setAttribute('aria-expanded', String(isOpen));
  buildDrawer.setAttribute('aria-expanded', String(isOpen));
  buildDrawer.dataset.view = buildDrawerView;
  buildDrawer.querySelectorAll<HTMLElement>('[data-build-page]').forEach((page) => {
    page.setAttribute('aria-hidden', String(page.dataset.buildPage !== buildDrawerView));
  });
  buildDrawer.classList.toggle('open', isOpen);
}

function syncMiningModeDrawer(): void {
  const isOpen = activeDrawer === 'mining';
  miningModeToggle.classList.toggle('is-expanded', isOpen);
  miningModeToggle.setAttribute('aria-expanded', String(isOpen));
  miningActualToggle.setAttribute('aria-expanded', String(isOpen));
  miningDrawer.setAttribute('aria-expanded', String(isOpen));
  miningDrawer.dataset.view = miningDrawerView;
  miningDrawer.dataset.category = miningDrawerCategory;
  miningDrawer.querySelectorAll<HTMLElement>('[data-mining-page]').forEach((page) => {
    page.setAttribute('aria-hidden', String(page.dataset.miningPage !== miningDrawerView));
  });
  miningDrawer.classList.toggle('open', isOpen);
}

function formatMineCargo(cargo: MineCargoKind): string {
  return cargo.charAt(0).toUpperCase() + cargo.slice(1);
}

function formatMineStorageState(fillState: MineStorageFillState): string {
  return fillState.charAt(0).toUpperCase() + fillState.slice(1);
}

function formatMineStorageTime(durationMs: number): string {
  const minutes = Math.floor(durationMs / 60_000);
  const seconds = Math.floor(durationMs / 1_000) % 60;
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

function updateMiningUi(): void {
  syncMiningModeDrawer();
  const tripDuration = getMineTripDuration(state);
  const cartCount = getMineCartCount(state);
  const rate = cartCount * 1000 / tripDuration;
  const cargo = formatMineCargo(getMineCargoKind(state));

  miningMineList.replaceChildren();
  miningStorageList.replaceChildren();
  const settlementStorageStatus = getSettlementStorageUpgradeStatus(state);
  const settlementStorageTile = document.createElement('article');
  settlementStorageTile.className = 'mining-info-tile mining-info-tile--storage settlement-storage-tile';
  const settlementStorageTitle = document.createElement('strong');
  settlementStorageTitle.textContent = 'Settlement Storage';
  const settlementStorageAmount = document.createElement('span');
  const settlementStorageCapacity = getSettlementStorageCapacity(state);
  settlementStorageAmount.textContent = `${Math.floor(getStoredResourceTotal(state))}/${settlementStorageCapacity} materials`;
  const settlementStorageState = document.createElement('small');
  settlementStorageState.textContent = `Level ${state.settlementStorage.level} Â· ${state.settlementStorage.constructionState === 'upgrading' ? 'Upgrading' : 'Ready'}`;
  const settlementStorageUpgrade = document.createElement('button');
  settlementStorageUpgrade.className = 'storage-upgrade-button';
  settlementStorageUpgrade.type = 'button';
  settlementStorageUpgrade.dataset.settlementStorageUpgrade = 'true';
  settlementStorageUpgrade.textContent = settlementStorageStatus.definition
    ? `Upgrade Â· ${Object.entries(settlementStorageStatus.definition.requiredResources).map(([resource, amount]) => `${amount} ${resource}`).join(' + ')}`
    : 'Fully upgraded';
  settlementStorageUpgrade.disabled = !settlementStorageStatus.ready;
  settlementStorageUpgrade.title = settlementStorageStatus.definition
    ? settlementStorageStatus.ready
      ? `Upgrade settlement storage to ${settlementStorageStatus.definition.capacity.toLocaleString()}`
      : `Locked: ${settlementStorageStatus.missing.join(' Â· ')}`
    : 'Settlement storage is fully upgraded';
  settlementStorageTile.append(settlementStorageTitle, settlementStorageAmount, settlementStorageState, settlementStorageUpgrade);
  miningStorageList.append(settlementStorageTile);
  if (state.mines.length === 0) {
    const empty = document.createElement('article');
    empty.className = 'mining-info-tile mining-info-tile--empty';
    empty.textContent = 'No active mines';
    miningMineList.append(empty);
    const storageEmpty = document.createElement('article');
    storageEmpty.className = 'mining-info-tile mining-info-tile--empty';
    storageEmpty.textContent = 'No mine storage';
    miningStorageList.append(storageEmpty);
  } else {
    state.mines.forEach((mine, index) => {
      const capacity = getMineStorageCapacity(mine);
      const fillState = getMineStorageFillState(mine.storageAmount, capacity);
      const placement = state.placements.find((candidate) => candidate.id === mine.id);
      const tile = document.createElement('article');
      tile.className = 'mining-info-tile';
      const title = document.createElement('strong');
      title.textContent = `Mine ${index + 1}`;
      const level = document.createElement('small');
      level.textContent = `Building level ${placement?.level ?? 1}`;
      const speed = document.createElement('span');
      speed.textContent = `${rate.toFixed(2)}/s · ${cartCount} cart${cartCount === 1 ? '' : 's'}`;
      const ore = document.createElement('small');
      ore.textContent = `Mining ${cargo}`;
      const storage = document.createElement('small');
      storage.textContent = `Storage ${Math.floor(mine.storageAmount)}/${capacity} · ${formatMineStorageState(fillState)}`;
      tile.append(title, level, speed, ore, storage);
      miningMineList.append(tile);

      const storageTile = document.createElement('article');
      storageTile.className = 'mining-info-tile mining-info-tile--storage';
      const storageTitle = document.createElement('strong');
      storageTitle.textContent = `Mine ${index + 1}`;
      const storageAmount = document.createElement('span');
      storageAmount.textContent = `${Math.floor(mine.storageAmount)}/${capacity} ore · ${formatMineStorageState(fillState)}`;
      const storageTime = document.createElement('small');
      storageTime.textContent = `Full in ${formatMineStorageTime(getMineStorageFillDuration(mine))}`;
      const storageUpgrade = document.createElement('button');
      storageUpgrade.className = 'storage-upgrade-button';
      storageUpgrade.type = 'button';
      storageUpgrade.dataset.mineStorageUpgrade = mine.id;
      storageUpgrade.textContent = '+100 capacity · 1 Emerald';
      storageUpgrade.disabled = (state.resources.emerald ?? 0) < (getMineStorageUpgradeCost(state, mine.id) ?? 1);
      storageUpgrade.title = storageUpgrade.disabled ? 'Need 1 Emerald to upgrade this mine storage' : 'Upgrade this mine storage for 1 Emerald';
      storageTile.append(storageTitle, storageAmount, storageTime, storageUpgrade);
      miningStorageList.append(storageTile);
    });
  }

  const upgradeStatus = (id: MineUpgradeId): string => {
    const definition = getMineUpgradeDefinition(id);
    const rank = getMineUpgradeRank(state, id);
    const cost = getMineUpgradeCost(state, id);
    if (!definition || cost === null) return `Max rank ${rank}`;
    return `Rank ${rank}/${definition.costs.length} · ${cost} Emerald${cost === 1 ? '' : 's'}`;
  };
  railUpgradeStatus.textContent = upgradeStatus('rail-speed');
  storageUpgradeStatus.textContent = upgradeStatus('storage-capacity');
  miningUpgradeButtons.forEach((button) => {
    const id = button.dataset.miningUpgrade as MineUpgradeId;
    const cost = getMineUpgradeCost(state, id);
    const maxed = cost === null;
    button.disabled = state.mines.length === 0 || maxed || (state.resources.emerald ?? 0) < cost;
    button.title = maxed ? 'Fully upgraded' : `Spend ${cost} Emerald${cost === 1 ? '' : 's'} to upgrade`;
  });
  miningCategoryButtons.forEach((button) => {
    const selected = miningDrawerView === 'categories' && button.dataset.miningCategory === miningDrawerCategory;
    button.setAttribute('aria-pressed', String(selected));
    button.classList.toggle('selected', selected);
  });
  miningDrawer.querySelectorAll<HTMLElement>('[data-mining-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.miningPanel !== miningDrawerCategory;
  });
}

function setBuildMode(nextMode: BuildMode): void {
  buildMode = nextMode;
  buildAction = null;
  selectedMoveItem = null;
  hoveredPlacedItem = null;
  pendingDestroyItem = null;
  moveHoverCell = null;
  placementDestroyModal.hidden = true;
  if (nextMode === 'mine') {
    activeDrawer = 'build';
    buildDrawerCategory = 'mining';
    buildDrawerView = 'items';
  }
  if (nextMode === 'path' || nextMode === 'path-upgrade') {
    activeDrawer = 'build';
    buildDrawerCategory = 'paths';
    buildDrawerView = 'items';
  }
  app.dataset.activeDrawer = activeDrawer ?? '';
  buildModeToggle.setAttribute('aria-pressed', String(activeDrawer === 'build'));
  miningModeToggle.setAttribute('aria-pressed', String(activeDrawer === 'mining'));
  syncBuildModeDrawer();
  syncMiningModeDrawer();
  minePlacementPreview = null;
  pathPlacementPreview = null;
  updateMineGhostVisual(null);
  updatePathGhostVisual(null);
  canvas.classList.toggle('is-building', buildMode !== null);
  updateUi();
}

function setBuildAction(nextAction: BuildAction): void {
  buildAction = buildAction === nextAction ? null : nextAction;
  selectedMoveItem = null;
  hoveredPlacedItem = null;
  pendingDestroyItem = null;
  moveHoverCell = null;
  placementDestroyModal.hidden = true;
  buildMode = null;
  minePlacementPreview = null;
  pathPlacementPreview = null;
  activeDrawer = buildAction ? 'build' : activeDrawer;
  if (buildAction) {
    buildDrawerCategory = 'root';
    buildDrawerView = 'categories';
  }
  app.dataset.activeDrawer = activeDrawer ?? '';
  updateMineGhostVisual(null);
  updatePathGhostVisual(null);
  canvas.classList.remove('is-building');
  updateUi();
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

function updateSettlementHubUi(): void {
  const stage = getSettlementStage(state);
  const nextStage = getNextSettlementStage(state);
  const upgrade = getSettlementHubUpgrade(state);
  const status = getSettlementHubUpgradeStatus(state);
  settlementHubTitle.textContent = `Settlement Hub Level ${state.settlementHub.level}`;
  settlementHubDescription.textContent = stage.description;
  settlementHubStage.textContent = stage.name;
  settlementHubNextStage.textContent = nextStage ? `Next: ${nextStage.name}` : 'Maximum era reached';
  settlementHubRequirements.replaceChildren();
  if (!upgrade || !nextStage) {
    const item = document.createElement('li');
    item.textContent = 'The settlement has reached its current limit.';
    settlementHubRequirements.append(item);
    settlementHubUpgradeButton.disabled = true;
    settlementHubUpgradeButton.textContent = 'Fully Upgraded';
    settlementHubStatus.textContent = 'No further Hub upgrades are currently defined.';
    return;
  }
  const requirementItems = status.missing.length > 0 ? status.missing : ['All requirements met'];
  requirementItems.forEach((requirement) => {
    const item = document.createElement('li');
    item.textContent = requirement;
    settlementHubRequirements.append(item);
  });
  settlementHubUpgradeButton.disabled = !status.ready;
  settlementHubUpgradeButton.textContent = status.ready ? `Upgrade to ${nextStage.name}` : `Upgrade to ${nextStage.name}`;
  settlementHubStatus.textContent = status.ready
    ? `Ready · ${Math.ceil(upgrade.durationMs / 1000)}s construction`
    : 'Meet every requirement to assign a builder.';
}

function updateUi(): void {
  const rate = state.mines.length > 0 ? getMineCartCount(state) * 1000 / getMineTripDuration(state) : 0;
  const settlementStage = getSettlementStage(state);
  const nextSettlementStage = getNextSettlementStage(state);
  levelEl.textContent = String(state.level);
  settlementStageEl.textContent = settlementStage.name;
  const activeBuilders = getActiveBuilderCount(state);
  const builderSlots = getBuilderSlotCount(state);
  const availableBuilders = getAvailableBuilderSlots(state);
  const queuedProjects = state.constructionQueue.filter((project) => !project.builderId).length;
  builderCountEl.textContent = `Builders ${activeBuilders}/${builderSlots} Â· ${availableBuilders} free${queuedProjects > 0 ? ` Â· ${queuedProjects} queued` : ''}`;
  if (nextSettlementStage) {
    settlementProgressLabelEl.textContent = `${state.settlementProgress.toLocaleString()} / ${nextSettlementStage.requiredProgress.toLocaleString()} Growth`;
    const stageSpan = Math.max(1, nextSettlementStage.requiredProgress - settlementStage.requiredProgress);
    const stageProgress = Math.max(0, state.settlementProgress - settlementStage.requiredProgress);
    settlementFillEl.style.width = `${Math.min(100, stageProgress / stageSpan * 100)}%`;
  } else {
    settlementProgressLabelEl.textContent = `${state.settlementProgress.toLocaleString()} Growth`;
    settlementFillEl.style.width = '100%';
  }
  updateSettlementHubUi();
  const nextGoal = getSettlementNextGoal(state);
  nextGoalTitleEl.textContent = nextGoal.title;
  nextGoalDetailEl.textContent = `${nextGoal.detail} Â· ${availableBuilders > 0 ? `${availableBuilders} builder${availableBuilders === 1 ? '' : 's'} free` : queuedProjects > 0 ? `${queuedProjects} project${queuedProjects === 1 ? '' : 's'} queued` : 'All builders busy'}`;
  totalXpEl.textContent = state.totalXp.toLocaleString();
  autoRateEl.textContent = rate.toFixed(2);
  resourceEmeraldEl.textContent = (state.resources.emerald ?? 0).toLocaleString();
  resourceDiamondEl.textContent = (state.resources.diamond ?? 0).toLocaleString();
  resourceGoldEl.textContent = (state.resources.gold ?? 0).toLocaleString();
  resourceModalEmeraldEl.textContent = (state.resources.emerald ?? 0).toLocaleString();
  resourceModalDiamondEl.textContent = (state.resources.diamond ?? 0).toLocaleString();
  resourceModalGoldEl.textContent = (state.resources.gold ?? 0).toLocaleString();
  resourceModalCobblestoneEl.textContent = (state.resources.cobblestone ?? 0).toLocaleString();
  const storedResources = getStoredResourceTotal(state);
  const storageCapacity = getSettlementStorageCapacity(state);
  const storageLabel = `${Math.min(storedResources, storageCapacity).toLocaleString()} / ${storageCapacity.toLocaleString()}`;
  resourceStorageEl.textContent = storageLabel;
  resourceModalStorageEl.textContent = storageLabel;
  resourceStorageEl.closest<HTMLElement>('.resource-capacity')?.classList.toggle('is-full', storedResources >= storageCapacity);
  const resourceFill = (value: number, milestone: number) => `${Math.min(100, value / milestone * 100)}%`;
  resourceXpFillEl.style.width = settlementFillEl.style.width;
  resourceEmeraldFillEl.style.width = resourceFill(state.resources.emerald ?? 0, 100);
  resourceDiamondFillEl.style.width = resourceFill(state.resources.diamond ?? 0, 100);
  resourceGoldFillEl.style.width = resourceFill(state.resources.gold ?? 0, 100);
  if (skillTreePointsLabel) skillTreePointsLabel.textContent = `${state.craftingPoints} CP`;
  if (miningMenuRate) miningMenuRate.textContent = `${rate.toFixed(2)}/s`;
  const traderReady = isTraderUnlocked(state);
  tradingButton.disabled = !traderReady;
  tradingButton.title = traderReady
    ? 'Open Wandering Trader'
    : 'Wandering Trader unlocks when the Settlement Hub reaches Hamlet';
  traderEmeraldButton.disabled = !traderReady || (state.resources.cobblestone ?? 0) < TRADER_EMERALD_COST;
  traderEmeraldStatus.textContent = !traderReady
    ? 'The trader arrives when the Settlement Hub reaches Hamlet.'
    : traderEmeraldButton.disabled
      ? `Need ${TRADER_EMERALD_COST} Cobblestone.`
      : `${state.resources.cobblestone.toLocaleString()} Cobblestone available.`;
  if (storyStageLabel) storyStageLabel.textContent = settlementStage.name;
  pointsEl.textContent = `${state.craftingPoints} CP`;
  updateCurrentTool();
  updateConstructionUi();
  updateMineUi();
  updateBuildUi();
  syncPlacementActionVisuals();
  updateMiningUi();
}

function updateConstructionState(now: number): boolean {
  const completed = completeConstructionProjects(state, now);
  if (completed.length > 0) {
    updateWorldScene();
  }
  return completed.length > 0;
}

function flashXpCard(): void {
  totalXpCard.classList.remove('is-gaining');
  void totalXpCard.offsetWidth;
  totalXpCard.classList.add('is-gaining');
  window.clearTimeout(xpFlashTimeout);
  xpFlashTimeout = window.setTimeout(() => totalXpCard.classList.remove('is-gaining'), 480);
}

function setActiveDrawer(nextDrawer: DrawerKind): void {
  activeDrawer = activeDrawer === nextDrawer ? null : nextDrawer;
  if (activeDrawer !== 'build') {
    buildAction = null;
    selectedMoveItem = null;
    hoveredPlacedItem = null;
    pendingDestroyItem = null;
    moveHoverCell = null;
    placementDestroyModal.hidden = true;
  }
  if (activeDrawer !== 'build' && buildMode !== null) setBuildMode(null);
  app.dataset.activeDrawer = activeDrawer ?? '';
  buildModeToggle.setAttribute('aria-pressed', String(activeDrawer === 'build'));
  miningModeToggle.setAttribute('aria-pressed', String(activeDrawer === 'mining'));
  syncBuildModeDrawer();
  syncMiningModeDrawer();
  updateUi();
}

function showBuildDrawer(category: BuildDrawerCategory): void {
  if (activeDrawer === 'build' && buildDrawerCategory === category && category === 'root') {
    setActiveDrawer('build');
    return;
  }
  if (buildMode !== null) setBuildMode(null);
  buildAction = null;
  selectedMoveItem = null;
  hoveredPlacedItem = null;
  pendingDestroyItem = null;
  moveHoverCell = null;
  placementDestroyModal.hidden = true;
  activeDrawer = 'build';
  buildDrawerCategory = category;
  buildDrawerView = category === 'root' ? 'categories' : 'items';
  app.dataset.activeDrawer = 'build';
  buildModeToggle.setAttribute('aria-pressed', String(category !== 'mining'));
  miningModeToggle.setAttribute('aria-pressed', 'false');
  updateUi();
}

function showMiningDrawer(category?: MiningDrawerCategory): void {
  if (category) {
    activeDrawer = 'mining';
    miningDrawerCategory = category;
    miningDrawerView = 'items';
  } else if (activeDrawer === 'mining') {
    activeDrawer = null;
    miningDrawerView = 'categories';
  } else {
    activeDrawer = 'mining';
    miningDrawerView = 'categories';
  }
  if (activeDrawer === 'mining' && buildMode !== null) setBuildMode(null);
  app.dataset.activeDrawer = activeDrawer ?? '';
  buildModeToggle.setAttribute('aria-pressed', 'false');
  miningModeToggle.setAttribute('aria-pressed', String(activeDrawer === 'mining'));
  updateUi();
}

function openWorldModal(id: string): void {
  const modal = document.querySelector<HTMLElement>(`#${id}`);
  if (!modal) return;
  modal.hidden = false;
  modal.querySelector<HTMLButtonElement>('.modal-close')?.focus();
}

function closeWorldModal(id: string): void {
  const modal = document.querySelector<HTMLElement>(`#${id}`);
  if (!modal) return;
  modal.hidden = true;
  if (id === 'placement-destroy-modal') cancelDestroyConfirmation();
}

function getOreAtPointer(event: PointerEvent): OreNode | null {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(oreTargets, false)[0];
  return hit ? oreByMesh.get(hit.object) ?? null : null;
}

function getPlacedItemAtPointer(event: PointerEvent): PlacedItemTarget | null {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const mineTargets = Array.from(mineVisuals.values())
    .filter((visual) => visual.group.visible)
    .map((visual) => visual.group);
  const pathTargets = pathVisuals
    .filter((visual) => visual.group.visible)
    .map((visual) => visual.surface);
  const hit = raycaster.intersectObjects([...mineTargets, ...pathTargets], true)[0];
  if (!hit) return null;

  let current: THREE.Object3D | null = hit.object;
  while (current) {
    const placementId = current.userData.placementId;
    if (typeof placementId === 'string') return { kind: 'mine', id: placementId };
    current = current.parent;
  }
  const pathVisual = pathVisuals.find((visual) => visual.surface === hit.object);
  return pathVisual ? { kind: 'path', x: pathVisual.cell.x, z: pathVisual.cell.z } : null;
}

function getPlacedItemLabel(target: PlacedItemTarget): string {
  if (target.kind === 'path') return 'path tile';
  const mineIndex = state.mines.findIndex((mine) => mine.id === target.id);
  return mineIndex >= 0 ? `Mine ${mineIndex + 1}` : 'placed item';
}

function updateBuildActionHover(event: PointerEvent): void {
  if (pendingDestroyItem) return;
  hoveredPlacedItem = getPlacedItemAtPointer(event);
  if (buildAction === 'move' && selectedMoveItem) {
    // Keep sampling the ground beneath the cursor even when the cursor is
    // over the selected item. The selected visual is now a placement ghost,
    // so clearing this cell would make it snap back to its original position
    // instead of following the pointer like the normal green placement ghost.
    // Keep the last valid cell during a transient raycast miss. Clearing the
    // preview for one pointer event makes the mine flash back to its source.
    const surfaceCell = getSurfaceCellAtPointer(event);
    if (surfaceCell) moveHoverCell = surfaceCell;
  } else {
    moveHoverCell = null;
  }
  syncPlacementActionVisuals();
}

function cancelDestroyConfirmation(): void {
  pendingDestroyItem = null;
  placementDestroyModal.hidden = true;
  syncPlacementActionVisuals();
}

function confirmDestroyPlacement(): void {
  if (!pendingDestroyItem) return;
  const target = pendingDestroyItem;
  const destroyed = target.kind === 'mine'
    ? destroyWorldPlacement(state, target.id)
    : destroyPathCell(state, target.x, target.z);
  if (!destroyed) {
    cancelDestroyConfirmation();
    return;
  }
  pendingDestroyItem = null;
  hoveredPlacedItem = null;
  placementDestroyModal.hidden = true;
  audioManager.playMiningSound('stone');
  updateWorldScene();
  updateUi();
  saveState(localStorage, state);
}

function handleBuildActionPointerDown(event: PointerEvent): void {
  let target = getPlacedItemAtPointer(event);
  if (buildAction === 'destroy') {
    if (!target) return;
    pendingDestroyItem = target;
    hoveredPlacedItem = target;
    placementDestroyTitle.textContent = `Destroy ${getPlacedItemLabel(target)}?`;
    placementDestroyMessage.textContent = 'All progress and upgrades on this item will be lost.';
    syncPlacementActionVisuals();
    openWorldModal('placement-destroy-modal');
    return;
  }
  if (buildAction !== 'move') return;
  if (selectedMoveItem && target && samePlacedItem(target, selectedMoveItem)) target = null;
  if (!selectedMoveItem) {
    if (!target) return;
    selectedMoveItem = target;
    // Seed the preview from the ground cell under the initial click so the
    // selected item immediately behaves like a normal placement ghost.
    moveHoverCell = getSurfaceCellAtPointer(event) ?? (
      target.kind === 'mine'
        ? state.mines.find((mine) => mine.id === target.id) ?? null
        : target
    );
    updateUi();
    return;
  }
  const destination = getSurfaceCellAtPointer(event);
  if (!destination || target) return;
  const moved = selectedMoveItem.kind === 'mine'
    ? moveWorldPlacement(state, selectedMoveItem.id, destination.x, destination.z)
    : movePathCell(state, selectedMoveItem.x, selectedMoveItem.z, destination.x, destination.z);
  if (!moved) return;
  selectedMoveItem = null;
  audioManager.playMiningSound('grass');
  updateWorldScene();
  updateUi();
  saveState(localStorage, state);
}

function getSurfaceCellAtPointer(event: PointerEvent): { x: number; z: number } | null {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const surfaceMeshes = blockNodes.filter((node) => node.mesh.visible && node.coordinate.y === 0).map((node) => node.mesh);
  const hit = raycaster.intersectObjects(surfaceMeshes, false)[0];
  if (!hit) return null;
  return {
    x: Math.round(hit.point.x / BLOCK_SIZE),
    z: Math.round(hit.point.z / BLOCK_SIZE),
  };
}

function getMinePlacementAtPointer(event: PointerEvent): MinePlacementPreview | null {
  const cell = getSurfaceCellAtPointer(event);
  if (!cell) return null;
  const { x, z } = cell;
  const directions: WorldDirection[] = ['south', 'east', 'north', 'west'];
  const bounds = getChunkBounds(state);
  const fitsInsideWorld = (direction: WorldDirection, railLength: MineRailLength): boolean => getMineFootprint(x, z, direction, railLength).every((footprintCell) => (
    footprintCell.x >= bounds.minX
      && footprintCell.x <= bounds.maxX
      && footprintCell.z >= bounds.minZ
      && footprintCell.z <= bounds.maxZ
  ));

  let selectedDirection: WorldDirection | null = null;
  let detectedRailLength: MineRailLength | null = null;
  for (const railLength of MINE_RAIL_LENGTHS) {
    const direction = directions.find((candidate) => canPlaceMine(state, x, z, candidate, railLength));
    if (direction) {
      selectedDirection = direction;
      detectedRailLength = railLength;
      break;
    }
  }

  // Even an invalid ghost should have a useful footprint. Prefer the longest
  // rail that still fits the world, so moving near an edge automatically
  // shortens the preview instead of showing geometry outside the block.
  if (!detectedRailLength) {
    for (const railLength of MINE_RAIL_LENGTHS) {
      const direction = directions.find((candidate) => fitsInsideWorld(candidate, railLength));
      if (direction) {
        selectedDirection = direction;
        detectedRailLength = railLength;
        break;
      }
    }
  }

  const railLength = detectedRailLength ?? DEFAULT_MINE_RAIL_LENGTH;
  const direction = selectedDirection ?? 'south';
  selectedMineRailLength = railLength;
  return {
    x,
    z,
    direction,
    railLength,
    valid: Boolean(selectedDirection && canPlaceMine(state, x, z, direction, railLength)),
  };
}

function getPathPlacementAtPointer(event: PointerEvent): PathPlacementPreview | null {
  const cell = getSurfaceCellAtPointer(event);
  if (!cell) return null;
  return {
    ...cell,
    valid: canBuildPathCell(state, cell.x, cell.z) && (state.resources.dirt ?? 0) >= DIRT_PATH_BUILD_COST,
    upgrade: false,
  };
}

function getPathUpgradeAtPointer(event: PointerEvent): PathPlacementPreview | null {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(pathVisuals.map((visual) => visual.surface), false)[0];
  const visual = hit ? pathVisuals.find((candidate) => candidate.surface === hit.object) : null;
  if (!visual) return null;
  const nextTier = getNextPathTier(visual.cell.tier);
  const definition = nextTier ? PATH_TIERS.find((entry) => entry.tier === nextTier) : null;
  const valid = Boolean(nextTier && (!definition?.requiredResource || (state.resources[definition.requiredResource] ?? 0) >= definition.resourceCost));
  return { x: visual.cell.x, z: visual.cell.z, valid, upgrade: true };
}

function updateBuildPlacementPreview(event: PointerEvent): void {
  if (buildMode === 'mine') {
    minePlacementPreview = getAvailableMineSites(state) > 0 ? getMinePlacementAtPointer(event) : null;
    updateMineGhostVisual(minePlacementPreview);
    return;
  }
  if (buildMode === 'path') pathPlacementPreview = getPathPlacementAtPointer(event);
  else if (buildMode === 'path-upgrade') pathPlacementPreview = getPathUpgradeAtPointer(event);
  else return;
  updatePathGhostVisual(pathPlacementPreview);
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

function beginNewMinePlacement(): void {
  // Build Mode is for placing a new unlocked mine. It must never dispatch or
  // modify the progress of a mine that is already operating in the world.
  // The first blueprint is part of the starter flow; later blueprints are
  // supplied by mine-site skills and settlement stages.
  if (getAvailableMineSites(state) <= 0) return;
  setBuildMode(buildMode === 'mine' ? null : 'mine');
}

function dispatchCart(): void {
  dispatchMineCart(state);
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
    if (buildAction !== null) {
      handleBuildActionPointerDown(event);
      return;
    }
    if (buildMode === 'mine') {
      const placement = getMinePlacementAtPointer(event);
      if (placement?.valid && unlockStarterMine(state, Date.now(), placement.x, placement.z, placement.direction, placement.railLength)) {
        setBuildMode(null);
        updateWorldScene();
        updateUi();
        saveState(localStorage, state);
      }
      return;
    }
    if (buildMode === 'path') {
      const placement = getPathPlacementAtPointer(event);
      if (placement?.valid && buildPathCell(state, placement.x, placement.z)) {
        ensurePathVisual(state.pathCells[state.pathCells.length - 1]);
        audioManager.playMiningSound('grass');
        updateWorldScene();
        updateUi();
        saveState(localStorage, state);
      }
      return;
    }
    if (buildMode === 'path-upgrade') {
      const placement = getPathUpgradeAtPointer(event);
      if (placement?.valid && upgradePathCell(state, placement.x, placement.z)) {
        audioManager.playMiningSound('stone');
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
    if (buildMode !== null) updateBuildPlacementPreview(event);
    else if (buildAction !== null) updateBuildActionHover(event);
    else updateHoverTarget(event);
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
canvas.addEventListener('pointerenter', (event) => {
  if (buildMode !== null) updateBuildPlacementPreview(event);
  else if (buildAction !== null) updateBuildActionHover(event);
  else updateHoverTarget(event);
});
canvas.addEventListener('pointerleave', () => {
  setHoveredOre(null);
  hoveredPlacedItem = null;
  moveHoverCell = null;
  syncPlacementActionVisuals();
  minePlacementPreview = null;
  pathPlacementPreview = null;
  updateMineGhostVisual(null);
  updatePathGhostVisual(null);
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
  if (buildMode !== null) updateBuildPlacementPreview(event);
  else updateHoverTarget(event);
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
  if (event.key === 'Escape' && !placementDestroyModal.hidden) cancelDestroyConfirmation();
  if (event.key === 'Escape') worldModals.forEach((modal) => { modal.hidden = true; });
  if (event.key === 'Escape' && activeDrawer !== null) setActiveDrawer(activeDrawer);
  if (event.key === 'Escape' && buildMode !== null) setBuildMode(null);
  if (event.key === 'Escape' && buildAction !== null) setBuildAction(null);
});

mineButton.addEventListener('click', () => {
  if (state.mines.length === 0 && getAvailableMineSites(state) > 0) {
    setBuildMode(buildMode === 'mine' ? null : 'mine');
    return;
  }
  dispatchCart();
});
pathButton.addEventListener('click', () => setBuildMode(buildMode === 'path' ? null : 'path'));
pathUpgradeButton.addEventListener('click', () => setBuildMode(buildMode === 'path-upgrade' ? null : 'path-upgrade'));
actualToggle.addEventListener('click', () => {
  actualToggle.classList.remove('is-pulsing');
  void actualToggle.offsetWidth;
  actualToggle.classList.add('is-pulsing');
  showBuildDrawer('root');
});
miningActualToggle.addEventListener('click', () => {
  miningActualToggle.classList.remove('is-pulsing');
  void miningActualToggle.offsetWidth;
  miningActualToggle.classList.add('is-pulsing');
  showMiningDrawer();
});
buildBackButton.addEventListener('click', () => {
  if (buildDrawerCategory === 'root') {
    setActiveDrawer('build');
    return;
  }
  if (buildMode !== null) setBuildMode(null);
  buildDrawerCategory = 'root';
  buildDrawerView = 'categories';
  activeDrawer = 'build';
  app.dataset.activeDrawer = 'build';
  updateUi();
});
buildCategoryButtons.forEach((button) => {
  button.addEventListener('click', () => showBuildDrawer(button.dataset.buildCategory as BuildDrawerCategory));
});
buildActionButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const action = button.dataset.buildAction as Exclude<BuildAction, null> | undefined;
    if (action) setBuildAction(action);
  });
});
buildCategoryItemButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const item = button.dataset.buildItem;
    if (item === 'back') {
      if (buildMode !== null) setBuildMode(null);
      buildDrawerCategory = 'root';
      buildDrawerView = 'categories';
      updateUi();
      return;
    }
    if (item === 'mine') beginNewMinePlacement();
    if (item === 'path') pathButton.click();
    if (item === 'path-upgrade') pathUpgradeButton.click();
  });
});
miningCategoryButtons.forEach((button) => {
  button.addEventListener('click', () => showMiningDrawer(button.dataset.miningCategory as MiningDrawerCategory));
});
miningDrawer.querySelectorAll<HTMLButtonElement>('[data-mining-item="back"]').forEach((button) => {
  button.addEventListener('click', () => {
    miningDrawerView = 'categories';
    updateUi();
  });
});
miningUpgradeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const id = button.dataset.miningUpgrade as MineUpgradeId;
    if (!buyMineUpgrade(state, id)) return;
    updateWorldScene();
    updateUi();
    saveState(localStorage, state);
  });
});
miningDrawer.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const settlementStorageButton = target.closest<HTMLButtonElement>('[data-settlement-storage-upgrade]');
  if (settlementStorageButton) {
    if (!queueSettlementStorageUpgrade(state)) return;
    updateUi();
    saveState(localStorage, state);
    return;
  }
  const button = target.closest<HTMLButtonElement>('[data-mine-storage-upgrade]');
  if (!button) return;
  const mineId = button.dataset.mineStorageUpgrade;
  if (!mineId || !buyMineStorageUpgrade(state, mineId)) return;
  updateWorldScene();
  updateUi();
  saveState(localStorage, state);
});
document.querySelectorAll<HTMLButtonElement>('[data-rail-length]').forEach((button) => {
  button.addEventListener('click', () => {
    if (buildMode !== 'mine') return;
    selectedMineRailLength = Number(button.dataset.railLength) as MineRailLength;
    minePlacementPreview = null;
    updateMineGhostVisual(null);
    updateUi();
  });
});
resourcesButton.addEventListener('click', () => openWorldModal('resources-modal'));
tradingButton.addEventListener('click', () => openWorldModal('trading-modal'));
traderEmeraldButton.addEventListener('click', () => {
  if ((state.resources.cobblestone ?? 0) < TRADER_EMERALD_COST) return;
  state.resources.cobblestone -= TRADER_EMERALD_COST;
  addSettlementResource(state, 'emerald', 1);
  updateUi();
  saveState(localStorage, state);
});
storyButton.addEventListener('click', () => openWorldModal('story-modal'));
settlementHubButton.addEventListener('click', () => openWorldModal('settlement-hub-modal'));
settlementHubUpgradeButton.addEventListener('click', () => {
  if (!queueSettlementHubUpgrade(state)) return;
  updateUi();
  saveState(localStorage, state);
});
pauseMenuButton.addEventListener('click', () => openWorldModal('pause-modal'));
/* Debug Menu temporarily disabled. Keep the wiring for later development use.
debugMenuButton.addEventListener('click', () => {
  closeWorldModal('pause-modal');
  openWorldModal('debug-modal');
});
debugUnlockSkillTreeButton.addEventListener('click', () => {
  debugUnlockFullSkillTree(state);
  updateWorldScene();
  updateUi();
  saveState(localStorage, state);
  debugStatus.textContent = 'All skill nodes unlocked. The world is ready for testing.';
  debugUnlockSkillTreeButton.textContent = 'Unlocked';
  debugUnlockSkillTreeButton.disabled = true;
});
*/
resumeButton.addEventListener('click', () => closeWorldModal('pause-modal'));
placementDestroyCancel.addEventListener('click', cancelDestroyConfirmation);
placementDestroyConfirm.addEventListener('click', confirmDestroyPlacement);
document.querySelectorAll<HTMLButtonElement>('[data-close-modal]').forEach((button) => {
  button.addEventListener('click', () => closeWorldModal(button.dataset.closeModal!));
});
worldModals.forEach((modal) => {
  modal.addEventListener('click', (event) => {
    if (event.target !== modal) return;
    if (modal === placementDestroyModal) cancelDestroyConfirmation();
    else modal.hidden = true;
  });
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
  if (event.code === 'Space' && !event.repeat && buildMode === null) {
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
  if (window.confirm('Reset all Villagers - Idle World Game progress?')) {
    isResetting = true;
    localStorage.removeItem(SAVE_KEY);
    void playerSaveSync.clearRemoteSave().finally(() => window.location.reload());
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

void playerSaveSync.initialize(state, hasLocalSave).then((remoteState) => {
  if (!remoteState || isResetting) return;
  // If the player started working before the first cloud request finished,
  // keep that local progress instead of replacing it with the remote copy.
  if (!hasLocalSave && localStorage.getItem(SAVE_KEY) !== null) return;
  localStorage.setItem(SAVE_KEY, JSON.stringify(remoteState));
  state = loadState(localStorage);
  updateWorldScene();
  updateUi();
}).catch((error: unknown) => {
  console.warn('Villagers - Idle World Game cloud session initialization failed; local saving remains active.', error);
});

const clock = new THREE.Clock();
const SIMULATION_INTERVAL_MS = 100;
const UI_REFRESH_INTERVAL_MS = 250;
let lastSimulationAt = Date.now();
let lastUiRefreshAt = 0;
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
  let stateChanged = false;
  if (wallClockNow - lastSimulationAt >= SIMULATION_INTERVAL_MS) {
    lastSimulationAt = wallClockNow;
    stateChanged = updateConstructionState(wallClockNow);
    const mineResult = advanceMineOperations(state, wallClockNow);
    if (mineResult.trips > 0) {
      addXp(state, mineResult.xp);
      flashXpCard();
      audioManager.playMiningSound('stone');
      stateChanged = true;
    }
    if (stateChanged) saveState(localStorage, state);
  }
  if (stateChanged || wallClockNow - lastUiRefreshAt >= UI_REFRESH_INTERVAL_MS) {
    updateUi();
    lastUiRefreshAt = wallClockNow;
  }
  updateMineCartAnimations(wallClockNow);
  oreNodes.forEach((node) => {
    node.pulse = Math.max(0, node.pulse - delta * 4);
    const pulse = Math.sin(node.pulse * Math.PI);
    node.mesh.scale.setScalar(1 + pulse * 0.28);
  });
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}
requestAnimationFrame(render);
