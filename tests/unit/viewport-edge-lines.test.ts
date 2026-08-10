import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  createViewportEdgeGeometry,
  createViewportEdgeMaterial,
} from '../../src/features/cad/viewport/edge-lines'
import { CAD_VIEWPORT_CONFIG } from '../../src/features/cad/viewport/config'
import { CAD_VIEWPORT_THEME_FALLBACK } from '../../src/features/cad/viewport/theme'

function createTriangulatedSquare(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0], 3),
  )
  geometry.setIndex([0, 1, 2, 0, 2, 3])
  return geometry
}

function createPerpendicularFaces(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1],
      3,
    ),
  )
  geometry.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4, 3, 5, 4])
  return geometry
}

describe('CAD viewport edge geometry', () => {
  it('uses a bounded crease threshold and restrained line opacity', () => {
    expect(CAD_VIEWPORT_CONFIG.edgeThresholdAngle).toBeGreaterThan(0)
    expect(CAD_VIEWPORT_CONFIG.edgeThresholdAngle).toBeLessThan(90)
    expect(CAD_VIEWPORT_CONFIG.edgeOpacity).toBeGreaterThan(0)
    expect(CAD_VIEWPORT_CONFIG.edgeOpacity).toBeLessThanOrEqual(1)
    expect(CAD_VIEWPORT_THEME_FALLBACK.edge).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('keeps the square boundary while suppressing a coplanar triangulation diagonal', () => {
    const source = createTriangulatedSquare()
    const edges = createViewportEdgeGeometry(source)

    expect(edges.getAttribute('position').count).toBe(8)

    edges.dispose()
    source.dispose()
  })

  it('keeps a pronounced crease shared by perpendicular faces', () => {
    const source = createPerpendicularFaces()
    const edges = createViewportEdgeGeometry(source)

    expect(edges.getAttribute('position').count).toBe(14)

    edges.dispose()
    source.dispose()
  })

  it('creates a depth-tested, non-depth-writing line material', () => {
    const edgeColor = '#c0d0ff'
    const material = createViewportEdgeMaterial(edgeColor)

    expect(material.depthTest).toBe(true)
    expect(material.depthWrite).toBe(false)
    expect(material.polygonOffset).toBe(true)
    expect(material.polygonOffsetFactor).toBeLessThan(0)
    expect(material.polygonOffsetUnits).toBeLessThan(0)
    expect(material.transparent).toBe(true)
    expect(material.opacity).toBeGreaterThan(0)
    expect(material.opacity).toBeLessThanOrEqual(1)
    expect(material.color.getHexString()).toBe(edgeColor.slice(1))

    material.dispose()
  })
})
