import type {
  BooleanOperationKind,
  BooleanOperationProgress,
} from '../cad-contract/messages'

export type BooleanOperationProgressSink = (
  progress: BooleanOperationProgress,
) => void

export type BooleanOperationTimingSink = (
  kind: BooleanOperationKind,
  durationMs: number,
) => void

export type BooleanOperationScope = {
  measure: <T>(kind: BooleanOperationKind, operation: () => T) => T
}

export type BooleanOperationReporter = {
  createScope: (total?: number) => BooleanOperationScope
}

type Clock = () => number

function defaultClock(): number {
  return performance.now()
}

function validTotal(total: number | undefined): number | undefined {
  if (total === undefined) return undefined
  if (!Number.isSafeInteger(total) || total <= 0) return undefined
  return total
}

function createProgress(
  kind: BooleanOperationKind,
  state: BooleanOperationProgress['state'],
  elapsedMs: number,
  completed: number | undefined,
  total: number | undefined,
): BooleanOperationProgress {
  const progress: BooleanOperationProgress = {
    kind,
    state,
    elapsedMs: Math.max(0, elapsedMs),
  }
  if (completed !== undefined && total !== undefined) {
    progress.completed = completed
    progress.total = total
  }
  return progress
}

export function measureBoolean<T>(
  reporter: BooleanOperationReporter | undefined,
  kind: BooleanOperationKind,
  operation: () => T,
): T {
  if (!reporter) return operation()
  return reporter.createScope().measure(kind, operation)
}

export function measureBooleanInScope<T>(
  scope: BooleanOperationScope | undefined,
  kind: BooleanOperationKind,
  operation: () => T,
): T {
  if (!scope) return operation()
  return scope.measure(kind, operation)
}

export function createBooleanOperationReporter(
  reportProgress?: BooleanOperationProgressSink,
  reportTiming?: BooleanOperationTimingSink,
  now: Clock = defaultClock,
): BooleanOperationReporter {
  return {
    createScope(total) {
      const normalizedTotal = validTotal(total)
      let completed = 0

      return {
        measure(kind, operation) {
          const startedAt = now()
          reportProgress?.(
            createProgress(
              kind,
              'running',
              0,
              normalizedTotal === undefined ? undefined : completed,
              normalizedTotal,
            ),
          )

          try {
            const result = operation()
            const durationMs = Math.max(0, now() - startedAt)
            completed += 1
            reportProgress?.(
              createProgress(
                kind,
                'completed',
                durationMs,
                normalizedTotal === undefined ? undefined : completed,
                normalizedTotal,
              ),
            )
            reportTiming?.(kind, durationMs)
            return result
          } catch (error) {
            reportTiming?.(kind, Math.max(0, now() - startedAt))
            throw error
          }
        },
      }
    },
  }
}
