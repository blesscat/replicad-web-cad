import * as THREE from 'three'
import { CAD_VIEWPORT_CONFIG } from './config'

export function createViewportEdgeGeometry(
  geometry: THREE.BufferGeometry,
): THREE.EdgesGeometry {
  return new THREE.EdgesGeometry(
    geometry,
    CAD_VIEWPORT_CONFIG.edgeThresholdAngle,
  )
}

export function createViewportEdgeMaterial(
  color: string,
): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({
    color,
    opacity: CAD_VIEWPORT_CONFIG.edgeOpacity,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    toneMapped: false,
  })
}
