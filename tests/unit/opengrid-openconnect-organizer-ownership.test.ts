import { describe, expect, it, vi } from 'vitest'
import type { Shape3D } from 'replicad'
import { OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS } from '../../src/cad-contract/units'
import {
  applyOpenGridOpenConnectOrganizerOwnedTransforms,
  createOpenGridOpenConnectOrganizerOwnedCavityCutters,
  fuseOpenGridOpenConnectOrganizerOwnedShapes,
} from '../../src/cad-kernel/components/opengrid-openconnect-organizer/builder'

function fakeShape() {
  return { delete: vi.fn() } as unknown as Shape3D
}

describe('OpenGrid OpenConnect organizer native ownership', () => {
  it('deletes earlier cavity cutters when a later cutter factory fails', () => {
    const first = fakeShape()
    const factory = vi
      .fn<() => Shape3D>()
      .mockReturnValueOnce(first)
      .mockImplementationOnce(() => {
        throw new Error('CUTTER_FACTORY_FAILED')
      })

    expect(() =>
      createOpenGridOpenConnectOrganizerOwnedCavityCutters(
        OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
        [
          [0, 0],
          [1, 1],
        ],
        factory,
      ),
    ).toThrow('CUTTER_FACTORY_FAILED')
    expect(first.delete).toHaveBeenCalledOnce()
  })

  it('deletes the second owned operand when fusion throws', () => {
    const first = fakeShape()
    const second = fakeShape()
    const fuse = vi.fn(() => {
      throw new Error('FUSE_FAILED')
    })

    expect(() =>
      fuseOpenGridOpenConnectOrganizerOwnedShapes(
        first,
        second,
        undefined,
        fuse,
      ),
    ).toThrow('FUSE_FAILED')
    expect(second.delete).toHaveBeenCalledOnce()
  })

  it('deletes the latest replacement when a later transform throws', () => {
    const original = fakeShape()
    const replacement = fakeShape()

    expect(() =>
      applyOpenGridOpenConnectOrganizerOwnedTransforms(original, [
        () => replacement,
        () => {
          throw new Error('TRANSFORM_FAILED')
        },
      ]),
    ).toThrow('TRANSFORM_FAILED')
    expect(original.delete).toHaveBeenCalledOnce()
    expect(replacement.delete).toHaveBeenCalledOnce()
  })
})
