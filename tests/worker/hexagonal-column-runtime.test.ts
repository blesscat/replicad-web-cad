import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  buildModelBRep: vi.fn(),
  exportStepBytes: vi.fn(),
  exportStlBytes: vi.fn(),
  initialiseCadKernel: vi.fn(),
  loadHexagonalColumnReference: vi.fn(),
  loadHswCellTemplate: vi.fn(),
  loadModularGridBaseTemplate: vi.fn(),
  meshBRep: vi.fn(),
  serializeMesh: vi.fn(),
  generatedShapes: [] as Array<{ delete: ReturnType<typeof vi.fn> }>,
}))

vi.mock('../../src/cad-kernel/initialise', () => ({
  initialiseCadKernel: mocks.initialiseCadKernel,
}))

vi.mock('../../src/cad-kernel/components/hexagonal-column/builder', () => ({
  loadHexagonalColumnReference: mocks.loadHexagonalColumnReference,
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

import { CadWorkerRuntime } from '../../src/workers/cad.worker'

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

function hexagonalColumnCommand(generation: number) {
  return {
    ...base,
    requestId: `hex-request-${generation}`,
    operationId: `hex-operation-${generation}`,
    kind: 'model.generate' as const,
    generation,
    modelId: 'hexagonal-column' as const,
    parameters: {
      height: 50,
      count: 3,
      gap: 1,
      orientation: 'lying',
    },
    previewConfig: { tolerance: 0.01, angularTolerance: 0.1 },
  }
}

function configureMocks() {
  mocks.initialiseCadKernel.mockResolvedValue(undefined)
  mocks.exportStepBytes.mockResolvedValue(new Uint8Array([1]).buffer)
  mocks.exportStlBytes.mockResolvedValue(new Uint8Array([2]).buffer)
  mocks.loadHexagonalColumnReference.mockResolvedValue({ delete: vi.fn() })
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
      const reference = await context.getHexagonalColumnReference()
      expect(reference).toBeDefined()
      context.reportProgress({
        stage: 'building',
        completed: 3,
        total: 3,
        unit: 'columns',
      })
      const shape = { delete: vi.fn() }
      mocks.generatedShapes.push(shape)
      return shape
    },
  )
}

describe('hexagonal-column Worker runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.generatedShapes.length = 0
    configureMocks()
  })

  it('loads one reference per epoch, forwards column progress, and disposes it', async () => {
    const events: any[] = []
    const runtime = new CadWorkerRuntime('epoch-hex', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle(hexagonalColumnCommand(1))
    await runtime.handle(hexagonalColumnCommand(2))

    expect(mocks.loadHexagonalColumnReference).toHaveBeenCalledOnce()
    expect(
      events.filter((event) => event.kind === 'model.candidate-ready'),
    ).toHaveLength(2)
    expect(
      events.find(
        (event) =>
          event.kind === 'operation.progress' &&
          event.operationId === 'hex-operation-1' &&
          event.unit === 'columns',
      ),
    ).toMatchObject({ completed: 3, total: 3 })

    await runtime.handle({ ...base, kind: 'worker.dispose' as const })
    const referencePromise =
      mocks.loadHexagonalColumnReference.mock.results[0]?.value
    const reference = await referencePromise
    expect(reference.delete).toHaveBeenCalledOnce()
  })

  it('keeps the component route explicit in the generation command', async () => {
    const events: any[] = []
    const runtime = new CadWorkerRuntime('epoch-hex-route', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle(hexagonalColumnCommand(1))

    const candidate = events.find(
      (event) => event.kind === 'model.candidate-ready',
    )
    expect(candidate).toMatchObject({
      modelId: 'hexagonal-column',
      parameters: {
        height: 50,
        count: 3,
        gap: 1,
        orientation: 'lying',
      },
      workerEpoch: 'epoch-hex-route',
    })
  })

  it('uses deterministic STEP and STL metadata for the committed Compound', async () => {
    const events: any[] = []
    const runtime = new CadWorkerRuntime('epoch-hex-export', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle(hexagonalColumnCommand(1))

    const candidate = events.find(
      (event) => event.kind === 'model.candidate-ready',
    )
    await runtime.handle({
      ...base,
      kind: 'model.commit' as const,
      requestId: 'commit-hex',
      operationId: 'commit-hex',
      generation: 1,
      candidateId: candidate.candidateId,
      workerEpoch: 'epoch-hex-export',
    })
    const ready = events.find((event) => event.kind === 'model.ready')

    await runtime.handle({
      ...base,
      kind: 'export.step' as const,
      requestId: 'step-hex',
      operationId: 'step-hex',
      modelRevision: ready.modelRevision,
      workerEpoch: 'epoch-hex-export',
      file: {
        name: 'hexagonal-column-50x3-g1-lying.step',
        mime: 'model/step' as const,
      },
    })
    await runtime.handle({
      ...base,
      kind: 'export.stl' as const,
      requestId: 'stl-hex',
      operationId: 'stl-hex',
      modelRevision: ready.modelRevision,
      workerEpoch: 'epoch-hex-export',
      file: {
        name: 'hexagonal-column-50x3-g1-lying.stl',
        mime: 'model/stl' as const,
      },
    })

    expect(
      events
        .filter((event) => event.kind === 'export.ready')
        .map((event) => ({
          format: event.format,
          fileName: event.fileName,
        })),
    ).toEqual([
      { format: 'step', fileName: 'hexagonal-column-50x3-g1-lying.step' },
      { format: 'stl', fileName: 'hexagonal-column-50x3-g1-lying.stl' },
    ])
  })
})
