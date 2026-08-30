import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS } from '../../src/cad-contract/units'
import type { KernelBuildContext } from '../../src/cad-kernel/model'

const mocks = vi.hoisted(() => ({
  buildOpenGridOpenConnectOrganizer: vi.fn(),
}))

vi.mock(
  '../../src/cad-kernel/components/opengrid-openconnect-organizer/builder',
  () => ({
    buildOpenGridOpenConnectOrganizer: mocks.buildOpenGridOpenConnectOrganizer,
  }),
)

import {
  buildModelBRep,
  getKernelModelDefinition,
} from '../../src/cad-kernel/model'

describe('OpenGrid OpenConnect organizer kernel registration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('dispatches the exact model through the existing locked-slot cache seam', async () => {
    const lockedSlot = { model: 'locked-slot' }
    const built = { model: 'opengrid-openconnect-organizer' }
    const getLockedSlot = vi.fn(async () => lockedSlot)
    mocks.buildOpenGridOpenConnectOrganizer.mockImplementation(
      async (_parameters, context) => {
        expect(await context.getLockedSlot()).toBe(lockedSlot)
        return built
      },
    )
    const context = {
      getOpenGridOpenConnectShelfLockedSlot: getLockedSlot,
      getModularGridBaseTemplate: vi.fn(),
      getHswCellTemplate: vi.fn(),
    } as unknown as KernelBuildContext

    await expect(
      buildModelBRep(
        'opengrid-openconnect-organizer',
        { ...OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS },
        context,
      ),
    ).resolves.toBe(built)
    expect(
      getKernelModelDefinition('opengrid-openconnect-organizer'),
    ).toMatchObject({ id: 'opengrid-openconnect-organizer' })
    expect(mocks.buildOpenGridOpenConnectOrganizer).toHaveBeenCalledWith(
      OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
      expect.objectContaining({ getLockedSlot: getLockedSlot }),
    )
    expect(getLockedSlot).toHaveBeenCalledOnce()
  })

  it('rejects a missing locked-slot cache seam before calling the builder', async () => {
    const context = {
      getModularGridBaseTemplate: vi.fn(),
      getHswCellTemplate: vi.fn(),
    } as unknown as KernelBuildContext

    await expect(
      buildModelBRep(
        'opengrid-openconnect-organizer',
        { ...OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS },
        context,
      ),
    ).rejects.toThrow(
      'MODEL_ASSET_CONTEXT_MISSING:opengrid-openconnect-organizer-locked-slot',
    )
    expect(mocks.buildOpenGridOpenConnectOrganizer).not.toHaveBeenCalled()
  })
})
