import { describe, expect, it, vi } from 'vitest'
import type { Shape3D } from 'replicad'
import { meshBRep } from '../../src/cad-kernel/mesh'

describe('CAD mesh boundary', () => {
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
