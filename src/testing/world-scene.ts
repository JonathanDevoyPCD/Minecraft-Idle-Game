import * as THREE from 'three';
import { PLAYABLE_SIZE, TILE_SIZE, WORLD_SIZE, WORLD_SPAN } from './world-config';
import { createBorderDecorationPlan, getWorldPosition, type WorldCell } from './world-grid';

const SURFACE_THICKNESS = 0.72;
const PLAYABLE_SPAN = TILE_SIZE * PLAYABLE_SIZE;

export interface WorldSceneResources {
  dispose: () => void;
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

export function createWorldScene(scene: THREE.Scene, grid: readonly WorldCell[]): WorldSceneResources {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const worldTexture = loadGrassTexture('grass_block_top.png', WORLD_SIZE, WORLD_SIZE);
  const clearingTexture = loadGrassTexture('grass_block_top.png', PLAYABLE_SIZE, PLAYABLE_SIZE);
  const sideTexture = loadGrassTexture('grass_block_side.png', WORLD_SIZE, 1);
  const dirtTexture = loadGrassTexture('dirt.png', WORLD_SIZE, 1);
  textures.push(worldTexture, clearingTexture, sideTexture, dirtTexture);

  const worldTopMaterial = new THREE.MeshStandardMaterial({ map: worldTexture, color: 0x789d4c, roughness: 1 });
  const clearingMaterial = new THREE.MeshStandardMaterial({ map: clearingTexture, color: 0x8abd51, roughness: 1 });
  const sideMaterial = new THREE.MeshStandardMaterial({ map: sideTexture, roughness: 1 });
  const dirtMaterial = new THREE.MeshStandardMaterial({ map: dirtTexture, roughness: 1 });
  materials.push(worldTopMaterial, clearingMaterial, sideMaterial, dirtMaterial);

  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(WORLD_SPAN, SURFACE_THICKNESS, WORLD_SPAN),
    [dirtMaterial, dirtMaterial, worldTopMaterial, dirtMaterial, sideMaterial, sideMaterial],
  );
  geometries.push(ground.geometry);
  ground.position.y = -SURFACE_THICKNESS / 2;
  ground.receiveShadow = true;
  ground.name = '60-by-60-world-slab';
  scene.add(ground);

  const clearing = new THREE.Mesh(new THREE.PlaneGeometry(PLAYABLE_SPAN, PLAYABLE_SPAN), clearingMaterial);
  geometries.push(clearing.geometry);
  clearing.rotation.x = -Math.PI / 2;
  clearing.position.set(0, 0.006, 0);
  clearing.receiveShadow = true;
  clearing.name = '50-by-50-playable-clearing';
  scene.add(clearing);

  addBorderDressing(scene, grid, geometries, materials, textures);

  return {
    dispose: () => {
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
      for (const texture of textures) texture.dispose();
    },
  };
}
