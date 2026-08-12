import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  buildOpenGridBRep,
  type OpenGridBuildContext,
} from '../../src/cad-kernel/components/opengrid/builder'
import { inspectOpenGridShapeQuality } from '../../src/cad-kernel/components/opengrid/quality'
import { meshBRep } from '../../src/cad-kernel/mesh'
import {
  boundsForOpenGrid,
  normalizeOpenGridParameters,
  OPENGRID_CONFIGURATION,
  OPENGRID_PREVIEW_CONFIGURATION,
  type OpenGridParameters,
} from '../../src/cad-contract/units'
import { setOC } from 'replicad'

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

beforeAll(async () => {
  const openCascade = await initialiseOpenCascade({
    locateFile: () => WASM_PATH,
  })
  setOC(openCascade as Parameters<typeof setOC>[0])
})

function parameters(
  overrides: Partial<OpenGridParameters> = {},
): OpenGridParameters {
  return normalizeOpenGridParameters({
    ...OPENGRID_CONFIGURATION.defaultParameters,
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

async function buildAndInspect(
  input: OpenGridParameters,
  context: OpenGridBuildContext = {},
) {
  const shape = await buildOpenGridBRep(input, context)
  const mesh = meshBRep(shape, OPENGRID_PREVIEW_CONFIGURATION)
  const quality = inspectOpenGridShapeQuality(shape, input, mesh)
  return { shape, quality }
}

async function buildTimed(
  input: OpenGridParameters,
  balancedFuseBatchSize: number,
) {
  const assemblyFuseDurations: number[] = []
  const startedAt = performance.now()
  const result = await buildAndInspect(input, {
    balancedFuseBatchSize,
    reportPhase: (phase, durationMs) => {
      if (phase === 'assembly-fuse') assemblyFuseDurations.push(durationMs)
    },
  })
  return {
    ...result,
    assemblyFuseDurations,
    elapsedMs: performance.now() - startedAt,
  }
}

describe('OpenGrid Hybrid spatial region assembly', () => {
  it('keeps a rectangular feature-enabled Hybrid region connected', async () => {
    const input = parameters({
      variant: 'Hybrid',
      rows: 3,
      columns: 4,
      halfCellX: 'right',
      halfCellY: 'bottom',
      chamfers: 'corners',
      connectorHoles: 'enabled',
      screwMode: 'corners',
    })
    const baseline = await buildTimed(input, 64)
    let optimized: Awaited<ReturnType<typeof buildTimed>> | null = null
    try {
      optimized = await buildTimed(
        input,
        OPENGRID_CONFIGURATION.balancedFuseBatchSize,
      )
      if (!optimized) throw new Error('HYBRID_OPTIMIZED_RESULT_MISSING')
      for (const [label, result] of [
        ['baseline', baseline],
        ['optimized', optimized],
      ] as const) {
        expect(
          result.quality.passed,
          `${label}:${result.quality.failures.join(';')}`,
        ).toBe(true)
        expect(result.quality.solidCount).toBe(1)
        expect(result.quality.cellOpeningCount).toBe(input.rows * input.columns)
        expect(result.assemblyFuseDurations.length).toBeGreaterThan(0)
        expect(
          result.assemblyFuseDurations.every(
            (durationMs) => Number.isFinite(durationMs) && durationMs >= 0,
          ),
        ).toBe(true)
        expect(Number.isFinite(result.elapsedMs)).toBe(true)
        expect(result.elapsedMs).toBeGreaterThan(0)
      }

      const expectedBounds = boundsForOpenGrid(input)
      for (const [label, result] of [
        ['baseline', baseline],
        ['optimized', optimized],
      ] as const) {
        expect(result.quality.bounds, `${label}:bounds`).not.toBeNull()
        if (!result.quality.bounds) throw new Error('HYBRID_BOUNDS_MISSING')
        for (const axis of [0, 1, 2] as const) {
          expect(result.quality.bounds.min[axis]).toBeCloseTo(
            expectedBounds.min[axis],
            5,
          )
          expect(result.quality.bounds.max[axis]).toBeCloseTo(
            expectedBounds.max[axis],
            5,
          )
        }
        expect(result.quality.bounds.max[2]).toBeCloseTo(
          OPENGRID_CONFIGURATION.variants.Hybrid.thickness,
          5,
        )
      }
    } finally {
      baseline.shape.delete()
      optimized?.shape.delete()
    }
  }, 240_000)
})
