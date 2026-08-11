import type {
  BooleanOperationKind,
  BooleanOperationProgress,
  ProgressUnit,
} from '../../../cad-contract/messages'

export type CadProgressStage = 'loading' | 'building' | 'meshing' | 'exporting'

export type CadProgress = {
  stage: CadProgressStage
  operationId?: string
  completed?: number
  total?: number
  unit?: ProgressUnit
  booleanOperation?: BooleanOperationProgress
}

export type CadProgressDetails = {
  stage: CadProgressStage
  label: string
  message: string
  step: number
  totalSteps: number
}

export const CAD_PROGRESS_STAGES: ReadonlyArray<CadProgressStage> = [
  'loading',
  'building',
  'meshing',
  'exporting',
]

const PROGRESS_DEFINITIONS: Record<
  CadProgressStage,
  Pick<CadProgressDetails, 'label' | 'message'>
> = {
  loading: {
    label: '載入 CAD engine',
    message: '正在載入 CAD engine…',
  },
  building: {
    label: '建立 B-Rep',
    message: '正在建立 B-Rep…',
  },
  meshing: {
    label: '產生預覽 mesh',
    message: '正在產生預覽 mesh…',
  },
  exporting: {
    label: '匯出 STEP',
    message: '正在匯出 STEP…',
  },
}

const PROGRESS_UNIT_LABELS: Record<ProgressUnit, string> = {
  cells: '格',
  batches: '批次',
  steps: '步驟',
  columns: '支',
}

const BOOLEAN_OPERATION_LABELS: Record<BooleanOperationKind, string> = {
  fuse: '合併（Fuse）',
  cut: '切除（Cut）',
  intersect: '交集（Intersect）',
}

export function progressDetails(stage: CadProgressStage): CadProgressDetails {
  return {
    stage,
    ...PROGRESS_DEFINITIONS[stage],
    step: CAD_PROGRESS_STAGES.indexOf(stage) + 1,
    totalSteps: CAD_PROGRESS_STAGES.length,
  }
}

export function progressMessage(stage: CadProgressStage): string {
  return progressDetails(stage).message
}

export function progressCountLabel(progress: CadProgress): string | null {
  if (
    progress.completed === undefined ||
    progress.total === undefined ||
    progress.unit === undefined
  )
    return null
  return `${progress.completed} / ${progress.total} ${PROGRESS_UNIT_LABELS[progress.unit]}`
}

export function booleanProgressRemaining(progress: CadProgress): number | null {
  const operation = progress.booleanOperation
  if (
    !operation ||
    operation.completed === undefined ||
    operation.total === undefined
  )
    return null
  return Math.max(0, operation.total - operation.completed)
}

export function booleanProgressLabel(progress: CadProgress): string | null {
  const operation = progress.booleanOperation
  if (!operation) return null

  const label = BOOLEAN_OPERATION_LABELS[operation.kind]
  if (operation.completed !== undefined && operation.total !== undefined) {
    const remaining = booleanProgressRemaining(progress)
    if (remaining === null)
      return `${label} ${operation.completed} / ${operation.total}`
    return `${label} ${operation.completed} / ${operation.total} · 剩餘 ${remaining}`
  }
  return `${label}進行中`
}

export function formatProgressElapsed(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function buildingProgressElapsedMs(
  stage: CadProgressStage,
  startedAt: number | null,
  now: number,
): number | null {
  if (stage !== 'building' || startedAt === null) return null
  return Math.max(0, now - startedAt)
}
