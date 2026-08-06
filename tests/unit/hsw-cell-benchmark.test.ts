import { describe, expect, it, vi } from 'vitest'
import type { Shape3D } from 'replicad'
import {
  HSW_CELL_BENCHMARK_FIXTURES,
  HSW_CELL_BENCHMARK_RUNS,
  compareHswGeometry,
  evaluateHswPerformanceGate,
  median,
  percentile95,
  runHswCellBenchmark,
  type HswBenchmarkPhase,
  type HswBenchmarkAdapter,
  type HswBenchmarkQuality,
  type HswBenchmarkSummary,
} from '../../src/workers/benchmark/hsw-cell'

function phaseSummaries(
  medianMs: number,
): Record<HswBenchmarkPhase, { medianMs: number; p95Ms: number }> {
  return {
    cloneTranslateMs: { medianMs, p95Ms: medianMs },
    assemblyFuseMs: { medianMs, p95Ms: medianMs },
    meshMs: { medianMs, p95Ms: medianMs },
    totalMs: { medianMs, p95Ms: medianMs },
  }
}

function summary(
  strategy: 'sequential' | 'column',
  fixture: { rows: number; columns: number },
  medianMs: number,
): HswBenchmarkSummary {
  return {
    strategy,
    fixture,
    samples: HSW_CELL_BENCHMARK_RUNS,
    medianMs,
    p95Ms: medianMs,
    phases: phaseSummaries(medianMs),
  }
}

function quality(): HswBenchmarkQuality {
  return {
    bounds: { min: [-1, -1, 0], max: [1, 1, 8] },
    meshTriangleCount: 12,
    openingCount: 1,
    sharpEdgeCount: 12,
    singleSolid: true,
    stepByteLength: null,
    stlByteLength: null,
    stlTriangleCount: null,
  }
}

function binaryStlBytes(): ArrayBuffer {
  const bytes = new ArrayBuffer(84 + 50)
  new DataView(bytes).setUint32(80, 1, true)
  return bytes
}

