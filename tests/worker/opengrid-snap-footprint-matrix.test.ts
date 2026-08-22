import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { initialiseCadKernel } from '../../src/cad-kernel/initialise'
import {
  buildOpenGridSnap,
  importOpenGridSnapReference,
  OPENGRID_SNAP_REFERENCE_URLS,
} from '../../src/cad-kernel/components/opengrid-snap/builder'
import {
  inspectOpenGridSnapShapeQuality,
  OPENGRID_SNAP_GENERATED_ENVELOPE_TOLERANCE,
} from '../../src/cad-kernel/components/opengrid-snap/quality'
import { meshBRep } from '../../src/cad-kernel/mesh'

const require = createRequire(import.meta.url)
const WASM_PATH =
  require.resolve('replicad-opencascadejs/src/replicad_single.wasm')

type Variant = 'Full' | 'Lite'
type Profile = 'Standard' | 'Directional'
type Footprint = 'full' | 'half' | 'quarter'

function assetBlob(variant: Variant, profile: Profile): Blob {
  return new Blob([
    readFileSync(fileURLToPath(OPENGRID_SNAP_REFERENCE_URLS[profile][variant])),
  ])
}

describe('OpenGrid Snap footprint generation matrix', () => {
  beforeAll(async () => {
    await initialiseCadKernel(WASM_PATH)
  })

  it('keeps every variant/profile/footprint/feature/offset combination valid', async () => {
    const references = new Map<
      string,
      Awaited<ReturnType<typeof importOpenGridSnapReference>>
    >()
    const variants: Variant[] = ['Full', 'Lite']
    const profiles: Profile[] = ['Standard', 'Directional']
    const footprints: Footprint[] = ['full', 'half', 'quarter']
    const featureStates = [
      { fourCornerLocatingHoles: false, centerRemoverHole: false },
      { fourCornerLocatingHoles: true, centerRemoverHole: false },
      { fourCornerLocatingHoles: false, centerRemoverHole: true },
      { fourCornerLocatingHoles: true, centerRemoverHole: true },
    ] as const
    const offsets = [0, 0.2] as const

    try {
      for (const profile of profiles) {
        for (const variant of variants) {
          const key = `${profile}:${variant}`
          references.set(
            key,
            await importOpenGridSnapReference(
              assetBlob(variant, profile),
              variant,
              profile,
            ),
          )
        }
      }

      for (const profile of profiles) {
        for (const variant of variants) {
          const reference = references.get(`${profile}:${variant}`)
          if (!reference) throw new Error('matrix-reference-missing')

          for (const footprint of footprints) {
            for (const features of featureStates) {
              for (const offset of offsets) {
                const parameters = {
                  variant,
                  profile,
                  offset,
                  footprint,
                  ...features,
                  magnetHoleShape: 'none',
                  magnetHoleLength: 0,
                  magnetHoleWidth: 0,
                  magnetHoleDiameter: 0,
                  magnetHoleThickness: 0,
                } as const
                let generated: Awaited<ReturnType<typeof buildOpenGridSnap>>
                try {
                  generated = await buildOpenGridSnap(parameters, {
                    getOpenGridSnapReference: async () => reference,
                  })
                } catch (error) {
                  throw new Error(
                    `${profile}/${variant}/${footprint}/offset${offset}/corners${features.fourCornerLocatingHoles}/center${features.centerRemoverHole}: ${error instanceof Error ? error.message : String(error)}`,
                  )
                }
                try {
                  let mesh: ReturnType<typeof meshBRep>
                  try {
                    mesh = meshBRep(generated, {
                      tolerance: 0.05,
                      angularTolerance: 0.1,
                    })
                  } catch (error) {
                    throw new Error(
                      `${profile}/${variant}/${footprint}/offset${offset}/corners${features.fourCornerLocatingHoles}/center${features.centerRemoverHole}: ${error instanceof Error ? error.message : String(error)}`,
                    )
                  }
                  const quality = inspectOpenGridSnapShapeQuality(
                    generated,
                    parameters,
                    mesh,
                    reference,
                  )
                  expect(
                    quality.passed,
                    `${profile}/${variant}/${footprint}/offset${offset}/corners${features.fourCornerLocatingHoles}/center${features.centerRemoverHole}: ${quality.failures.join(';')}`,
                  ).toBe(true)
                  expect(quality.meshTriangleCount).toBeGreaterThan(0)
                  expect(quality.bounds?.min[0]).toBeGreaterThanOrEqual(
                    quality.expectedBounds.min[0] -
                      OPENGRID_SNAP_GENERATED_ENVELOPE_TOLERANCE,
                  )
                } finally {
                  generated.delete()
                }
              }
            }
          }
        }
      }
    } finally {
      for (const reference of references.values()) reference.delete()
    }
  }, 180_000)
})
