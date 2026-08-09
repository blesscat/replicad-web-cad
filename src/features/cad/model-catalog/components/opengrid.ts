import type { ModelParameterValues } from '../../../../cad-contract/units'
import {
  boundsForOpenGrid,
  isOpenGridParameters,
  openGridFileName,
  openGridStlFileName,
  OPENGRID_CONFIGURATION,
  validateOpenGridParameters,
} from '../../../../cad-contract/units'
import type { ModelDefinition } from '../types'

function validateOpenGridDefinitionParameters(value: unknown) {
  const validation = validateOpenGridParameters(value)
  if (!validation.valid) return validation
  return {
    valid: true as const,
    value: {
      modelId: 'opengrid' as const,
      parameters: validation.value,
    },
  }
}

function openGridFileNameFor(parameters: ModelParameterValues): string {
  if (!isOpenGridParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid')
  }
  return openGridFileName(parameters)
}

function openGridStlFileNameFor(parameters: ModelParameterValues): string {
  if (!isOpenGridParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid')
  }
  return openGridStlFileName(parameters)
}

function boundsForOpenGridDefinition(parameters: ModelParameterValues) {
  if (!isOpenGridParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid')
  }
  return boundsForOpenGrid(parameters)
}

export const opengridDefinition: ModelDefinition = {
  id: 'opengrid',
  buildKey: 'opengrid',
  family: 'opengrid',
  displayName: 'OpenGrid 底板',
  selectionDescription:
    '依官方 OpenGrid SCAD 產生 Full、Lite、Heavy 三種 28 mm 網格底板，可調整倒角、側邊接頭與交界螺絲孔。',
  parameterSchema: [],
  defaultParameters: {
    ...OPENGRID_CONFIGURATION.defaultParameters,
    customScrewPositions: [],
  },
  previewMetadata: { centeredOnXY: true, baseAtZ: 0 },
  validateParameters: validateOpenGridDefinitionParameters,
  boundsForParameters: boundsForOpenGridDefinition,
  exportFileName: openGridFileNameFor,
  stlFileName: openGridStlFileNameFor,
}
