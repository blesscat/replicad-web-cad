import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { makeBox, measureVolume, setOC, type Shape3D } from 'replicad'
import {
  assertOpenGridShapeQuality,
  inspectOpenGridShapeQuality,
} from '../../src/cad-kernel/components/opengrid/quality'
import { buildOpenGridBRep } from '../../src/cad-kernel/components/opengrid/builder'
import { meshBRep } from '../../src/cad-kernel/mesh'
import {
  boundsForOpenGrid,
  cellCenterForOpenGrid,
  normalizeOpenGridParameters,
  OPENGRID_CONFIGURATION,
  OPENGRID_PREVIEW_CONFIGURATION,
  type OpenGridParameters,
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

function measureIntersectionVolume(
  shape: Shape3D,
  minimum: [number, number, number],
  maximum: [number, number, number],
): number {
  const probe = makeBox(minimum, maximum)
  const intersection = shape.intersect(probe)
  try {
    return measureVolume(intersection)
  } finally {
    if (intersection !== shape && intersection !== probe) intersection.delete()
    probe.delete()
  }
}

function expectHalfCellBoundaryStrips(
  shape: Shape3D,
  input: OpenGridParameters,
): void {
  const bounds = boundsForOpenGrid(input)
  if (input.halfCellX !== 'none') {
    const isLeft = input.halfCellX === 'left'
    const minX = isLeft ? bounds.min[0] + 0.3 : bounds.max[0] - 0.7
    const maxX = isLeft ? bounds.min[0] + 0.7 : bounds.max[0] - 0.3
    for (let row = 0; row < input.rows; row += 1) {
      const [, centerY] = cellCenterForOpenGrid(input, row, 0)
      const volume = measureIntersectionVolume(
        shape,
        [minX, centerY - 0.5, 0.5],
        [maxX, centerY + 0.5, 1.5],
      )
      expect(volume).toBeGreaterThan(0.01)
    }
  }

  if (input.halfCellY !== 'none') {
    const isBottom = input.halfCellY === 'bottom'
    const minY = isBottom ? bounds.min[1] + 0.3 : bounds.max[1] - 0.7
    const maxY = isBottom ? bounds.min[1] + 0.7 : bounds.max[1] - 0.3
    for (let column = 0; column < input.columns; column += 1) {
      const [centerX] = cellCenterForOpenGrid(input, 0, column)
      const volume = measureIntersectionVolume(
        shape,
        [centerX - 0.5, minY, 0.5],
        [centerX + 0.5, maxY, 1.5],
      )
      expect(volume).toBeGreaterThan(0.01)
    }
  }
}

describe('OpenGrid everywhere chamfer fallback', () => {
  it('keeps Full, Lite, and Heavy dual half-cell profiles valid', async () => {
    for (const variant of ['Full', 'Lite', 'Heavy'] as const) {
      const input = parameters({
        variant,
        rows: 2,
        columns: 2,
        halfCellX: 'left',
        halfCellY: 'bottom',
        chamfers: 'everywhere',
        connectorHoles: 'enabled',
        screwMode: 'none',
      })
      const shape = await buildOpenGridBRep(input)
      try {
        const mesh = meshBRep(shape, OPENGRID_PREVIEW_CONFIGURATION)
        const quality = inspectOpenGridShapeQuality(shape, input, mesh)
        expect(quality.passed, `${variant}:${quality.failures.join(';')}`).toBe(
          true,
        )
        assertOpenGridShapeQuality(shape, input, mesh)
        expect(quality.cellOpeningCount).toBe(4)
        expectHalfCellBoundaryStrips(shape, input)
      } finally {
        shape.delete()
      }
    }
  }, 120_000)
})
