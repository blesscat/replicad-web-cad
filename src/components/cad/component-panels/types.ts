import type {
  ModelParameterKey,
  OpenGridParameterKey,
  OpenGridParameters,
} from '../../../cad-contract/units'
import type { RawParameters } from '../workspace/types'

export type ComponentPanelProps = {
  rawParameters: RawParameters
  fieldErrors: Partial<Record<ModelParameterKey | 'parameters', string>>
  onInputChange: (key: ModelParameterKey, value: string) => void
}

export type OpenGridComponentPanelProps = {
  parameters: OpenGridParameters
  fieldErrors: Partial<Record<OpenGridParameterKey | 'parameters', string>>
  onParametersChange: (parameters: OpenGridParameters) => void
}
