import { describe, expect, it, vi } from 'vitest'
import type { Shape3D } from 'replicad'
import {
  MODULAR_GRID_BENCHMARK_FIXTURES,
  evaluatePerformanceGate,
  median,
  percentile95,
  runModularGridBenchmark,
  type BenchmarkSummary,
} from '../../src/workers/benchmark/modular-grid-base'

describe('modular-grid-base benchmark helpers', () => {
  it('exposes the canonical fixture matrix in ascending size order', () => {
    expect(MODULAR_GRID_BENCHMARK_FIXTURES).toEqual([
      { rows: 1, columns: 1 },
      { rows: 2, columns: 2 },
      { rows: 5, columns: 5 },
      { rows: 10, columns: 10 },
      { rows: 20, columns: 20 },
      { rows: 25, columns: 25 },
    ])
  })

  it('calculates robust median and P95 values from repeated samples', () => {
    expect(median([12, 3, 8, 20, 9])).toBe(9)
    expect(percentile95([12, 3, 8, 20, 9])).toBe(20)
  })

  it('enforces large-grid improvement and small-grid regression gates', () => {
    const summaries: BenchmarkSummary[] = [
      {
        strategy: 'sequential',
        fixture: { rows: 1, columns: 1 },
        samples: 5,
        medianMs: 100,
        p95Ms: 110,
      },
      {
        strategy: 'balanced',
        fixture: { rows: 1, columns: 1 },
        samples: 5,
        medianMs: 105,
        p95Ms: 115,
      },
      {
        strategy: 'sequential',
        fixture: { rows: 2, columns: 2 },
        samples: 5,
        medianMs: 200,
        p95Ms: 220,
      },
      {
        strategy: 'balanced',
        fixture: { rows: 2, columns: 2 },
        samples: 5,
        medianMs: 210,
        p95Ms: 230,
      },
      {
        strategy: 'sequential',
        fixture: { rows: 10, columns: 10 },
        samples: 5,
        medianMs: 1_000,
        p95Ms: 1_100,
      },
      {
        strategy: 'balanced',
        fixture: { rows: 10, columns: 10 },
        samples: 5,
        medianMs: 700,
        p95Ms: 800,
      },
      {
        strategy: 'sequential',
        fixture: { rows: 25, columns: 25 },
        samples: 5,
        medianMs: 10_000,
        p95Ms: 11_000,
      },
      {
        strategy: 'balanced',
        fixture: { rows: 25, columns: 25 },
        samples: 5,
        medianMs: 7_000,
        p95Ms: 8_000,
      },
    ]

    expect(evaluatePerformanceGate(summaries)).toEqual({
      passed: true,
      failures: [],
      warnings: [],
    })
    expect(
      evaluatePerformanceGate(
        summaries.map((summary) =>
          summary.strategy === 'balanced' && summary.fixture.rows === 1
            ? { ...summary, medianMs: 120 }
            : summary,
        ),
      ).passed,
    ).toBe(false)
  })

  it('keeps the gate actionable when the sequential large-grid baseline fails', () => {
    const summaries = [
      ...[
        { rows: 1, columns: 1 },
        { rows: 2, columns: 2 },
      ].flatMap((fixture, index) => [
        {
          strategy: 'sequential' as const,
          fixture,
          samples: 5,
          medianMs: (index + 1) * 100,
          p95Ms: (index + 1) * 110,
        },
        {
          strategy: 'balanced' as const,
          fixture,
          samples: 5,
          medianMs: (index + 1) * 105,
          p95Ms: (index + 1) * 115,
        },
      ]),
      {
        strategy: 'balanced' as const,
        fixture: { rows: 10, columns: 10 },
        samples: 5,
        medianMs: 700,
        p95Ms: 800,
      },
      {
        strategy: 'balanced' as const,
        fixture: { rows: 25, columns: 25 },
        samples: 5,
        medianMs: 7_000,
        p95Ms: 8_000,
      },
    ]

    const result = evaluatePerformanceGate(summaries, [
      {
        strategy: 'sequential',
        fixture: { rows: 10, columns: 10 },
        sample: 1,
        phase: 'build',
        message: 'native baseline failed',
      },
      {
        strategy: 'sequential',
        fixture: { rows: 25, columns: 25 },
        sample: 1,
        phase: 'build',
        message: 'native baseline failed',
      },
    ])

    expect(result.passed).toBe(true)
    expect(result.failures).toEqual([])
    expect(result.warnings).toEqual([
      expect.stringContaining('10x10'),
      expect.stringContaining('25x25'),
    ])
  })

  it('checks STEP quality during warm-up without adding writer cost to samples', async () => {
    const shape = {
      delete: vi.fn(),
      boundingBox: {
        bounds: [
          [0, 0, 0],
          [20, 20, 5],
        ],
        delete: vi.fn(),
      },
    } as unknown as Shape3D
    const exportStep = vi.fn(async () => new ArrayBuffer(1))

    const report = await runModularGridBenchmark({
      adapter: {
        loadTemplate: async () => shape,
        build: () => shape,
        mesh: () => ({
          positions: new Float32Array([0, 0, 0]),
          normals: new Float32Array([0, 0, 1]),
          indices: new Uint32Array([0, 0, 0]),
          bounds: { min: [0, 0, 0], max: [20, 20, 5] },
          triangleCount: 1,
        }),
        exportStep,
      },
      environment: {
        browserBuildMode: 'unit',
        dependencyLockfileVersion: 'test',
        referenceEnvironment: 'test',
      },
      fixtures: [{ rows: 1, columns: 1 }],
      strategies: ['balanced'],
    })

    expect(exportStep).toHaveBeenCalledOnce()
    expect(report.warmups).toHaveLength(1)
    expect(report.runs).toHaveLength(5)
    expect(report.summaries[0]).toMatchObject({ stepByteLength: 1 })
  })
})
