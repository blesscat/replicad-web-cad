import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  buildModelBRep: vi.fn(),
  exportStepBytes: vi.fn(),
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
}))

import { CadWorkerRuntime } from '../../src/workers/cad.worker'

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
})
