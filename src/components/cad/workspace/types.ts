import type {
  ModelId,
  ModelParameterKey,
  ModelParameterValues,
  ScalarModelParameterKey,
} from '../../../cad-contract/units'
import type { ExportFormat } from '../../../features/cad/download'

export type RawParameters = Partial<Record<ScalarModelParameterKey, string>>

export type OperationRecord = {
  kind: 'model' | 'export' | 'init'
  generation?: number
  modelId?: ModelId
  parameters?: ModelParameterValues
  modelRevision?: string
  requestId: string
}

export type ExportRequest = {
  operationId: string
  format: ExportFormat
  revision: string
  workerEpoch: string
  fileName: string
  downloaded: boolean
}
