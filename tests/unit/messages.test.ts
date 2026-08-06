import { describe, expect, it } from 'vitest'
import {
  isWorkerCommand,
  isWorkerEvent,
  PROTOCOL_VERSION,
} from '../../src/cad-contract/messages'

describe('Worker contract runtime validation', () => {
  it('accepts versioned model commands and rejects incompatible messages', () => {
    expect(
      isWorkerCommand({
        version: PROTOCOL_VERSION,
        kind: 'model.generate',
        requestId: 'request-1',
        operationId: 'operation-1',
        generation: 1,
        modelId: 'box',
        parameters: { width: 20, depth: 30, height: 40 },
        previewConfig: { tolerance: 0.01, angularTolerance: 0.1 },
      }),
    ).toBe(true)
    expect(isWorkerCommand({ version: 2, kind: 'model.generate' })).toBe(false)
    expect(
      isWorkerCommand({
        version: PROTOCOL_VERSION,
        kind: 'unknown',
        requestId: 'x',
        operationId: 'y',
      }),
    ).toBe(false)
    expect(
      isWorkerCommand({
        version: PROTOCOL_VERSION,
        kind: 'model.generate',
        requestId: 'request-2',
        operationId: 'operation-2',
        generation: 2,
        modelId: 'box',
        parameters: { width: 20.5, depth: 30, height: 40 },
        previewConfig: { tolerance: 0.01, angularTolerance: 0.1 },
      }),
    ).toBe(false)
    expect(
      isWorkerCommand({
        version: PROTOCOL_VERSION,
        kind: 'model.generate',
        requestId: 'request-3',
        operationId: 'operation-3',
        generation: 3,
        modelId: 'box',
        parameters: { width: 20, depth: 30, height: 40, rows: 1 },
        previewConfig: { tolerance: 0.01, angularTolerance: 0.1 },
      }),
    ).toBe(false)
  })

  it('accepts a modular-grid-base command with its own parameter shape', () => {
    expect(
      isWorkerCommand({
        version: PROTOCOL_VERSION,
        kind: 'model.generate',
        requestId: 'request-grid-1',
        operationId: 'operation-grid-1',
        generation: 1,
        modelId: 'modular-grid-base',
        parameters: { rows: 2, columns: 2 },
        previewConfig: { tolerance: 0.01, angularTolerance: 0.1 },
      }),
    ).toBe(true)
    expect(
      isWorkerCommand({
        version: PROTOCOL_VERSION,
        kind: 'model.generate',
        requestId: 'request-grid-2',
        operationId: 'operation-grid-2',
        generation: 2,
        modelId: 'modular-grid-base',
        parameters: { width: 20, depth: 20, height: 5 },
        previewConfig: { tolerance: 0.01, angularTolerance: 0.1 },
      }),
    ).toBe(false)
  })

  it('accepts HSW commands only with the independent rows/columns contract', () => {
    const command = {
      version: PROTOCOL_VERSION,
      kind: 'model.generate' as const,
      requestId: 'request-hsw-1',
      operationId: 'operation-hsw-1',
      generation: 1,
      modelId: 'hsw-cell' as const,
      parameters: { rows: 2, columns: 3 },
      previewConfig: { tolerance: 0.01, angularTolerance: 0.1 },
    }

    expect(isWorkerCommand(command)).toBe(true)
    expect(
      isWorkerCommand({
        ...command,
        parameters: { rows: 2, columns: 3, width: 20 },
      }),
    ).toBe(false)
    expect(
      isWorkerCommand({
        ...command,
        parameters: { rows: 2.5, columns: 3 },
      }),
    ).toBe(false)
  })

  it('accepts hexagonal-column commands with orientation', () => {
    const command = {
      version: PROTOCOL_VERSION,
      kind: 'model.generate' as const,
      requestId: 'request-hex-1',
      operationId: 'operation-hex-1',
      generation: 1,
      modelId: 'hexagonal-column' as const,
      parameters: {
        height: 50,
        count: 3,
        gap: 1,
        orientation: 'lying',
      },
      previewConfig: { tolerance: 0.01, angularTolerance: 0.1 },
    }

    expect(isWorkerCommand(command)).toBe(true)
    expect(
      isWorkerCommand({ ...command, parameters: { height: 50, count: 3 } }),
    ).toBe(false)
    expect(
      isWorkerCommand({
        ...command,
        parameters: {
          height: 50.5,
          count: 3,
          gap: 1,
          orientation: 'lying',
        },
      }),
    ).toBe(false)
  })

  it('accepts a validated STL export command and response', () => {
    const command = {
      version: PROTOCOL_VERSION,
      kind: 'export.stl',
      requestId: 'stl-request-1',
      operationId: 'stl-operation-1',
      modelRevision: 'rev-1',
      workerEpoch: 'epoch-1',
      file: { name: 'box-20x30x40.stl', mime: 'model/stl' },
    }
    const event = {
      version: PROTOCOL_VERSION,
      kind: 'export.ready',
      requestId: 'stl-response-1',
      operationId: 'stl-operation-1',
      modelRevision: 'rev-1',
      workerEpoch: 'epoch-1',
      format: 'stl',
      bytes: new Uint8Array(84 + 50).buffer,
      mime: 'model/stl',
      fileName: 'box-20x30x40.stl',
    }

    expect(isWorkerCommand(command)).toBe(true)
    expect(isWorkerEvent(event)).toBe(true)
    expect(
      isWorkerCommand({
        ...command,
        file: { name: 'box-20x30x40.step', mime: 'model/stl' },
      }),
    ).toBe(false)
    expect(
      isWorkerCommand({
        ...command,
        workerEpoch: '',
      }),
    ).toBe(false)
    expect(
      isWorkerEvent({
        ...event,
        bytes: new ArrayBuffer(0),
      }),
    ).toBe(false)
    expect(
      isWorkerEvent({
        ...event,
        mime: 'model/step',
      }),
    ).toBe(false)
    expect(
      isWorkerEvent({
        ...event,
        fileName: 'box-20x30x40.step',
      }),
    ).toBe(false)
  })

  it('accepts transferable mesh responses only when buffers and counts are valid', () => {
    const event = {
      version: PROTOCOL_VERSION,
      kind: 'model.ready',
      requestId: 'response-1',
      operationId: 'operation-1',
      generation: 1,
      modelRevision: 'rev-epoch-r1',
      workerEpoch: 'epoch-1',
      modelId: 'box',
      parameters: { width: 20, depth: 30, height: 40 },
      mesh: {
        positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]).buffer,
        normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]).buffer,
        indices: new Uint32Array([0, 1, 2]).buffer,
        bounds: { min: [0, 0, 0], max: [1, 1, 0] },
        triangleCount: 1,
      },
      bounds: { min: [0, 0, 0], max: [1, 1, 0] },
    }
    expect(isWorkerEvent(event)).toBe(true)
    expect(
      isWorkerEvent({ ...event, mesh: { ...event.mesh, triangleCount: 0 } }),
    ).toBe(false)
  })

  it('accepts valid progress counters and rejects incomplete or invalid counters', () => {
    const progress = {
      version: PROTOCOL_VERSION,
      kind: 'operation.progress' as const,
      requestId: 'progress-response-1',
      operationId: 'operation-1',
      stage: 'building' as const,
      generation: 2,
      completed: 4,
      total: 10,
      unit: 'cells' as const,
    }

    expect(isWorkerEvent(progress)).toBe(true)
    expect(isWorkerEvent({ ...progress, completed: 11 })).toBe(false)
    expect(isWorkerEvent({ ...progress, completed: -1 })).toBe(false)
    expect(isWorkerEvent({ ...progress, total: 0 })).toBe(false)
    expect(isWorkerEvent({ ...progress, unit: undefined })).toBe(false)
    expect(isWorkerEvent({ ...progress, total: undefined })).toBe(false)
    expect(
      isWorkerEvent({
        ...progress,
        completed: undefined,
        total: undefined,
        unit: undefined,
      }),
    ).toBe(true)
  })
})
