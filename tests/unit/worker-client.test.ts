import { describe, expect, it } from 'vitest'
import {
  validateMeshSnapshot,
  validateModelPartMeshes,
} from '../../src/features/cad/worker-client'

function meshSnapshot() {
  return {
    positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]).buffer,
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]).buffer,
    indices: new Uint32Array([0, 1, 2]).buffer,
    bounds: {
      min: [0, 0, 0] as [number, number, number],
      max: [1, 1, 0] as [number, number, number],
    },
    triangleCount: 1,
  }
}

describe('Worker mesh boundary validation', () => {
  it('accepts finite typed arrays with in-range triangle indices', () => {
    expect(validateMeshSnapshot(meshSnapshot())).toBe(true)
  })

  it('rejects non-finite coordinates, out-of-range indices and invalid counts', () => {
    expect(
      validateMeshSnapshot({
        ...meshSnapshot(),
        positions: new Float32Array([0, 0, Number.NaN]).buffer,
      }),
    ).toBe(false)
    expect(
      validateMeshSnapshot({
        ...meshSnapshot(),
        indices: new Uint32Array([0, 1, 9]).buffer,
      }),
    ).toBe(false)
    expect(validateMeshSnapshot({ ...meshSnapshot(), triangleCount: 2 })).toBe(
      false,
    )
  })

  it('validates large transferred meshes without overflowing the call stack', () => {
    const vertexCount = 50_000
    const positions = new Float32Array(vertexCount * 3)
    const normals = new Float32Array(vertexCount * 3)

    expect(
      validateMeshSnapshot({
        ...meshSnapshot(),
        positions: positions.buffer,
        normals: normals.buffer,
      }),
    ).toBe(true)
  })

  it('accepts a complete body/text pair and rejects incomplete or malformed pairs', () => {
    const partMeshes = [
      { name: 'body' as const, mesh: meshSnapshot() },
      { name: 'text' as const, mesh: meshSnapshot() },
    ]
    expect(validateModelPartMeshes(partMeshes, true)).toBe(true)
    expect(validateModelPartMeshes(partMeshes.slice(0, 1), true)).toBe(false)
    expect(
      validateModelPartMeshes(
        [{ name: 'text', mesh: { ...meshSnapshot(), triangleCount: 2 } }],
        false,
      ),
    ).toBe(false)
    expect(validateModelPartMeshes(undefined, false)).toBe(true)
    expect(validateModelPartMeshes(undefined, true)).toBe(false)
  })
})
