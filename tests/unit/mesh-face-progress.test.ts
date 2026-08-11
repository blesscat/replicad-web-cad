import { describe, expect, it, vi } from 'vitest'

const native = vi.hoisted(() => {
  const faces = Array.from({ length: 6 }, (_, index) => ({ index }))
  let failAt = -1

  class Explorer {
    private index = 0

    More(): boolean {
      return this.index < faces.length
    }

    Current(): (typeof faces)[number] {
      return faces[this.index]
    }

    Next(): void {
      this.index += 1
    }

    delete(): void {}
  }

  class Location {
    Transformation() {
      return { delete() {} }
    }

    delete(): void {}
  }

  const triangulation = {
    IsNull: () => false,
    get: () => ({
      NbNodes: () => 3,
      Node: () => ({
        Transformed: () => ({
          X: () => 0,
          Y: () => 0,
          Z: () => 0,
          delete() {},
        }),
        delete() {},
      }),
      NbTriangles: () => 1,
      Triangle: () => ({
        Value: (index: number) => index,
        delete() {},
      }),
    }),
    delete() {},
  }

  const oc = {
    TopAbs_ShapeEnum: {
      TopAbs_FACE: 'face',
      TopAbs_SHAPE: 'shape',
    },
    TopExp_Explorer_2: Explorer,
    TopoDS: {
      Face_1: (face: (typeof faces)[number]) => face,
    },
    TopLoc_Location_1: Location,
    BRepMesh_IncrementalMesh_2: class {
      constructor(face: { index?: number }) {
        if (face.index === failAt) throw new Error('native face failure')
      }

      delete(): void {}
    },
    BRep_Tool: {
      Triangulation: () => triangulation,
    },
    TColgp_Array1OfDir_2: class {
      Lower(): number {
        return 1
      }

      Upper(): number {
        return 3
      }

      Value() {
        return {
          Transformed: () => ({
            X: () => 0,
            Y: () => 0,
            Z: () => 1,
            delete() {},
          }),
          delete() {},
        }
      }

      delete(): void {}
    },
    Poly_Connect_2: class {
      constructor() {}

      delete(): void {}
    },
    StdPrs_ToolTriangulatedShape: {
      Normal: () => undefined,
    },
  }

  return {
    faces,
    oc,
    setFailAt(index: number) {
      failAt = index
    },
  }
})

vi.mock('replicad', () => ({
  Face: class {
    wrapped: unknown
    orientation = 'forward'

    constructor(wrapped: unknown) {
      this.wrapped = wrapped
    }

    delete(): void {}
  },
  getOC: () => native.oc,
}))

import type { Shape3D } from 'replicad'
import { meshBRep } from '../../src/cad-kernel/mesh'

describe('per-face CAD mesh progress', () => {
  it('reports zero and completion around the per-face path', () => {
    const progress: Array<{ completed: number; total: number }> = []
    const shape = { wrapped: { kind: 'shape' } }

    const mesh = meshBRep(shape as unknown as Shape3D, {
      tolerance: 0.01,
      angularTolerance: 0.1,
      faceMeshingThreshold: 5,
      reportFaceProgress: (value) => progress.push(value),
    })

    expect(mesh.triangleCount).toBe(native.faces.length)
    expect(progress[0]).toEqual({ completed: 0, total: native.faces.length })
    expect(progress.at(-1)).toEqual({
      completed: native.faces.length,
      total: native.faces.length,
    })
    expect(progress.map(({ completed }) => completed)).toEqual(
      Array.from({ length: native.faces.length + 1 }, (_, index) => index),
    )
  })

  it('does not report face progress for the global path', () => {
    const progress: Array<{ completed: number; total: number }> = []
    const shape = { wrapped: { kind: 'shape' } }

    meshBRep(shape as unknown as Shape3D, {
      tolerance: 0.01,
      angularTolerance: 0.1,
      faceMeshingThreshold: native.faces.length,
      reportFaceProgress: (value) => progress.push(value),
    })

    expect(progress).toEqual([])
  })

  it('does not count a face whose native meshing fails', () => {
    native.setFailAt(2)
    try {
      const progress: Array<{ completed: number; total: number }> = []
      const shape = { wrapped: { kind: 'shape' } }

      expect(() =>
        meshBRep(shape as unknown as Shape3D, {
          tolerance: 0.01,
          angularTolerance: 0.1,
          faceMeshingThreshold: 5,
          reportFaceProgress: (value) => progress.push(value),
        }),
      ).toThrow('MESH_INVALID: MESH_FACE_INVALID:2:native face failure')
      expect(progress).toEqual([
        { completed: 0, total: native.faces.length },
        { completed: 1, total: native.faces.length },
        { completed: 2, total: native.faces.length },
      ])
    } finally {
      native.setFailAt(-1)
    }
  })
})
