import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/cad-kernel/initialise', () => ({
  initialiseCadKernel: vi.fn(async () => undefined),
}))

vi.mock('../../src/cad-kernel/model', () => ({
  buildModelBRep: vi.fn(() => ({ delete: vi.fn() })),
}))

vi.mock('../../src/cad-kernel/mesh', () => ({
  meshBRep: vi.fn(() => ({
    positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
    indices: new Uint32Array([0, 1, 2]),
    bounds: { min: [0, 0, 0], max: [1, 1, 0] },
    triangleCount: 1,
  })),
  serializeMesh: vi.fn((mesh) => ({
    positions: mesh.positions.slice().buffer,
    normals: mesh.normals.slice().buffer,
    indices: mesh.indices.slice().buffer,
    bounds: mesh.bounds,
    triangleCount: mesh.triangleCount,
  })),
}))

vi.mock('../../src/cad-kernel/export', () => ({
  exportStepBytes: vi.fn(async () => new Uint8Array([1]).buffer),
}))

vi.mock('../../src/cad-kernel/components/opengrid-pillar/quality', () => ({
  assertPillarShapeQuality: vi.fn(),
}))

import { CadWorkerRuntime } from '../../src/workers/cad.worker'
import { assertPillarShapeQuality } from '../../src/cad-kernel/components/opengrid-pillar/quality'
import { meshBRep, serializeMesh } from '../../src/cad-kernel/mesh'

const base = {
  version: 1 as const,
  requestId: 'request-1',
  operationId: 'operation-1',
}

function initCommand() {
  return {
    ...base,
    kind: 'engine.init' as const,
    asset: { wasmUrl: '/replicad_single.wasm' },
  }
}

function generateCommand(generation = 1) {
  return {
    ...base,
    kind: 'model.generate' as const,
    requestId: `generate-request-${generation}`,
    operationId: `generate-operation-${generation}`,
    generation,
    modelId: 'box' as const,
    parameters: { width: 20, depth: 30, height: 40 },
    previewConfig: { tolerance: 0.01, angularTolerance: 0.1 },
  }
}

function pillarGenerateCommand(generation = 1) {
  return {
    ...base,
    requestId: `pillar-generate-request-${generation}`,
    operationId: `pillar-generate-operation-${generation}`,
    kind: 'model.generate' as const,
    generation,
    modelId: 'opengrid-pillar' as const,
    parameters: { length: 12, baseConnection: true },
    previewConfig: { tolerance: 0.01, angularTolerance: 0.1 },
  }
}

