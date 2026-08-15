import type {
  ModelParameterKey,
  OpenGridParameterKey,
  OpenGridParameters,
  ValidationIssue,
} from '../../../cad-contract/units'
import type { OpenGridSystemContext } from '../../../features/cad/system-entry-context'
import type { RawParameters } from '../workspace/types'
import type { Locale } from '../../../i18n'

export type ComponentPanelProps = {
  locale: Locale
  rawParameters: RawParameters
  fieldErrors: Partial<
    Record<ModelParameterKey | 'parameters', ValidationIssue>
  >
  onInputChange: (key: ModelParameterKey, value: string) => void
}

export type OpenGridComponentPanelProps = {
  locale: Locale
  parameters: OpenGridParameters
  systemContext?: OpenGridSystemContext
  fieldErrors: Partial<
    Record<OpenGridParameterKey | 'parameters', ValidationIssue>
  >
  onParametersChange: (parameters: OpenGridParameters) => void
  onDimensionCalculationInvalid: () => void
}
