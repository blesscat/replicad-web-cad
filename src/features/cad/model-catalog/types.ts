import type {
  ModelBounds,
  ModelId,
  ModelParameterKey,
  ModelParameterValues,
  ModelValidation,
} from '../../../cad-contract/units'

export type ModelFamily = 'hsw' | 'opengrid' | 'other'

export type ModelFamilyMetadata = {
  key: ModelFamily
  label: string
  description: string
}

export type ModelFamilyGroup = ModelFamilyMetadata & {
  definitions: ReadonlyArray<ModelDefinition>
}

export type ParameterField = {
  key: ModelParameterKey
  label: string
  axis: string
  unit: 'mm' | '格' | '支'
  control: 'text' | 'range' | 'range-text'
  defaultValue: number
  min: number
  max: number
  step: number
  sliderMin?: number
  sliderMax?: number
}

export type ModelDefinition = {
  id: ModelId
  buildKey: ModelId
  family: ModelFamily
  displayName: string
  selectionDescription: string
  parameterSchema: ReadonlyArray<ParameterField>
  defaultParameters: ModelParameterValues
  previewMetadata: { centeredOnXY: boolean; baseAtZ: number }
  validateParameters: (parameters: unknown) => ModelValidation
  boundsForParameters: (parameters: ModelParameterValues) => ModelBounds
  exportFileName: (parameters: ModelParameterValues) => string
  stlFileName: (parameters: ModelParameterValues) => string
}
