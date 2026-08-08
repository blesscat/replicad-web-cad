import { describe, expect, it, vi } from 'vitest'
import type { Shape3D } from 'replicad'
import {
  createOpenGridBenchmarkFixtures,
  OPENGRID_BENCHMARK_STRATEGIES,
  OPENGRID_BENCHMARK_FIXTURES,
  OPENGRID_BENCHMARK_RUNS,
  renderOpenGridBenchmarkMarkdown,
  runOpenGridBenchmark,
  type OpenGridBenchmarkAdapter,
  type OpenGridBenchmarkFixture,
  type OpenGridBenchmarkQuality,
} from '../../src/workers/benchmark/opengrid-geometry'
import {
  deterministicCustomScrewPositions,
  expectedOpenGridBounds,
  OPENGRID_BENCHMARK_CONFIGURATION,
  screwPositionsForRequest,
} from '../../src/cad-kernel/components/opengrid-benchmark/builder'

function fakeQuality(
  fixture: OpenGridBenchmarkFixture,
): OpenGridBenchmarkQuality {
  return {
    passed: true,
    failures: [],
    bounds: expectedOpenGridBounds(fixture.request),
    expectedBounds: expectedOpenGridBounds(fixture.request),
    volume: 1,
    solidCount: 1,
    singleSolid: true,
    brepValid: true,
    centeredXY: true,
    baseZAtZero: true,
    meshTriangleCount: 1,
    stepByteLength: 1,
    stlByteLength: 1,
    stlTriangleCount: 1,
  }
}

function createFakeAdapter(
  build: OpenGridBenchmarkAdapter['build'] = async () =>
    ({ delete: vi.fn() }) as unknown as Shape3D,
): OpenGridBenchmarkAdapter {
  return {
    build,
    mesh: () => ({
      positions: new Float32Array([0, 0, 0]),
      normals: new Float32Array([0, 0, 1]),
      indices: new Uint32Array([0, 0, 0]),
      bounds: { min: [0, 0, 0], max: [1, 1, 1] },
      triangleCount: 1,
    }),
    exportStep: async () => new ArrayBuffer(1),
    exportStl: async () => new ArrayBuffer(1),
    inspect: (shape, fixture) => fakeQuality(fixture),
  }
}

function fakeEnvironment() {
  return {
    browserBuildMode: 'unit',
    dependencyLockfileVersion: 'test',
    referenceEnvironment: 'test',
    nativeExecutionEpoch: 'unit-epoch',
  }
}

