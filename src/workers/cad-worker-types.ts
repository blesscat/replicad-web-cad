import type {
  BooleanOperationProgress,
  ProgressUnit,
  WorkerEvent,
} from '../cad-contract/messages'
import type { OpenGridBuildContext } from '../cad-kernel/components/opengrid/builder'

export type EventSink = (event: WorkerEvent, transfer?: Transferable[]) => void

export type CadWorkerBuildOptions = Pick<
  OpenGridBuildContext,
  | 'useCompoundChamferCutters'
  | 'useCompoundScrewParts'
  | 'fuseHalfCellExtensionsIntoAssembly'
  | 'balancedFuseBatchSize'
> & {
  useOpenGridCanonicalTileCache?: boolean
  useOpenGridHalfCellPrototypeCache?: boolean
}

export type SupersededReason =
  | 'STALE_GENERATION'
  | 'CANDIDATE_CAPACITY'
  | 'CANDIDATE_EXPIRED'
  | 'CANDIDATE_ORPHANED'

export type CandidateTerminal = {
  operationId: string
  requestId: string
  generation: number
  reason: SupersededReason
}

export type ProgressCommand = {
  operationId: string
  requestId: string
  generation?: number
}

export type ProgressCounters = {
  completed?: number
  total?: number
  unit?: ProgressUnit
}

export type ProgressEmitter = (
  command: ProgressCommand,
  stage: 'loading' | 'building' | 'meshing' | 'exporting',
  modelRevision?: string,
  counters?: ProgressCounters,
  booleanOperation?: BooleanOperationProgress,
) => void
