import * as THREE from 'three';
import './style.css';
import {
  SAVE_KEY,
  SPEED_RATES,
  addXp,
  buySpeedUpgrade,
  calculateOfflineXp,
  getAutoRate,
  loadState,
  saveState,
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
camera.position.set(6, 6, 6);
camera.lookAt(0, 0, 0);

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

const shadowPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(4.8, 4.8),
  new THREE.ShadowMaterial({ color: 0x1d7288, opacity: 0.17 }),
);
shadowPlane.rotation.x = -Math.PI / 2;
shadowPlane.position.y = -1.18;
shadowPlane.receiveShadow = true;
scene.add(shadowPlane);

const shadowBase = new THREE.Mesh(
  new THREE.PlaneGeometry(5.4, 5.4),
  new THREE.MeshBasicMaterial({ color: 0x2b879c, transparent: true, opacity: 0.07, depthWrite: false }),
);
shadowBase.rotation.x = -Math.PI / 2;
shadowBase.position.y = -1.2;
scene.add(shadowBase);

const block = new THREE.Group();
scene.add(block);

const dirtMaterials = [
  new THREE.MeshStandardMaterial({ color: 0x694329, roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: 0x52331f, roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: 0x694329, roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: 0x432a1b, roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: 0x75482a, roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: 0x5c3923, roughness: 1 }),
];

const cube = new THREE.Mesh(new THREE.BoxGeometry(2.45, 1.75, 2.45), dirtMaterials);
cube.position.y = -0.15;
cube.castShadow = true;
cube.receiveShadow = true;
block.add(cube);

const grassCapMaterials = [
  new THREE.MeshStandardMaterial({ color: 0x568b37, roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: 0x47732e, roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: 0x56883b, roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: 0x3c6128, roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: 0x5a8835, roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: 0x4b782f, roughness: 1 }),
];
const grassCap = new THREE.Mesh(new THREE.BoxGeometry(2.58, 0.34, 2.58), grassCapMaterials);
grassCap.position.y = 0.9;
grassCap.castShadow = true;
grassCap.receiveShadow = true;
block.add(grassCap);

const grassTufts = new THREE.Group();
const tuftMaterial = new THREE.MeshStandardMaterial({ color: 0x4c8a31, roughness: 1 });
for (const [x, z, height] of [[-0.7, -0.2, 0.24], [0.62, 0.45, 0.18], [0.15, -0.62, 0.14]] as const) {
  const tuft = new THREE.Mesh(new THREE.BoxGeometry(0.09, height, 0.09), tuftMaterial);
  tuft.position.set(x, 1.08 + height / 2, z);
  tuft.castShadow = true;
  grassTufts.add(tuft);
}
block.add(grassTufts);

const miningTargets = [cube, grassCap];

function createCloud(x: number, y: number, scale: number): THREE.Group {
  const cloud = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0xf7fbf4, roughness: 1 });
  [[0, 0, 0], [0.6, 0, 0], [-0.6, 0, 0], [0.05, 0.28, 0], [0.55, 0.22, 0]]
    .forEach(([cx, cy, cz]) => {
      const piece = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.38, 0.55), material);
      piece.position.set(cx, cy, cz);
      cloud.add(piece);
    });
  cloud.position.set(x, y, -2.2);
  cloud.scale.setScalar(scale);
  scene.add(cloud);
  return cloud;
}

const clouds = [createCloud(-5.2, 2.8, 0.65), createCloud(4.2, 2.2, 0.48), createCloud(3.2, 3.4, 0.32)];

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const VIEW_ZOOM_LEVELS = [0.72, 0.86, 1, 1.14, 1.28];
let viewZoomIndex = 0;
let rotationStep = 0;
let pulse = 0;
let lastAutoHit = performance.now();
let state = loadState(localStorage);
let isResetting = false;
const offlineXp = calculateOfflineXp(state);

const levelEl = document.querySelector('#level')!;
const xpLabelEl = document.querySelector('#xp-label')!;
const xpFillEl = document.querySelector<HTMLElement>('#xp-fill')!;
const totalXpEl = document.querySelector('#total-xp')!;
const autoRateEl = document.querySelector('#auto-rate')!;
const pointsEl = document.querySelector('#upgrade-points')!;
const speedButton = document.querySelector<HTMLButtonElement>('#speed-upgrade')!;
const currentRateEl = document.querySelector('#current-rate')!;
const nextRateEl = document.querySelector('#next-rate')!;
const upgradePanel = document.querySelector('#upgrade-panel')!;
const floatLayer = document.querySelector('#float-layer')!;
const offlineModal = document.querySelector<HTMLDivElement>('#offline-modal')!;
const zoomOutButton = document.querySelector<HTMLButtonElement>('#zoom-out')!;
const zoomInButton = document.querySelector<HTMLButtonElement>('#zoom-in')!;
const rotateViewButton = document.querySelector<HTMLButtonElement>('#rotate-view')!;
const zoomLevelEl = document.querySelector('#zoom-level')!;

