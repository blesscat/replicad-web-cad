import { useReducer, useState } from 'react'
import type { ModelId, ModelParameterKey } from '../../../cad-contract/units'
import {
  cadReducer,
  initialCadState,
  type CadState,
} from '../../../features/cad/state'
import { getModelDefinition } from '../../../features/cad/model-catalog'
import { useCadWorkerRuntime } from './useCadWorkerRuntime'
import { rawFromParameters, statusMessage } from './validation'
import type { RawParameters } from './types'

export type CadWorkspaceController = {
  state: CadState
  modelId: ModelId
  rawParameters: RawParameters
  fieldErrors: Partial<Record<ModelParameterKey, string>>
  status: string
  canExport: boolean
  onInputChange: (key: ModelParameterKey, value: string) => void
  onExport: () => void
  onRetry: () => void
}

export function useCadWorkspaceController(
  modelId: ModelId,
): CadWorkspaceController {
  const definition = getModelDefinition(modelId)
  if (!definition) throw new Error(`UNKNOWN_MODEL_ID:${modelId}`)

  const [state, dispatch] = useReducer(cadReducer, undefined, () =>
    initialCadState(modelId, definition.defaultParameters),
  )
  const [rawParameters, setRawParameters] = useState<RawParameters>(() =>
    rawFromParameters(definition.defaultParameters),
  )
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<ModelParameterKey, string>>
  >({})
  const [progress, setProgress] = useState('')
  const { handleInputChange, handleExport, handleRetry } = useCadWorkerRuntime({
    state,
    rawParameters,
    dispatch,
    setRawParameters,
    setFieldErrors,
    setProgress,
  })
  const status = statusMessage(state, progress)
  const canExport =
    state.status === 'ready' && state.exportStatus === 'idle' && !state.stale

  return {
    state,
    modelId: state.modelId,
    rawParameters,
    fieldErrors,
    status,
    canExport,
    onInputChange: handleInputChange,
    onExport: handleExport,
    onRetry: handleRetry,
  }
}
