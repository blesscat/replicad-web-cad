import type { ModelParameterValues } from '../../../../cad-contract/units'
import {
  boundsForHexagonalColumn,
  hexagonalColumnFileName,
  hexagonalColumnStlFileName,
  HEXAGONAL_COLUMN_CONFIGURATION,
  isHexagonalColumnParameters,
  PROTOTYPE_CONFIGURATION,
  validateHexagonalColumnParameters,
} from '../../../../cad-contract/units'
import type { ModelDefinition, ParameterField } from '../types'

const HEXAGONAL_COLUMN_PARAMETER_SCHEMA: ReadonlyArray<ParameterField> = [
  {
    key: 'height',
    label: '整體長度',
    axis: 'X/Z',
    unit: 'mm',
    control: 'range-text',
    defaultValue: HEXAGONAL_COLUMN_CONFIGURATION.defaultHeight,
    min: HEXAGONAL_COLUMN_CONFIGURATION.minHeight,
    max: HEXAGONAL_COLUMN_CONFIGURATION.maxHeight,
    step: PROTOTYPE_CONFIGURATION.inputStep,
    sliderMin: HEXAGONAL_COLUMN_CONFIGURATION.minHeight,
    sliderMax: HEXAGONAL_COLUMN_CONFIGURATION.heightSliderMax,
  },
  {
    key: 'count',
    label: '支數',
    axis: 'Y',
    unit: '支',
    control: 'range',
    defaultValue: HEXAGONAL_COLUMN_CONFIGURATION.defaultCount,
    min: HEXAGONAL_COLUMN_CONFIGURATION.minCount,
    max: HEXAGONAL_COLUMN_CONFIGURATION.maxCount,
    step: PROTOTYPE_CONFIGURATION.inputStep,
  },
  {
    key: 'gap',
    label: '柱間隙',
    axis: 'Y',
    unit: 'mm',
    control: 'range-text',
    defaultValue: HEXAGONAL_COLUMN_CONFIGURATION.defaultGap,
    min: HEXAGONAL_COLUMN_CONFIGURATION.minGap,
    max: HEXAGONAL_COLUMN_CONFIGURATION.maxGap,
    step: PROTOTYPE_CONFIGURATION.inputStep,
    sliderMin: HEXAGONAL_COLUMN_CONFIGURATION.minGap,
    sliderMax: HEXAGONAL_COLUMN_CONFIGURATION.gapSliderMax,
  },
]

function exportHexagonalColumnFileName(
  parameters: ModelParameterValues,
): string {
  if (!isHexagonalColumnParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:hexagonal-column')
  }
  return hexagonalColumnFileName(parameters)
}

function validateHexagonalColumnDefinitionParameters(value: unknown) {
  const validation = validateHexagonalColumnParameters(value)
  if (!validation.valid) return validation
  return {
    valid: true as const,
    value: {
      modelId: 'hexagonal-column' as const,
      parameters: validation.value,
    },
  }
}

function boundsForHexagonalColumnDefinition(parameters: ModelParameterValues) {
  if (!isHexagonalColumnParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:hexagonal-column')
  }
  return boundsForHexagonalColumn(parameters)
}

export const hexagonalColumnDefinition: ModelDefinition = {
  id: 'hexagonal-column',
  buildKey: 'hexagonal-column',
  family: 'other',
  displayName: '可調六角柱',
  selectionDescription:
    '以參考六角柱截面建立固定端部倒角的直柱；長度文字輸入 1–500 mm、slider 1–200 mm，可調整支數與間隙，預設躺下排列（間隙 1 mm）。',
  parameterSchema: HEXAGONAL_COLUMN_PARAMETER_SCHEMA,
  defaultParameters: {
    height: HEXAGONAL_COLUMN_CONFIGURATION.defaultHeight,
    count: HEXAGONAL_COLUMN_CONFIGURATION.defaultCount,
    gap: HEXAGONAL_COLUMN_CONFIGURATION.defaultGap,
    orientation: HEXAGONAL_COLUMN_CONFIGURATION.defaultOrientation,
  },
  previewMetadata: { centeredOnXY: true, baseAtZ: 0 },
  validateParameters: validateHexagonalColumnDefinitionParameters,
  boundsForParameters: boundsForHexagonalColumnDefinition,
  exportFileName: exportHexagonalColumnFileName,
  stlFileName: (parameters) => {
    if (!isHexagonalColumnParameters(parameters)) {
      throw new Error('MODEL_PARAMETERS_MISMATCH:hexagonal-column')
    }
    return hexagonalColumnStlFileName(parameters)
  },
}
