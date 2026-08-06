import { describe, expect, it, vi } from 'vitest'
import type { Shape3D } from 'replicad'
import {
  BOX_NORMAL_BENCHMARK_FIXTURES,
  BOX_NORMAL_BENCHMARK_RUNS,
  percentile95,
  median,
  runBoxNormalBenchmark,
  type BoxNormalBenchmarkAdapter,
} from '../../src/workers/benchmark/box-normal'

function createAdapter(
  invalidCounts = false,
  reportCounts = true,
): BoxNormalBenchmarkAdapter {
  const reference = { delete: vi.fn() } as unknown as Shape3D

  function postInstanceCount(cornerPosts: boolean): number {
    if (!cornerPosts) return 0
    return invalidCounts ? 3 : 4
  }

  return {
    loadReference: vi.fn(async () => reference),
    build: vi.fn(async (parameters, _reference, context) => {
      if (reportCounts) {
        context.reportOperationCounts({
          bodyPrototype: 1,
          postInstances: postInstanceCount(parameters.cornerPosts),
          placements: parameters.cornerPosts ? 4 : 0,
          assemblyFuses: parameters.cornerPosts ? 4 : 0,
          gridCellBuilds: 0,
        })
      }
      return { delete: vi.fn() } as unknown as Shape3D
    }),
    mesh: vi.fn(() => ({
      positions: new Float32Array([0, 0, 0]),
      normals: new Float32Array([0, 0, 1]),
      indices: new Uint32Array([0]),
      bounds: {
        min: [0, 0, 0] as [number, number, number],
        max: [0, 0, 0] as [number, number, number],
      },
      triangleCount: 1,
    })),
    disposeReference: vi.fn(),
  }
}

describe('box-normal benchmark', () => {
  it('uses the required six fixtures and five measured runs with warmups', async () => {
    const report = await runBoxNormalBenchmark({
      adapter: createAdapter(),
      environment: 'test-reference',
    })

    expect(BOX_NORMAL_BENCHMARK_FIXTURES).toEqual([
      { x: 2, y: 2, height: 10, cornerPosts: false },
      { x: 2, y: 2, height: 10, cornerPosts: true },
      { x: 3, y: 3, height: 10, cornerPosts: false },
      { x: 3, y: 3, height: 10, cornerPosts: true },
      { x: 40, y: 35, height: 10, cornerPosts: false },
      { x: 40, y: 35, height: 10, cornerPosts: true },
    ])
    expect(report.warmupRuns).toBe(1)
    expect(report.measuredRuns).toBe(BOX_NORMAL_BENCHMARK_RUNS)
    expect(report.warmups).toHaveLength(6)
    expect(report.runs).toHaveLength(6 * BOX_NORMAL_BENCHMARK_RUNS)
    expect(report.summaries).toHaveLength(6)
    expect(report.traces).toHaveLength(6 * (BOX_NORMAL_BENCHMARK_RUNS + 1))
    expect(report.gate).toEqual({ passed: true, failures: [] })
  })

  it('reports median and P95 without a hardware-dependent time gate', () => {
    expect(median([12, 3, 8, 20, 9])).toBe(9)
    expect(percentile95([12, 3, 8, 20, 9])).toBe(20)
  })

  it('fails when a fixture violates the fixed operation-count table', async () => {
    const report = await runBoxNormalBenchmark({
      adapter: createAdapter(true),
      environment: 'test-reference',
      fixtures: [{ x: 2, y: 2, height: 10, cornerPosts: true }],
    })

    expect(report.gate.passed).toBe(false)
    expect(report.gate.failures).toEqual([
      'operation-count-mismatch:2x2-h10-posts',
    ])
  })

  it('fails when a fixture does not report operation counts', async () => {
    const report = await runBoxNormalBenchmark({
      adapter: createAdapter(false, false),
      environment: 'test-reference',
      fixtures: [{ x: 2, y: 2, height: 10, cornerPosts: false }],
    })

    expect(report.gate).toEqual({
      passed: false,
      failures: ['operation-count-missing:2x2-h10-plain'],
    })
  })
})
