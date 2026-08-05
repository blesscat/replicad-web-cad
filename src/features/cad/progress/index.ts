import type { ProgressUnit } from '../../../cad-contract/messages'

export type CadProgressStage = 'loading' | 'building' | 'meshing' | 'exporting'

export type CadProgress = {
  stage: CadProgressStage
  completed?: number
  total?: number
  unit?: ProgressUnit
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
