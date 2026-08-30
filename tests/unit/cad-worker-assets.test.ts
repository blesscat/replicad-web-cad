import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  buildOpenGridCanonicalTile: vi.fn(),
  loadHswCellTemplate: vi.fn(),
  loadHexagonalColumnReference: vi.fn(),
  loadModularGridBaseTemplate: vi.fn(),
  loadOpenGridDetachableCornerSeatHolderReference: vi.fn(),
  loadOpenGridDetachableCornerSeatReference: vi.fn(),
  loadOpenGridPrototypeTemplate: vi.fn(),
  loadOpenGridSnapFixedFootprint: vi.fn(),
  loadOpenGridSnapOpenConnectHead: vi.fn(),
  loadOpenGridSnapReference: vi.fn(),
  loadOpenGridSnapRemoverAsset: vi.fn(),
  loadOpenGridOpenConnectShelfLockedSlot: vi.fn(),
}))

vi.mock('../../src/cad-kernel/components/opengrid/builder', () => ({
  buildOpenGridCanonicalTile: mocks.buildOpenGridCanonicalTile,
  loadOpenGridPrototypeTemplate: mocks.loadOpenGridPrototypeTemplate,
}))
vi.mock('../../src/cad-kernel/components/hsw-cell/builder', () => ({
  loadHswCellTemplate: mocks.loadHswCellTemplate,
}))
vi.mock('../../src/cad-kernel/components/hexagonal-column/builder', () => ({
  loadHexagonalColumnReference: mocks.loadHexagonalColumnReference,
}))
vi.mock('../../src/cad-kernel/components/modular-grid-base/builder', () => ({
  loadModularGridBaseTemplate: mocks.loadModularGridBaseTemplate,
}))
vi.mock('../../src/cad-kernel/components/opengrid-snap/builder', () => ({
  loadOpenGridSnapFixedFootprint: mocks.loadOpenGridSnapFixedFootprint,
  loadOpenGridSnapOpenConnectHead: mocks.loadOpenGridSnapOpenConnectHead,
  loadOpenGridSnapReference: mocks.loadOpenGridSnapReference,
}))
vi.mock(
  '../../src/cad-kernel/components/opengrid-snap-remover/builder',
  () => ({
    loadOpenGridSnapRemoverAsset: mocks.loadOpenGridSnapRemoverAsset,
  }),
)
vi.mock(
  '../../src/cad-kernel/components/opengrid-locating-assembly/reference',
  () => ({
    loadOpenGridDetachableCornerSeatHolderReference:
      mocks.loadOpenGridDetachableCornerSeatHolderReference,
    loadOpenGridDetachableCornerSeatReference:
      mocks.loadOpenGridDetachableCornerSeatReference,
  }),
)
vi.mock(
  '../../src/cad-kernel/components/opengrid-openconnect-shelf/slot',
  () => ({
    loadOpenGridOpenConnectShelfLockedSlot:
      mocks.loadOpenGridOpenConnectShelfLockedSlot,
  }),
)

import { CadWorkerAssetCache } from '../../src/workers/cad-worker-assets'

describe('CAD Worker asset cache', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shares lazy templates and disposes the native asset', async () => {
    const template = { delete: vi.fn() }
    mocks.loadModularGridBaseTemplate.mockResolvedValue(template)
    const cache = new CadWorkerAssetCache(() => false, {})

    const first = cache.getModularGridBaseTemplate()
    expect(cache.getModularGridBaseTemplate()).toBe(first)
    expect(mocks.loadModularGridBaseTemplate).toHaveBeenCalledOnce()

    await first
    cache.dispose()
    await Promise.resolve()

    expect(template.delete).toHaveBeenCalledOnce()
  })

  it('deletes an asset that resolves after disposal and rejects its waiter', async () => {
    let resolveTemplate: (template: {
      delete: ReturnType<typeof vi.fn>
    }) => void
    const templatePromise = new Promise<{ delete: ReturnType<typeof vi.fn> }>(
      (resolve) => {
        resolveTemplate = resolve
      },
    )
    mocks.loadModularGridBaseTemplate.mockReturnValue(templatePromise)
    let disposed = false
    const cache = new CadWorkerAssetCache(() => disposed, {})
    const pending = cache.getModularGridBaseTemplate()

    disposed = true
    cache.dispose()
    const template = { delete: vi.fn() }
    resolveTemplate!(template)

    await expect(pending).rejects.toThrow('WORKER_TERMINATED')
    expect(template.delete).toHaveBeenCalledOnce()
  })

  it('removes failed prototype loads so a later request can retry', async () => {
    const failure = new Error('prototype unavailable')
    const prototype = { delete: vi.fn() }
    mocks.loadOpenGridPrototypeTemplate
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(prototype)
    const cache = new CadWorkerAssetCache(() => false, {})

    await expect(cache.getOpenGridPrototype('Full')).rejects.toThrow(
      'prototype unavailable',
    )
    await expect(cache.getOpenGridPrototype('Full')).resolves.toBe(prototype)
    expect(mocks.loadOpenGridPrototypeTemplate).toHaveBeenCalledTimes(2)
  })

  it('shares one locked-slot promise between the shelf and organizer builders', async () => {
    const lockedSlot = { delete: vi.fn() }
    mocks.loadOpenGridOpenConnectShelfLockedSlot.mockResolvedValue(lockedSlot)
    const cache = new CadWorkerAssetCache(() => false, {})

    const shelfRequest = cache.getOpenGridOpenConnectShelfLockedSlot()
    const organizerRequest = cache.getOpenGridOpenConnectShelfLockedSlot()

    expect(organizerRequest).toBe(shelfRequest)
    await expect(shelfRequest).resolves.toBe(lockedSlot)
    expect(mocks.loadOpenGridOpenConnectShelfLockedSlot).toHaveBeenCalledOnce()

    cache.dispose()
    await Promise.resolve()
    expect(lockedSlot.delete).toHaveBeenCalledOnce()
  })
})
