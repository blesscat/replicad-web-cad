import type { ModelId, ModelParameterKey } from '../../../cad-contract/units'
import { initialCadState, type CadState } from '../../../features/cad/state'
import { getModelDefinition } from '../../../features/cad/model-catalog'
import type { ComponentParameterStore } from '../../../features/cad/parameters'
import type { CadProgress } from '../../../features/cad/progress'
import type { ExportFormat } from '../../../features/cad/download'
import {
  createCadWorkerRuntime,
  type CadWorkerRuntime,
} from './createCadWorkerRuntime'
import { rawFromParameters } from './validation'
import type { FieldErrors } from './runtime/types'
import type { RawParameters } from './types'

export type CadWorkspaceControllerSnapshot = {
  state: CadState
  modelId: ModelId
  rawParameters: RawParameters
  fieldErrors: FieldErrors
  progress: CadProgress | null
  canExport: boolean
}

export type CadWorkspaceController = {
  getSnapshot: () => CadWorkspaceControllerSnapshot
  onInputChange: (key: ModelParameterKey, value: string) => void
  onExport: (format?: ExportFormat) => void
  onRetry: () => void
  dispose: () => void
}

export type CadWorkspaceControllerOptions = {
  parameterStore: ComponentParameterStore
}

function createSnapshot(
  state: CadState,
  rawParameters: RawParameters,
  fieldErrors: FieldErrors,
  progress: CadProgress | null,
): CadWorkspaceControllerSnapshot {
  const canExport =
    state.status === 'ready' && state.exportStatus === 'idle' && !state.stale

  return {
    state,
    modelId: state.modelId,
    rawParameters,
    fieldErrors,
    progress,
    canExport,
  }
}

export function createCadWorkspaceController(
  modelId: ModelId,
  onChange: (snapshot: CadWorkspaceControllerSnapshot) => void,
  options: CadWorkspaceControllerOptions,
): CadWorkspaceController {
  const definition = getModelDefinition(modelId)
  if (!definition) throw new Error(`UNKNOWN_MODEL_ID:${modelId}`)

  const initialParameters = options.parameterStore.get(modelId)
  let state = initialCadState(modelId, initialParameters)
  let rawParameters = rawFromParameters(initialParameters)
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
    setPersistedParameters: (selectedModelId, parameters) => {
      options.parameterStore.set(selectedModelId, parameters)
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
