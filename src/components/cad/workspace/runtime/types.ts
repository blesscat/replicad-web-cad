import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { CadError } from '../../../../cad-contract/errors'
import type {
  ModelId,
  ModelParameterKey,
  ModelParameterValues,
} from '../../../../cad-contract/units'
import type { CadAction, CadState } from '../../../../features/cad/state'
import type { CadProgress } from '../../../../features/cad/progress'
import type { CadWorkerClient } from '../../../../features/cad/worker-client'
import type { ExportRequest, OperationRecord, RawParameters } from '../types'

export type FieldErrors = Partial<Record<ModelParameterKey, string>>

export type RuntimeRefs = {
  client: MutableRefObject<CadWorkerClient | null>
  rawParameters: MutableRefObject<RawParameters>
  state: MutableRefObject<CadState>
  workerEpoch: MutableRefObject<string | null>
  latestGeneration: MutableRefObject<number>
  initialModelSent: MutableRefObject<boolean>
  autoRecoveryAttempts: MutableRefObject<number>
  operations: MutableRefObject<Map<string, OperationRecord>>
  activeProgressOperationId: MutableRefObject<string | null>
  exportRequest: MutableRefObject<ExportRequest | null>
  debounce: MutableRefObject<ReturnType<typeof setTimeout> | null>
  timers: MutableRefObject<Map<string, ReturnType<typeof setTimeout>>>
  startWorker: MutableRefObject<(manual?: boolean) => void>
  recoverWorker: MutableRefObject<RecoverWorker>
  disposed: MutableRefObject<boolean>
}

export type RecoverWorker = (
  error: CadError,
  client?: CadWorkerClient | null,
) => void

export type RuntimeContext = {
  refs: RuntimeRefs
  dispatch: Dispatch<CadAction>
  setRawParameters: Dispatch<SetStateAction<RawParameters>>
  setFieldErrors: Dispatch<SetStateAction<FieldErrors>>
  setProgress: Dispatch<SetStateAction<CadProgress | null>>
  setOperationProgress: (operationId: string, progress: CadProgress) => void
  clearOperationProgress: (operationId: string) => void
  clearProgress: () => void
  clearTimer: (operationId: string) => void
  setOperationTimeout: (
    operationId: string,
    timeoutMs: number,
    callback: () => void,
  ) => void
  recoverWorker: RecoverWorker
}

export type ModelGenerationHandlers = {
  sendGenerate: (
    modelId: ModelId,
    parameters: ModelParameterValues,
    generation: number,
    operationId?: string,
  ) => void
  sendInvalidate: (
    generation: number,
    reason: 'invalid-input' | 'superseded',
  ) => void
  handleInputChange: (key: ModelParameterKey, value: string) => void
}
