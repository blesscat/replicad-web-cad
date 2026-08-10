import { describe, expect, it, vi } from 'vitest'
import { measureViewportGeometry } from '../../src/features/cad/viewport/geometry-timing'

describe('CAD viewport geometry timing boundaries', () => {
  it('reports base and edge preparation durations without changing results', () => {
    const timings = vi.fn()
    expect(
      measureViewportGeometry('base-geometry', () => 'base', timings),
    ).toBe('base')
    expect(
      measureViewportGeometry('edge-geometry', () => 'edges', timings),
    ).toBe('edges')
    expect(timings).toHaveBeenCalledTimes(2)
    expect(timings).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ phase: 'base-geometry' }),
    )
    expect(timings).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ phase: 'edge-geometry' }),
    )
  })
})
