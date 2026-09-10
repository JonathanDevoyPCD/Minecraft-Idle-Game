import { mkdirSync, writeFileSync } from 'node:fs';
import * as THREE from 'three';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';

const BLOCK_SIZE = 0.9;
const outputDirectory = new URL('./public/assets/', import.meta.url);

function createMaterial(name, color) {
  const material = new THREE.MeshStandardMaterial({ color });
  material.name = name;
  return material;
}

function addPart(parent, material, name, size, position, rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size[0] * BLOCK_SIZE, size[1] * BLOCK_SIZE, size[2] * BLOCK_SIZE),
    material,
  );
  mesh.name = name;
  mesh.position.set(position[0] * BLOCK_SIZE, position[1] * BLOCK_SIZE, position[2] * BLOCK_SIZE);
  mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  parent.add(mesh);
}

function addSlopeFill(parent, material) {
  const halfWidth = 0.78 / 2;
  const rearZ = -0.42;
  const frontZ = 0.55;
  const groundY = 0.34;
  const peakY = 1.58;
  const vertices = [
    -halfWidth, groundY, rearZ,
    halfWidth, groundY, rearZ,
    -halfWidth, groundY, frontZ,
    halfWidth, groundY, frontZ,
    -halfWidth, peakY, frontZ,
    halfWidth, peakY, frontZ,
  ].map((value) => value * BLOCK_SIZE);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1], 2),
  );
  geometry.setIndex([
    0, 2, 3, 0, 3, 1,
    2, 3, 5, 2, 5, 4,
    0, 4, 5, 0, 5, 1,
    0, 2, 4,
    1, 5, 3,
  ]);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'rear-ground-seal';
  parent.add(mesh);
}

const mine = new THREE.Group();
mine.name = 'idlecraft-mine';

const stone = createMaterial('stone', 0x9aa4a3);
const stoneAccent = createMaterial('stone-accent', 0x697578);
const timber = createMaterial('timber', 0x8c5b36);
const dark = createMaterial('mine-darkness', 0x10191d);
const beam = createMaterial('dark-beam', 0x5f3e2a);

addPart(mine, dark, 'mine-opening', [0.78, 1.1, 0.12], [0, 1.0, 0.58]);
[-0.36, 0.36].forEach((x) => {
  addPart(mine, stone, 'entrance-stone-column', [0.16, 1.18, 0.3], [x, 0.96, 0.58]);
  addPart(mine, stoneAccent, 'entrance-stone-foot', [0.2, 0.18, 0.34], [x, 0.32, 0.58]);
  addPart(mine, timber, 'entrance-timber-post', [0.12, 1.4, 0.18], [x * 1.08, 0.95, 0.42]);
});
addPart(mine, stone, 'entrance-stone-header', [0.84, 0.2, 0.3], [0, 1.56, 0.58]);
addPart(mine, beam, 'entrance-timber-header', [0.92, 0.18, 0.22], [0, 1.68, 0.42]);
addPart(mine, timber, 'left-timber-foot', [0.14, 0.18, 0.3], [-0.39, 0.3, 0.42]);
addPart(mine, timber, 'right-timber-foot', [0.14, 0.18, 0.3], [0.39, 0.3, 0.42]);

const slopeRotation = [-Math.PI * 0.285, 0, 0];
addPart(mine, stone, 'rear-sloped-stone-shell', [0.78, 0.56, 1.12], [0, 0.98, 0.17], slopeRotation);
addSlopeFill(mine, stone);
[-0.27, 0, 0.27].forEach((x) => {
  addPart(mine, beam, 'rear-sloped-timber-rib', [0.13, 0.16, 1.14], [x, 1.25, -0.1], slopeRotation);
});
[
  { y: 0.92, z: -0.35 },
  { y: 1.22, z: -0.02 },
  { y: 1.5, z: 0.25 },
].forEach(({ y, z }) => {
  addPart(mine, timber, 'rear-cross-brace', [0.78, 0.11, 0.12], [0, y, z]);
});
addPart(mine, stoneAccent, 'buried-rear-stone-footing', [0.82, 0.18, 0.22], [0, 0.34, -0.34]);

mine.updateMatrixWorld(true);
const exporter = new OBJExporter();
const object = [
  '# IdleCraft mine structure',
  '# Units: 1 game block = 0.9 OBJ units',
  'mtllib idlecraft-mine.mtl',
  exporter.parse(mine),
].join('\n');

const materialLibrary = `# IdleCraft mine material library\n\nnewmtl stone\nKd 0.604 0.643 0.639\nKs 0.08 0.08 0.08\nNs 16\n\nnewmtl stone-accent\nKd 0.412 0.459 0.471\nKs 0.06 0.06 0.06\nNs 12\n\nnewmtl timber\nKd 0.549 0.357 0.212\nKs 0.04 0.04 0.04\nNs 8\n\nnewmtl mine-darkness\nKd 0.063 0.098 0.114\nKs 0 0 0\nNs 1\n\nnewmtl dark-beam\nKd 0.373 0.243 0.165\nKs 0.03 0.03 0.03\nNs 6\n`;

mkdirSync(outputDirectory, { recursive: true });
writeFileSync(new URL('./idlecraft-mine.obj', outputDirectory), object, 'utf8');
writeFileSync(new URL('./idlecraft-mine.mtl', outputDirectory), materialLibrary, 'utf8');

console.log('Exported public/assets/idlecraft-mine.obj and public/assets/idlecraft-mine.mtl');
