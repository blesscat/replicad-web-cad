import * as THREE from 'three'

export type ViewportMeshArrays = {
  positions: Float32Array | ArrayBuffer
  normals: Float32Array | ArrayBuffer
  indices: Uint32Array | ArrayBuffer
}

function float32Array(value: Float32Array | ArrayBuffer): Float32Array {
  return value instanceof ArrayBuffer ? new Float32Array(value) : value
}

function uint32Array(value: Uint32Array | ArrayBuffer): Uint32Array {
  return value instanceof ArrayBuffer ? new Uint32Array(value) : value
}

export function createViewportBaseGeometry(
  mesh: ViewportMeshArrays,
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(float32Array(mesh.positions), 3),
  )
  geometry.setAttribute(
    'normal',
    new THREE.BufferAttribute(float32Array(mesh.normals), 3),
  )
  geometry.setIndex(new THREE.BufferAttribute(uint32Array(mesh.indices), 1))
  geometry.computeBoundingSphere()
  return geometry
}
