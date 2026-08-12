import { describe, expect, it, vi } from 'vitest'
import {
  PROTOCOL_VERSION,
  type ExportReadyEvent,
} from '../../src/cad-contract/messages'
import {
  validateStepResponse,
  validateStlResponse,
  triggerFixedStepDownload,
  triggerStlDownload,
} from '../../src/features/cad/download'

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

function stlResponse(
  overrides: Record<string, unknown> = {},
): ExportReadyEvent {
  const bytes = new ArrayBuffer(84 + 50)
  new DataView(bytes).setUint32(80, 1, true)
  return {
    version: PROTOCOL_VERSION,
    kind: 'export.ready',
    requestId: 'response-stl-1',
    operationId: 'export-stl-1',
    modelRevision: 'rev-1',
    workerEpoch: 'epoch-1',
    format: 'stl',
    bytes,
    mime: 'model/stl',
    fileName: 'box-20x30x40.stl',
    ...overrides,
  } as ExportReadyEvent
}

function mismatchedStlBytes(): ArrayBuffer {
  const bytes = new ArrayBuffer(84 + 50)
  new DataView(bytes).setUint32(80, 2, true)
  return bytes
}

describe('STL response validation', () => {
  it('accepts a valid binary STL response', () => {
    expect(
      validateStlResponse(
        stlResponse(),
        'rev-1',
        'epoch-1',
        'box-20x30x40.stl',
      ),
    ).toEqual({ valid: true })
  })

  const invalidCases: Array<[Record<string, unknown>, string]> = [
    [{ modelRevision: 'rev-2' }, 'revision'],
    [{ format: 'step' }, 'format'],
    [{ mime: 'application/octet-stream' }, 'metadata'],
    [{ fileName: 'box-20x30x40.step' }, 'extension'],
    [{ workerEpoch: 'epoch-2' }, 'worker epoch'],
    [{ bytes: new ArrayBuffer(84) }, 'truncated'],
    [{ bytes: mismatchedStlBytes() }, 'triangle count'],
  ]

  it.each(invalidCases)('rejects %s', (overrides) => {
    expect(
      validateStlResponse(
        stlResponse(overrides),
        'rev-1',
        'epoch-1',
        'box-20x30x40.stl',
      ).valid,
    ).toBe(false)
  })
})

describe('STL browser download adapter', () => {
  it('triggers a fixed STEP asset download with its user-facing filename', () => {
    const click = vi.fn()
    const anchor = { href: '', download: '', click }
    vi.stubGlobal('document', {
      createElement: vi.fn(() => anchor),
    })

    triggerFixedStepDownload({
      url: '/downloads/snap-half.step',
      fileName: 'Half.step',
    })

    expect(anchor).toMatchObject({
      href: '/downloads/snap-half.step',
      download: 'Half.step',
    })
    expect(click).toHaveBeenCalledOnce()

    vi.unstubAllGlobals()
  })

  it('triggers one download and returns Object URL cleanup', () => {
    const click = vi.fn()
    const anchor = { href: '', download: '', click }
    const createObjectURL = vi.fn(() => 'blob:stl')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('document', {
      createElement: vi.fn(() => anchor),
    })
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })

    const cleanup = triggerStlDownload(stlResponse())

    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(anchor).toMatchObject({
      href: 'blob:stl',
      download: 'box-20x30x40.stl',
    })
    expect(click).toHaveBeenCalledOnce()
    cleanup()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:stl')

    vi.unstubAllGlobals()
  })
})