describe('CAD Worker candidate terminal lifecycle', () => {
  beforeEach(() => vi.clearAllMocks())

  it('emits throttled face progress when the mesh adapter reports faces', async () => {
    vi.mocked(meshBRep).mockImplementationOnce((_shape, options) => {
      options.reportFaceProgress?.({ completed: 0, total: 1_000 })
      for (let completed = 1; completed <= 1_000; completed += 1) {
        options.reportFaceProgress?.({ completed, total: 1_000 })
      }
      return {
        positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
        normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
        indices: new Uint32Array([0, 1, 2]),
        bounds: { min: [0, 0, 0], max: [1, 1, 0] },
        triangleCount: 1,
      }
    })
    const events: any[] = []
    const runtime = new CadWorkerRuntime('epoch-face-progress', (event) =>
      events.push(event),
    )

    await runtime.handle(initCommand())
    await runtime.handle(generateCommand())

    const faceProgress = events.filter(
      (event) => event.kind === 'operation.progress' && event.unit === 'faces',
    )
    expect(faceProgress[0]).toMatchObject({
      stage: 'meshing',
      completed: 0,
      total: 1_000,
    })
    expect(faceProgress.at(-1)).toMatchObject({
      stage: 'meshing',
      completed: 1_000,
      total: 1_000,
    })
    expect(faceProgress.length).toBeLessThan(1_001)
  })

  it('keeps meshing stage-only when the adapter has no face progress', async () => {
    const events: any[] = []
    const runtime = new CadWorkerRuntime('epoch-global-mesh', (event) =>
      events.push(event),
    )

    await runtime.handle(initCommand())
    await runtime.handle(generateCommand())

    const meshingProgress = events.filter(
      (event) =>
        event.kind === 'operation.progress' && event.stage === 'meshing',
    )
    expect(meshingProgress.length).toBeGreaterThan(0)
    expect(meshingProgress.every((event) => event.unit === undefined)).toBe(
      true,
    )
  })

  it('flushes the latest face progress before a mesh failure terminal', async () => {
    vi.mocked(meshBRep).mockImplementationOnce((_shape, options) => {
      options.reportFaceProgress?.({ completed: 0, total: 1_000 })
      options.reportFaceProgress?.({ completed: 5, total: 1_000 })
      throw new Error('forced mesh failure')
    })
    const events: any[] = []
    const runtime = new CadWorkerRuntime('epoch-face-failure', (event) =>
      events.push(event),
    )

    await runtime.handle(initCommand())
    await runtime.handle(generateCommand())

    const faceProgress = events.filter(
      (event) => event.kind === 'operation.progress' && event.unit === 'faces',
    )
    expect(faceProgress.at(-1)).toMatchObject({
      completed: 5,
      total: 1_000,
    })
    expect(events.at(-1)).toMatchObject({
      kind: 'operation.error',
      operationId: 'generate-operation-1',
    })
  })

  it('emits one original terminal response for repeated discard', async () => {
    const events: any[] = []
    const runtime = new CadWorkerRuntime('epoch-test', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle(generateCommand())
    const candidate = events.find(
      (event) => event.kind === 'model.candidate-ready',
    )

    await runtime.handle({
      ...base,
      kind: 'model.discard' as const,
      requestId: 'discard-request-1',
      operationId: 'generate-operation-1',
      generation: 1,
      candidateId: candidate.candidateId,
      workerEpoch: 'epoch-test',
    })
    await runtime.handle({
      ...base,
      kind: 'model.discard' as const,
      requestId: 'discard-request-2',
      operationId: 'generate-operation-1',
      generation: 1,
      candidateId: candidate.candidateId,
      workerEpoch: 'epoch-test',
    })

    const terminals = events.filter(
      (event) => event.kind === 'operation.superseded',
    )
    expect(terminals).toHaveLength(1)
    expect(terminals[0]).toMatchObject({
      operationId: 'generate-operation-1',
      terminalForRequestId: 'generate-request-1',
    })
  })

  it('invalidates a same-generation candidate and rejects commit', async () => {
    const events: any[] = []
    const runtime = new CadWorkerRuntime('epoch-test', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle(generateCommand())
    const candidate = events.find(
      (event) => event.kind === 'model.candidate-ready',
    )
    await runtime.handle({
      ...base,
      kind: 'model.invalidate' as const,
      requestId: 'invalidate-request',
      operationId: 'invalidate-operation',
      generation: 1,
      workerEpoch: 'epoch-test',
      reason: 'invalid-input' as const,
    })
    await runtime.handle({
      ...base,
      kind: 'model.commit' as const,
      requestId: 'commit-request',
      operationId: 'generate-operation-1',
      generation: 1,
      candidateId: candidate.candidateId,
      workerEpoch: 'epoch-test',
    })

    expect(events.filter((event) => event.kind === 'model.ready')).toHaveLength(
      0,
    )
    expect(
      events.filter((event) => event.kind === 'operation.superseded'),
    ).toHaveLength(1)
  })

  it('rejects commands after worker.dispose', async () => {
    const events: any[] = []
    const runtime = new CadWorkerRuntime('epoch-test', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle({ ...base, kind: 'worker.dispose' as const })
    await runtime.handle(generateCommand())

    expect(events.at(-1)).toMatchObject({
      kind: 'operation.error',
      code: 'WORKER_TERMINATED',
    })
  })

  it('generates and commits pillar metadata through the shared lifecycle', async () => {
    const events: any[] = []
    const runtime = new CadWorkerRuntime('epoch-pillar', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle(pillarGenerateCommand())

    const candidate = events.find(
      (event) => event.kind === 'model.candidate-ready',
    )
    expect(candidate).toMatchObject({
      modelId: 'opengrid-pillar',
      generation: 1,
      parameters: { length: 12, baseConnection: true },
      workerEpoch: 'epoch-pillar',
    })
    expect(assertPillarShapeQuality).toHaveBeenCalledWith(
      expect.anything(),
      { length: 12, baseConnection: true },
      expect.objectContaining({ triangleCount: 1 }),
    )

    await runtime.handle({
      ...base,
      requestId: 'pillar-commit-request',
      operationId: 'pillar-generate-operation-1',
      kind: 'model.commit' as const,
      generation: 1,
      candidateId: candidate.candidateId,
      workerEpoch: 'epoch-pillar',
    })

    const ready = events.find((event) => event.kind === 'model.ready')
    expect(ready).toMatchObject({
      kind: 'model.ready',
      modelId: 'opengrid-pillar',
      parameters: { length: 12, baseConnection: true },
    })
    expect(ready).not.toHaveProperty('mesh')
    expect(serializeMesh).toHaveBeenCalledTimes(1)
  })
})
