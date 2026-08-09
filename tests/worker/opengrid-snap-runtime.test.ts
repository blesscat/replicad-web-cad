import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  buildModelBRep: vi.fn(),
  initialiseCadKernel: vi.fn(),
  meshBRep: vi.fn(),
  serializeMesh: vi.fn(),
  assertOpenGridSnapShapeQuality: vi.fn(),
  loadOpenGridSnapReference: vi.fn(),
  exportStepBytes: vi.fn(),
  exportStlBytes: vi.fn(),
}))

vi.mock('../../src/cad-kernel/initialise', () => ({
  initialiseCadKernel: mocks.initialiseCadKernel,
}))
vi.mock('../../src/cad-kernel/model', () => ({
  buildModelBRep: mocks.buildModelBRep,
}))
vi.mock('../../src/cad-kernel/mesh', () => ({
  meshBRep: mocks.meshBRep,
  serializeMesh: mocks.serializeMesh,
}))
vi.mock('../../src/cad-kernel/components/opengrid/quality', () => ({
  assertOpenGridShapeQuality: vi.fn(),
}))
vi.mock('../../src/cad-kernel/components/opengrid-snap/quality', () => ({
  assertOpenGridSnapShapeQuality: mocks.assertOpenGridSnapShapeQuality,
}))
vi.mock('../../src/cad-kernel/components/opengrid-snap/builder', () => ({
  loadOpenGridSnapReference: mocks.loadOpenGridSnapReference,
}))
vi.mock('../../src/cad-kernel/export', () => ({
  exportStepBytes: mocks.exportStepBytes,
  exportStlBytes: mocks.exportStlBytes,
}))

import { CadWorkerRuntime } from '../../src/workers/cad.worker'
import {
  openGridSnapFileName,
  openGridSnapStlFileName,
  type OpenGridSnapParameters,
} from '../../src/cad-contract/units'

const base = {
  version: 1 as const,
  requestId: 'request-base',
  operationId: 'operation-base',
}

function snapParameters(
  variant: 'Full' | 'Lite',
  offset: number,
  halfCellX: 'none' | 'left' | 'right' = 'none',
  halfCellY: 'none' | 'top' | 'bottom' = 'none',
): OpenGridSnapParameters {
  return { variant, offset, halfCellX, halfCellY }
}

function initCommand() {
  return {
    ...base,
    kind: 'engine.init' as const,
    asset: { wasmUrl: '/replicad_single.wasm' },
  }
}

function generateCommand(
  parameters: OpenGridSnapParameters = {
    ...snapParameters('Full', 0),
  },
  generation = 1,
) {
  return {
    ...base,
    requestId: `snap-request-${generation}`,
    operationId: `snap-operation-${generation}`,
    kind: 'model.generate' as const,
    generation,
    modelId: 'opengrid-snap' as const,
    parameters,
    previewConfig: { tolerance: 0.01, angularTolerance: 0.1 },
  }
}

function configureMocks() {
  mocks.initialiseCadKernel.mockResolvedValue(undefined)
  mocks.meshBRep.mockImplementation((shape: { bounds?: unknown }) => ({
    positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
    indices: new Uint32Array([0, 1, 2]),
    bounds: shape.bounds ?? { min: [0, 0, 0], max: [1, 1, 1] },
    triangleCount: 1,
  }))
  mocks.serializeMesh.mockImplementation((mesh) => ({
    positions: mesh.positions.slice().buffer,
    normals: mesh.normals.slice().buffer,
    indices: mesh.indices.slice().buffer,
    bounds: mesh.bounds,
    triangleCount: mesh.triangleCount,
  }))
  mocks.buildModelBRep.mockImplementation(async () => ({ delete: vi.fn() }))
  mocks.loadOpenGridSnapReference.mockImplementation(async () => ({
    delete: vi.fn(),
  }))
  mocks.exportStepBytes.mockResolvedValue(new Uint8Array([1, 2, 3]).buffer)
  mocks.exportStlBytes.mockResolvedValue(new Uint8Array([4, 5, 6]).buffer)
}

