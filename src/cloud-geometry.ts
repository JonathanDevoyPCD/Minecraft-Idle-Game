import * as THREE from 'three';

export type CloudCell = readonly [number, number, number];

interface CloudFaceDefinition {
  normal: readonly [number, number, number];
  neighbor: readonly [number, number, number];
  corners: readonly (readonly [number, number, number])[];
}

const CLOUD_FACE_DEFINITIONS: readonly CloudFaceDefinition[] = [
  { normal: [1, 0, 0], neighbor: [1, 0, 0], corners: [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]] },
  { normal: [-1, 0, 0], neighbor: [-1, 0, 0], corners: [[-1, -1, 1], [-1, 1, 1], [-1, 1, -1], [-1, -1, -1]] },
  { normal: [0, 1, 0], neighbor: [0, 1, 0], corners: [[-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1]] },
  { normal: [0, -1, 0], neighbor: [0, -1, 0], corners: [[-1, -1, 1], [-1, -1, -1], [1, -1, -1], [1, -1, 1]] },
  { normal: [0, 0, 1], neighbor: [0, 0, 1], corners: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]] },
  { normal: [0, 0, -1], neighbor: [0, 0, -1], corners: [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]] },
];

export function createCloudGeometry(
  cells: readonly CloudCell[],
  blockSize: number,
  blockHeight: number,
): THREE.BufferGeometry {
  const occupied = new Set(cells.map(([x, y, z]) => `${x},${y},${z}`));
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const halfWidth = blockSize / 2;
  const halfHeight = blockHeight / 2;
  const faceUvs = [[0, 0], [1, 0], [1, 1], [0, 1]];

  cells.forEach(([cellX, cellY, cellZ]) => {
    CLOUD_FACE_DEFINITIONS.forEach((face) => {
      const [neighborX, neighborY, neighborZ] = face.neighbor;
      if (occupied.has(`${cellX + neighborX},${cellY + neighborY},${cellZ + neighborZ}`)) return;

      const baseVertex = positions.length / 3;
      face.corners.forEach(([x, y, z], index) => {
        positions.push(
          cellX * blockSize + x * halfWidth,
          cellY * blockHeight + y * halfHeight,
          cellZ * blockSize + z * halfWidth,
        );
        normals.push(...face.normal);
        uvs.push(...faceUvs[index]);
      });
      indices.push(
        baseVertex, baseVertex + 1, baseVertex + 2,
        baseVertex, baseVertex + 2, baseVertex + 3,
      );
    });
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}
