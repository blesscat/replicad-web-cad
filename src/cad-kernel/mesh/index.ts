import type { Shape3D } from "replicad";
import type { MeshSnapshot } from "../../cad-contract/messages";
import type { BoxBounds } from "../../cad-contract/units";

export type MeshData = {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  bounds: BoxBounds;
  triangleCount: number;
};

export function meshBRep(
  shape: Shape3D,
  options: { tolerance: number; angularTolerance: number }
): MeshData {
  const mesh = shape.mesh(options);
  const boundingBox = shape.boundingBox;
  let bounds: BoxBounds;
  try {
    const [[minX, minY, minZ], [maxX, maxY, maxZ]] = boundingBox.bounds;
    bounds = {
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ],
    };
  } finally {
    boundingBox.delete();
  }

  const positions = new Float32Array(mesh.vertices);
  const normals = new Float32Array(mesh.normals);
  const indices = new Uint32Array(mesh.triangles);

  if (positions.length === 0 || indices.length === 0 || indices.length % 3 !== 0) {
    throw new Error("B-Rep mesh did not contain triangles");
  }
  if (normals.length !== positions.length) {
    throw new Error("B-Rep mesh normals do not match positions");
  }

  return {
    positions,
    normals,
    indices,
    bounds,
    triangleCount: indices.length / 3,
  };
}

export function cloneMesh(mesh: MeshData): MeshData {
  return {
    positions: new Float32Array(mesh.positions),
    normals: new Float32Array(mesh.normals),
    indices: new Uint32Array(mesh.indices),
    bounds: {
      min: [...mesh.bounds.min] as [number, number, number],
      max: [...mesh.bounds.max] as [number, number, number],
    },
    triangleCount: mesh.triangleCount,
  };
}

export function serializeMesh(mesh: MeshData): MeshSnapshot {
  const copy = cloneMesh(mesh);
  return {
    positions: copy.positions.buffer as ArrayBuffer,
    normals: copy.normals.buffer as ArrayBuffer,
    indices: copy.indices.buffer as ArrayBuffer,
    bounds: copy.bounds,
    triangleCount: copy.triangleCount,
  };
}