describe('OpenGrid Snap Worker runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    configureMocks()
  })

  it('dispatches Snap independently, caches each variant, and quality-gates it', async () => {
    const events: unknown[] = []
    const runtime = new CadWorkerRuntime('epoch-snap', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle(generateCommand(snapParameters('Full', 0.2)))
    await runtime.handle(generateCommand(snapParameters('Full', 0), 2))
    await runtime.handle(generateCommand(snapParameters('Lite', 0), 3))

    expect(mocks.buildModelBRep).toHaveBeenCalledWith(
      'opengrid-snap',
      expect.objectContaining({ variant: 'Full', offset: 0.2 }),
      expect.objectContaining({
        getOpenGridSnapReference: expect.any(Function),
      }),
    )
    expect(mocks.loadOpenGridSnapReference).toHaveBeenCalledTimes(2)
    expect(mocks.assertOpenGridSnapShapeQuality).toHaveBeenCalledTimes(3)
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'model.candidate-ready',
        modelId: 'opengrid-snap',
        parameters: snapParameters('Lite', 0),
      }),
    )
  })

  it('removes a failed reference promise so the next generation can retry', async () => {
    const events: unknown[] = []
    const runtime = new CadWorkerRuntime('epoch-snap-retry', (event) =>
      events.push(event),
    )
    mocks.loadOpenGridSnapReference
      .mockRejectedValueOnce(new Error('OPENGRID_SNAP_ASSET_LOAD_FAILED'))
      .mockResolvedValueOnce({ delete: vi.fn() })

    await runtime.handle(initCommand())
    await runtime.handle(generateCommand())
    await runtime.handle(generateCommand(snapParameters('Full', 0.1), 2))

    expect(mocks.loadOpenGridSnapReference).toHaveBeenCalledTimes(2)
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'model.candidate-ready',
        modelId: 'opengrid-snap',
      }),
    )
  })

  it('keeps the latest Snap generation and disposes the stale candidate', async () => {
    let releaseFirst: () => void = () => undefined
    const firstReleased = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })
    const generatedShapes: Array<{ delete: ReturnType<typeof vi.fn> }> = []
    let builds = 0
    mocks.buildModelBRep.mockImplementation(
      async (
        _modelId: string,
        _parameters: OpenGridSnapParameters,
        context: { isGenerationCurrent?: () => boolean },
      ) => {
        builds += 1
        if (builds === 1) await firstReleased
        if (!context.isGenerationCurrent?.())
          throw new Error('STALE_GENERATION')
        const shape = { delete: vi.fn() }
        generatedShapes.push(shape)
        return shape
      },
    )

    const events: unknown[] = []
    const runtime = new CadWorkerRuntime('epoch-snap-latest', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())

    const first = runtime.handle(
      generateCommand(snapParameters('Full', 0.2), 1),
    )
    await Promise.resolve()
    const second = runtime.handle(
      generateCommand(snapParameters('Full', 0.3, 'right', 'top'), 2),
    )
    await second
    releaseFirst()
    await first

    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'operation.superseded',
        generation: 1,
      }),
    )
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'model.candidate-ready',
        generation: 2,
        parameters: snapParameters('Full', 0.3, 'right', 'top'),
      }),
    )
    expect(generatedShapes).toHaveLength(1)
  })

  it('exports the committed Snap revision with deterministic filenames', async () => {
    const events: unknown[] = []
    const runtime = new CadWorkerRuntime('epoch-snap-export', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle(
      generateCommand(snapParameters('Lite', 0.2, 'left', 'top')),
    )
    const candidate = events.find(
      (event) =>
        typeof event === 'object' &&
        event !== null &&
        'kind' in event &&
        event.kind === 'model.candidate-ready',
    ) as { candidateId: string } | undefined
    expect(candidate).toBeDefined()
    await runtime.handle({
      ...base,
      requestId: 'snap-commit-request',
      operationId: 'snap-operation-1',
      kind: 'model.commit' as const,
      generation: 1,
      candidateId: candidate!.candidateId,
      workerEpoch: 'epoch-snap-export',
    })
    const ready = events.find(
      (event) =>
        typeof event === 'object' &&
        event !== null &&
        'kind' in event &&
        event.kind === 'model.ready',
    ) as
      { modelRevision: string; parameters: OpenGridSnapParameters } | undefined
    expect(ready).toBeDefined()

    await runtime.handle({
      ...base,
      requestId: 'snap-export-step-request',
      operationId: 'snap-export-step-operation',
      kind: 'export.step' as const,
      modelRevision: ready!.modelRevision,
      workerEpoch: 'epoch-snap-export',
      file: {
        name: openGridSnapFileName(ready!.parameters),
        mime: 'model/step' as const,
      },
    })
    await runtime.handle({
      ...base,
      requestId: 'snap-export-stl-request',
      operationId: 'snap-export-stl-operation',
      kind: 'export.stl' as const,
      modelRevision: ready!.modelRevision,
      workerEpoch: 'epoch-snap-export',
      file: {
        name: openGridSnapStlFileName(ready!.parameters),
        mime: 'model/stl' as const,
      },
    })

    expect(mocks.exportStepBytes).toHaveBeenCalledOnce()
    expect(mocks.exportStlBytes).toHaveBeenCalledOnce()
    expect(
      events.filter(
        (event) =>
          typeof event === 'object' &&
          event !== null &&
          'kind' in event &&
          event.kind === 'export.ready',
      ),
    ).toHaveLength(2)
  })

  it('disposes loaded variant references once', async () => {
    const events: unknown[] = []
    const references = [{ delete: vi.fn() }, { delete: vi.fn() }]
    mocks.loadOpenGridSnapReference
      .mockResolvedValueOnce(references[0])
      .mockResolvedValueOnce(references[1])
    const runtime = new CadWorkerRuntime('epoch-snap-dispose', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle(generateCommand(snapParameters('Full', 0)))
    await runtime.handle(generateCommand(snapParameters('Lite', 0), 2))
    await runtime.handle({
      ...base,
      requestId: 'snap-dispose-request',
      operationId: 'snap-dispose-operation',
      kind: 'worker.dispose' as const,
    })

    expect(references[0].delete).toHaveBeenCalledOnce()
    expect(references[1].delete).toHaveBeenCalledOnce()
  })
})
