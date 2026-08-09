import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  buildModelBRep: vi.fn(),
  initialiseCadKernel: vi.fn(),
  meshBRep: vi.fn(),
  serializeMesh: vi.fn(),
  assertOpenGridShapeQuality: vi.fn(),
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
  assertOpenGridShapeQuality: mocks.assertOpenGridShapeQuality,
}))
vi.mock('../../src/cad-kernel/export', () => ({
  exportStepBytes: mocks.exportStepBytes,
  exportStlBytes: mocks.exportStlBytes,
}))

import { CadWorkerRuntime } from '../../src/workers/cad.worker'
import {
  OPENGRID_CONFIGURATION,
  openGridFileName,
  openGridStlFileName,
  type OpenGridParameters,
} from '../../src/cad-contract/units'

const base = {
  version: 1 as const,
  requestId: 'request-base',
  operationId: 'operation-base',
}

function opengridParameters(
  overrides: Partial<OpenGridParameters> = {},
): OpenGridParameters {
  return {
    ...OPENGRID_CONFIGURATION.defaultParameters,
    chamferCorners: {
      ...OPENGRID_CONFIGURATION.defaultParameters.chamferCorners,
    },
    connectorSides: {
      ...OPENGRID_CONFIGURATION.defaultParameters.connectorSides,
    },
    customScrewPositions: [],
    ...overrides,
  }
}

function initCommand() {
  return {
    ...base,
    kind: 'engine.init' as const,
    asset: { wasmUrl: '/replicad_single.wasm' },
  }
}

function generateCommand(overrides: Record<string, unknown> = {}) {
  return {
    ...base,
    requestId: 'opengrid-request-1',
    operationId: 'opengrid-operation-1',
    kind: 'model.generate' as const,
    generation: 1,
    modelId: 'opengrid' as const,
    parameters: opengridParameters(),
    previewConfig: { tolerance: 0.01, angularTolerance: 0.1 },
    ...overrides,
  }
}

function configureMocks() {
  mocks.initialiseCadKernel.mockResolvedValue(undefined)
  mocks.meshBRep.mockReturnValue({
    positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
    indices: new Uint32Array([0, 1, 2]),
    bounds: { min: [0, 0, 0], max: [1, 1, 1] },
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

describe('OpenGrid Worker runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    configureMocks()
  })

  it('accepts the former blocked-size tuple when it uses official parameters', async () => {
    const events: unknown[] = []
    const runtime = new CadWorkerRuntime('epoch-opengrid', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle(
      generateCommand({
        parameters: {
          variant: 'Lite',
          rows: 10,
          columns: 10,
          screwKind: 'custom',
          screwMode: 'everywhere',
          screwCenter: false,
          screwEvery: 0,
          customScrewPositions: [],
          connectorHoles: 'enabled',
          chamfers: 'none',
          chamferCorners: {
            topLeft: true,
            topRight: true,
            bottomLeft: true,
            bottomRight: true,
          },
          connectorSides: {
            top: true,
            right: true,
            bottom: true,
            left: true,
          },
          screwEveryRows: 1,
          screwEveryColumns: 2,
          screwDiameter: 4.1,
          screwHeadDiameter: 7.2,
          screwHeadInset: 1,
          screwHeadIsCountersunk: true,
          screwHeadCountersunkDegree: 90,
        },
      }),
    )

    expect(mocks.buildModelBRep).toHaveBeenCalledOnce()
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'model.candidate-ready',
        modelId: 'opengrid',
      }),
    )
  })

  it('routes a valid typed command through the product builder and quality gate', async () => {
    const events: unknown[] = []
    const runtime = new CadWorkerRuntime('epoch-opengrid', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle(
      generateCommand({
        parameters: {
          variant: 'Heavy',
          rows: 2,
          columns: 2,
          screwKind: 'custom',
          screwMode: 'custom',
          screwCenter: false,
          screwEvery: 0,
          customScrewPositions: [{ row: 0, column: 0 }],
          connectorHoles: 'enabled',
          chamfers: 'corners',
          chamferCorners: {
            topLeft: true,
            topRight: true,
            bottomLeft: true,
            bottomRight: true,
          },
          connectorSides: {
            top: true,
            right: true,
            bottom: true,
            left: true,
          },
          screwEveryRows: 1,
          screwEveryColumns: 2,
          screwDiameter: 5,
          screwHeadDiameter: 8,
          screwHeadInset: 1,
          screwHeadIsCountersunk: true,
          screwHeadCountersunkDegree: 90,
        },
      }),
    )

    expect(mocks.buildModelBRep).toHaveBeenCalledWith(
      'opengrid',
      expect.objectContaining({
        variant: 'Heavy',
        customScrewPositions: [{ row: 0, column: 0 }],
      }),
      expect.any(Object),
    )
    expect(mocks.assertOpenGridShapeQuality).toHaveBeenCalledOnce()
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
      requestId: 'opengrid-commit-request',
      operationId: 'opengrid-operation-1',
      kind: 'model.commit' as const,
      generation: 1,
      candidateId: candidate!.candidateId,
      workerEpoch: 'epoch-opengrid',
    })

    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'model.candidate-ready',
        modelId: 'opengrid',
        parameters: expect.objectContaining({ variant: 'Heavy' }),
      }),
    )
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'model.ready',
        modelId: 'opengrid',
        parameters: expect.objectContaining({ variant: 'Heavy' }),
        bounds: expect.any(Object),
      }),
    )
    const ready = events.find(
      (event) =>
        typeof event === 'object' &&
        event !== null &&
        'kind' in event &&
        event.kind === 'model.ready',
    ) as {
      modelRevision: string
      parameters: Parameters<typeof openGridFileName>[0]
      workerEpoch: string
    }
    await runtime.handle({
      ...base,
      requestId: 'opengrid-export-step-request',
      operationId: 'opengrid-export-step-operation',
      kind: 'export.step' as const,
      modelRevision: ready.modelRevision,
      workerEpoch: ready.workerEpoch,
      file: {
        name: openGridFileName(ready.parameters),
        mime: 'model/step' as const,
      },
    })
    await runtime.handle({
      ...base,
      requestId: 'opengrid-export-stl-request',
      operationId: 'opengrid-export-stl-operation',
      kind: 'export.stl' as const,
      modelRevision: ready.modelRevision,
      workerEpoch: ready.workerEpoch,
      file: {
        name: openGridStlFileName(ready.parameters),
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
})
