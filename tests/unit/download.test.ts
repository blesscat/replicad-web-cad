import { describe, expect, it } from 'vitest'
import {
  PROTOCOL_VERSION,
  type ExportReadyEvent,
} from '../../src/cad-contract/messages'
import { validateStepResponse } from '../../src/features/cad/download'

function stepResponse(
  overrides: Record<string, unknown> = {},
): ExportReadyEvent {
  return {
    version: PROTOCOL_VERSION,
    kind: 'export.ready',
    requestId: 'response-1',
    operationId: 'export-1',
    modelRevision: 'rev-1',
    workerEpoch: 'epoch-1',
    format: 'step' as const,
    bytes: new Uint8Array([1, 2, 3]).buffer,
    mime: 'model/step' as const,
    fileName: 'box-20x30x40.step',
    ...overrides,
  } as ExportReadyEvent
}

describe('STEP response validation', () => {
  it('accepts a non-empty response for the expected revision', () => {
    expect(
      validateStepResponse(
        stepResponse(),
        'rev-1',
        'epoch-1',
        'box-20x30x40.step',
      ),
    ).toEqual({ valid: true })
  })

  const invalidCases: Array<[Record<string, unknown>, string]> = [
    [{ modelRevision: 'rev-2' }, 'revision'],
    [{ format: 'stl' }, 'metadata'],
    [{ mime: 'application/octet-stream' }, 'metadata'],
    [{ fileName: 'box.step.txt' }, 'extension'],
    [{ workerEpoch: 'epoch-2' }, 'worker epoch'],
    [{ fileName: 'box-21x30x40.step' }, 'filename'],
    [{ bytes: new ArrayBuffer(0) }, 'empty'],
  ]

  it.each(invalidCases)('rejects %s', (overrides) => {
    expect(
      validateStepResponse(
        stepResponse(overrides),
        'rev-1',
        'epoch-1',
        'box-20x30x40.step',
      ).valid,
    ).toBe(false)
  })
})
