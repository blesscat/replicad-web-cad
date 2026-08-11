import type {
  ModelBounds,
  ModelId,
  ModelParameterKey,
  ModelParameterValues,
  ModelValidation,
} from '../../../cad-contract/units'
import type { OpenGridSystemContext } from '../system-entry-context'

export type ModelFamily = 'hsw' | 'opengrid' | 'other'

export type ModelFamilyMetadata = {
  key: ModelFamily
  label: string
  description: string
}

export type ModelFamilyGroup = ModelFamilyMetadata & {
  definitions: ReadonlyArray<ModelDefinition>
  subgroups?: ReadonlyArray<ModelSelectionSubgroup>
}

export type ModelSelectionSubgroup = {
  key: OpenGridSystemContext
  label: string
  definitions: ReadonlyArray<ModelDefinition>
}

export type ParameterField = {
  key: ModelParameterKey
  label: string
  axis: string
  unit: 'mm' | '°' | '格' | '支'
  control: 'text' | 'range' | 'range-text'
  defaultValue: number
  min: number
  max: number
  step: number
  sliderMin?: number
  sliderMax?: number
  sliderDirection?: 'ltr' | 'rtl'
}

export type ModelPreviewImage = {
  src: string
  alt: string
  width: number
  height: number
}

export type ModelDefinition = {
  id: ModelId
  buildKey: ModelId
  family: ModelFamily
  displayName: string
  selectionLabel?: string
  selectionDescription: string
  parameterSchema: ReadonlyArray<ParameterField>
  defaultParameters: ModelParameterValues
  previewMetadata: { centeredOnXY: boolean; baseAtZ: number }
  previewImage?: ModelPreviewImage
  validateParameters: (parameters: unknown) => ModelValidation
  boundsForParameters: (parameters: ModelParameterValues) => ModelBounds
  exportFileName: (parameters: ModelParameterValues) => string
  stlFileName: (parameters: ModelParameterValues) => string
  systemContext?: OpenGridSystemContext
}
