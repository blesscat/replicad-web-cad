import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { measureVolume, setOC, type Shape3D } from 'replicad'
import {
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
} from '../../src/cad-contract/units'
import { buildOpenGridStackableBox } from '../../src/cad-kernel/components/opengrid-stackable-box/builder'
import { buildOpenGridStackableCylinder as buildCylinder } from '../../src/cad-kernel/components/opengrid-stackable-cylinder/builder'
import {
  openGridStackableBoxHoneycombCellCountFor,
  openGridStackableCylinderHoneycombCellCountFor,
} from '../../src/cad-kernel/lattice/opengrid-honeycomb'
import { meshBRep } from '../../src/cad-kernel/mesh'

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

const runBenchmark = process.env.RUN_CAD_BENCHMARK === '1'
const sampleCount = 3

type BenchmarkSample = {
  buildMs: number
  meshMs: number
  totalMs: number
  volume: number
  triangleCount: number
  cellCount: number
}

function deleteShape(shape: Shape3D | null | undefined): void {
  try {
    shape?.delete()
  } catch {
    // Keep benchmark cleanup from hiding the measured result.
  }
}

function median(values: number[]): number {
  const sorted = [...values].sort((first, second) => first - second)
  const middle = Math.floor(sorted.length / 2)
  const lower = sorted[middle - 1]
  const upper = sorted[middle]
  return sorted.length % 2 === 0 && lower !== undefined && upper !== undefined
    ? (lower + upper) / 2
    : (upper ?? 0)
}

function summarize(samples: BenchmarkSample[]) {
  return {
    buildMsMedian: median(samples.map((sample) => sample.buildMs)),
    meshMsMedian: median(samples.map((sample) => sample.meshMs)),
    totalMsMedian: median(samples.map((sample) => sample.totalMs)),
    volume: median(samples.map((sample) => sample.volume)),
    triangleCount: median(samples.map((sample) => sample.triangleCount)),
    cellCount: samples[0]?.cellCount ?? 0,
  }
}

async function initialise(): Promise<void> {
  const openCascade = await initialiseOpenCascade({
    locateFile: () => WASM_PATH,
  })
  setOC(openCascade as Parameters<typeof setOC>[0])
}

function measureSample(
  build: () => Shape3D,
  cellCount: number,
): BenchmarkSample {
  const startedAt = performance.now()
  const shape = build()
  const builtAt = performance.now()
  try {
    const meshStartedAt = performance.now()
    const mesh = meshBRep(shape, {
      tolerance: 0.05,
      angularTolerance: 0.1,
    })
    const finishedAt = performance.now()
    return {
      buildMs: builtAt - startedAt,
      meshMs: finishedAt - meshStartedAt,
      totalMs: finishedAt - startedAt,
      volume: measureVolume(shape),
      triangleCount: mesh.triangleCount,
      cellCount,
    }
  } finally {
    deleteShape(shape)
  }
}

describe.skipIf(!runBenchmark)('OpenGrid honeycomb benchmark', () => {
  beforeAll(initialise)

  it('reports representative solid and honeycomb build/mesh timings', () => {
    const boxInput = {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 3,
      y: 3,
      height: 60,
    }
    const boxHoneycombInput = { ...boxInput, honeycombMode: true }
    const cylinderInput = {
      ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
      diameter: 100,
      height: 60,
    }
    const cylinderHoneycombInput = { ...cylinderInput, honeycombMode: true }
    const fixtures = [
      {
        id: 'box-3x3-h60',
        baseline: () => buildOpenGridStackableBox(boxInput),
        honeycomb: () => buildOpenGridStackableBox(boxHoneycombInput),
        cellCount: openGridStackableBoxHoneycombCellCountFor(boxHoneycombInput),
      },
      {
        id: 'cylinder-d100-h60',
        baseline: () => buildCylinder(cylinderInput),
        honeycomb: () => buildCylinder(cylinderHoneycombInput),
        cellCount: openGridStackableCylinderHoneycombCellCountFor(
          cylinderHoneycombInput,
        ),
      },
    ]
    const report = fixtures.map((fixture) => {
      const baselineSamples = Array.from({ length: sampleCount }, () =>
        measureSample(fixture.baseline, 0),
      )
      const honeycombSamples = Array.from({ length: sampleCount }, () =>
        measureSample(fixture.honeycomb, fixture.cellCount),
      )
      const baseline = summarize(baselineSamples)
      const honeycomb = summarize(honeycombSamples)
      expect(honeycomb.cellCount).toBeGreaterThan(0)
      expect(honeycomb.volume).toBeLessThan(baseline.volume)
      expect(honeycomb.triangleCount).toBeGreaterThan(0)
      return { id: fixture.id, baseline, honeycomb }
    })

    console.log(JSON.stringify({ sampleCount, report }, null, 2))
    expect(report).toHaveLength(2)
  }, 600000)
})