if (offlineXp > 0) {
  addXp(state, offlineXp);
  document.querySelector('#offline-xp')!.textContent = `${offlineXp.toLocaleString()} XP`;
  offlineModal.hidden = false;
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
    ? 'Maximum prototype speed reached'
    : state.level < 2
      ? 'Unlock at Level 2 · Costs 1 CP'
      : state.craftingPoints < 1
        ? 'Requires 1 Crafting Point'
        : 'Upgrade Auto Rate · Costs 1 CP';
  upgradePanel.classList.toggle('is-unlocked', state.level >= 2);
}

function floatingXp(manual: boolean): void {
  const label = document.createElement('span');
  label.className = `floating-xp${manual ? ' manual' : ''}`;
  label.textContent = '+1 XP';
  label.style.setProperty('--drift', `${(Math.random() - 0.5) * 70}px`);
  floatLayer.append(label);
  label.addEventListener('animationend', () => label.remove());
}

function mine(manual = false): void {
  const levelUps = addXp(state, 1);
  pulse = 1;
  floatingXp(manual);
  if (levelUps > 0) {
    document.body.classList.add('level-up');
    window.setTimeout(() => document.body.classList.remove('level-up'), 900);
  }
  updateUi();
}

function handleCanvasPointer(event: PointerEvent): void {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  if (raycaster.intersectObjects(miningTargets).length > 0) mine(true);
}

canvas.addEventListener('pointerdown', handleCanvasPointer);
document.querySelector('#mine-button')!.addEventListener('click', () => mine(true));
document.addEventListener('keydown', (event) => {
  if (event.code === 'Space' && !event.repeat) {
    event.preventDefault();
    mine(true);
  }
});

speedButton.addEventListener('click', () => {
  if (buySpeedUpgrade(state)) {
    lastAutoHit = performance.now();
    updateUi();
    saveState(localStorage, state);
  }
});

document.querySelector('#offline-close')!.addEventListener('click', () => {
  offlineModal.hidden = true;
});

document.querySelector('#reset-button')!.addEventListener('click', () => {
  if (window.confirm('Reset all IdleCraft prototype progress?')) {
    isResetting = true;
    localStorage.removeItem(SAVE_KEY);
    window.location.reload();
  }
});

function updateViewControls(): void {
  const zoom = VIEW_ZOOM_LEVELS[viewZoomIndex];
  camera.zoom = zoom;
  camera.updateProjectionMatrix();
  zoomLevelEl.textContent = `${Math.round(zoom * 100)}%`;
  zoomOutButton.disabled = viewZoomIndex === 0;
  zoomInButton.disabled = viewZoomIndex === VIEW_ZOOM_LEVELS.length - 1;
}

function changeZoom(direction: number): void {
  const nextIndex = Math.max(0, Math.min(VIEW_ZOOM_LEVELS.length - 1, viewZoomIndex + direction));
  if (nextIndex === viewZoomIndex) return;
  viewZoomIndex = nextIndex;
  updateViewControls();
}

zoomOutButton.addEventListener('click', () => changeZoom(-1));
zoomInButton.addEventListener('click', () => changeZoom(1));
rotateViewButton.addEventListener('click', () => {
  rotationStep = (rotationStep + 1) % 4;
  block.rotation.y = rotationStep * Math.PI / 2;
});
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
function render(now: number): void {
  const delta = Math.min(clock.getDelta(), 0.05);
  const interval = 1000 / getAutoRate(state);
  if (now - lastAutoHit >= interval) {
    const hits = Math.min(5, Math.floor((now - lastAutoHit) / interval));
    for (let i = 0; i < hits; i += 1) mine(false);
    lastAutoHit += hits * interval;
  }

  pulse = Math.max(0, pulse - delta * 5.8);
  const squash = Math.sin((1 - pulse) * Math.PI) * 0.065;
  block.scale.set(1 + squash, 1 - squash * 0.7, 1 + squash);
  block.position.y = Math.sin(now * 0.0008) * 0.05;
  clouds.forEach((cloud, index) => {
    cloud.position.x += delta * (0.045 + index * 0.012);
    if (cloud.position.x > 6) cloud.position.x = -6;
  });

  renderer.render(scene, camera);
  requestAnimationFrame(render);
}
requestAnimationFrame(render);
