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

  it('accepts Snap commands only with Full/Lite offsets and axis directions', () => {
    const command = {
      version: PROTOCOL_VERSION,
      kind: 'model.generate' as const,
      requestId: 'request-snap-1',
      operationId: 'operation-snap-1',
      generation: 1,
      modelId: 'opengrid-snap' as const,
      parameters: {
        variant: 'Full' as const,
        offset: 0.2,
        halfCellX: 'none' as const,
        halfCellY: 'none' as const,
      },
      previewConfig: { tolerance: 0.01, angularTolerance: 0.1 },
    }

    expect(isWorkerCommand(command)).toBe(true)
    expect(
      isWorkerCommand({
        ...command,
        parameters: {
          variant: 'Lite',
          offset: 0.2,
          rows: 2,
        },
      }),
    ).toBe(false)
    expect(
      isWorkerCommand({
        ...command,
        parameters: {
          variant: 'Full',
          offset: 0.2,
          halfCellX: 'diagonal',
          halfCellY: 'none',
        },
      }),
    ).toBe(false)
    expect(
      isWorkerCommand({
        ...command,
        parameters: { variant: 'Full', offset: Number.NaN },
      }),
    ).toBe(false)
  })

  it('accepts OpenGrid stackable-box commands only with half-cell parameters', () => {
    const command = {
      version: PROTOCOL_VERSION,
      kind: 'model.generate' as const,
      requestId: 'request-stackable-1',
      operationId: 'operation-stackable-1',
      generation: 1,
      modelId: 'opengrid-stackable-box' as const,
      parameters: {
        x: 0.5,
        y: 1.5,
        height: 25,
        fullBottomHoleGrid: false,
      },
      previewConfig: { tolerance: 0.01, angularTolerance: 0.1 },
    }

    expect(isWorkerCommand(command)).toBe(true)
    expect(
      isWorkerCommand({
        ...command,
        parameters: {
          x: 0.25,
          y: 1.5,
          height: 25,
          fullBottomHoleGrid: false,
        },
      }),
    ).toBe(false)
    expect(
      isWorkerCommand({
        ...command,
        modelId: 'opengrid',
        parameters: { x: 0.5, y: 1.5, height: 25 },
      }),
    ).toBe(false)
  })

  it('accepts only the independent divider arm-count contract', () => {
    const command = {
      version: PROTOCOL_VERSION,
      kind: 'model.generate' as const,
      requestId: 'request-divider-1',
      operationId: 'operation-divider-1',
      generation: 1,
      modelId: 'opengrid-divider' as const,
      parameters: { left: 1, right: 1, up: 2, down: 0, height: 20 },
      previewConfig: { tolerance: 0.01, angularTolerance: 0.1 },
    }

    expect(isWorkerCommand(command)).toBe(true)
    expect(
      isWorkerCommand({
        ...command,
        parameters: { left: 1, right: 0, up: 0, down: 0, height: 20 },
      }),
    ).toBe(false)
    expect(
      isWorkerCommand({
        ...command,
        parameters: { left: 1.25, right: 1, up: 0, down: 0, height: 20 },
      }),
    ).toBe(false)
    expect(
      isWorkerCommand({
        ...command,
        parameters: {
          left: 1,
          right: 1,
          up: 0,
          down: 0,
          height: 20,
          rows: 1,
        },
      }),
    ).toBe(false)
  })

  it('accepts OpenGrid stackable-cylinder commands only with integer diameter and height', () => {
    const command = {
      version: PROTOCOL_VERSION,
      kind: 'model.generate' as const,
      requestId: 'request-cylinder-1',
      operationId: 'operation-cylinder-1',
      generation: 1,
      modelId: 'opengrid-stackable-cylinder' as const,
      parameters: {
        diameter: 56,
        height: 30,
        thinBottomMode: false,
        bottomPlateMode: false,
        bottomHolesEnabled: true,
      },
      previewConfig: { tolerance: 0.01, angularTolerance: 0.1 },
    }

    expect(isWorkerCommand(command)).toBe(true)
    expect(
      isWorkerCommand({
        ...command,
        parameters: {
          diameter: 56.5,
          height: 30,
          thinBottomMode: false,
          bottomPlateMode: false,
          bottomHolesEnabled: true,
        },
      }),
    ).toBe(false)
    expect(
      isWorkerCommand({
        ...command,
        parameters: {
          diameter: 56,
          height: 30,
          thinBottomMode: false,
          bottomPlateMode: false,
          bottomHolesEnabled: true,
          fullBottomHoleGrid: false,
        },
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

  it('accepts pillar commands only with integer length and boolean mode', () => {
    const command = {
      version: PROTOCOL_VERSION,
      kind: 'model.generate' as const,
      requestId: 'request-pillar-1',
      operationId: 'operation-pillar-1',
      generation: 1,
      modelId: 'opengrid-pillar' as const,
      parameters: { length: 12, baseConnection: true },
      previewConfig: { tolerance: 0.01, angularTolerance: 0.1 },
    }

    expect(isWorkerCommand(command)).toBe(true)
    expect(
      isWorkerCommand({
        ...command,
        parameters: { length: 12.5, baseConnection: true },
      }),
    ).toBe(false)
    expect(
      isWorkerCommand({
        ...command,
        parameters: { length: 12, baseConnection: 'true' },
      }),
    ).toBe(false)
    expect(
      isWorkerCommand({
        ...command,
        parameters: { length: 12, baseConnection: true, height: 5 },
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
