import * as THREE from 'three';
import './style.css';
import {
  SAVE_KEY,
  SPEED_RATES,
  BLOCK_DEFINITIONS,
  addXp,
  buyWorldExpansion,
  buySpeedUpgrade,
  buyToolUpgrade,
  calculateOfflineXp,
  getAutoRate,
  getContextTool,
  getExpansionChunkOrigin,
  getTool,
  getWorldTier,
  harvestResource,
  loadState,
  saveState,
  TOOL_TIERS,
  TOOL_KIND_PROFILES,
  WORLD_DIRECTIONS,
  WORLD_TIERS,
  type BlockType,
  type WorldDirection,
  xpRequired,
} from './game';
import {
  getSkillTreeBranch,
  SKILL_TREE_BRANCHES,
  SKILL_TREE_NODES,
  type SkillNodeDefinition,
} from './skill-tree';

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
let isResetting = false;

function loadBlockTexture(fileName: string): THREE.Texture {
  const texture = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}assets/blocks/${fileName}`);
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
  hoverOutline: THREE.LineSegments;
  pulse: number;
}

function createBlockMesh(type: BlockType): THREE.Mesh {
  const materials = type === 'grass'
    ? [grassSideMaterial, grassSideMaterial, grassMaterial, dirtMaterial, grassSideMaterial, grassSideMaterial]
    : type === 'dirt'
      ? [dirtMaterial, dirtMaterial, dirtMaterial, dirtMaterial, dirtMaterial, dirtMaterial]
      : [stoneMaterial, stoneMaterial, stoneMaterial, stoneMaterial, stoneMaterial, stoneMaterial];
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE), materials);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  world.add(mesh);
  return mesh;
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
    hoverOutline: new THREE.LineSegments(
      new THREE.EdgesGeometry(mesh.geometry),
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.1,
        depthTest: false,
        depthWrite: false,
      }),
    ),
    pulse: 0,
  } satisfies BlockNode;
  node.hoverOutline.visible = false;
  node.hoverOutline.scale.setScalar(1.02);
  node.hoverOutline.renderOrder = 10;
  node.mesh.add(node.hoverOutline);
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
      for (const [y, type] of [[0, 'grass'], [-1, 'dirt'], [-2, 'stone']] as const) {
        const surfaceNoise = Math.abs(Math.sin(seed * 0.001 + x * 12.9898 + z * 78.233));
        const surfaceType = y === 0 && requiredWorldRank > 1 && surfaceNoise > 0.93 ? 'dirt' : type;
        cells.push({ type: surfaceType, coordinate: { x, y, z }, requiredWorldRank, requiredDirection });
      }
    }
  }
  return cells;
}

function generateWorldLayout(currentState: typeof state): GeneratedBlock[] {
  const cells: GeneratedBlock[] = [{
    type: 'grass',
    coordinate: { x: 0, y: 0, z: 0 },
    requiredWorldRank: 0,
  }];
  cells.push(
    ...generateMeadowChunk({ x: -1, z: -1 }, 1, undefined, currentState.worldSeed, true),
    { type: 'dirt', coordinate: { x: 0, y: -1, z: 0 }, requiredWorldRank: 1 },
    { type: 'stone', coordinate: { x: 0, y: -2, z: 0 }, requiredWorldRank: 1 },
  );
  WORLD_DIRECTIONS.forEach((direction) => {
    const expansionNumber = 1;
    cells.push(...generateMeadowChunk(
      getExpansionChunkOrigin(expansionNumber, direction),
      expansionNumber + 1,
      direction,
      currentState.worldSeed,
    ));
  });
  return cells;
}

const blockNodes: BlockNode[] = generateWorldLayout(state).map(({ type, coordinate, requiredWorldRank, requiredDirection }) => {
  const { x, y, z } = coordinate;
  return createBlockNode(`${type}-${x}-${y}-${z}-${requiredDirection ?? 'core'}`, type, coordinate, requiredWorldRank, requiredDirection);
});
const blockByMesh = new Map<THREE.Object3D, BlockNode>(blockNodes.map((node) => [node.mesh, node]));
const miningTargets: THREE.Mesh[] = [];

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
  blockNodes.forEach((node) => {
    const directionIndex = node.requiredWorldRank - 2;
    const directionUnlocked = !node.requiredDirection
      || state.expansionDirections[directionIndex] === node.requiredDirection;
    node.mesh.visible = state.worldRank >= node.requiredWorldRank && directionUnlocked;
  });
  miningTargets.length = 0;
  blockNodes.forEach((node) => {
    if (node.mesh.visible) miningTargets.push(node.mesh);
  });
  updateWorldFloor();
}

const CLOUD_BLOCK_SIZE = BLOCK_SIZE;
const CLOUD_BLOCK_HEIGHT = BLOCK_SIZE;
const viewRight = new THREE.Vector3(1, 0, -1).normalize();
const viewUp = new THREE.Vector3(-1, 2, -1).normalize();
const viewBack = new THREE.Vector3(-1, -1, -1).normalize();

function createCloud(screenX: number, screenY: number): THREE.Group {
  const cloud = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0xf7fbf4,
    roughness: 1,
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
  });
  [[-1, 0, 0], [0, 0, 0], [1, 0, 0]]
    .forEach(([cx, cy, cz]) => {
      const piece = new THREE.Mesh(
        new THREE.BoxGeometry(CLOUD_BLOCK_SIZE, CLOUD_BLOCK_HEIGHT, CLOUD_BLOCK_SIZE),
        material,
      );
      piece.position.set(cx * CLOUD_BLOCK_SIZE, cy * CLOUD_BLOCK_HEIGHT, cz * CLOUD_BLOCK_SIZE);
      cloud.add(piece);
    });
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
let lastAutoHit = performance.now();
const offlineXp = calculateOfflineXp(state);
updateWorldScene();

const levelEl = document.querySelector('#level')!;
const xpLabelEl = document.querySelector('#xp-label')!;
const xpFillEl = document.querySelector<HTMLElement>('#xp-fill')!;
const totalXpEl = document.querySelector('#total-xp')!;
const autoRateEl = document.querySelector('#auto-rate')!;
const pointsEl = document.querySelector('#upgrade-points')!;
const speedButton = document.querySelector<HTMLButtonElement>('#speed-upgrade')!;
const toolNameEl = document.querySelector('#tool-name')!;
const toolRankEl = document.querySelector('#tool-rank')!;
const toolDescriptionEl = document.querySelector('#tool-description')!;
const toolButton = document.querySelector<HTMLButtonElement>('#tool-upgrade')!;
const worldNameEl = document.querySelector('#world-name')!;
const worldRankEl = document.querySelector('#world-rank')!;
const worldDescriptionEl = document.querySelector('#world-description')!;
const expansionDirectionsEl = document.querySelector<HTMLElement>('#expansion-directions')!;
const directionButtons = document.querySelectorAll<HTMLButtonElement>('[data-expansion-direction]');
const worldButton = document.querySelector<HTMLButtonElement>('#world-upgrade')!;
const currentRateEl = document.querySelector('#current-rate')!;
const nextRateEl = document.querySelector('#next-rate')!;
const totalXpCard = totalXpEl.closest<HTMLElement>('.stat-card')!;
const offlineModal = document.querySelector<HTMLDivElement>('#offline-modal')!;
const zoomOutButton = document.querySelector<HTMLButtonElement>('#zoom-out')!;
const zoomInButton = document.querySelector<HTMLButtonElement>('#zoom-in')!;
const zoomLevelEl = document.querySelector('#zoom-level')!;
const currentToolEl = document.querySelector('#current-tool')!;
const currentToolHintEl = document.querySelector('#current-tool-hint')!;
const toolIconGroups = document.querySelectorAll<SVGGElement>('[data-tool-icon]');
const skillTreeButton = document.querySelector<HTMLButtonElement>('#skill-tree-button')!;
const skillTreeOverlay = document.querySelector<HTMLElement>('#skill-tree-overlay')!;
const skillTreeClose = document.querySelector<HTMLButtonElement>('#skill-tree-close')!;
const skillTreeGraph = document.querySelector<HTMLElement>('#skill-tree-graph')!;
let hoveredNode: BlockNode | null = null;
let xpFlashTimeout = 0;
let selectedExpansionDirection: WorldDirection = 'north';

if (offlineXp > 0) {
  addXp(state, offlineXp);
  document.querySelector('#offline-xp')!.textContent = `${offlineXp.toLocaleString()} XP`;
  offlineModal.hidden = false;
}

function updateCurrentTool(): void {
  const profile = hoveredNode ? getContextTool(state, hoveredNode.type) : TOOL_KIND_PROFILES.hand;
  currentToolEl.textContent = profile.name;
  currentToolHintEl.textContent = hoveredNode
    ? `${BLOCK_DEFINITIONS[hoveredNode.type].resourceName} · ${profile.harvestPower} XP/strike`
    : 'Point at a block';
  toolIconGroups.forEach((group) => {
    group.style.display = group.dataset.toolIcon === profile.kind ? '' : 'none';
  });
}

function getSkillNodeState(node: SkillNodeDefinition): 'locked' | 'available' | 'ready' {
  if (node.prerequisites.length > 0) return 'locked';
  return state.craftingPoints >= node.cost.craftingPoints ? 'ready' : 'available';
}

function getSkillNodeTitle(id: string): string {
  return SKILL_TREE_NODES.find((node) => node.id === id)?.title ?? id;
}

function renderSkillTree(): void {
  skillTreeGraph.replaceChildren();
  const summary = document.createElement('p');
  summary.className = 'skill-tree-summary';
  summary.textContent = `${SKILL_TREE_NODES.length} planned nodes · ${SKILL_TREE_BRANCHES.length} branches · Crafting Points unlock the tree`;
  skillTreeGraph.append(summary);

  const branches = document.createElement('div');
  branches.className = 'skill-tree-branch-grid';
  SKILL_TREE_BRANCHES.forEach((branch, index) => {
    const branchSection = document.createElement('section');
    branchSection.className = 'skill-tree-branch';
    branchSection.style.setProperty('--branch-colour', branch.colour);

    const heading = document.createElement('header');
    heading.className = 'skill-tree-branch-heading';
    const branchIndex = document.createElement('span');
    branchIndex.className = 'skill-tree-branch-index';
    branchIndex.textContent = String(index + 1).padStart(2, '0');
    const headingCopy = document.createElement('div');
    const headingTitle = document.createElement('strong');
    headingTitle.textContent = branch.title;
    const headingSubtitle = document.createElement('small');
    headingSubtitle.textContent = branch.subtitle;
    headingCopy.append(headingTitle, headingSubtitle);
    heading.append(branchIndex, headingCopy);
    branchSection.append(heading);

    const nodeList = document.createElement('div');
    nodeList.className = 'skill-tree-node-list';
    getSkillTreeBranch(branch.id).forEach((node) => {
      const stateName = getSkillNodeState(node);
      const nodeCard = document.createElement('article');
      nodeCard.className = `skill-tree-node skill-tree-node--${node.kind}`;
      nodeCard.dataset.state = stateName;
      nodeCard.dataset.skillNodeId = node.id;
      nodeCard.setAttribute('aria-label', `${node.title}, ${stateName}`);

      const nodeTopline = document.createElement('div');
      nodeTopline.className = 'skill-tree-node-topline';
      const kind = document.createElement('span');
      kind.className = 'skill-tree-node-kind';
      kind.textContent = node.kind;
      const state = document.createElement('span');
      state.className = 'skill-tree-node-state';
      state.textContent = stateName === 'ready' ? 'READY' : stateName.toUpperCase();
      nodeTopline.append(kind, state);

      const title = document.createElement('strong');
      title.textContent = node.title;
      const description = document.createElement('p');
      description.textContent = node.description;
      const effect = document.createElement('span');
      effect.className = 'skill-tree-node-effect';
      effect.textContent = node.effect;
      const consequence = document.createElement('small');
      consequence.className = 'skill-tree-node-consequence';
      consequence.textContent = `World: ${node.worldConsequence}`;

      const footer = document.createElement('div');
      footer.className = 'skill-tree-node-footer';
      const cost = document.createElement('span');
      cost.textContent = `${node.cost.craftingPoints} CP`;
      const rank = document.createElement('span');
      rank.textContent = node.maxRank > 1 ? `${node.maxRank} ranks` : '1 rank';
      footer.append(cost, rank);

      const prerequisites = document.createElement('small');
      prerequisites.className = 'skill-tree-node-prerequisites';
      prerequisites.textContent = node.prerequisites.length > 0
        ? `Requires: ${node.prerequisites.map(getSkillNodeTitle).join(' · ')}`
        : 'Branch starting point';

      nodeCard.append(nodeTopline, title, description, effect, consequence, footer, prerequisites);
      nodeList.append(nodeCard);
    });
    branchSection.append(nodeList);
    branches.append(branchSection);
  });
  skillTreeGraph.append(branches);
}

function updateUi(): void {
  const required = xpRequired(state.level);
  const rate = getAutoRate(state);
  levelEl.textContent = String(state.level);
  xpLabelEl.textContent = `${state.xp.toLocaleString()} / ${required.toLocaleString()} XP`;
  xpFillEl.style.width = `${Math.min(100, state.xp / required * 100)}%`;
  totalXpEl.textContent = state.totalXp.toLocaleString();
  autoRateEl.textContent = rate.toFixed(1);
  pointsEl.textContent = `${state.craftingPoints} CP`;
  currentRateEl.textContent = rate.toFixed(1);
  const maxed = state.speedRank >= SPEED_RATES.length - 1;
  nextRateEl.textContent = maxed ? 'MAX' : SPEED_RATES[state.speedRank + 1].toFixed(1);
  speedButton.disabled = state.level < 2 || state.craftingPoints < 1 || maxed;
  speedButton.textContent = maxed
    ? 'Maximum speed reached'
    : state.level < 2
      ? 'Unlock at Level 2 · Costs 1 CP'
      : state.craftingPoints < 1
        ? 'Requires 1 Crafting Point'
        : 'Upgrade Auto Rate · Costs 1 CP';
  const tool = getTool(state);
  const nextTool = TOOL_TIERS[state.toolRank + 1];
  const toolMaxed = !nextTool;
  toolNameEl.textContent = tool.name;
  toolRankEl.textContent = `TIER ${state.toolRank}`;
  toolDescriptionEl.textContent = tool.description;
  toolButton.disabled = toolMaxed || state.level < nextTool.requiredLevel || state.craftingPoints < nextTool.cost;
  toolButton.textContent = toolMaxed
    ? 'All available tools unlocked'
    : state.level < nextTool.requiredLevel
      ? `Unlock at Level ${nextTool.requiredLevel} · Costs ${nextTool.cost} CP`
      : state.craftingPoints < nextTool.cost
        ? `Requires ${nextTool.cost} Crafting Point${nextTool.cost === 1 ? '' : 's'}`
        : `Unlock ${nextTool.name} · Costs ${nextTool.cost} CP`;
  const worldTier = getWorldTier(state);
  const nextWorld = WORLD_TIERS[state.worldRank + 1];
  const worldMaxed = !nextWorld;
  worldNameEl.textContent = worldTier.name;
  worldRankEl.textContent = `TIER ${state.worldRank}`;
  worldDescriptionEl.textContent = worldTier.description;
  worldButton.disabled = worldMaxed || state.level < nextWorld.requiredLevel || state.craftingPoints < nextWorld.cost;
  worldButton.textContent = worldMaxed
    ? 'All available expansions unlocked'
    : state.level < nextWorld.requiredLevel
      ? `Unlock at Level ${nextWorld.requiredLevel} · Costs ${nextWorld.cost} CP`
      : state.craftingPoints < nextWorld.cost
        ? `Requires ${nextWorld.cost} Crafting Point${nextWorld.cost === 1 ? '' : 's'}`
        : `Expand to ${nextWorld.name} · Costs ${nextWorld.cost} CP`;
  const canChooseDirection = state.worldRank >= 1 && !worldMaxed;
  const availableDirections = WORLD_DIRECTIONS.filter((direction) => !state.expansionDirections.includes(direction));
  if (!availableDirections.includes(selectedExpansionDirection)) {
    selectedExpansionDirection = availableDirections[0] ?? 'north';
  }
  expansionDirectionsEl.hidden = !canChooseDirection;
  directionButtons.forEach((button) => {
    const direction = button.dataset.expansionDirection as WorldDirection;
    const used = state.expansionDirections.includes(direction);
    button.disabled = !canChooseDirection || used;
    button.setAttribute('aria-pressed', String(canChooseDirection && !used && direction === selectedExpansionDirection));
  });
  updateCurrentTool();
}

function flashXpCard(): void {
  totalXpCard.classList.remove('is-gaining');
  void totalXpCard.offsetWidth;
  totalXpCard.classList.add('is-gaining');
  window.clearTimeout(xpFlashTimeout);
  xpFlashTimeout = window.setTimeout(() => totalXpCard.classList.remove('is-gaining'), 480);
}

function mine(node: BlockNode): void {
  const harvestPower = getContextTool(state, node.type).harvestPower;
  const levelUps = addXp(state, harvestPower);
  node.pulse = 1;
  harvestResource(state, node.type);
  flashXpCard();
  if (levelUps > 0) {
    document.body.classList.add('level-up');
    window.setTimeout(() => document.body.classList.remove('level-up'), 900);
  }
  updateUi();
}

function getBlockAtPointer(event: PointerEvent): BlockNode | null {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(miningTargets, false)[0];
  return hit ? blockByMesh.get(hit.object) ?? null : null;
}

function setHoveredNode(nextNode: BlockNode | null): void {
  if (nextNode === hoveredNode) return;
  if (hoveredNode) hoveredNode.hoverOutline.visible = false;
  hoveredNode = nextNode;
  if (hoveredNode) hoveredNode.hoverOutline.visible = true;
  updateCurrentTool();
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
  setHoveredNode(getBlockAtPointer(event));
}

canvas.addEventListener('pointerdown', (event) => {
  if (event.button === 0) {
    // The hover raycast is the source of truth for left-click handoff. This
    // keeps a visible block hover from falling back to camera orbit on press.
    const node = hoveredNode ?? getBlockAtPointer(event);
    if (node) {
      setHoveredNode(node);
      mine(node);
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
  setHoveredNode(null);
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
    skillTreeClose.focus();
  }
  else skillTreeButton.focus();
}

skillTreeButton.addEventListener('click', () => setSkillTreeOpen(true));
skillTreeClose.addEventListener('click', () => setSkillTreeOpen(false));
skillTreeOverlay.addEventListener('click', (event) => {
  if (event.target === skillTreeOverlay) setSkillTreeOpen(false);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !skillTreeOverlay.hidden) setSkillTreeOpen(false);
});

directionButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const direction = button.dataset.expansionDirection as WorldDirection;
    if (!WORLD_DIRECTIONS.includes(direction)) return;
    selectedExpansionDirection = direction;
    updateUi();
  });
});

document.querySelector('#mine-button')!.addEventListener('click', () => mine(blockNodes[0]));
document.addEventListener('keydown', (event) => {
  if (event.code === 'Space' && !event.repeat) {
    event.preventDefault();
    mine(blockNodes[0]);
  }
  if (PAN_KEYS.has(event.code)) {
    event.preventDefault();
    heldCameraKeys.add(event.code);
  }
});
document.addEventListener('keyup', (event) => heldCameraKeys.delete(event.code));
window.addEventListener('blur', () => heldCameraKeys.clear());

speedButton.addEventListener('click', () => {
  if (buySpeedUpgrade(state)) {
    lastAutoHit = performance.now();
    updateUi();
    saveState(localStorage, state);
  }
});

toolButton.addEventListener('click', () => {
  if (buyToolUpgrade(state)) {
    updateUi();
    saveState(localStorage, state);
  }
});

worldButton.addEventListener('click', () => {
  if (buyWorldExpansion(state, selectedExpansionDirection)) {
    updateWorldScene();
    updateUi();
    saveState(localStorage, state);
  }
});

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

function render(now: number): void {
  const delta = Math.min(clock.getDelta(), 0.05);
  updateCameraPan(delta);
  const interval = 1000 / getAutoRate(state);
  if (now - lastAutoHit >= interval) {
    const hits = Math.min(5, Math.floor((now - lastAutoHit) / interval));
    for (let i = 0; i < hits; i += 1) mine(blockNodes[0]);
    lastAutoHit += hits * interval;
  }

  blockNodes.forEach((node) => {
    node.pulse = Math.max(0, node.pulse - delta * 3.8);
    const pulse = Math.sin(node.pulse * Math.PI);
    const squash = pulse * 0.095;
    node.mesh.scale.set(1 + squash, 1 - squash * 0.7, 1 + squash);
    node.mesh.position.y = node.coordinate.y * BLOCK_SIZE - pulse * 0.035;
  });
  clouds.forEach((cloud, index) => {
    cloud.position.x += delta * (0.045 + index * 0.012);
    if (cloud.position.x > 6) cloud.position.x = -6;
  });

  renderer.render(scene, camera);
  requestAnimationFrame(render);
}
requestAnimationFrame(render);
