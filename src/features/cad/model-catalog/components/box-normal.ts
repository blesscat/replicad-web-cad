import type { ModelParameterValues } from '../../../../cad-contract/units'
import {
  boundsForBoxNormal,
  boxNormalFileName,
  boxNormalStlFileName,
  BOX_NORMAL_CONFIGURATION,
  isBoxNormalParameters,
  validateBoxNormalParameters,
} from '../../../../cad-contract/units'
import type { ModelDefinition, ParameterField } from '../types'

const BOX_NORMAL_PARAMETER_SCHEMA: ReadonlyArray<ParameterField> = [
  {
    key: 'x',
    label: 'X 格數',
    axis: 'X',
    unit: '格',
    control: 'range',
    defaultValue: BOX_NORMAL_CONFIGURATION.defaultX,
    min: BOX_NORMAL_CONFIGURATION.minX,
    max: BOX_NORMAL_CONFIGURATION.maxX,
    step: 1,
  },
  {
    key: 'y',
    label: 'Y 格數',
    axis: 'Y',
    unit: '格',
    control: 'range',
    defaultValue: BOX_NORMAL_CONFIGURATION.defaultY,
    min: BOX_NORMAL_CONFIGURATION.minY,
    max: BOX_NORMAL_CONFIGURATION.maxY,
    step: 1,
  },
  {
    key: 'height',
    label: '盒體高度',
    axis: 'Z',
    unit: 'mm',
    control: 'range-text',
    defaultValue: BOX_NORMAL_CONFIGURATION.defaultHeight,
    min: BOX_NORMAL_CONFIGURATION.minHeight,
    max: BOX_NORMAL_CONFIGURATION.maxHeight,
    step: 1,
    sliderMin: BOX_NORMAL_CONFIGURATION.minHeight,
    sliderMax: BOX_NORMAL_CONFIGURATION.heightSliderMax,
  },
]

function exportBoxNormalFileName(parameters: ModelParameterValues): string {
  if (!isBoxNormalParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:box-normal')
  }
  return boxNormalFileName(parameters)
}

function validateBoxNormalDefinitionParameters(value: unknown) {
  const validation = validateBoxNormalParameters(value)
  if (!validation.valid) return validation
  return {
    valid: true as const,
    value: {
      modelId: 'box-normal' as const,
      parameters: validation.value,
    },
  }
}

function boundsForBoxNormalDefinition(parameters: ModelParameterValues) {
  if (!isBoxNormalParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:box-normal')
  }
  return boundsForBoxNormal(parameters)
}

export const boxNormalDefinition: ModelDefinition = {
  id: 'box-normal',
  buildKey: 'box-normal',
  displayName: '標準開口盒',
  selectionDescription:
    '依 X/Y 網格格數建立開口盒，總 footprint 各內縮 0.15 mm，可選擇四角 7 mm 六角定位柱。',
  parameterSchema: BOX_NORMAL_PARAMETER_SCHEMA,
  defaultParameters: {
    x: BOX_NORMAL_CONFIGURATION.defaultX,
    y: BOX_NORMAL_CONFIGURATION.defaultY,
    height: BOX_NORMAL_CONFIGURATION.defaultHeight,
    cornerPosts: true,
  },
  previewMetadata: { centeredOnXY: true, baseAtZ: 0 },
  validateParameters: validateBoxNormalDefinitionParameters,
  boundsForParameters: boundsForBoxNormalDefinition,
  exportFileName: exportBoxNormalFileName,
  stlFileName: (parameters) => {
    if (!isBoxNormalParameters(parameters)) {
      throw new Error('MODEL_PARAMETERS_MISMATCH:box-normal')
    }
    return boxNormalStlFileName(parameters)
  },
}
