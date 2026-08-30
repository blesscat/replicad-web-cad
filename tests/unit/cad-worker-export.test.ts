import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkerEvent } from '../../src/cad-contract/messages'
import {
  modelFileName,
  modelStlFileName,
  OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
  type ModelId,
  type ModelParameterValues,
} from '../../src/cad-contract/units'
import type { RevisionRecord } from '../../src/cad-kernel/lifetime'
import type { EventSink } from '../../src/workers/cad-worker-types'

const mocks = vi.hoisted(() => ({
  exportStepBytes: vi.fn(),
  exportStlBytes: vi.fn(),
}))

vi.mock('../../src/cad-kernel/export', () => ({
  exportStepBytes: mocks.exportStepBytes,
  exportStlBytes: mocks.exportStlBytes,
}))

import {
  exportStepCommand,
  exportStlCommand,
} from '../../src/workers/cad-worker-export'

const parameters = { width: 20, depth: 30, height: 40 }
const model = { modelId: 'box' as const, parameters }

function revision(
  modelId: ModelId = 'box',
  revisionParameters: ModelParameterValues = parameters,
): RevisionRecord {
  return {
    modelRevision: 'revision-1',
    operationId: 'operation-1',
    generation: 1,
    workerEpoch: 'epoch-1',
    modelId,
    parameters: revisionParameters,
    shape: {} as RevisionRecord['shape'],
    mesh: {} as RevisionRecord['mesh'],
    previewTiming: {} as RevisionRecord['previewTiming'],
    exportPins: 0,
  }
}

describe('CAD Worker export seam', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('pins a revision and emits a valid STEP export', async () => {
    const currentRevision = revision()
    const lifecycle = {
      pin: vi.fn(() => currentRevision),
      unpin: vi.fn(),
    }
    const events: WorkerEvent[] = []
    const transfers: Transferable[][] = []
    const emit: EventSink = (event, transfer) => {
      events.push(event)
      if (transfer) transfers.push(transfer)
    }
    const bytes = new Uint8Array([1, 2, 3]).buffer
    mocks.exportStepBytes.mockResolvedValue(bytes)

    await exportStepCommand(
      {
        version: 2,
        kind: 'export.step',
        requestId: 'step-request',
        operationId: 'step-operation',
        modelRevision: currentRevision.modelRevision,
        workerEpoch: 'epoch-1',
        file: { name: modelFileName(model), mime: 'model/step' },
      },
      { epoch: 'epoch-1', lifecycle, emit },
    )

    expect(lifecycle.pin).toHaveBeenCalledWith(currentRevision.modelRevision)
    expect(lifecycle.unpin).toHaveBeenCalledWith(currentRevision.modelRevision)
    expect(events).toContainEqual(
      expect.objectContaining({ kind: 'export.accepted' }),
    )
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'export.ready',
        format: 'step',
        bytes,
        fileName: modelFileName(model),
      }),
    )
    expect(transfers).toContainEqual([bytes])
  })

  it('pins a revision and emits a valid STL export', async () => {
    const currentRevision = revision()
    const lifecycle = {
      pin: vi.fn(() => currentRevision),
      unpin: vi.fn(),
    }
    const events: WorkerEvent[] = []
    const emit: EventSink = (event) => events.push(event)
    const bytes = new Uint8Array([4, 5, 6]).buffer
    mocks.exportStlBytes.mockResolvedValue(bytes)

    await exportStlCommand(
      {
        version: 2,
        kind: 'export.stl',
        requestId: 'stl-request',
        operationId: 'stl-operation',
        modelRevision: currentRevision.modelRevision,
        workerEpoch: 'epoch-1',
        file: { name: modelStlFileName(model), mime: 'model/stl' },
      },
      { epoch: 'epoch-1', lifecycle, emit },
    )

    expect(lifecycle.pin).toHaveBeenCalledWith(currentRevision.modelRevision)
    expect(lifecycle.unpin).toHaveBeenCalledWith(currentRevision.modelRevision)
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'export.ready',
        format: 'stl',
        bytes,
        fileName: modelStlFileName(model),
      }),
    )
  })

  it('preserves the complete OpenConnect organizer identity in STEP and STL exports', async () => {
    const organizerParameters = {
      ...OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
      holeCountX: 3,
      holeCountY: 4,
      holeSpacingMode: 'independent' as const,
      holeSpacingX: 2.25,
      holeSpacingY: 3.5,
      holeShape: 'pentagon' as const,
      holeDiameter: 18.75,
      holeDepth: 30,
      bottomThickness: 3.25,
      edgeThickness: 4.25,
      tiltAngle: 22,
    }
    const organizerModel = {
      modelId: 'opengrid-openconnect-organizer' as const,
      parameters: organizerParameters,
    }
    const currentRevision = revision(
      organizerModel.modelId,
      organizerParameters,
    )
    const lifecycle = {
      pin: vi.fn(() => currentRevision),
      unpin: vi.fn(),
    }
    const events: WorkerEvent[] = []
    const emit: EventSink = (event) => events.push(event)
    mocks.exportStepBytes.mockResolvedValue(new Uint8Array([1]).buffer)
    mocks.exportStlBytes.mockResolvedValue(new Uint8Array([2]).buffer)

    await exportStepCommand(
      {
        version: 2,
        kind: 'export.step',
        requestId: 'organizer-step-request',
        operationId: 'organizer-step-operation',
        modelRevision: currentRevision.modelRevision,
        workerEpoch: 'epoch-1',
        file: { name: modelFileName(organizerModel), mime: 'model/step' },
      },
      { epoch: 'epoch-1', lifecycle, emit },
    )
    await exportStlCommand(
      {
        version: 2,
        kind: 'export.stl',
        requestId: 'organizer-stl-request',
        operationId: 'organizer-stl-operation',
        modelRevision: currentRevision.modelRevision,
        workerEpoch: 'epoch-1',
        file: { name: modelStlFileName(organizerModel), mime: 'model/stl' },
      },
      { epoch: 'epoch-1', lifecycle, emit },
    )

    const readyEvents = events.filter((event) => event.kind === 'export.ready')
    expect(readyEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          format: 'step',
          fileName: modelFileName(organizerModel),
        }),
        expect.objectContaining({
          format: 'stl',
          fileName: modelStlFileName(organizerModel),
        }),
      ]),
    )
    expect(modelFileName(organizerModel)).toMatch(
      /^opengrid-openconnect-organizer-.*\.step$/,
    )
    expect(modelStlFileName(organizerModel)).toMatch(
      /^opengrid-openconnect-organizer-.*\.stl$/,
    )
    expect(lifecycle.unpin).toHaveBeenCalledTimes(2)
  })
})
