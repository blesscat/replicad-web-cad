import type { ModelParameterKey } from '../../../cad-contract/units'
import type { RawParameters } from '../workspace/types'

export type ComponentPanelProps = {
  rawParameters: RawParameters
  fieldErrors: Partial<Record<ModelParameterKey, string>>
  onInputChange: (key: ModelParameterKey, value: string) => void
}
