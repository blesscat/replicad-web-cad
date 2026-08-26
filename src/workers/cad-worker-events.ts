import {
  PROTOCOL_VERSION,
  type BooleanOperationProgress,
  type ProgressEvent,
} from '../cad-contract/messages'
import type {
  CadError,
  CadErrorCode,
  CadErrorStage,
} from '../cad-contract/errors'
import type { DiagnosticDescriptor } from '../cad-contract/diagnostics'
import type {
  EventSink,
  ProgressCommand,
  ProgressCounters,
  SupersededReason,
} from './cad-worker-types'

export function id(): string {
  return crypto.randomUUID()
}

export function makeError(
  stage: CadErrorStage,
  code: CadErrorCode,
  message: DiagnosticDescriptor,
  recoverable = true,
): CadError {
  return { stage, code, message, recoverable }
}

export function emitProgress(
  emit: EventSink,
  command: ProgressCommand,
  stage: ProgressEvent['stage'],
  modelRevision?: string,
  counters?: ProgressCounters,
  booleanOperation?: BooleanOperationProgress,
): void {
  const event: ProgressEvent = {
    version: PROTOCOL_VERSION,
    kind: 'operation.progress',
    requestId: id(),
    operationId: command.operationId,
    stage,
    generation: command.generation,
    modelRevision,
    ...counters,
  }
  if (booleanOperation !== undefined) event.booleanOperation = booleanOperation
  emit(event)
}

export function emitSuperseded(
  emit: EventSink,
  command: ProgressCommand,
  reason: SupersededReason,
  fallbackGeneration: number,
): void {
  emit({
    version: PROTOCOL_VERSION,
    kind: 'operation.superseded',
    requestId: id(),
    operationId: command.operationId,
    terminalForRequestId: command.requestId,
    generation: command.generation ?? fallbackGeneration,
    reason,
  })
}
