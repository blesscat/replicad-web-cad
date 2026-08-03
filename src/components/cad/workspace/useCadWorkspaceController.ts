import { useReducer, useState } from 'react'
import type { DimensionKey } from '../../../cad-contract/units'
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
  rawParameters: RawParameters
  fieldErrors: Partial<Record<DimensionKey, string>>
  status: string
  canExport: boolean
  onInputChange: (key: DimensionKey, value: string) => void
  onExport: () => void
  onRetry: () => void
}

export function useCadWorkspaceController(): CadWorkspaceController {
  const [state, dispatch] = useReducer(cadReducer, undefined, initialCadState)
  const [rawParameters, setRawParameters] = useState<RawParameters>(
    rawFromParameters(INITIAL_PARAMETERS),
  )
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<DimensionKey, string>>
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
    rawParameters,
    fieldErrors,
    status,
    canExport,
    onInputChange: handleInputChange,
    onExport: handleExport,
    onRetry: handleRetry,
  }
}
