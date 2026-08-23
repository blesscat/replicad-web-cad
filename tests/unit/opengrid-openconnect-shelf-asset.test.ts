import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  openGridOpenConnectShelfLockedSlotAssetUrl,
  openGridOpenConnectShelfSlotBoundsForOrigin,
  transformOpenGridOpenConnectShelfSlotPoint,
  OPENGRID_OPENCONNECT_SLOT_SOURCE_BOUNDS,
} from '../../src/cad-kernel/components/opengrid-openconnect-shelf/slot'
import {
  openGridOpenConnectShelfSlotOriginsFor,
  OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS,
} from '../../src/cad-contract/units'

const EXPECTED_SIZE = 63_446
const EXPECTED_SHA256 =
  '6c982975a7d3ee8007cf108553b2d67bfdd10202ae52a6f9babf34d7be346dab'

describe('OpenGrid OpenConnect locked-slot asset', () => {
  it('keeps the supplied STEP bytes unchanged at a module-relative URL', () => {
    expect(openGridOpenConnectShelfLockedSlotAssetUrl.href).toContain(
      '/opengrid-openconnect-shelf/assets/openconnect-slot-negative-lock.step',
    )
    const asset = readFileSync(
      fileURLToPath(openGridOpenConnectShelfLockedSlotAssetUrl),
    )
    expect(asset.byteLength).toBe(EXPECTED_SIZE)
    expect(createHash('sha256').update(asset).digest('hex')).toBe(
      EXPECTED_SHA256,
    )
    expect(
      readdirSync(
        fileURLToPath(new URL('.', openGridOpenConnectShelfLockedSlotAssetUrl)),
      ).sort(),
    ).toEqual(['README.md', 'openconnect-slot-negative-lock.step'])
  })

  it('preserves the measured asymmetric millimetre source envelope', () => {
    expect(OPENGRID_OPENCONNECT_SLOT_SOURCE_BOUNDS).toEqual({
      min: [-13, -13.2, 0],
      max: [8.6, 9, 2.7],
    })
  })

  it('uses a rigid right-handed +90 degree X transform at the authored origin', () => {
    const origin = [28, 0, 14] as const
    const transformedOrigin = transformOpenGridOpenConnectShelfSlotPoint(
      [0, 0, 0],
      origin,
    )
    const transformedX = transformOpenGridOpenConnectShelfSlotPoint(
      [1, 0, 0],
      origin,
    )
    const transformedY = transformOpenGridOpenConnectShelfSlotPoint(
      [0, 1, 0],
      origin,
    )
    const transformedZ = transformOpenGridOpenConnectShelfSlotPoint(
      [0, 0, 1],
      origin,
    )

    expect(transformedOrigin).toEqual([28, 0, 14])
    expect(transformedX).toEqual([29, 0, 14])
    expect(transformedY).toEqual([28, 0, 15])
    expect(transformedZ).toEqual([28, -1, 14])

    const basisLengths = [transformedX, transformedY, transformedZ].map(
      (point) =>
        Math.hypot(
          point[0] - transformedOrigin[0],
          point[1] - transformedOrigin[1],
          point[2] - transformedOrigin[2],
        ),
    )
    expect(basisLengths).toEqual([1, 1, 1])
  })

  it('places one unchanged locked cutter on every 28 mm column origin', () => {
    const origins = openGridOpenConnectShelfSlotOriginsFor(
      OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS,
    )
    expect(origins).toHaveLength(3)
    expect(origins.map((origin) => origin[0])).toEqual([-28, 0, 28])
    expect(origins.map((origin) => origin[1])).toEqual([3.2, 3.2, 3.2])
    expect(origins.map((origin) => origin[2])).toEqual([14, 14, 14])

    const bounds = openGridOpenConnectShelfSlotBoundsForOrigin(origins[1]!)
    expect(bounds.min[0]).toBeCloseTo(-13)
    expect(bounds.min[1]).toBeCloseTo(0.5)
    expect(bounds.min[2]).toBeCloseTo(0.8)
    expect(bounds.max).toEqual([8.6, 3.2, 23])

    for (const columns of [1, 3, 10]) {
      const columnOrigins = openGridOpenConnectShelfSlotOriginsFor({ columns })
      expect(columnOrigins).toHaveLength(columns)
      for (let index = 1; index < columnOrigins.length; index += 1) {
        expect(columnOrigins[index]![0] - columnOrigins[index - 1]![0]).toBe(28)
      }
    }
  })
})
