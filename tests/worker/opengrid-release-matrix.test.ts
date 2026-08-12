import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { setOC } from 'replicad'
import { buildOpenGridBRep } from '../../src/cad-kernel/components/opengrid/builder'
import { inspectOpenGridShapeQuality } from '../../src/cad-kernel/components/opengrid/quality'
import { meshBRep } from '../../src/cad-kernel/mesh'
import {
  deterministicOpenGridCustomScrewPositions,
  normalizeOpenGridParameters,
  OPENGRID_CONFIGURATION,
  type OpenGridParameters,
  type OpenGridVariant,
} from '../../src/cad-contract/units'

;(globalThis as typeof globalThis & { __dirname?: string }).__dirname = dirname(
  fileURLToPath(import.meta.url),
)
const require = createRequire(import.meta.url)
;(globalThis as typeof globalThis & { require?: typeof require }).require =
  require
const initialiseOpenCascade = require('replicad-opencascadejs')
  .default as (options: { locateFile: () => string }) => Promise<unknown>
const WASM_PATH =
  require.resolve('replicad-opencascadejs/src/replicad_single.wasm')

const runReleaseMatrix = process.env.RUN_OPENGRID_RELEASE_MATRIX === '1'
const selectedFixtureIds = process.env.RUN_OPENGRID_RELEASE_FIXTURES?.split(',')
  .map((value) => value.trim())
  .filter(Boolean)
const variants: readonly OpenGridVariant[] = ['Full', 'Lite', 'Heavy', 'Hybrid']
const selectedVariants = process.env.RUN_OPENGRID_RELEASE_VARIANTS?.split(',')
  .map((value) => value.trim())
  .filter((value): value is OpenGridVariant =>
    variants.includes(value as OpenGridVariant),
  )
const variantsToRun = selectedVariants?.length ? selectedVariants : variants

function parameters(
  variant: OpenGridVariant,
  overrides: Partial<OpenGridParameters> = {},
): OpenGridParameters {
  return normalizeOpenGridParameters({
    ...OPENGRID_CONFIGURATION.defaultParameters,
    variant,
    chamferCorners: {
      ...OPENGRID_CONFIGURATION.defaultParameters.chamferCorners,
    },
    connectorSides: {
      ...OPENGRID_CONFIGURATION.defaultParameters.connectorSides,
    },
    customScrewPositions: [],
    ...overrides,
  })
}

const fixtures = [
  {
    id: '1x1',
    rows: 1,
    columns: 1,
    chamfers: 'none' as const,
    connectorHoles: 'none' as const,
    screwMode: 'none' as const,
  },
  {
    id: '2x2',
    rows: 2,
    columns: 2,
    screwMode: 'corners' as const,
    connectorHoles: 'enabled' as const,
  },
  {
    id: '5x5',
    rows: 5,
    columns: 5,
    screwKind: 'custom' as const,
    screwMode: 'custom' as const,
    customScrewPositions: deterministicOpenGridCustomScrewPositions(5, 5),
    connectorHoles: 'none' as const,
  },
  {
    id: '10x10',
    rows: 10,
    columns: 10,
    screwKind: 'custom' as const,
    screwMode: 'everywhere' as const,
    connectorHoles: 'enabled' as const,
  },
  {
    id: 'max-grid-custom',
    rows: OPENGRID_CONFIGURATION.maxGridCount,
    columns: OPENGRID_CONFIGURATION.maxGridCount,
    screwKind: 'custom' as const,
    screwMode: 'custom' as const,
    customScrewPositions: deterministicOpenGridCustomScrewPositions(
      OPENGRID_CONFIGURATION.maxGridCount,
      OPENGRID_CONFIGURATION.maxGridCount,
    ),
    connectorHoles: 'enabled' as const,
  },
] as const

beforeAll(async () => {
  if (!runReleaseMatrix) return
  const openCascade = await initialiseOpenCascade({
    locateFile: () => WASM_PATH,
  })
  setOC(openCascade as Parameters<typeof setOC>[0])
})

describe.skipIf(!runReleaseMatrix)('OpenGrid official release matrix', () => {
  it('passes every official fixture for Full, Lite, Heavy, and Hybrid', async () => {
    for (const variant of variantsToRun) {
      const selectedFixtures = selectedFixtureIds
        ? fixtures.filter((fixture) => selectedFixtureIds.includes(fixture.id))
        : fixtures
      for (const fixture of selectedFixtures) {
        const { id: fixtureId, ...overrides } = fixture
        const input = parameters(variant, overrides)
        const shape = await buildOpenGridBRep(input)
        try {
          const mesh = meshBRep(shape, {
            tolerance: 0.05,
            angularTolerance: 0.1,
          })
          const quality = inspectOpenGridShapeQuality(shape, input, mesh)
          if (!quality.passed) {
            throw new Error(
              `${variant}:${fixtureId}:OPENGRID_QUALITY_INVALID:${quality.failures.join(';')}:bounds=${JSON.stringify(quality.bounds)}:solids=${quality.solidCount}`,
            )
          }
          expect(quality.passed, `${variant}:${fixtureId}`).toBe(true)
          expect(quality.cellOpeningCount).toBe(input.rows * input.columns)
        } finally {
          shape.delete()
        }
      }
    }
  }, 120_000)
})
