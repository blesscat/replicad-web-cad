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
  displayName: 'models.model.opengrid.name',
  selectionLabel: 'models.model.opengrid.selection',
  selectionDescription: 'models.model.opengrid.description',
  parameterSchema: [],
  defaultParameters: {
    ...OPENGRID_CONFIGURATION.defaultParameters,
    customScrewPositions: [],
  },
  previewMetadata: { centeredOnXY: true, baseAtZ: 0 },
  previewImage: {
    src: '/model-previews/opengrid.png',
    alt: 'models.model.opengrid.alt',
    width: 640,
    height: 400,
  },
  validateParameters: validateOpenGridDefinitionParameters,
  boundsForParameters: boundsForOpenGridDefinition,
  exportFileName: openGridFileNameFor,
  stlFileName: openGridStlFileNameFor,
}
