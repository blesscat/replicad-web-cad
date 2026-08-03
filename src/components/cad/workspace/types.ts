import type { BoxParameters, DimensionKey } from '../../../cad-contract/units'

export type RawParameters = Record<DimensionKey, string>

export type OperationRecord = {
  kind: 'model' | 'export' | 'init'
  generation?: number
  parameters?: BoxParameters
  modelRevision?: string
  requestId: string
}

export type ExportRequest = {
  operationId: string
  revision: string
  workerEpoch: string
  fileName: string
  downloaded: boolean
}
