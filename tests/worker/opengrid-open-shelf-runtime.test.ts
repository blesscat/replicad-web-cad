import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  buildModelBRep: vi.fn(),
  initialiseCadKernel: vi.fn(),
  meshBRep: vi.fn(),
  serializeMesh: vi.fn(),
  assertOpenGridOpenShelfShapeQuality: vi.fn(),
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
vi.mock('../../src/cad-kernel/components/opengrid-open-shelf/quality', () => ({
  assertOpenGridOpenShelfShapeQuality:
    mocks.assertOpenGridOpenShelfShapeQuality,
}))
vi.mock('../../src/cad-kernel/export', () => ({
  exportStepBytes: mocks.exportStepBytes,
  exportStlBytes: mocks.exportStlBytes,
}))

import { OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS } from '../../src/cad-contract/units'
import { CadWorkerRuntime } from '../../src/workers/cad.worker'

const base = {
  version: 1 as const,
  requestId: 'open-shelf-base-request',
  operationId: 'open-shelf-base-operation',
}

function configureMocks(): void {
  mocks.initialiseCadKernel.mockResolvedValue(undefined)
  mocks.meshBRep.mockReturnValue({
    positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
    indices: new Uint32Array([0, 1, 2]),
    bounds: { min: [-55.925, -41.925, -3], max: [55.925, 41.925, 50] },
    triangleCount: 1,
  })
  mocks.serializeMesh.mockImplementation((mesh) => ({
    positions: mesh.positions.slice().buffer,
    normals: mesh.normals.slice().buffer,
    indices: mesh.indices.slice().buffer,
    bounds: mesh.bounds,
    triangleCount: mesh.triangleCount,
  }))
  mocks.buildModelBRep.mockResolvedValue({ delete: vi.fn() })
  mocks.exportStepBytes.mockResolvedValue(new Uint8Array([1, 2, 3]).buffer)
  mocks.exportStlBytes.mockResolvedValue(new Uint8Array([4, 5, 6]).buffer)
}

function initCommand() {
  return {
    ...base,
    kind: 'engine.init' as const,
    asset: { wasmUrl: '/replicad_single.wasm' },
  }
}

function generateCommand() {
  return {
    ...base,
    requestId: 'open-shelf-request-1',
    operationId: 'open-shelf-operation-1',
    kind: 'model.generate' as const,
    generation: 1,
    modelId: 'opengrid-open-shelf' as const,
    parameters: { ...OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS },
    previewConfig: { tolerance: 0.01, angularTolerance: 0.1 },
  }
}

describe('OpenGrid open-shelf Worker runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    configureMocks()
  })

  it('routes a valid Open Shelf generation through its builder and quality gate', async () => {
    const events: unknown[] = []
    const runtime = new CadWorkerRuntime('epoch-open-shelf', (event) =>
      events.push(event),
    )

    await runtime.handle(initCommand())
    await runtime.handle(generateCommand())

    expect(mocks.buildModelBRep).toHaveBeenCalledWith(
      'opengrid-open-shelf',
      OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
      expect.any(Object),
    )
    expect(mocks.assertOpenGridOpenShelfShapeQuality).toHaveBeenCalledOnce()
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'model.candidate-ready',
        modelId: 'opengrid-open-shelf',
        parameters: OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
      }),
    )
  })
})
