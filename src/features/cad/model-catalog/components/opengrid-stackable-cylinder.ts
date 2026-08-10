import type { ModelParameterValues } from '../../../../cad-contract/units'
import {
  boundsForOpenGridStackableCylinder,
  isOpenGridStackableCylinderParameters,
  openGridStackableCylinderFileName,
  openGridStackableCylinderStlFileName,
  OPENGRID_STACKABLE_CYLINDER_CONFIGURATION,
  OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
  validateOpenGridStackableCylinderParameters,
} from '../../../../cad-contract/units'
import type { ModelDefinition, ParameterField } from '../types'

const OPENGRID_STACKABLE_CYLINDER_PARAMETER_SCHEMA: ReadonlyArray<ParameterField> =
  [
    {
      key: 'diameter',
      label: '外徑',
      axis: '直徑',
      unit: 'mm',
      control: 'range-text',
      defaultValue: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultDiameter,
      min: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.minDiameter,
      max: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.maxDiameter,
      step: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.inputStep,
      sliderMin: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.minDiameter,
      sliderMax: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.maxDiameter,
    },
    {
      key: 'height',
      label: '高度',
      axis: 'Z',
      unit: 'mm',
      control: 'range-text',
      defaultValue: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultHeight,
      min: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.minHeight,
      max: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.maxHeight,
      step: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.inputStep,
      sliderMin: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.minHeight,
      sliderMax: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.maxHeight,
    },
  ]

function validateDefinitionParameters(value: unknown) {
  const validation = validateOpenGridStackableCylinderParameters(value)
  if (!validation.valid) return validation
  return {
    valid: true as const,
    value: {
      modelId: 'opengrid-stackable-cylinder' as const,
      parameters: validation.value,
    },
  }
}

function boundsForDefinition(parameters: ModelParameterValues) {
  if (!isOpenGridStackableCylinderParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-stackable-cylinder')
  }
  return boundsForOpenGridStackableCylinder(parameters)
}

function exportFileName(parameters: ModelParameterValues): string {
  if (!isOpenGridStackableCylinderParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-stackable-cylinder')
  }
  return openGridStackableCylinderFileName(parameters)
}

function exportStlFileName(parameters: ModelParameterValues): string {
  if (!isOpenGridStackableCylinderParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-stackable-cylinder')
  }
  return openGridStackableCylinderStlFileName(parameters)
}

export const opengridStackableCylinderDefinition: ModelDefinition = {
  id: 'opengrid-stackable-cylinder',
  buildKey: 'opengrid-stackable-cylinder',
  family: 'opengrid',
  displayName: 'OpenGrid 可堆疊圓柱',
  selectionDescription:
    '預設為 2 mm 壁厚、5 mm 底厚並保留內側 0.6 mm 圓角的開口圓柱；可切換原本的薄底模式（3 mm 平面、內側平行 45° 斜面），或底板模式（3 mm 底板、預設式內壁圓角、無內側斜坡，切除紅線以下腳端，外側 45° 後直接平底）。底部孔洞可一次全部開關：預設為 Ø5.05 mm × 4 mm 接 Ø7.05 mm × 1 mm，薄底與底板模式為 2 mm + 1 mm；並依 14 mm 間距只在 X/Y 最外圈產生最多四個孔，底板模式沿用預設模式的孔位安全計算，孔外緣離外壁至少 2 mm。三種模式都保留相同外徑堆疊、0.2 mm 徑向間隙、上緣內側 2 mm/45° 導角。',
  parameterSchema: OPENGRID_STACKABLE_CYLINDER_PARAMETER_SCHEMA,
  defaultParameters: { ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS },
  previewMetadata: { centeredOnXY: true, baseAtZ: 0 },
  validateParameters: validateDefinitionParameters,
  boundsForParameters: boundsForDefinition,
  exportFileName,
  stlFileName: exportStlFileName,
}
