import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  analyzerDelete: vi.fn(),
  measureVolume: vi.fn(),
  placeLockedSlot: vi.fn(),
}))

vi.mock('replicad', () => ({
  getOC: () => ({
    BRepCheck_Analyzer: class {
      IsValid_2(): boolean {
        return false
      }

      delete(): void {
        mocks.analyzerDelete()
      }
    },
  }),
  measureVolume: mocks.measureVolume,
}))

vi.mock(
  '../../src/cad-kernel/components/opengrid-openconnect-shelf/slot',
  () => ({
    placeOpenGridOpenConnectShelfLockedSlot: mocks.placeLockedSlot,
  }),
)

import {
  assertOpenGridOpenConnectShelfShapeQuality,
  inspectOpenGridOpenConnectShelfShapeQuality,
} from '../../src/cad-kernel/components/opengrid-openconnect-shelf/quality'
import {
  boundsForOpenGridOpenConnectShelf,
  OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS,
} from '../../src/cad-contract/units'
import type { Shape3D } from 'replicad'

describe('OpenGrid OpenConnect shelf quality gate', () => {
  it('rejects an invalid B-Rep before trusting derived counts or volume', () => {
    const parameters = { ...OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS }
    const shape = { wrapped: {} } as Shape3D
    const lockedSlot = { wrapped: {} } as Shape3D
    const mesh = { bounds: boundsForOpenGridOpenConnectShelf(parameters) }

    expect(
      inspectOpenGridOpenConnectShelfShapeQuality(
        shape,
        parameters,
        mesh,
        lockedSlot,
      ),
    ).toEqual({
      passed: false,
      failures: ['invalid-brep'],
      validBRep: false,
      volume: 0,
      solidCount: 0,
      slotCount: 0,
      slotResidualVolumes: [],
    })
    expect(() =>
      assertOpenGridOpenConnectShelfShapeQuality(
        shape,
        parameters,
        mesh,
        lockedSlot,
      ),
    ).toThrow('OPENGRID_OPENCONNECT_SHELF_QUALITY_FAILED:invalid-brep')
    expect(mocks.measureVolume).not.toHaveBeenCalled()
    expect(mocks.placeLockedSlot).not.toHaveBeenCalled()
    expect(mocks.analyzerDelete).toHaveBeenCalledTimes(2)
  })
})
