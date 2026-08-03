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
})
