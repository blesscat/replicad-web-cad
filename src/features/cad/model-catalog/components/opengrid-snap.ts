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
  displayName: 'Snap (咔咔)',
  selectionLabel: 'Snap (咔咔)',
  selectionDescription:
    '提供 Standard 或 Directional 的 Snap (咔咔)，可切換 Full/Lite 的完整、半格或四分之一格，以及四周定位孔與中心 remover 孔。',
  parameterSchema: OPENGRID_SNAP_PARAMETER_SCHEMA,
  defaultParameters: OPENGRID_SNAP_CONFIGURATION.defaultParameters,
  previewMetadata: { centeredOnXY: true, baseAtZ: 0 },
  previewImage: {
    src: '/model-previews/opengrid-snap.png',
    alt: 'Snap (咔咔) 預覽',
    width: 640,
    height: 400,
  },
  validateParameters: validateOpenGridSnapDefinitionParameters,
  boundsForParameters: boundsForOpenGridSnapDefinition,
  exportFileName: openGridSnapFileNameFor,
  stlFileName: openGridSnapStlFileNameFor,
}
