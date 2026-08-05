import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  buildModelBRep: vi.fn(),
  exportStepBytes: vi.fn(),
  exportStlBytes: vi.fn(),
  initialiseCadKernel: vi.fn(),
  loadModularGridBaseTemplate: vi.fn(),
  meshBRep: vi.fn(),
  serializeMesh: vi.fn(),
  generatedShapes: [] as Array<{ delete: ReturnType<typeof vi.fn> }>,
}))

vi.mock('../../src/cad-kernel/initialise', () => ({
  initialiseCadKernel: mocks.initialiseCadKernel,
}))

vi.mock('../../src/cad-kernel/components/modular-grid-base/builder', () => ({
  loadModularGridBaseTemplate: mocks.loadModularGridBaseTemplate,
}))

vi.mock('../../src/cad-kernel/model', () => ({
  buildModelBRep: mocks.buildModelBRep,
}))

vi.mock('../../src/cad-kernel/mesh', () => ({
  meshBRep: mocks.meshBRep,
  serializeMesh: mocks.serializeMesh,
}))

vi.mock('../../src/cad-kernel/export', () => ({
  exportStepBytes: mocks.exportStepBytes,
  exportStlBytes: mocks.exportStlBytes,
}))

import {
  CadWorkerRuntime,
  createCadWorkerMessageHandler,
} from '../../src/workers/cad.worker'

const base = {
  version: 1 as const,
  requestId: 'request-base',
  operationId: 'operation-base',
}

function initCommand() {
  return {
    ...base,
    kind: 'engine.init' as const,
    asset: { wasmUrl: '/replicad_single.wasm' },
  }
}

function gridCommand(generation: number) {
  return {
    ...base,
    kind: 'model.generate' as const,
    requestId: `grid-request-${generation}`,
    operationId: `grid-operation-${generation}`,
    generation,
    modelId: 'modular-grid-base' as const,
    parameters: { rows: 2, columns: 2 },
    previewConfig: { tolerance: 0.01, angularTolerance: 0.1 },
  }
}

function configureMocks() {
  mocks.initialiseCadKernel.mockResolvedValue(undefined)
  mocks.exportStepBytes.mockResolvedValue(new Uint8Array([1]).buffer)
  mocks.exportStlBytes.mockResolvedValue(new Uint8Array([2]).buffer)
  mocks.loadModularGridBaseTemplate.mockResolvedValue({ delete: vi.fn() })
  mocks.meshBRep.mockReturnValue({
    positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
    indices: new Uint32Array([0, 1, 2]),
    bounds: { min: [0, 0, 0], max: [1, 1, 0] },
    triangleCount: 1,
  })
  mocks.serializeMesh.mockImplementation((mesh) => ({
    positions: mesh.positions.slice().buffer,
    normals: mesh.normals.slice().buffer,
    indices: mesh.indices.slice().buffer,
    bounds: mesh.bounds,
    triangleCount: mesh.triangleCount,
  }))
  mocks.buildModelBRep.mockImplementation(
    async (_modelId, _parameters, context) => {
      await context.getModularGridBaseTemplate()
      const shape = { delete: vi.fn() }
      mocks.generatedShapes.push(shape)
      return shape
    },
  )
}

