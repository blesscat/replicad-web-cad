import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'
import { ViewportEdgePreparation } from '../../src/features/cad/viewport/edge-preparation'

describe('CAD viewport edge lifecycle', () => {
  it('prepares small edges immediately and disposes replacement resources', () => {
    const base = new THREE.BufferGeometry()
    const firstEdges = new THREE.EdgesGeometry()
    const secondEdges = new THREE.EdgesGeometry()
    const createEdges = vi
      .fn<(geometry: THREE.BufferGeometry) => THREE.EdgesGeometry>()
      .mockReturnValueOnce(firstEdges)
      .mockReturnValueOnce(secondEdges)
    const firstDispose = vi.spyOn(firstEdges, 'dispose')
    const secondDispose = vi.spyOn(secondEdges, 'dispose')
    const preparation = new ViewportEdgePreparation({ createEdges })

    preparation.prepare(base, 1, vi.fn())
    preparation.prepare(base, 1, vi.fn())
    preparation.dispose()

    expect(createEdges).toHaveBeenCalledTimes(2)
    expect(firstDispose).toHaveBeenCalledTimes(1)
    expect(secondDispose).toHaveBeenCalledTimes(1)
    base.dispose()
  })

  it('defers large edges, cancels stale generations, and disposes the final edge', () => {
    const base = new THREE.BufferGeometry()
    const scheduled: Array<() => void> = []
    const cancel = vi.fn()
    const edge = new THREE.EdgesGeometry()
    const dispose = vi.spyOn(edge, 'dispose')
    const createEdges = vi.fn(() => edge)
    const preparation = new ViewportEdgePreparation({
      createEdges,
      schedule: (callback) => {
        scheduled.push(callback)
        return scheduled.length as unknown as ReturnType<typeof setTimeout>
      },
      cancel,
    })

    preparation.prepare(base, 100_000, vi.fn())
    preparation.prepare(base, 100_000, vi.fn())
    scheduled[0]?.()
    expect(createEdges).not.toHaveBeenCalled()
    scheduled[1]?.()
    expect(createEdges).toHaveBeenCalledTimes(1)
    preparation.dispose()

    expect(cancel).toHaveBeenCalledTimes(1)
    expect(dispose).toHaveBeenCalledTimes(1)
    base.dispose()
  })
})
