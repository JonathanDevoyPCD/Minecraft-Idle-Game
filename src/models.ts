import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import './models.css';

type Footprint = 1 | 2;

interface ModelSpec {
  id: string;
  name: string;
  role: string;
  footprint: Footprint;
  path: string;
  position: readonly [number, number];
}

interface LoadedModel {
  object: THREE.Group;
  baseScale: number;
  platformHeight: number;
}

const models: readonly ModelSpec[] = [
  { id: 'chicken', name: 'Chicken', role: '1×1 animal', footprint: 1, path: 'models/chicken/source/chicken.fbx', position: [-4.5, 2.3] },
  { id: 'pig', name: 'Pig', role: '1×1 animal', footprint: 1, path: 'models/pig/source/pig.fbx', position: [-1.5, 2.3] },
  { id: 'sheep', name: 'Sheep', role: '1×1 animal', footprint: 1, path: 'models/sheep/source/sheep.fbx', position: [1.5, 2.3] },
  { id: 'villager', name: 'Villager', role: '1×1 worker', footprint: 1, path: 'models/villager/source/villager.fbx', position: [4.5, 2.3] },
  { id: 'trader', name: 'Wandering Trader', role: '1×1 visitor', footprint: 1, path: 'models/wandering-trader/source/WanderingTrader.fbx', position: [-3, -2.6] },
  { id: 'cow', name: 'Cow', role: '2×2 animal', footprint: 2, path: 'models/cow/source/cow.fbx', position: [1.2, -2.6] },
  { id: 'horse', name: 'Horse', role: '2×2 animal', footprint: 2, path: 'models/horse/source/horse.fbx', position: [5.8, -2.6] },
];

const canvas = document.querySelector<HTMLCanvasElement>('#model-world')!;
const scaleInput = document.querySelector<HTMLInputElement>('#model-scale')!;
const scaleValue = document.querySelector<HTMLOutputElement>('#model-scale-value')!;
const resetButton = document.querySelector<HTMLButtonElement>('#reset-model-view')!;
const cardRoot = document.querySelector<HTMLElement>('#model-cards')!;
const status = document.querySelector<HTMLElement>('#model-load-status')!;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x4fb5d6, 13, 28);
const stage = new THREE.Group();
scene.add(stage);
scene.add(new THREE.HemisphereLight(0xd7f7ff, 0x46663f, 2.8));
const sunlight = new THREE.DirectionalLight(0xfff5d3, 3.8);
sunlight.position.set(7, 11, -5);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(1024, 1024);
sunlight.shadow.camera.left = -10;
sunlight.shadow.camera.right = 10;
sunlight.shadow.camera.top = 10;
sunlight.shadow.camera.bottom = -10;
scene.add(sunlight);

const camera = new THREE.OrthographicCamera(-8, 8, 6, -6, 0.1, 100);
const cameraTarget = new THREE.Vector3(0.6, 0, 0);
let orbitYaw = Math.PI / 4;
let orbitPitch = 0.72;
let zoom = 1;
const cameraRadius = 17;

function updateCamera(): void {
  const horizontal = cameraRadius * Math.cos(orbitPitch);
  camera.position.set(
    cameraTarget.x + horizontal * Math.cos(orbitYaw),
    cameraRadius * Math.sin(orbitPitch),
    cameraTarget.z + horizontal * Math.sin(orbitYaw),
  );
  camera.lookAt(cameraTarget);
  camera.zoom = zoom;
  camera.updateProjectionMatrix();
}

function resize(): void {
  const width = Math.max(1, window.innerWidth);
  const height = Math.max(1, window.innerHeight);
  const aspect = width / height;
  const span = 9;
  camera.left = -span * aspect;
  camera.right = span * aspect;
  camera.top = span;
  camera.bottom = -span;
  renderer.setSize(width, height, false);
  updateCamera();
}

const tileSize = 1.05;
const blockMaterial = new THREE.MeshStandardMaterial({ color: 0x8caf47, roughness: 0.92 });
const blockSideMaterial = new THREE.MeshStandardMaterial({ color: 0x806034, roughness: 1 });
const platformMaterials = [blockMaterial, blockMaterial, blockMaterial, blockMaterial, blockMaterial, blockSideMaterial];
const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xffefac, transparent: true, opacity: 0.88 });
const loaded = new Map<string, LoadedModel>();

function addPlatform(spec: ModelSpec): number {
  const width = spec.footprint * tileSize;
  const platformHeight = 0.34;
  const platform = new THREE.Mesh(new THREE.BoxGeometry(width, platformHeight, width), platformMaterials);
  platform.position.set(spec.position[0], platformHeight / 2, spec.position[1]);
  platform.receiveShadow = true;
  platform.castShadow = true;
  stage.add(platform);

  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(width, 0.04, width)), edgeMaterial);
  edge.position.set(spec.position[0], platformHeight + 0.025, spec.position[1]);
  stage.add(edge);
  return platformHeight;
}

