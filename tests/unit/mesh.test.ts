import { describe, expect, it, vi } from 'vitest'
import type { Shape3D } from 'replicad'
import { meshBRep } from '../../src/cad-kernel/mesh'

describe('CAD mesh boundary', () => {
  it('reports bounds from the generated mesh positions', () => {
    const shape = {
      mesh: vi.fn(() => ({
        vertices: [-1, -2, -3, 4, 5, 6, 0, 1, 2],
        normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
        triangles: [0, 1, 2],
      })),
    }

    expect(
      meshBRep(shape as unknown as Shape3D, {
        tolerance: 0.01,
        angularTolerance: 0.1,
      }).bounds,
    ).toEqual({
      min: [-1, -2, -3],
      max: [4, 5, 6],
    })
  })

  it('maps native mesh failures to a stable mesh error', () => {
    const shape = {
      mesh: vi.fn(() => {
        throw new Error('OpenCascade meshing failed')
      }),
    }

    expect(() =>
      meshBRep(shape as unknown as Shape3D, {
        tolerance: 0.01,
        angularTolerance: 0.1,
      }),
    ).toThrow('MESH_INVALID: OpenCascade meshing failed')
  })
})