describe('modular-grid-base Worker runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.generatedShapes.length = 0
    configureMocks()
  })

  it('shares one template import across generations and disposes candidates and template', async () => {
    const events: any[] = []
    const runtime = new CadWorkerRuntime('epoch-grid', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())

    await Promise.all([
      runtime.handle(gridCommand(1)),
      runtime.handle(gridCommand(2)),
    ])

    expect(mocks.loadModularGridBaseTemplate).toHaveBeenCalledOnce()
    expect(events.some((event) => event.kind === 'model.candidate-ready')).toBe(
      true,
    )
    expect(
      events.some(
        (event) =>
          event.kind === 'operation.superseded' && event.generation === 1,
      ),
    ).toBe(true)

    await runtime.handle({ ...base, kind: 'worker.dispose' as const })
    expect(
      mocks.generatedShapes.every(
        (shape) => shape.delete.mock.calls.length > 0,
      ),
    ).toBe(true)
    const templatePromise =
      mocks.loadModularGridBaseTemplate.mock.results[0]?.value
    const template = await templatePromise
    expect(template.delete).toHaveBeenCalledOnce()
  })

  it('correlates kernel cell progress to the generating operation', async () => {
    mocks.buildModelBRep.mockImplementation(
      async (_modelId, _parameters, context) => {
        context.reportProgress({
          stage: 'building',
          completed: 3,
          total: 4,
          unit: 'cells',
        })
        const shape = { delete: vi.fn() }
        mocks.generatedShapes.push(shape)
        return shape
      },
    )
    const events: any[] = []
    const runtime = new CadWorkerRuntime('epoch-grid-progress', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle(gridCommand(1))

    expect(
      events.find(
        (event) =>
          event.kind === 'operation.progress' &&
          event.operationId === 'grid-operation-1' &&
          event.generation === 1 &&
          event.completed === 3,
      ),
    ).toMatchObject({ total: 4, unit: 'cells', stage: 'building' })
  })

  it('accepts a queued generate after invalidating the same generation', async () => {
    const events: any[] = []
    const runtime = new CadWorkerRuntime('epoch-grid-invalidation', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle({
      ...base,
      kind: 'model.invalidate' as const,
      requestId: 'grid-invalidate-request',
      operationId: 'grid-invalidate-operation',
      generation: 1,
      workerEpoch: 'epoch-grid-invalidation',
      reason: 'superseded' as const,
    })
    await runtime.handle(gridCommand(1))

    expect(
      events.some(
        (event) =>
          event.kind === 'model.candidate-ready' && event.generation === 1,
      ),
    ).toBe(true)
    expect(
      events.some(
        (event) =>
          event.kind === 'operation.superseded' &&
          event.operationId === 'grid-operation-1',
      ),
    ).toBe(false)
  })

  it('drops a superseded candidate and keeps the Worker epoch usable', async () => {
    let releaseFirstBuild: () => void = () => undefined
    const firstBuildReleased = new Promise<void>((resolve) => {
      releaseFirstBuild = resolve
    })
    let buildCount = 0
    mocks.buildModelBRep.mockImplementation(
      async (_modelId, _parameters, context) => {
        buildCount += 1
        const shape = { delete: vi.fn() }
        mocks.generatedShapes.push(shape)
        if (buildCount === 1) await firstBuildReleased
        return shape
      },
    )
    const events: any[] = []
    const runtime = new CadWorkerRuntime('epoch-grid-cancel', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())

    const first = runtime.handle(gridCommand(1))
    await Promise.resolve()
    const latest = runtime.handle(gridCommand(2))
    await latest
    releaseFirstBuild()
    await first

    expect(
      events.some(
        (event) =>
          event.kind === 'operation.superseded' && event.generation === 1,
      ),
    ).toBe(true)
    expect(
      events.some(
        (event) =>
          event.kind === 'model.candidate-ready' && event.generation === 1,
      ),
    ).toBe(false)
    expect(
      events.some(
        (event) =>
          event.kind === 'model.candidate-ready' && event.generation === 2,
      ),
    ).toBe(true)
    expect(mocks.generatedShapes[0]?.delete).toHaveBeenCalledOnce()
  })

  it('routes invalidation around the serial command queue during a build', async () => {
    let releaseBuild: () => void = () => undefined
    const buildReleased = new Promise<void>((resolve) => {
      releaseBuild = resolve
    })
    let buildStarted: () => void = () => undefined
    const buildStartedPromise = new Promise<void>((resolve) => {
      buildStarted = resolve
    })
    mocks.buildModelBRep.mockImplementation(
      async (_modelId, _parameters, _context) => {
        buildStarted()
        await buildReleased
        const shape = { delete: vi.fn() }
        mocks.generatedShapes.push(shape)
        return shape
      },
    )
    const events: any[] = []
    const runtime = new CadWorkerRuntime('epoch-grid-queue-cancel', (event) =>
      events.push(event),
    )
    const handle = createCadWorkerMessageHandler(runtime)
    await handle(initCommand())

    const generation = handle(gridCommand(1))
    await buildStartedPromise
    await handle({
      ...base,
      kind: 'model.invalidate' as const,
      requestId: 'queue-invalidate-request',
      operationId: 'queue-invalidate-operation',
      generation: 2,
      workerEpoch: 'epoch-grid-queue-cancel',
      reason: 'superseded' as const,
    })
    releaseBuild()
    await generation

    expect(
      events.some(
        (event) =>
          event.kind === 'operation.superseded' && event.generation === 1,
      ),
    ).toBe(true)
    expect(
      events.some(
        (event) =>
          event.kind === 'model.candidate-ready' && event.generation === 1,
      ),
    ).toBe(false)
    expect(mocks.generatedShapes[0]?.delete).toHaveBeenCalledOnce()
  })

  it('maps template load failures to a diagnosable component asset error', async () => {
    mocks.loadModularGridBaseTemplate.mockRejectedValue(
      new Error('GRID_TEMPLATE_INVALID'),
    )
    const events: any[] = []
    const runtime = new CadWorkerRuntime('epoch-grid-error', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle(gridCommand(1))

    expect(events.at(-1)).toMatchObject({
      kind: 'operation.error',
      code: 'MODEL_ASSET_INVALID',
      stage: 'building',
    })
  })

  it('rejects an export filename that does not match the committed component', async () => {
    const events: any[] = []
    const runtime = new CadWorkerRuntime('epoch-grid-export', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle(gridCommand(1))
    const candidate = events.find(
      (event) => event.kind === 'model.candidate-ready',
    )

    await runtime.handle({
      ...base,
      kind: 'model.commit' as const,
      requestId: 'grid-commit-request',
      operationId: candidate.operationId,
      generation: candidate.generation,
      candidateId: candidate.candidateId,
      workerEpoch: 'epoch-grid-export',
    })
    const revision = events.find((event) => event.kind === 'model.ready')

    await runtime.handle({
      ...base,
      kind: 'export.step' as const,
      requestId: 'grid-export-request',
      operationId: 'grid-export-operation',
      modelRevision: revision.modelRevision,
      workerEpoch: 'epoch-grid-export',
      file: { name: 'wrong.step', mime: 'model/step' as const },
    })

    expect(mocks.exportStepBytes).not.toHaveBeenCalled()
    expect(events.at(-1)).toMatchObject({
      kind: 'operation.error',
      code: 'STEP_METADATA_INVALID',
      stage: 'exporting',
    })
  })

  it('exports binary STL from the committed component revision', async () => {
    const events: any[] = []
    const runtime = new CadWorkerRuntime('epoch-grid-stl', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle(gridCommand(1))
    const candidate = events.find(
      (event) => event.kind === 'model.candidate-ready',
    )

    await runtime.handle({
      ...base,
      kind: 'model.commit' as const,
      requestId: 'grid-stl-commit-request',
      operationId: candidate.operationId,
      generation: candidate.generation,
      candidateId: candidate.candidateId,
      workerEpoch: 'epoch-grid-stl',
    })
    const revision = events.find((event) => event.kind === 'model.ready')

    await runtime.handle({
      ...base,
      kind: 'export.stl' as const,
      requestId: 'grid-stl-export-request',
      operationId: 'grid-stl-export-operation',
      modelRevision: revision.modelRevision,
      workerEpoch: 'epoch-grid-stl',
      file: {
        name: 'modular-grid-base-2x2.stl',
        mime: 'model/stl' as const,
      },
    })

    expect(mocks.exportStlBytes).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tolerance: 0.001,
        angularTolerance: 0.1,
      }),
    )
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'export.accepted',
        operationId: 'grid-stl-export-operation',
        modelRevision: revision.modelRevision,
      }),
    )
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'export.ready',
        operationId: 'grid-stl-export-operation',
        modelRevision: revision.modelRevision,
        format: 'stl',
        mime: 'model/stl',
        fileName: 'modular-grid-base-2x2.stl',
      }),
    )
  })

  it('releases the STL export pin when the writer fails', async () => {
    mocks.exportStlBytes.mockRejectedValueOnce(new Error('STL writer failed'))
    const events: any[] = []
    const runtime = new CadWorkerRuntime('epoch-grid-stl-failure', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle(gridCommand(1))
    const firstCandidate = events.find(
      (event) => event.kind === 'model.candidate-ready',
    )
    await runtime.handle({
      ...base,
      kind: 'model.commit' as const,
      requestId: 'grid-stl-failure-commit-1',
      operationId: firstCandidate.operationId,
      generation: firstCandidate.generation,
      candidateId: firstCandidate.candidateId,
      workerEpoch: 'epoch-grid-stl-failure',
    })
    const firstRevision = events.find((event) => event.kind === 'model.ready')

    await runtime.handle({
      ...base,
      kind: 'export.stl' as const,
      requestId: 'grid-stl-failure-export',
      operationId: 'grid-stl-failure-operation',
      modelRevision: firstRevision.modelRevision,
      workerEpoch: 'epoch-grid-stl-failure',
      file: {
        name: 'modular-grid-base-2x2.stl',
        mime: 'model/stl' as const,
      },
    })
    expect(events.at(-1)).toMatchObject({
      kind: 'operation.error',
      code: 'STL_EXPORT_FAILED',
      stage: 'exporting',
    })

    await runtime.handle(gridCommand(2))
    const secondCandidate = events.find(
      (event) =>
        event.kind === 'model.candidate-ready' && event.generation === 2,
    )
    await runtime.handle({
      ...base,
      kind: 'model.commit' as const,
      requestId: 'grid-stl-failure-commit-2',
      operationId: secondCandidate.operationId,
      generation: secondCandidate.generation,
      candidateId: secondCandidate.candidateId,
      workerEpoch: 'epoch-grid-stl-failure',
    })

    expect(mocks.generatedShapes[0]?.delete).toHaveBeenCalledOnce()
  })
})
