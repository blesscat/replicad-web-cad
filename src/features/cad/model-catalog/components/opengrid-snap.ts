import type { ModelParameterValues } from '../../../../cad-contract/units'
import {
  boundsForOpenGridSnap,
  isOpenGridSnapParameters,
  openGridSnapFileName,
  openGridSnapStlFileName,
  OPENGRID_SNAP_CONFIGURATION,
  validateOpenGridSnapParameters,
} from '../../../../cad-contract/units'
import type { ModelDefinition, ParameterField } from '../types'

const OPENGRID_SNAP_PARAMETER_SCHEMA: ReadonlyArray<ParameterField> = [
  {
    key: 'offset',
    label: '外框總增量',
    axis: 'X/Y',
    unit: 'mm',
    control: 'range',
    defaultValue: 0,
    min: OPENGRID_SNAP_CONFIGURATION.minOffset,
    max: OPENGRID_SNAP_CONFIGURATION.maxOffset,
    step: OPENGRID_SNAP_CONFIGURATION.offsetStep,
  },
]

function validateOpenGridSnapDefinitionParameters(value: unknown) {
  const validation = validateOpenGridSnapParameters(value)
  if (!validation.valid) return validation
  return {
    valid: true as const,
    value: {
      modelId: 'opengrid-snap' as const,
      parameters: validation.value,
    },
  }
}

function openGridSnapFileNameFor(parameters: ModelParameterValues): string {
  if (!isOpenGridSnapParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-snap')
  }
  return openGridSnapFileName(parameters)
}

function openGridSnapStlFileNameFor(parameters: ModelParameterValues): string {
  if (!isOpenGridSnapParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-snap')
  }
  return openGridSnapStlFileName(parameters)
}

function boundsForOpenGridSnapDefinition(parameters: ModelParameterValues) {
  if (!isOpenGridSnapParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-snap')
  }
  return boundsForOpenGridSnap(parameters)
}

export const opengridSnapDefinition: ModelDefinition = {
  id: 'opengrid-snap',
  buildKey: 'opengrid-snap',
  family: 'opengrid',
  displayName: 'OpenGrid Snap',
  selectionDescription:
    '提供 Full 或 Lite Snap，可用 X/Y 半格方向嵌入自訂 OpenGrid 半格，並微調外框總寬深。',
  parameterSchema: OPENGRID_SNAP_PARAMETER_SCHEMA,
  defaultParameters: OPENGRID_SNAP_CONFIGURATION.defaultParameters,
  previewMetadata: { centeredOnXY: true, baseAtZ: 0 },
  validateParameters: validateOpenGridSnapDefinitionParameters,
  boundsForParameters: boundsForOpenGridSnapDefinition,
  exportFileName: openGridSnapFileNameFor,
  stlFileName: openGridSnapStlFileNameFor,
}
