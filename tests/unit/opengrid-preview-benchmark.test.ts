import { describe, expect, it, vi } from 'vitest'
import type { Shape3D } from 'replicad'
import {
  OPENGRID_PREVIEW_BENCHMARK_FIXTURES,
  OPENGRID_PREVIEW_BENCHMARK_RUNS,
  runOpenGridPreviewBenchmark,
  type OpenGridPreviewBenchmarkAdapter,
} from '../../src/workers/benchmark/opengrid-preview'
import type { PreviewTiming } from '../../src/cad-contract/preview-timing'

function fakeAdapter(): OpenGridPreviewBenchmarkAdapter {
  return {
    build: async () => ({ delete: vi.fn() }) as unknown as Shape3D,
    mesh: () => ({
      positions: new Float32Array([0, 0, 0]),
      normals: new Float32Array([0, 0, 1]),
      indices: new Uint32Array([0, 0, 0]),
      bounds: { min: [0, 0, 0], max: [1, 1, 1] },
      triangleCount: 1,
    }),
    inspect: () => ({
      passed: true,
      failures: [],
      bounds: { min: [0, 0, 0], max: [1, 1, 1] },
    }),
    serialize: () => new ArrayBuffer(1),
    candidate: vi.fn(),
    exportStep: async () => new ArrayBuffer(1),
    exportStl: async () => {
      const bytes = new ArrayBuffer(134)
      new DataView(bytes).setUint32(80, 1, true)
      return bytes
    },
  }
}

describe('OpenGrid preview benchmark harness', () => {
  it('records cold, warm-up, measured, phase, quality, and export samples', async () => {
    const report = await runOpenGridPreviewBenchmark({
      adapter: fakeAdapter(),
      environment: {
        browserBuildMode: 'unit',
        dependencyLockfileVersion: 'test',
        referenceEnvironment: 'test',
        workerEpoch: 'unit-epoch',
        previewConfiguration: {
          tolerance: 0.01,
          angularTolerance: 0.1,
          faceMeshingThreshold: 512,
        },
        label: 'unit',
      },
      fixtures: [OPENGRID_PREVIEW_BENCHMARK_FIXTURES[0]!],
      exportEachRun: true,
    })

    expect(report.coldRuns).toHaveLength(1)
    expect(report.warmups).toHaveLength(1)
    expect(report.runs).toHaveLength(OPENGRID_PREVIEW_BENCHMARK_RUNS)
    expect(report.failures).toHaveLength(0)
    expect(report.summaries[0]?.samples).toBe(OPENGRID_PREVIEW_BENCHMARK_RUNS)
    expect(report.runs[0]?.timing.candidateMs).not.toBeNull()
    expect(report.runs[0]?.timing.serializationMs).not.toBeNull()
    expect(report.coldRuns[0]?.quality.stepByteLength).toBe(1)
    expect(report.coldRuns[0]?.quality.stlByteLength).toBe(134)
    expect(report.coldRuns[0]?.quality.stlTriangleCount).toBe(1)
  })

  it('retains a failed phase without hiding successful fixture samples', async () => {
    const adapter = fakeAdapter()
    adapter.mesh = () => {
      throw new Error('synthetic mesh failure')
    }
    const report = await runOpenGridPreviewBenchmark({
      adapter,
      environment: {
        browserBuildMode: 'unit',
        dependencyLockfileVersion: 'test',
        referenceEnvironment: 'test',
        workerEpoch: 'unit-epoch',
        previewConfiguration: {
          tolerance: 0.01,
          angularTolerance: 0.1,
          faceMeshingThreshold: 512,
        },
        label: 'unit',
      },
      fixtures: [OPENGRID_PREVIEW_BENCHMARK_FIXTURES[0]!],
      measuredRuns: 1,
      warmupRuns: 1,
    })

    expect(report.runs).toHaveLength(0)
    expect(report.failures).toHaveLength(3)
    expect(report.failures.every((failure) => failure.phase === 'mesh')).toBe(
      true,
    )
  })

  it('keeps Worker lifecycle and viewport totals as separate observable phases', async () => {
    const adapter = fakeAdapter()
    const previewTiming: PreviewTiming = {
      buildMs: 8,
      meshMs: 2,
      qualityMs: 1,
      candidateMs: 0.5,
      serializationMs: 0.5,
      totalMs: 12,
    }
    adapter.runWorkerPreview = async () => ({
      mesh: adapter.mesh({} as Shape3D, {
        tolerance: 0.01,
        angularTolerance: 0.1,
      }),
      previewTiming,
      workerTotalMs: 20,
      transferMs: 3,
      commitMs: 4,
      quality: {
        passed: true,
        failures: [],
        bounds: { min: [0, 0, 0], max: [1, 1, 1] },
      },
      workerEpoch: 'unit-worker',
      candidateId: 'unit-candidate',
      modelRevision: 'unit-revision',
    })
    adapter.viewport = {
      createBase: () => ({}),
      createEdges: () => ({}),
      dispose: vi.fn(),
    }

    const report = await runOpenGridPreviewBenchmark({
      adapter,
      environment: {
        browserBuildMode: 'unit',
        dependencyLockfileVersion: 'test',
        referenceEnvironment: 'test',
        workerEpoch: 'unit-epoch',
        previewConfiguration: {
          tolerance: 0.01,
          angularTolerance: 0.1,
          faceMeshingThreshold: 512,
        },
        label: 'unit',
      },
      fixtures: [OPENGRID_PREVIEW_BENCHMARK_FIXTURES[0]!],
      measuredRuns: 1,
      warmupRuns: 0,
    })

    const run = report.runs[0]
    expect(run?.workerEpoch).toBe('unit-worker')
    expect(run?.timing.workerTotalMs).toBe(20)
    expect(run?.timing.transferMs).toBe(3)
    expect(run?.timing.commitMs).toBe(4)
    expect(run?.timing.viewportBaseMs).not.toBeNull()
    expect(run?.timing.viewportEdgeMs).not.toBeNull()
    expect(report.summaries[0]?.medianMs).toBe(20)
    expect(report.summaries[0]?.uiMedianMs).toBeGreaterThanOrEqual(20)
  })
})
