import { describe, expect, it, vi } from 'vitest'
import { exportStlBytes } from '../../src/cad-kernel/export'

describe('CAD STL export', () => {
  it('writes binary STL bytes with explicit tessellation settings', async () => {
    const bytes = new Uint8Array(84 + 50)
    const shape = {
      blobSTL: vi.fn(() => new Blob([bytes], { type: 'application/sla' })),
    }

    const result = await exportStlBytes(shape as never, {
      tolerance: 0.001,
      angularTolerance: 0.1,
    })

    expect(result.byteLength).toBe(bytes.byteLength)
    expect(shape.blobSTL).toHaveBeenCalledWith({
      binary: true,
      tolerance: 0.001,
      angularTolerance: 0.1,
    })
  })

  it('rejects an empty STL blob', async () => {
    const shape = {
      blobSTL: vi.fn(() => new Blob([])),
    }

    await expect(exportStlBytes(shape as never)).rejects.toThrow('STL_EMPTY')
  })
})
