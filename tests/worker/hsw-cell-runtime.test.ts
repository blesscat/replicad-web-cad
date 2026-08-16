import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  buildModelBRep: vi.fn(),
  exportStepBytes: vi.fn(),
  exportStlBytes: vi.fn(),
  initialiseCadKernel: vi.fn(),
  loadHswCellTemplate: vi.fn(),
  loadModularGridBaseTemplate: vi.fn(),
  meshBRep: vi.fn(),
  serializeMesh: vi.fn(),
  generatedShapes: [] as Array<{ delete: ReturnType<typeof vi.fn> }>,
}))

vi.mock('../../src/cad-kernel/initialise', () => ({
  initialiseCadKernel: mocks.initialiseCadKernel,
}))

vi.mock('../../src/cad-kernel/components/hsw-cell/builder', () => ({
  loadHswCellTemplate: mocks.loadHswCellTemplate,
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
  version: 2 as const,
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

function hswCommand(generation: number) {
  return {
    ...base,
    kind: 'model.generate' as const,
    requestId: `hsw-request-${generation}`,
    operationId: `hsw-operation-${generation}`,
    generation,
    modelId: 'hsw-cell' as const,
    parameters: { rows: 2, columns: 2 },
    previewConfig: { tolerance: 0.01, angularTolerance: 0.1 },
  }
}

function validBinaryStlBytes(): ArrayBuffer {
  const bytes = new ArrayBuffer(84 + 50)
  new DataView(bytes).setUint32(80, 1, true)
  return bytes
}

function configureMocks() {
  mocks.initialiseCadKernel.mockResolvedValue(undefined)
  mocks.exportStepBytes.mockResolvedValue(new Uint8Array([1]).buffer)
  mocks.exportStlBytes.mockResolvedValue(validBinaryStlBytes())
  mocks.loadHswCellTemplate.mockResolvedValue({ delete: vi.fn() })
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
      await context.getHswCellTemplate()
      context.reportProgress({
        stage: 'building',
        completed: 0,
        total: 4,
        unit: 'cells',
      })
      context.reportProgress({
        stage: 'building',
        completed: 4,
        total: 4,
        unit: 'cells',
      })
      const shape = { delete: vi.fn() }
      mocks.generatedShapes.push(shape)
      return shape
    },
  )
}

describe('hsw-cell Worker runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.generatedShapes.length = 0
    configureMocks()
  })

  it('reuses one HSW template per epoch and disposes it with candidates', async () => {
    const events: any[] = []
    const runtime = new CadWorkerRuntime('epoch-hsw', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle(hswCommand(1))
    await runtime.handle(hswCommand(2))

    expect(mocks.loadHswCellTemplate).toHaveBeenCalledOnce()
    expect(
      events.filter((event) => event.kind === 'model.candidate-ready'),
    ).toHaveLength(2)
    expect(
      events
        .filter((event) => event.kind === 'model.candidate-ready')
        .every(
          (event) =>
            event.modelId === 'hsw-cell' &&
            event.parameters.rows === 2 &&
            event.parameters.columns === 2 &&
            event.workerEpoch === 'epoch-hsw',
        ),
    ).toBe(true)

    await runtime.handle({ ...base, kind: 'worker.dispose' as const })
    expect(
      mocks.generatedShapes.every(
        (shape) => shape.delete.mock.calls.length > 0,
      ),
    ).toBe(true)
    const templatePromise = mocks.loadHswCellTemplate.mock.results[0]?.value
    const template = await templatePromise
    expect(template.delete).toHaveBeenCalledOnce()
  })

  it('reports logical cell progress for the HSW operation', async () => {
    const events: any[] = []
    const runtime = new CadWorkerRuntime('epoch-hsw-progress', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle(hswCommand(1))

    const buildingProgress = events.filter(
      (event) =>
        event.kind === 'operation.progress' &&
        event.operationId === 'hsw-operation-1' &&
        event.stage === 'building' &&
        event.unit === 'cells',
    )
    expect(buildingProgress[0]).toMatchObject({ completed: 0, total: 4 })
    expect(buildingProgress.at(-1)).toMatchObject({ completed: 4, total: 4 })
    expect(
      buildingProgress.every(
        (event, index) =>
          index === 0 ||
          event.completed >= buildingProgress[index - 1].completed,
      ),
    ).toBe(true)
  })

  it('keeps the latest HSW generation and disposes a stale result', async () => {
    let releaseFirst: () => void = () => undefined
    const firstReleased = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })
    let builds = 0
    mocks.buildModelBRep.mockImplementation(
      async (_modelId, _parameters, context) => {
        builds += 1
        if (builds === 1) await firstReleased
        if (!context.isGenerationCurrent()) throw new Error('STALE_GENERATION')
        const shape = { delete: vi.fn() }
        mocks.generatedShapes.push(shape)
        return shape
      },
    )

    const events: any[] = []
    const runtime = new CadWorkerRuntime('epoch-hsw-latest', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())

    const first = runtime.handle(hswCommand(1))
    await Promise.resolve()
    const second = runtime.handle(hswCommand(2))
    await second
    releaseFirst()
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
          event.kind === 'model.candidate-ready' && event.generation === 2,
      ),
    ).toBe(true)
    expect(mocks.generatedShapes).toHaveLength(1)
  })

  it('maps HSW asset failures to the shared asset error contract', async () => {
    mocks.loadHswCellTemplate.mockRejectedValue(
      new Error('HSW_CELL_ASSET_INVALID_BOUNDS'),
    )
    const events: any[] = []
    const runtime = new CadWorkerRuntime('epoch-hsw-error', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle(hswCommand(1))

    expect(events.at(-1)).toMatchObject({
      kind: 'operation.error',
      code: 'MODEL_ASSET_INVALID',
      stage: 'building',
    })
  })

  it('exports STEP and binary STL from the committed HSW B-Rep revision', async () => {
    const events: any[] = []
    const runtime = new CadWorkerRuntime('epoch-hsw-export', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle(hswCommand(1))
    const candidate = events.find(
      (event) => event.kind === 'model.candidate-ready',
    )

    await runtime.handle({
      ...base,
      kind: 'model.commit' as const,
      requestId: 'hsw-commit-request',
      operationId: candidate.operationId,
      generation: candidate.generation,
      candidateId: candidate.candidateId,
      workerEpoch: 'epoch-hsw-export',
    })
    const revision = events.find((event) => event.kind === 'model.ready')

    await runtime.handle({
      ...base,
      kind: 'export.step' as const,
      requestId: 'hsw-step-request',
      operationId: 'hsw-step-operation',
      modelRevision: revision.modelRevision,
      workerEpoch: 'epoch-hsw-export',
      file: { name: 'hsw-cell-2x2.step', mime: 'model/step' as const },
    })
    await runtime.handle({
      ...base,
      kind: 'export.stl' as const,
      requestId: 'hsw-stl-request',
      operationId: 'hsw-stl-operation',
      modelRevision: revision.modelRevision,
      workerEpoch: 'epoch-hsw-export',
      file: { name: 'hsw-cell-2x2.stl', mime: 'model/stl' as const },
    })

    expect(mocks.exportStepBytes).toHaveBeenCalledOnce()
    expect(mocks.exportStlBytes).toHaveBeenCalledOnce()
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'export.ready',
        format: 'step',
        fileName: 'hsw-cell-2x2.step',
        modelRevision: revision.modelRevision,
        workerEpoch: 'epoch-hsw-export',
      }),
    )
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'export.ready',
        format: 'stl',
        fileName: 'hsw-cell-2x2.stl',
        modelRevision: revision.modelRevision,
        workerEpoch: 'epoch-hsw-export',
      }),
    )
    const stlReady = events.find(
      (event) => event.kind === 'export.ready' && event.format === 'stl',
    )
    expect(stlReady.bytes.byteLength).toBe(134)
    expect(new DataView(stlReady.bytes).getUint32(80, true)).toBe(1)
  })

  it('routes invalidation around the queue during HSW assembly', async () => {
    let releaseBuild: () => void = () => undefined
    const buildReleased = new Promise<void>((resolve) => {
      releaseBuild = resolve
    })
    let buildStarted: () => void = () => undefined
    const buildStartedPromise = new Promise<void>((resolve) => {
      buildStarted = resolve
    })
    mocks.buildModelBRep.mockImplementation(
      async (_modelId, _parameters, context) => {
        buildStarted()
        await buildReleased
        if (!context.isGenerationCurrent()) throw new Error('STALE_GENERATION')
        const shape = { delete: vi.fn() }
        mocks.generatedShapes.push(shape)
        return shape
      },
    )

    const events: any[] = []
    const runtime = new CadWorkerRuntime('epoch-hsw-queue', (event) =>
      events.push(event),
    )
    const handle = createCadWorkerMessageHandler(runtime)
    await handle(initCommand())

    const generation = handle(hswCommand(1))
    await buildStartedPromise
    await handle({
      ...base,
      kind: 'model.invalidate' as const,
      requestId: 'hsw-invalidate-request',
      operationId: 'hsw-invalidate-operation',
      generation: 2,
      workerEpoch: 'epoch-hsw-queue',
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
  })
})
