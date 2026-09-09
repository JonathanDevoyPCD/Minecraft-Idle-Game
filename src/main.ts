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
  getTool,
  getWorldTier,
  harvestResource,
  loadState,
  saveState,
  TOOL_TIERS,
  TOOL_KIND_PROFILES,
  WORLD_TIERS,
  type BlockType,
  xpRequired,
} from './game';

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
  new THREE.PlaneGeometry(BLOCK_SIZE * 4.2, BLOCK_SIZE * 4.2),
  new THREE.ShadowMaterial({ color: 0x1d7288, opacity: 0.17 }),
);
shadowPlane.rotation.x = -Math.PI / 2;
shadowPlane.position.y = -BLOCK_SIZE * 0.56;
shadowPlane.receiveShadow = true;
scene.add(shadowPlane);

const shadowBase = new THREE.Mesh(
  new THREE.PlaneGeometry(BLOCK_SIZE * 4.8, BLOCK_SIZE * 4.8),
  new THREE.MeshBasicMaterial({ color: 0x2b879c, transparent: true, opacity: 0.07, depthWrite: false }),
);
shadowBase.rotation.x = -Math.PI / 2;
shadowBase.position.y = -BLOCK_SIZE * 0.58;
scene.add(shadowBase);

const world = new THREE.Group();
scene.add(world);

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
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE),
  [grassSideMaterial, grassSideMaterial, grassMaterial, dirtMaterial, grassSideMaterial, grassSideMaterial],
);
cube.castShadow = true;
cube.receiveShadow = true;
world.add(cube);

const neighborBlock = new THREE.Mesh(
  new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE),
  [dirtMaterial, dirtMaterial, dirtMaterial, dirtMaterial, dirtMaterial, dirtMaterial],
);
neighborBlock.position.x = BLOCK_SIZE;
neighborBlock.castShadow = true;
neighborBlock.receiveShadow = true;
neighborBlock.visible = false;
world.add(neighborBlock);

const stoneBlock = new THREE.Mesh(
  new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE),
  [stoneMaterial, stoneMaterial, stoneMaterial, stoneMaterial, stoneMaterial, stoneMaterial],
);
stoneBlock.position.z = BLOCK_SIZE;
stoneBlock.castShadow = true;
stoneBlock.receiveShadow = true;
stoneBlock.visible = false;
world.add(stoneBlock);

interface BlockNode {
  id: string;
  type: BlockType;
  mesh: THREE.Mesh;
  pulse: number;
}

const blockNodes: BlockNode[] = [
  { id: 'grass-0', type: 'grass', mesh: cube, pulse: 0 },
  { id: 'dirt-1', type: 'dirt', mesh: neighborBlock, pulse: 0 },
  { id: 'stone-2', type: 'stone', mesh: stoneBlock, pulse: 0 },
];
const blockByMesh = new Map<THREE.Object3D, BlockNode>(blockNodes.map((node) => [node.mesh, node]));
const miningTargets: THREE.Mesh[] = [];

function updateWorldScene(): void {
  const isExpanded = state.worldRank >= 1;
  blockNodes.forEach((node, index) => {
    node.mesh.visible = index === 0 || isExpanded;
  });
  miningTargets.length = 0;
  blockNodes.forEach((node) => {
    if (node.mesh.visible) miningTargets.push(node.mesh);
  });
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
let state = loadState(localStorage);
let isResetting = false;
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
const worldButton = document.querySelector<HTMLButtonElement>('#world-upgrade')!;
const currentRateEl = document.querySelector('#current-rate')!;
const nextRateEl = document.querySelector('#next-rate')!;
const worldEyebrowEl = document.querySelector('#world-eyebrow')!;
const worldTitleEl = document.querySelector('#world-title')!;
const hintEl = document.querySelector('#hint')!;
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
let hoveredNode: BlockNode | null = null;
let xpFlashTimeout = 0;

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

function updateWorldCopy(): void {
  const worldTier = getWorldTier(state);
  const targetDefinition = hoveredNode ? BLOCK_DEFINITIONS[hoveredNode.type] : null;
  worldEyebrowEl.textContent = targetDefinition
    ? `BLOCK TARGET · ${targetDefinition.name.toUpperCase()}`
    : `WORLD ${state.worldRank === 0 ? 'SEED' : 'GROWTH'} · ${worldTier.name.toUpperCase()}`;
  worldTitleEl.textContent = targetDefinition ? targetDefinition.name : state.worldRank === 0 ? 'Grass Block' : worldTier.name;
  hintEl.textContent = targetDefinition
    ? `Harvest ${targetDefinition.resourceName.toLowerCase()} with ${getContextTool(state, hoveredNode!.type).name}`
    : `${worldTier.blockCount} block${worldTier.blockCount === 1 ? '' : 's'} ready · Click a block to harvest`;
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
  updateWorldCopy();
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

function handleCanvasPointer(event: PointerEvent): void {
  if (event.button !== 0) return;
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(miningTargets)[0];
  if (hit) {
    const node = blockByMesh.get(hit.object);
    if (node) {
      hoveredNode = node;
      updateCurrentTool();
      mine(node);
    }
  }
}

function updateHoverTarget(event: PointerEvent): void {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(miningTargets)[0];
  const nextNode = hit ? blockByMesh.get(hit.object) ?? null : null;
  if (nextNode === hoveredNode) return;
  hoveredNode = nextNode;
  updateWorldCopy();
  updateCurrentTool();
}

canvas.addEventListener('pointerdown', (event) => {
  if (event.button === 1) {
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
    return;
  }
  handleCanvasPointer(event);
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
  orbitYaw -= deltaX * 0.008;
  orbitPitch = THREE.MathUtils.clamp(orbitPitch - deltaY * 0.006, 0.18, 1.35);
  updateCameraTransform();
});
canvas.addEventListener('pointerleave', () => {
  hoveredNode = null;
  updateWorldCopy();
  updateCurrentTool();
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
}
canvas.addEventListener('pointerup', endOrbit);
canvas.addEventListener('pointercancel', endOrbit);
canvas.addEventListener('contextmenu', (event) => event.preventDefault());

function setSkillTreeOpen(open: boolean): void {
  skillTreeOverlay.hidden = !open;
  skillTreeButton.setAttribute('aria-expanded', String(open));
  if (open) skillTreeClose.focus();
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
  if (buyWorldExpansion(state)) {
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
    node.pulse = Math.max(0, node.pulse - delta * 5.8);
    const squash = Math.sin((1 - node.pulse) * Math.PI) * 0.065;
    node.mesh.scale.set(1 + squash, 1 - squash * 0.7, 1 + squash);
  });
  clouds.forEach((cloud, index) => {
    cloud.position.x += delta * (0.045 + index * 0.012);
    if (cloud.position.x > 6) cloud.position.x = -6;
  });

  renderer.render(scene, camera);
  requestAnimationFrame(render);
}
requestAnimationFrame(render);
