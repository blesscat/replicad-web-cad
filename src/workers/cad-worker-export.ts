import { PROTOCOL_VERSION, type WorkerCommand } from '../cad-contract/messages'
import {
  modelFileName,
  modelStlFileName,
  PROTOTYPE_CONFIGURATION,
  validateModelParameters,
} from '../cad-contract/units'
import { exportStepBytes, exportStlBytes } from '../cad-kernel/export'
import type { CadWorkerLifecycle } from './cad-worker-lifecycle'
import { emitProgress, id } from './cad-worker-events'
import type { EventSink } from './cad-worker-types'

type ExportContext = {
  epoch: string
  lifecycle: Pick<CadWorkerLifecycle, 'pin' | 'unpin'>
  emit: EventSink
}

type StepCommand = Extract<WorkerCommand, { kind: 'export.step' }>
type StlCommand = Extract<WorkerCommand, { kind: 'export.stl' }>

export async function exportStepCommand(
  command: StepCommand,
  context: ExportContext,
): Promise<void> {
  if (command.workerEpoch !== context.epoch) throw new Error('WORKER_RESTARTED')
  const revision = context.lifecycle.pin(command.modelRevision)
  try {
    const validation = validateModelParameters(
      revision.modelId,
      revision.parameters,
    )
    if (!validation.valid) throw new Error('STEP_METADATA_INVALID')
    if (command.file.name !== modelFileName(validation.value)) {
      throw new Error('STEP_METADATA_INVALID')
    }
    context.emit({
      version: PROTOCOL_VERSION,
      kind: 'export.accepted',
      requestId: id(),
      operationId: command.operationId,
      modelRevision: revision.modelRevision,
      workerEpoch: context.epoch,
    })
    emitProgress(context.emit, command, 'exporting', revision.modelRevision)
    const bytes = await exportStepBytes(revision.shape)
    if (bytes.byteLength === 0) throw new Error('STEP_EMPTY')
    context.emit(
      {
        version: PROTOCOL_VERSION,
        kind: 'export.ready',
        requestId: id(),
        operationId: command.operationId,
        modelRevision: revision.modelRevision,
        workerEpoch: context.epoch,
        format: 'step',
        bytes,
        mime: 'model/step',
        fileName: command.file.name,
      },
      [bytes],
    )
  } finally {
    context.lifecycle.unpin(revision.modelRevision)
  }
}

export async function exportStlCommand(
  command: StlCommand,
  context: ExportContext,
): Promise<void> {
  if (command.workerEpoch !== context.epoch) throw new Error('WORKER_RESTARTED')
  const revision = context.lifecycle.pin(command.modelRevision)
  try {
    const validation = validateModelParameters(
      revision.modelId,
      revision.parameters,
    )
    if (!validation.valid) throw new Error('STL_METADATA_INVALID')
    if (command.file.name !== modelStlFileName(validation.value)) {
      throw new Error('STL_METADATA_INVALID')
    }
    context.emit({
      version: PROTOCOL_VERSION,
      kind: 'export.accepted',
      requestId: id(),
      operationId: command.operationId,
      modelRevision: revision.modelRevision,
      workerEpoch: context.epoch,
    })
    emitProgress(context.emit, command, 'exporting', revision.modelRevision)
    const bytes = await exportStlBytes(revision.shape, {
      tolerance: PROTOTYPE_CONFIGURATION.stlTolerance,
      angularTolerance: PROTOTYPE_CONFIGURATION.stlAngularTolerance,
    })
    if (bytes.byteLength === 0) throw new Error('STL_EMPTY')
    context.emit(
      {
        version: PROTOCOL_VERSION,
        kind: 'export.ready',
        requestId: id(),
        operationId: command.operationId,
        modelRevision: revision.modelRevision,
        workerEpoch: context.epoch,
        format: 'stl',
        bytes,
        mime: PROTOTYPE_CONFIGURATION.stlMime,
        fileName: command.file.name,
      },
      [bytes],
    )
  } finally {
    context.lifecycle.unpin(revision.modelRevision)
  }
}
