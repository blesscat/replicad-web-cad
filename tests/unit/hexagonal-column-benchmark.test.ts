import { describe, expect, it, vi } from 'vitest'
import type { Shape3D } from 'replicad'
import {
  HEXAGONAL_COLUMN_BENCHMARK_FIXTURES,
  runHexagonalColumnBenchmark,
  type HexagonalColumnBenchmarkAdapter,
} from '../../src/workers/benchmark/hexagonal-column'

function createAdapter(
  trace = { stepImports: 1, fuseOperations: 0 },
): HexagonalColumnBenchmarkAdapter {
  const reference = { delete: vi.fn() } as unknown as Shape3D
  return {
    loadReference: vi.fn(async () => reference),
    build: vi.fn(async (_parameters, _reference, context) => {
      context.reportPhase('prototype-build', 2)
      context.reportPhase('clone-translate-compound', 3)
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
    getOperationTrace: () => trace,
    disposeReference: vi.fn(),
  }
}

describe('hexagonal-column benchmark', () => {
  it('runs one warm-up and five measured samples per required fixture', async () => {
    const report = await runHexagonalColumnBenchmark({
      adapter: createAdapter(),
      environment: 'test-reference',
    })

    expect(report.warmupRuns).toBe(1)
    expect(report.measuredRuns).toBe(5)
    expect(report.warmups).toHaveLength(
      HEXAGONAL_COLUMN_BENCHMARK_FIXTURES.length,
    )
    expect(report.runs).toHaveLength(
      HEXAGONAL_COLUMN_BENCHMARK_FIXTURES.length * 5,
    )
    expect(report.summaries).toHaveLength(3)
    expect(report.summaries[2]?.fixture.count).toBe(20)
    expect(report.summaries[2]?.phases.totalMs.p95Ms).toBeGreaterThanOrEqual(0)
    expect(report.gate).toEqual({ passed: true, failures: [] })
  })

  it('fails the performance contract when the trace shows repeated imports or fuse', async () => {
    const report = await runHexagonalColumnBenchmark({
      adapter: createAdapter({ stepImports: 20, fuseOperations: 1 }),
      environment: 'test-reference',
    })

    expect(report.gate.passed).toBe(false)
    expect(report.gate.failures).toEqual(
      expect.arrayContaining([
        'per-column-step-import-detected',
        'boolean-fuse-detected',
      ]),
    )
  })
})
