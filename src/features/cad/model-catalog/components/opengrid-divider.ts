import type { ModelParameterValues } from '../../../../cad-contract/units'
import {
  boundsForOpenGridDivider,
  isOpenGridDividerParameters,
  openGridDividerFileName,
  openGridDividerStlFileName,
  OPENGRID_DIVIDER_CONFIGURATION,
  validateOpenGridDividerParameters,
} from '../../../../cad-contract/units'
import type { ModelDefinition, ParameterField } from '../types'

const OPENGRID_DIVIDER_PARAMETER_SCHEMA: ReadonlyArray<ParameterField> = [
  {
    key: 'left',
    label: '左臂',
    axis: 'X',
    unit: '格',
    control: 'range',
    defaultValue: OPENGRID_DIVIDER_CONFIGURATION.defaultParameters.left,
    min: 0,
    max: OPENGRID_DIVIDER_CONFIGURATION.maxArmCount,
    step: OPENGRID_DIVIDER_CONFIGURATION.gridStep,
  },
  {
    key: 'right',
    label: '右臂',
    axis: 'X',
    unit: '格',
    control: 'range',
    defaultValue: OPENGRID_DIVIDER_CONFIGURATION.defaultParameters.right,
    min: 0,
    max: OPENGRID_DIVIDER_CONFIGURATION.maxArmCount,
    step: OPENGRID_DIVIDER_CONFIGURATION.gridStep,
  },
  {
    key: 'up',
    label: '上臂',
    axis: 'Y',
    unit: '格',
    control: 'range',
    defaultValue: OPENGRID_DIVIDER_CONFIGURATION.defaultParameters.up,
    min: 0,
    max: OPENGRID_DIVIDER_CONFIGURATION.maxArmCount,
    step: OPENGRID_DIVIDER_CONFIGURATION.gridStep,
  },
  {
    key: 'down',
    label: '下臂',
    axis: 'Y',
    unit: '格',
    control: 'range',
    defaultValue: OPENGRID_DIVIDER_CONFIGURATION.defaultParameters.down,
    min: 0,
    max: OPENGRID_DIVIDER_CONFIGURATION.maxArmCount,
    step: OPENGRID_DIVIDER_CONFIGURATION.gridStep,
  },
  {
    key: 'height',
    label: '分隔牆高度',
    axis: 'Z',
    unit: 'mm',
    control: 'range-text',
    defaultValue: OPENGRID_DIVIDER_CONFIGURATION.defaultParameters.height,
    min: OPENGRID_DIVIDER_CONFIGURATION.minHeight,
    max: OPENGRID_DIVIDER_CONFIGURATION.maxHeight,
    step: 1,
    sliderMin: OPENGRID_DIVIDER_CONFIGURATION.minHeight,
    sliderMax: OPENGRID_DIVIDER_CONFIGURATION.maxHeight,
  },
  {
    key: 'wallThickness',
    label: '上方牆厚',
    axis: 'Z',
    unit: 'mm',
    control: 'range-text',
    defaultValue:
      OPENGRID_DIVIDER_CONFIGURATION.defaultParameters.wallThickness,
    min: OPENGRID_DIVIDER_CONFIGURATION.minWallThickness,
    max: OPENGRID_DIVIDER_CONFIGURATION.maxWallThickness,
    step: 1,
    sliderMin: OPENGRID_DIVIDER_CONFIGURATION.minWallThickness,
    sliderMax: OPENGRID_DIVIDER_CONFIGURATION.maxWallThickness,
  },
]

function validateDefinitionParameters(value: unknown) {
  const validation = validateOpenGridDividerParameters(value)
  if (!validation.valid) return validation
  return {
    valid: true as const,
    value: {
      modelId: 'opengrid-divider' as const,
      parameters: validation.value,
    },
  }
}

function boundsForDefinition(parameters: ModelParameterValues) {
  if (!isOpenGridDividerParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-divider')
  }
  return boundsForOpenGridDivider(parameters)
}

function exportFileName(parameters: ModelParameterValues): string {
  if (!isOpenGridDividerParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-divider')
  }
  return openGridDividerFileName(parameters)
}

function exportStlFileName(parameters: ModelParameterValues): string {
  if (!isOpenGridDividerParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-divider')
  }
  return openGridDividerStlFileName(parameters)
}

export const opengridDividerDefinition: ModelDefinition = {
  id: 'opengrid-divider',
  buildKey: 'opengrid-divider',
  family: 'opengrid',
  displayName: 'OpenGrid 分隔塊',
  selectionDescription:
    '適用於自製 14 mm 整格（7 mm 半格）底座的分隔牆產生器，可用 0.5 格步進設定上下左右格數、可調 1–5 mm 上方牆厚（預設 2 mm）與高度；底部保留 5 mm 支撐並以名義 45° 斜角過渡，保留穩定側邊圓角與 1 mm 頂部圓角，另自動加入 Ø5 × 3 mm、28 mm 中心距定位柱。',
  parameterSchema: OPENGRID_DIVIDER_PARAMETER_SCHEMA,
  defaultParameters: { ...OPENGRID_DIVIDER_CONFIGURATION.defaultParameters },
  previewMetadata: { centeredOnXY: true, baseAtZ: 0 },
  validateParameters: validateDefinitionParameters,
  boundsForParameters: boundsForDefinition,
  exportFileName,
  stlFileName: exportStlFileName,
}
