import type { ModelParameterValues } from '../../../../cad-contract/units'
import {
  boundsForPillar,
  isPillarParameters,
  pillarFileName,
  pillarStlFileName,
  PILLAR_CONFIGURATION,
  validatePillarParameters,
} from '../../../../cad-contract/units'
import type { ModelDefinition, ParameterField } from '../types'

const PILLAR_PARAMETER_SCHEMA: ReadonlyArray<ParameterField> = [
  {
    key: 'length',
    label: '總長度',
    axis: 'Z',
    unit: 'mm',
    control: 'range-text',
    defaultValue: PILLAR_CONFIGURATION.defaultLength,
    min: PILLAR_CONFIGURATION.minLength,
    max: PILLAR_CONFIGURATION.maxLength,
    step: 1,
    sliderMin: PILLAR_CONFIGURATION.minLength,
    sliderMax: PILLAR_CONFIGURATION.lengthSliderMax,
  },
]

function validatePillarDefinitionParameters(value: unknown) {
  const validation = validatePillarParameters(value)
  if (!validation.valid) {
    return {
      valid: false as const,
      issues: validation.issues,
    }
  }
  return {
    valid: true as const,
    value: {
      modelId: 'opengrid-pillar' as const,
      parameters: validation.value,
    },
  }
}

function boundsForPillarDefinition(parameters: ModelParameterValues) {
  if (!isPillarParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-pillar')
  }
  return boundsForPillar(parameters)
}

function exportPillarFileName(parameters: ModelParameterValues): string {
  if (!isPillarParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-pillar')
  }
  return pillarFileName(parameters)
}

function exportPillarStlFileName(parameters: ModelParameterValues): string {
  if (!isPillarParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-pillar')
  }
  return pillarStlFileName(parameters)
}

export const opengridPillarDefinition: ModelDefinition = {
  id: 'opengrid-pillar',
  buildKey: 'opengrid-pillar',
  family: 'opengrid',
  displayName: 'OpenGrid 圓柱支柱',
  selectionLabel: '圓柱支柱',
  selectionDescription: `OpenGrid 用 Ø5 mm 圓柱支柱；總長度文字輸入 ${PILLAR_CONFIGURATION.minLength}–${PILLAR_CONFIGURATION.maxLength} mm、slider ${PILLAR_CONFIGURATION.minLength}–${PILLAR_CONFIGURATION.lengthSliderMax} mm，上端固定 ${PILLAR_CONFIGURATION.upperChamfer} mm chamfer，可選擇 Ø7 × 0.8 mm 的連接底版凸台。`,
  parameterSchema: PILLAR_PARAMETER_SCHEMA,
  defaultParameters: { ...PILLAR_CONFIGURATION.defaultParameters },
  previewMetadata: { centeredOnXY: true, baseAtZ: 0 },
  validateParameters: validatePillarDefinitionParameters,
  boundsForParameters: boundsForPillarDefinition,
  exportFileName: exportPillarFileName,
  stlFileName: exportPillarStlFileName,
}
