import type { ModelParameterValues } from '../../../../cad-contract/units'
import {
  boundsForPillar,
  isPillarParameters,
  pillarFileName,
  pillarStlFileName,
  PILLAR_CONFIGURATION,
  validatePillarParameters,
} from '../../../../cad-contract/units'
import type { ModelDefinition } from '../types'

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
  selectionDescription: `OpenGrid 用 Ø${PILLAR_CONFIGURATION.bodyDiameter} mm 圓柱支柱；標準版 ${PILLAR_CONFIGURATION.standardLength} mm（固定）、薄殼版 ${PILLAR_CONFIGURATION.thinShellLength} mm（固定），上端固定 ${PILLAR_CONFIGURATION.upperChamfer} mm chamfer，底部為 Ø${PILLAR_CONFIGURATION.baseDiameter} × ${PILLAR_CONFIGURATION.baseHeight} mm 平底凸台。`,
  parameterSchema: [],
  defaultParameters: { ...PILLAR_CONFIGURATION.defaultParameters },
  previewMetadata: { centeredOnXY: true, baseAtZ: 0 },
  previewImage: {
    src: '/model-previews/opengrid-pillar.png',
    alt: 'OpenGrid 圓柱支柱預覽',
    width: 640,
    height: 400,
  },
  validateParameters: validatePillarDefinitionParameters,
  boundsForParameters: boundsForPillarDefinition,
  exportFileName: exportPillarFileName,
  stlFileName: exportPillarStlFileName,
}
