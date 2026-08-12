import type {
  ModelParameterKey,
  OpenGridParameterKey,
  OpenGridParameters,
} from '../../../cad-contract/units'
import type { OpenGridSystemContext } from '../../../features/cad/system-entry-context'
import type { RawParameters } from '../workspace/types'

export type ComponentPanelProps = {
  rawParameters: RawParameters
  fieldErrors: Partial<Record<ModelParameterKey | 'parameters', string>>
  onInputChange: (key: ModelParameterKey, value: string) => void
}

export type OpenGridComponentPanelProps = {
  parameters: OpenGridParameters
  systemContext?: OpenGridSystemContext
  fieldErrors: Partial<Record<OpenGridParameterKey | 'parameters', string>>
  onParametersChange: (parameters: OpenGridParameters) => void
  onDimensionCalculationInvalid: () => void
}
