import * as THREE from 'three';
import { clampCameraTarget, getCameraPanBounds, getPanTargetDelta } from './camera-math';
import {
  CAMERA_MAX_ZOOM,
  CAMERA_MIN_ZOOM,
  CAMERA_PITCH,
  CAMERA_START_ZOOM,
  CAMERA_YAW,
  CAMERA_ZOOM_SMOOTHING,
  getBaseCameraViewHeight,
} from './world-config';
import { createWorldGrid } from './world-grid';
import { createWorldScene } from './world-scene';

const canvasElement = document.querySelector<HTMLCanvasElement>('#world');
if (!canvasElement) throw new Error('World foundation canvas is missing.');
const canvas: HTMLCanvasElement = canvasElement;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7bc5dc);
const worldGrid = createWorldGrid();
const worldResources = createWorldScene(scene, worldGrid);

scene.add(new THREE.HemisphereLight(0xd9f5ff, 0x546a42, 2.1));
const sun = new THREE.DirectionalLight(0xfff2cf, 3.15);
sun.position.set(32, 50, -38);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -42;
sun.shadow.camera.right = 42;
sun.shadow.camera.top = 42;
sun.shadow.camera.bottom = -42;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 150;
sun.shadow.bias = -0.00025;
scene.add(sun);

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 260);
const cameraTarget = new THREE.Vector3(0, 0, 0);
const cameraDistance = 115;
let baseViewHeight = 56;
let viewportAspect = 1;
let viewZoom = CAMERA_START_ZOOM;
let targetZoom = CAMERA_START_ZOOM;
let isPanning = false;
let previousPointerX = 0;
let previousPointerY = 0;
let lastFrameAt = performance.now();

function updateCameraTransform(): void {
  const horizontalRadius = cameraDistance * Math.cos(CAMERA_PITCH);
  camera.position.set(
    cameraTarget.x + horizontalRadius * Math.cos(CAMERA_YAW),
    cameraTarget.y + cameraDistance * Math.sin(CAMERA_PITCH),
    cameraTarget.z + horizontalRadius * Math.sin(CAMERA_YAW),
  );
  camera.lookAt(cameraTarget);
}

function clampCamera(): void {
  const bounds = getCameraPanBounds(viewportAspect, baseViewHeight, viewZoom);
  const clamped = clampCameraTarget(cameraTarget, bounds);
  cameraTarget.x = clamped.x;
  cameraTarget.z = clamped.z;
}

function resize(): void {
  const width = Math.max(1, window.innerWidth);
  const height = Math.max(1, window.innerHeight);
  const aspect = width / height;
  viewportAspect = aspect;
  renderer.setSize(width, height, false);
  baseViewHeight = getBaseCameraViewHeight(aspect);
  camera.left = -baseViewHeight * aspect / 2;
  camera.right = baseViewHeight * aspect / 2;
  camera.top = baseViewHeight / 2;
  camera.bottom = -baseViewHeight / 2;
  camera.updateProjectionMatrix();
  clampCamera();
  updateCameraTransform();
}

function updateZoom(deltaSeconds: number): void {
  const smoothing = 1 - Math.exp(-CAMERA_ZOOM_SMOOTHING * deltaSeconds);
  viewZoom += (targetZoom - viewZoom) * smoothing;
  if (Math.abs(targetZoom - viewZoom) < 0.0005) viewZoom = targetZoom;
  camera.zoom = viewZoom;
  camera.updateProjectionMatrix();
  clampCamera();
}

canvas.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 || isPanning) return;
  isPanning = true;
  previousPointerX = event.clientX;
  previousPointerY = event.clientY;
  canvas.classList.add('is-panning');
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener('pointermove', (event) => {
  if (!isPanning) return;
  const deltaX = event.clientX - previousPointerX;
  const deltaY = event.clientY - previousPointerY;
  previousPointerX = event.clientX;
  previousPointerY = event.clientY;
  const rect = canvas.getBoundingClientRect();
  const worldUnitsPerPixel = baseViewHeight / (viewZoom * Math.max(1, rect.height));
  const delta = getPanTargetDelta(deltaX, deltaY, worldUnitsPerPixel);
  cameraTarget.x += delta.x;
  cameraTarget.z += delta.z;
  clampCamera();
  updateCameraTransform();
});

function stopPanning(event: PointerEvent): void {
  if (!isPanning) return;
  isPanning = false;
  canvas.classList.remove('is-panning');
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
}

canvas.addEventListener('pointerup', stopPanning);
canvas.addEventListener('pointercancel', stopPanning);
canvas.addEventListener('lostpointercapture', () => {
  isPanning = false;
  canvas.classList.remove('is-panning');
});
canvas.addEventListener('contextmenu', (event) => event.preventDefault());
canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  targetZoom = THREE.MathUtils.clamp(targetZoom * Math.exp(-event.deltaY * 0.00125), CAMERA_MIN_ZOOM, CAMERA_MAX_ZOOM);
}, { passive: false });

window.addEventListener('resize', resize);
window.addEventListener('beforeunload', worldResources.dispose, { once: true });

function render(now: number): void {
  const deltaSeconds = Math.min((now - lastFrameAt) / 1000, 0.05);
  lastFrameAt = now;
  updateZoom(deltaSeconds);
  updateCameraTransform();
  renderer.render(scene, camera);
  window.requestAnimationFrame(render);
}

resize();
window.requestAnimationFrame(render);
