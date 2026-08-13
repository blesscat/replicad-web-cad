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
    defaultValue: PILLAR_CONFIGURATION.positioningDefaultLength,
    min: PILLAR_CONFIGURATION.positioningMinLength,
    max: PILLAR_CONFIGURATION.positioningMaxLength,
    step: 1,
    sliderMin: PILLAR_CONFIGURATION.positioningMinLength,
    sliderMax: PILLAR_CONFIGURATION.positioningLengthSliderMax,
  },
  {
    key: 'offset',
    label: 'XY 偏移',
    axis: 'XY',
    unit: 'mm',
    control: 'range-text',
    defaultValue: 0,
    min: PILLAR_CONFIGURATION.offsetMin,
    max: PILLAR_CONFIGURATION.offsetMax,
    step: PILLAR_CONFIGURATION.offsetStep,
    sliderMin: PILLAR_CONFIGURATION.offsetMin,
    sliderMax: PILLAR_CONFIGURATION.offsetMax,
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
  displayName: 'Locating Post (定位柱)',
  selectionLabel: 'Locating Post (定位柱)',
  selectionDescription:
    'Locating Post：堆疊版 9 mm（Ø5 mm）、薄殼版 6 mm（Ø5 mm），以及物件定位用的 Ø5 mm 兩端 chamfer 自訂長度版；XY 共用偏移 -0.5～0.5 mm，步進 0.05 mm。',
  parameterSchema: PILLAR_PARAMETER_SCHEMA,
  defaultParameters: { ...PILLAR_CONFIGURATION.defaultParameters },
  previewMetadata: { centeredOnXY: true, baseAtZ: 0 },
  previewImage: {
    src: '/model-previews/opengrid-pillar.png',
    alt: 'Locating Post (定位柱) 預覽',
    width: 640,
    height: 400,
  },
  validateParameters: validatePillarDefinitionParameters,
  boundsForParameters: boundsForPillarDefinition,
  exportFileName: exportPillarFileName,
  stlFileName: exportPillarStlFileName,
}