function addGrid(): void {
  const grid = new THREE.GridHelper(16, 16, 0x7fd0e3, 0x74bfd4);
  grid.position.y = -0.02;
  grid.material.transparent = true;
  grid.material.opacity = 0.22;
  stage.add(grid);
}

function applyScale(model: LoadedModel, multiplier: number): void {
  model.object.scale.setScalar(model.baseScale * multiplier);
  const bounds = new THREE.Box3().setFromObject(model.object);
  model.object.position.y += model.platformHeight - bounds.min.y;
}

function fallbackModel(spec: ModelSpec, platformHeight: number): LoadedModel {
  const object = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0xc8754d, roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(tileSize * spec.footprint * 0.7, tileSize * 0.72, tileSize * spec.footprint * 0.7), material);
  body.position.y = 0.36;
  body.castShadow = true;
  object.add(body);
  object.position.set(spec.position[0], platformHeight, spec.position[1]);
  stage.add(object);
  return { object, baseScale: 1, platformHeight };
}

function addCard(spec: ModelSpec): void {
  const card = document.createElement('article');
  card.className = 'model-card';
  card.dataset.model = spec.id;
  card.innerHTML = `<strong>${spec.name}</strong><span>${spec.role}</span><small>${spec.footprint}×${spec.footprint} footprint</small>`;
  cardRoot.append(card);
}

function markCard(spec: ModelSpec, state: 'loaded' | 'fallback'): void {
  const card = cardRoot.querySelector<HTMLElement>(`[data-model="${spec.id}"]`);
  if (card) card.dataset.state = state;
}

function prepareModel(object: THREE.Group, spec: ModelSpec, platformHeight: number): LoadedModel {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = true;
    child.receiveShadow = true;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if ('map' in material && material.map instanceof THREE.Texture) material.map.colorSpace = THREE.SRGBColorSpace;
    });
  });
  const sourceBounds = new THREE.Box3().setFromObject(object);
  const size = sourceBounds.getSize(new THREE.Vector3());
  const baseScale = tileSize * spec.footprint * 0.72 / Math.max(size.x, size.z, 0.001);
  const center = sourceBounds.getCenter(new THREE.Vector3());
  object.position.set(spec.position[0] - center.x, platformHeight - sourceBounds.min.y, spec.position[1] - center.z);
  stage.add(object);
  return { object, baseScale, platformHeight };
}

async function loadModel(spec: ModelSpec): Promise<void> {
  const platformHeight = addPlatform(spec);
  addCard(spec);
  const loader = new FBXLoader();
  try {
    const object = await loader.loadAsync(`${import.meta.env.BASE_URL}assets/${spec.path}`);
    const prepared = prepareModel(object, spec, platformHeight);
    loaded.set(spec.id, prepared);
    applyScale(prepared, Number(scaleInput.value) / 100);
    markCard(spec, 'loaded');
  } catch {
    const fallback = fallbackModel(spec, platformHeight);
    loaded.set(spec.id, fallback);
    markCard(spec, 'fallback');
  }
}

function updateScale(): void {
  const multiplier = Number(scaleInput.value) / 100;
  scaleValue.textContent = `${Math.round(multiplier * 100)}%`;
  loaded.forEach((model) => applyScale(model, multiplier));
}

function resetView(): void {
  orbitYaw = Math.PI / 4;
  orbitPitch = 0.72;
  zoom = 1;
  updateCamera();
}

let orbiting = false;
let lastPointer = { x: 0, y: 0 };
canvas.addEventListener('pointerdown', (event) => {
  orbiting = true;
  lastPointer = { x: event.clientX, y: event.clientY };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', (event) => {
  if (!orbiting) return;
  orbitYaw += (event.clientX - lastPointer.x) * 0.008;
  orbitPitch = THREE.MathUtils.clamp(orbitPitch + (event.clientY - lastPointer.y) * 0.006, 0.28, 1.2);
  lastPointer = { x: event.clientX, y: event.clientY };
  updateCamera();
});
canvas.addEventListener('pointerup', (event) => {
  orbiting = false;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
});
canvas.addEventListener('pointercancel', () => { orbiting = false; });
canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  zoom = THREE.MathUtils.clamp(zoom * (event.deltaY > 0 ? 0.92 : 1.08), 0.65, 1.6);
  updateCamera();
}, { passive: false });

scaleInput.addEventListener('input', updateScale);
resetButton.addEventListener('click', resetView);
window.addEventListener('resize', resize);

addGrid();
void Promise.all(models.map(loadModel)).then(() => {
  const fallbackCount = [...document.querySelectorAll('[data-state="fallback"]')].length;
  status.textContent = fallbackCount === 0
    ? `${models.length} models loaded · green cards use supplied FBX assets`
    : `${models.length - fallbackCount}/${models.length} FBX models loaded · orange cards need asset repair`;
});
resize();
renderer.setAnimationLoop(() => renderer.render(scene, camera));