describe('HSW benchmark helpers', () => {
  it('exposes the HSW-only fixture matrix and five-sample minimum', () => {
    expect(HSW_CELL_BENCHMARK_FIXTURES).toEqual([
      { rows: 1, columns: 1 },
      { rows: 2, columns: 2 },
      { rows: 5, columns: 5 },
      { rows: 10, columns: 10 },
      { rows: 20, columns: 20 },
    ])
    expect(HSW_CELL_BENCHMARK_RUNS).toBe(5)
  })

  it('calculates median and P95 from repeated timing samples', () => {
    expect(median([12, 3, 8, 20, 9])).toBe(9)
    expect(percentile95([12, 3, 8, 20, 9])).toBe(20)
  })

  it('enforces small-grid regression and large-grid improvement gates', () => {
    const summaries = [
      summary('sequential', { rows: 1, columns: 1 }, 100),
      summary('column', { rows: 1, columns: 1 }, 105),
      summary('sequential', { rows: 2, columns: 2 }, 200),
      summary('column', { rows: 2, columns: 2 }, 210),
      summary('sequential', { rows: 10, columns: 10 }, 1_000),
      summary('column', { rows: 10, columns: 10 }, 700),
      summary('sequential', { rows: 20, columns: 20 }, 10_000),
      summary('column', { rows: 20, columns: 20 }, 7_000),
    ]
    const geometry = [
      { fixture: { rows: 1, columns: 1 }, equivalent: true },
      { fixture: { rows: 2, columns: 2 }, equivalent: true },
      { fixture: { rows: 10, columns: 10 }, equivalent: true },
      { fixture: { rows: 20, columns: 20 }, equivalent: true },
    ]

    expect(evaluateHswPerformanceGate(summaries, [], geometry)).toEqual({
      passed: true,
      failures: [],
      warnings: [],
    })
    const regressedSummaries = summaries.map((entry) => {
      if (entry.strategy === 'column' && entry.fixture.rows === 1) {
        return { ...entry, medianMs: 120 }
      }
      return entry
    })
    expect(
      evaluateHswPerformanceGate(regressedSummaries, [], geometry).passed,
    ).toBe(false)
  })

  it('retains a warning when a large sequential baseline times out', () => {
    const summaries = [
      summary('sequential', { rows: 1, columns: 1 }, 100),
      summary('column', { rows: 1, columns: 1 }, 105),
      summary('sequential', { rows: 2, columns: 2 }, 200),
      summary('column', { rows: 2, columns: 2 }, 210),
      summary('column', { rows: 10, columns: 10 }, 700),
      summary('column', { rows: 20, columns: 20 }, 7_000),
    ]
    const failures = [10, 20].map((size) => ({
      strategy: 'sequential' as const,
      fixture: { rows: size, columns: size },
      sample: 1,
      phase: 'build',
      message: 'native timeout',
    }))

    const result = evaluateHswPerformanceGate(summaries, failures)

    expect(result.passed).toBe(true)
    expect(result.failures).toEqual([])
    expect(result.warnings).toEqual([
      expect.stringContaining('10x10'),
      expect.stringContaining('20x20'),
    ])
  })

  it('separates one cold asset import from warm cached generation samples', async () => {
    const shape = { delete: vi.fn() } as unknown as Shape3D
    const loadTemplate = vi.fn(async () => shape)
    const build = vi.fn(async () => shape)
    const mesh = vi.fn(() => ({
      positions: new Float32Array([0, 0, 0]),
      normals: new Float32Array([0, 0, 1]),
      indices: new Uint32Array([0, 0, 0]),
      bounds: {
        min: [-1, -1, 0] as [number, number, number],
        max: [1, 1, 8] as [number, number, number],
      },
      triangleCount: 1,
    }))

    const report = await runHswCellBenchmark({
      adapter: {
        loadTemplate,
        build: build as unknown as HswBenchmarkAdapter['build'],
        mesh: mesh as unknown as HswBenchmarkAdapter['mesh'],
        inspect: () => quality(),
        exportStep: vi.fn(async () => new ArrayBuffer(3)),
        exportStl: vi.fn(async () => binaryStlBytes()),
      },
      environment: {
        browserBuildMode: 'unit',
        dependencyLockfileVersion: 'test',
        referenceEnvironment: 'test',
      },
      fixtures: [{ rows: 1, columns: 1 }],
      strategies: ['column'],
    })

    expect(loadTemplate).toHaveBeenCalledOnce()
    expect(report.coldAssetImportMs).not.toBeNull()
    expect(report.coldAssetImport).toEqual({
      medianMs: expect.any(Number),
      p95Ms: expect.any(Number),
    })
    expect(report.warmups).toHaveLength(1)
    expect(report.runs).toHaveLength(HSW_CELL_BENCHMARK_RUNS)
    expect(report.warmups[0]?.quality.stepByteLength).toBe(3)
    expect(report.warmups[0]?.quality.stlByteLength).toBe(134)
    expect(report.warmups[0]?.quality.stlTriangleCount).toBe(1)
  })

  it('records every measured attempt after a transient strategy failure', async () => {
    const shape = { delete: vi.fn() } as unknown as Shape3D
    let buildCalls = 0
    const build = vi.fn(async () => {
      buildCalls += 1
      if (buildCalls === 2) throw new Error('transient native failure')
      return shape
    })
    const mesh = vi.fn(() => ({
      positions: new Float32Array([0, 0, 0]),
      normals: new Float32Array([0, 0, 1]),
      indices: new Uint32Array([0, 0, 0]),
      bounds: {
        min: [-1, -1, 0] as [number, number, number],
        max: [1, 1, 8] as [number, number, number],
      },
      triangleCount: 1,
    }))

    const report = await runHswCellBenchmark({
      adapter: {
        loadTemplate: vi.fn(async () => shape),
        build: build as unknown as HswBenchmarkAdapter['build'],
        mesh: mesh as unknown as HswBenchmarkAdapter['mesh'],
        inspect: () => quality(),
        exportStep: vi.fn(async () => new ArrayBuffer(3)),
        exportStl: vi.fn(async () => binaryStlBytes()),
      },
      environment: {
        browserBuildMode: 'unit',
        dependencyLockfileVersion: 'test',
        referenceEnvironment: 'test',
      },
      fixtures: [{ rows: 1, columns: 1 }],
      strategies: ['column'],
    })

    expect(build).toHaveBeenCalledTimes(HSW_CELL_BENCHMARK_RUNS + 1)
    expect(report.runs).toHaveLength(HSW_CELL_BENCHMARK_RUNS - 1)
    expect(report.failures).toEqual([
      expect.objectContaining({ strategy: 'column', sample: 1 }),
    ])
  })

  it('compares bounds, topology, sharpness, and mesh quality between strategies', () => {
    const base = {
      strategy: 'sequential' as const,
      fixture: { rows: 2, columns: 2 },
      sample: 0,
      timing: {
        cloneTranslateMs: 1,
        assemblyFuseMs: 1,
        meshMs: 1,
        totalMs: 1,
      },
      quality: quality(),
    }
    const column = {
      ...base,
      strategy: 'column' as const,
      quality: { ...quality() },
    }

    expect(
      compareHswGeometry([base, column], [{ rows: 2, columns: 2 }]),
    ).toEqual([{ fixture: { rows: 2, columns: 2 }, equivalent: true }])
    expect(
      compareHswGeometry(
        [base, { ...column, quality: { ...quality(), openingCount: 2 } }],
        [{ rows: 2, columns: 2 }],
      )[0]?.equivalent,
    ).toBe(false)
  })
})
