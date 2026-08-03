import type { BoxParameters, DimensionKey } from '../../../cad-contract/units'
import {
  boxFileName,
  PROTOTYPE_CONFIGURATION,
} from '../../../cad-contract/units'

export type ModelDefinition = {
  id: 'box'
  buildKey: 'box'
  displayName: string
  parameterSchema: ReadonlyArray<{
    key: DimensionKey
    label: string
    axis: string
    unit: 'mm'
    defaultValue: number
    min: number
    max: number
    step: number
  }>
  previewMetadata: { centeredOnXY: true; baseAtZ: 0 }
  exportFileName: (parameters: BoxParameters) => string
}

export const boxDefinition: ModelDefinition = {
  id: 'box',
  buildKey: 'box',
  displayName: '方塊',
  parameterSchema: [
    {
      key: 'width',
      label: '寬度',
      axis: 'X',
      unit: 'mm',
      defaultValue: PROTOTYPE_CONFIGURATION.defaultDimensions.width,
      min: PROTOTYPE_CONFIGURATION.minDimension,
      max: PROTOTYPE_CONFIGURATION.maxDimension,
      step: PROTOTYPE_CONFIGURATION.inputStep,
    },
    {
      key: 'depth',
      label: '深度',
      axis: 'Y',
      unit: 'mm',
      defaultValue: PROTOTYPE_CONFIGURATION.defaultDimensions.depth,
      min: PROTOTYPE_CONFIGURATION.minDimension,
      max: PROTOTYPE_CONFIGURATION.maxDimension,
      step: PROTOTYPE_CONFIGURATION.inputStep,
    },
    {
      key: 'height',
      label: '高度',
      axis: 'Z',
      unit: 'mm',
      defaultValue: PROTOTYPE_CONFIGURATION.defaultDimensions.height,
      min: PROTOTYPE_CONFIGURATION.minDimension,
      max: PROTOTYPE_CONFIGURATION.maxDimension,
      step: PROTOTYPE_CONFIGURATION.inputStep,
    },
  ],
  previewMetadata: { centeredOnXY: true, baseAtZ: 0 },
  exportFileName: boxFileName,
}