describe('OpenGrid geometry benchmark contract', () => {
  it('exposes every required variant and scale without exceeding the workspace', () => {
    const fixtures = createOpenGridBenchmarkFixtures()
    expect(new Set(fixtures.map((fixture) => fixture.variant))).toEqual(
      new Set(['Full', 'Lite', 'Heavy']),
    )
    for (const variant of ['Full', 'Lite', 'Heavy'] as const) {
      expect(
        fixtures
          .filter((fixture) => fixture.variant === variant)
          .map((fixture) => fixture.scaleId),
      ).toEqual(['1x1', '2x2', '5x5', '10x10', '17x17-max-500mm'])
    }

    const largest = fixtures.find(
      (fixture) => fixture.scaleId === '17x17-max-500mm',
    )
    expect(largest).toBeDefined()
    expect(
      largest!.request.rows * OPENGRID_BENCHMARK_CONFIGURATION.gridPitch,
    ).toBeLessThanOrEqual(
      OPENGRID_BENCHMARK_CONFIGURATION.workspaceMaxDimension,
    )
    expect(
      (largest!.request.rows + 1) * OPENGRID_BENCHMARK_CONFIGURATION.gridPitch,
    ).toBeGreaterThan(OPENGRID_BENCHMARK_CONFIGURATION.workspaceMaxDimension)
  })

  it('keeps official screw lattices deterministic for none, corners, everywhere, and custom loads', () => {
    const fixtures = createOpenGridBenchmarkFixtures()
    const none = fixtures.find((fixture) => fixture.scaleId === '1x1')!
    const corners = fixtures.find((fixture) => fixture.scaleId === '2x2')!
    const all = fixtures.find((fixture) => fixture.scaleId === '10x10')!
    const custom = fixtures.find((fixture) => fixture.scaleId === '5x5')!

    expect(screwPositionsForRequest(none.request)).toHaveLength(0)
    expect(screwPositionsForRequest(corners.request)).toEqual([
      { row: 0, column: 0 },
    ])
    expect(screwPositionsForRequest(all.request)).toHaveLength(81)
    expect(screwPositionsForRequest(custom.request)).toEqual(
      deterministicCustomScrewPositions(5, 5),
    )
    expect(custom.request.connectorHoles).toBe('enabled')
    expect(none.request.connectorHoles).toBe('enabled')
    expect(all.request.connectorHoles).toBe('enabled')
  })

  it('runs cold, warm-up, and five measured samples with explicit not-applicable phases', async () => {
    const fixture = OPENGRID_BENCHMARK_FIXTURES[0]
    const report = await runOpenGridBenchmark({
      adapter: createFakeAdapter(
        async () => ({ delete: vi.fn() }) as unknown as Shape3D,
      ),
      environment: fakeEnvironment(),
      fixtures: [fixture],
    })

    expect(report.coldRuns).toHaveLength(OPENGRID_BENCHMARK_STRATEGIES.length)
    expect(report.warmups).toHaveLength(OPENGRID_BENCHMARK_STRATEGIES.length)
    expect(report.runs).toHaveLength(
      OPENGRID_BENCHMARK_STRATEGIES.length * OPENGRID_BENCHMARK_RUNS,
    )
    expect(report.failures).toHaveLength(0)
    expect(report.summaries).toHaveLength(OPENGRID_BENCHMARK_STRATEGIES.length)
    expect(
      report.summaries.find((summary) => summary.strategy === 'whole-profile')
        ?.phases.assemblyFuseMs,
    ).toEqual({
      applicable: false,
      medianMs: null,
      p95Ms: null,
    })
    expect(report.recommendations.Full.strategy).toBeDefined()
    expect(report.selectedStrategies.Full).toBeDefined()
    expect(report.selectedStrategies.Lite).toBeNull()
    expect(report.selectedStrategies.Heavy).toBeNull()
  })

  it('retains failed samples while allowing independent strategies to finish', async () => {
    const fixture = OPENGRID_BENCHMARK_FIXTURES[0]
    const failingAdapter = createFakeAdapter(
      async (_fixture, strategy, context) => {
        if (strategy === 'cell-balanced') {
          context.reportPhaseStart?.('assembly-fuse')
          throw new Error('synthetic fuse failure')
        }
        return { delete: vi.fn() } as unknown as Shape3D
      },
    )
    const report = await runOpenGridBenchmark({
      adapter: failingAdapter,
      environment: fakeEnvironment(),
      fixtures: [fixture],
      strategies: ['whole-profile', 'cell-balanced'],
    })

    expect(report.runs).toHaveLength(OPENGRID_BENCHMARK_RUNS)
    expect(report.summaries.map((summary) => summary.strategy)).toEqual([
      'whole-profile',
    ])
    expect(
      report.failures.some(
        (failure) =>
          failure.strategy === 'cell-balanced' &&
          failure.kind === 'measured' &&
          failure.phase === 'assembly-fuse' &&
          failure.message.includes('synthetic fuse failure'),
      ),
    ).toBe(true)
  })

  it('retains a timeout failure for every timed-out sample', async () => {
    const fixture = OPENGRID_BENCHMARK_FIXTURES[0]
    const report = await runOpenGridBenchmark({
      adapter: createFakeAdapter(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5))
        return { delete: vi.fn() } as unknown as Shape3D
      }),
      environment: fakeEnvironment(),
      fixtures: [fixture],
      strategies: ['whole-profile'],
      sampleTimeoutMs: 1,
    })

    expect(report.runs).toHaveLength(0)
    expect(report.failures).toHaveLength(1 + 1 + OPENGRID_BENCHMARK_RUNS)
    expect(report.failures.every((failure) => failure.phase === 'build')).toBe(
      true,
    )
    expect(
      report.failures.every((failure) =>
        failure.message.includes('OPENGRID_BENCHMARK_TIMEOUT_1MS'),
      ),
    ).toBe(true)
  })

  it('records fixture classes with no quality-approved fallback', async () => {
    const fixture = OPENGRID_BENCHMARK_FIXTURES[0]
    const report = await runOpenGridBenchmark({
      adapter: createFakeAdapter(async () => {
        throw new Error('synthetic quality blocker')
      }),
      environment: fakeEnvironment(),
      fixtures: [fixture],
    })
    const markdown = renderOpenGridBenchmarkMarkdown(report)

    expect(report.recommendations.Full.blockedFixtureIds).toEqual([fixture.id])
    expect(report.recommendations.Full.fallbackConditions[0]).toContain(
      '官方 profile fixture',
    )
    expect(markdown).toContain('## Failures')
    expect(markdown).toContain(fixture.id)
  })

  it('renders a generator handoff with recommendation and future scope', async () => {
    const report = await runOpenGridBenchmark({
      adapter: createFakeAdapter(),
      environment: fakeEnvironment(),
      fixtures: [OPENGRID_BENCHMARK_FIXTURES[0]],
      strategies: ['whole-profile'],
    })
    const markdown = renderOpenGridBenchmarkMarkdown(report)

    expect(markdown).toContain('## Selected strategy')
    expect(markdown).toContain('## Generator handoff')
    expect(markdown).toContain('add-opengrid-generator')
    expect(markdown).toContain('Worker cancellation')
    expect(markdown).toContain('STEP/STL export')
  })
})
