/**
 * src/services/bobCobParser.ts — Ballistica .bob and .cob Binary Mesh Decoder
 * 
 * TypeScript binary parser for:
 * - .bob (Ballistica Object Binary, magic: 45623) -> Three.js BufferGeometry
 * - .cob (Collision Object Binary, magic: 13466) -> Three.js Wireframe/Hull Geometry
 */

import * as THREE from 'three';

export const BOB_MAGIC = 45623;
export const COB_MAGIC = 13466;

export interface BobData {
  type: 'bob';
  meshFormat: number;
  vertexCount: number;
  faceCount: number;
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint16Array;
}

export interface CobData {
  type: 'cob';
  vertexCount: number;
  faceCount: number;
  positions: Float32Array;
  indices: Uint32Array;
}

export function parseBobToArray(arrayBuffer: ArrayBuffer): BobData {
  const view = new DataView(arrayBuffer);
  if (arrayBuffer.byteLength < 16) {
    throw new Error('File is too small to be a valid .bob asset.');
  }

  let offset = 0;
  const magicShort = view.getUint16(offset, true);
  let meshFormat = 0;

  if (magicShort === BOB_MAGIC) {
    offset += 2;
    meshFormat = view.getUint16(offset, true);
    offset += 2;
  } else {
    const magicInt = view.getUint32(offset, true);
    if (magicInt !== BOB_MAGIC) {
      throw new Error(`Invalid .bob magic header: ${magicInt} (expected ${BOB_MAGIC})`);
    }
    offset += 4;
    meshFormat = view.getUint32(offset, true);
    offset += 4;
  }

  const vertexCount = view.getUint32(offset, true);
  offset += 4;
  const faceCount = view.getUint32(offset, true);
  offset += 4;

  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);

  const stride = 32; // x,y,z (12) + nx,ny,nz (12) + u,v (8)
  const availableBytes = arrayBuffer.byteLength - offset;

  if (availableBytes >= vertexCount * stride) {
    for (let i = 0; i < vertexCount; i++) {
      positions[i * 3 + 0] = view.getFloat32(offset + 0, true);
      positions[i * 3 + 1] = view.getFloat32(offset + 4, true);
      positions[i * 3 + 2] = view.getFloat32(offset + 8, true);

      normals[i * 3 + 0] = view.getFloat32(offset + 12, true);
      normals[i * 3 + 1] = view.getFloat32(offset + 16, true);
      normals[i * 3 + 2] = view.getFloat32(offset + 20, true);

      uvs[i * 2 + 0] = view.getFloat32(offset + 24, true);
      uvs[i * 2 + 1] = view.getFloat32(offset + 28, true);

      offset += stride;
    }
  } else {
    for (let i = 0; i < vertexCount; i++) {
      positions[i * 3 + 0] = view.getFloat32(offset + 0, true);
      positions[i * 3 + 1] = view.getFloat32(offset + 4, true);
      positions[i * 3 + 2] = view.getFloat32(offset + 8, true);
      offset += 12;
    }
  }

  const indexCount = faceCount * 3;
  const indices = new Uint16Array(indexCount);
  for (let i = 0; i < indexCount; i++) {
    if (offset + 2 > arrayBuffer.byteLength) break;
    indices[i] = view.getUint16(offset, true);
    offset += 2;
  }

  return {
    type: 'bob',
    meshFormat,
    vertexCount,
    faceCount,
    positions,
    normals,
    uvs,
    indices,
  };
}

export function parseCobToArray(arrayBuffer: ArrayBuffer): CobData {
  const view = new DataView(arrayBuffer);
  if (arrayBuffer.byteLength < 12) {
    throw new Error('File is too small to be a valid .cob asset.');
  }

  let offset = 0;
  const magic = view.getUint32(offset, true);
  offset += 4;

  if (magic !== COB_MAGIC) {
    throw new Error(`Invalid .cob magic header: ${magic} (expected ${COB_MAGIC})`);
  }

  const vertexCount = view.getUint32(offset, true);
  offset += 4;
  const faceCount = view.getUint32(offset, true);
  offset += 4;

  const positions = new Float32Array(vertexCount * 3);
  for (let i = 0; i < vertexCount; i++) {
    positions[i * 3 + 0] = view.getFloat32(offset + 0, true);
    positions[i * 3 + 1] = view.getFloat32(offset + 4, true);
    positions[i * 3 + 2] = view.getFloat32(offset + 8, true);
    offset += 12;
  }

  const indices = new Uint32Array(faceCount * 3);
  for (let i = 0; i < faceCount * 3; i++) {
    if (offset + 4 > arrayBuffer.byteLength) break;
    indices[i] = view.getUint32(offset, true);
    offset += 4;
  }

  return {
    type: 'cob',
    vertexCount,
    faceCount,
    positions,
    indices,
  };
}

export function buildThreeGeometry(parsed: BobData | CobData | any): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(parsed.positions, 3));

  if (parsed.indices && parsed.indices.length > 0) {
    geometry.setIndex(new THREE.BufferAttribute(parsed.indices, 1));
  }

  if (parsed.normals && parsed.normals.length === parsed.positions.length) {
    geometry.setAttribute('normal', new THREE.BufferAttribute(parsed.normals, 3));
  } else {
    geometry.computeVertexNormals();
  }

  if (parsed.uvs && parsed.uvs.length > 0) {
    geometry.setAttribute('uv', new THREE.BufferAttribute(parsed.uvs, 2));
  }

  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return geometry;
}
