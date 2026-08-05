import type { ModelId, ModelParameterKey } from '../../../cad-contract/units'
import { initialCadState, type CadState } from '../../../features/cad/state'
import { getModelDefinition } from '../../../features/cad/model-catalog'
import {
  progressMessage,
  type CadProgress,
} from '../../../features/cad/progress'
import type { ExportFormat } from '../../../features/cad/download'
import {
  createCadWorkerRuntime,
  type CadWorkerRuntime,
} from './createCadWorkerRuntime'
import { rawFromParameters, statusMessage } from './validation'
import type { FieldErrors } from './runtime/types'
import type { RawParameters } from './types'

export type CadWorkspaceControllerSnapshot = {
  state: CadState
  modelId: ModelId
  rawParameters: RawParameters
  fieldErrors: FieldErrors
  progress: CadProgress | null
  status: string
  canExport: boolean
}

export type CadWorkspaceController = {
  getSnapshot: () => CadWorkspaceControllerSnapshot
  onInputChange: (key: ModelParameterKey, value: string) => void
  onExport: (format?: ExportFormat) => void
  onRetry: () => void
  dispose: () => void
}

function createSnapshot(
  state: CadState,
  rawParameters: RawParameters,
  fieldErrors: FieldErrors,
  progress: CadProgress | null,
): CadWorkspaceControllerSnapshot {
  const status = statusMessage(
    state,
    progress ? progressMessage(progress.stage) : '',
  )
  const canExport =
    state.status === 'ready' && state.exportStatus === 'idle' && !state.stale

  return {
    state,
    modelId: state.modelId,
    rawParameters,
    fieldErrors,
    progress,
    status,
    canExport,
  }
}

export function createCadWorkspaceController(
  modelId: ModelId,
  onChange: (snapshot: CadWorkspaceControllerSnapshot) => void,
): CadWorkspaceController {
  const definition = getModelDefinition(modelId)
  if (!definition) throw new Error(`UNKNOWN_MODEL_ID:${modelId}`)

  let state = initialCadState(modelId, definition.defaultParameters)
  let rawParameters = rawFromParameters(definition.defaultParameters)
  let fieldErrors: FieldErrors = {}
  let progress: CadProgress | null = null

  const emit = () => {
    onChange(createSnapshot(state, rawParameters, fieldErrors, progress))
  }

  const runtime: CadWorkerRuntime = createCadWorkerRuntime({
    initialState: state,
    initialRawParameters: rawParameters,
    setState: (nextState) => {
      state = nextState
      emit()
    },
    setRawParameters: (nextParameters) => {
      rawParameters = nextParameters
      emit()
    },
    setFieldErrors: (nextErrors) => {
      fieldErrors = nextErrors
      emit()
    },
    setProgress: (nextProgress) => {
      progress = nextProgress
      emit()
    },
  })

  emit()

  return {
    getSnapshot: () =>
      createSnapshot(state, rawParameters, fieldErrors, progress),
    onInputChange: runtime.handleInputChange,
    onExport: runtime.handleExport,
    onRetry: runtime.handleRetry,
    dispose: runtime.dispose,
  }
}
