import type { ModelParameterValues } from '../../../../../cad-contract/units'
import {
  boundsForOpenGridSnapRemover,
  isOpenGridSnapRemoverParameters,
  openGridSnapRemoverFileName,
  openGridSnapRemoverStlFileName,
  validateOpenGridSnapRemoverParameters,
} from '../../../../../cad-contract/units'
import type { ModelDefinition } from '../../types'

function validateDefinitionParameters(value: unknown) {
  const validation = validateOpenGridSnapRemoverParameters(value)
  if (!validation.valid) return validation
  return {
    valid: true as const,
    value: {
      modelId: 'opengrid-snap-remover' as const,
      parameters: validation.value,
    },
  }
}

function boundsForDefinition(parameters: ModelParameterValues) {
  if (!isOpenGridSnapRemoverParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-snap-remover')
  }
  return boundsForOpenGridSnapRemover(parameters)
}

function exportFileName(parameters: ModelParameterValues): string {
  if (!isOpenGridSnapRemoverParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-snap-remover')
  }
  return openGridSnapRemoverFileName(parameters)
}

function stlFileName(parameters: ModelParameterValues): string {
  if (!isOpenGridSnapRemoverParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-snap-remover')
  }
  return openGridSnapRemoverStlFileName(parameters)
}

export const openGridSnapRemoverDefinition: ModelDefinition = {
  id: 'opengrid-snap-remover',
  buildKey: 'opengrid-snap-remover',
  family: 'opengrid',
  displayName: 'OpenGrid Snap Remover',
  selectionDescription: '固定 STEP 預覽，不提供參數調整。',
  parameterSchema: [],
  defaultParameters: {},
  previewMetadata: {
    centeredOnXY: false,
    baseAtZ: -5.005506125135993,
  },
  validateParameters: validateDefinitionParameters,
  boundsForParameters: boundsForDefinition,
  exportFileName,
  stlFileName,
}
