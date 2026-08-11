import type { CadError } from '../../../cad-contract/errors'
import type { CadState } from '../../../features/cad/state'

const TOAST_STATUSES = new Set<CadState['status']>([
  'recoverable-error',
  'fatal-worker-error',
])

export function toastErrorForState(
  state: Pick<CadState, 'status' | 'error'>,
): CadError | null {
  if (!TOAST_STATUSES.has(state.status)) return null
  return state.error
}

export function errorToastKey(error: CadError | null): string | null {
  if (!error) return null
  return JSON.stringify([
    error.code,
    error.operationId ?? null,
    error.generation ?? null,
    error.modelRevision ?? null,
    error.userMessage,
  ])
}
