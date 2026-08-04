import { normalizeError, type CadError } from '../../../cad-contract/errors'
import type { WorkerClientError } from '../../../features/cad/worker-client'
import type { CadState } from '../../../features/cad/state'
import {
  parseDimensionInput,
  validateModelParameters,
  type ModelId,
  type ModelParameterKey,
  type ModelParameterValues,
} from '../../../cad-contract/units'
import type { RawParameters } from './types'

export const DIMENSION_KEYS: ModelParameterKey[] = ['width', 'depth', 'height']
export const GRID_PARAMETER_KEYS: ModelParameterKey[] = ['rows', 'columns']

export function rawFromParameters(
  parameters: ModelParameterValues,
): RawParameters {
  if ('width' in parameters) {
    return {
      width: String(parameters.width),
      depth: String(parameters.depth),
      height: String(parameters.height),
    }
  }

  return {
    rows: String(parameters.rows),
    columns: String(parameters.columns),
  }
}

export function parseRawParameters(
  raw: RawParameters,
  modelId: ModelId = 'box',
):
  | { valid: true; value: ModelParameterValues }
  | { valid: false; message: string; field?: ModelParameterKey } {
  const keys = modelId === 'box' ? DIMENSION_KEYS : GRID_PARAMETER_KEYS
  const parsed: Partial<Record<ModelParameterKey, number | null>> = {}
  for (const key of keys) {
    parsed[key] = parseDimensionInput(raw[key] ?? '')
  }

  const validation = validateModelParameters(modelId, parsed)
  if (!validation.valid) {
    const issue = validation.issues[0]
    const field = issue?.field
    return {
      valid: false,
      message: issue?.message ?? '尺寸輸入無效。',
      field: field === 'parameters' ? undefined : field,
    }
  }
  return { valid: true, value: validation.value.parameters }
}

export function supportsCadBrowser():
  { supported: true } | { supported: false; message: string } {
  if (typeof window === 'undefined') {
    return { supported: false, message: '需要瀏覽器環境。' }
  }
  if (typeof WebAssembly === 'undefined') {
    return { supported: false, message: '此瀏覽器不支援 WebAssembly。' }
  }
  if (typeof Worker === 'undefined') {
    return { supported: false, message: '此瀏覽器不支援 Web Worker。' }
  }
  const canvas = document.createElement('canvas')
  const webgl =
    canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
  if (!webgl) {
    return { supported: false, message: '此瀏覽器不支援 WebGL。' }
  }
  return { supported: true }
}

export function errorForInput(message: string): CadError {
  return normalizeError(new Error(message), {
    stage: 'validation',
    code: 'INVALID_INPUT',
    userMessage: message,
    recoverable: true,
  })
}

export function errorForCapability(message: string): CadError {
  return normalizeError(new Error(message), {
    stage: 'worker',
    code: 'BROWSER_UNSUPPORTED',
    userMessage: message,
    recoverable: false,
  })
}

export function errorForWorker(error: WorkerClientError): CadError {
  return normalizeError(error.error, {
    stage: error.kind === 'protocol-error' ? 'protocol' : 'worker',
    code:
      error.kind === 'protocol-error'
        ? 'PROTOCOL_INVALID'
        : 'WORKER_TERMINATED',
    recoverable: true,
  })
}

export function statusMessage(state: CadState, progress: string): string {
  if (state.error) return state.error.userMessage
  if (progress) return progress
  switch (state.status) {
    case 'booting':
      return '準備啟動 CAD Worker…'
    case 'loading-engine':
      return '正在載入 OpenCascade WASM…'
    case 'generating':
      return '正在建立 CAD component…'
    case 'ready':
      return '模型已就緒，可以下載 STEP。'
    case 'invalid-input':
      return '請修正參數後再建模。'
    case 'recoverable-error':
      return 'CAD 操作失敗，可以修改參數或重試。'
    case 'fatal-worker-error':
      return 'CAD Worker 已停止，請重試。'
  }
}
