import type {
  ModelBounds,
  ModelId,
  ModelParameterKey,
  ModelParameterValues,
  ModelValidation,
} from '../../../cad-contract/units'

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
  displayName: string
  selectionDescription: string
  parameterSchema: ReadonlyArray<ParameterField>
  defaultParameters: ModelParameterValues
  previewMetadata: { centeredOnXY: true; baseAtZ: 0 }
  validateParameters: (parameters: unknown) => ModelValidation
  boundsForParameters: (parameters: ModelParameterValues) => ModelBounds
  exportFileName: (parameters: ModelParameterValues) => string
  stlFileName: (parameters: ModelParameterValues) => string
}
