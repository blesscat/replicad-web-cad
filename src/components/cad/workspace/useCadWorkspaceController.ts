import { useReducer, useState } from 'react'
import type { ModelId, ModelParameterKey } from '../../../cad-contract/units'
import {
  cadReducer,
  initialCadState,
  INITIAL_PARAMETERS,
  type CadState,
} from '../../../features/cad/state'
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
  onModelChange: (modelId: ModelId) => void
  onInputChange: (key: ModelParameterKey, value: string) => void
  onExport: () => void
  onRetry: () => void
}

export function useCadWorkspaceController(): CadWorkspaceController {
  const [state, dispatch] = useReducer(cadReducer, undefined, initialCadState)
  const [rawParameters, setRawParameters] = useState<RawParameters>(
    rawFromParameters(INITIAL_PARAMETERS),
  )
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<ModelParameterKey, string>>
  >({})
  const [progress, setProgress] = useState('')
  const { handleModelChange, handleInputChange, handleExport, handleRetry } =
    useCadWorkerRuntime({
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
    onModelChange: handleModelChange,
    onInputChange: handleInputChange,
    onExport: handleExport,
    onRetry: handleRetry,
  }
}
