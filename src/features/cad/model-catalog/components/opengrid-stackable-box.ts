import type { ModelParameterValues } from '../../../../cad-contract/units'
import {
  boundsForOpenGridStackableBox,
  isOpenGridStackableBoxParameters,
  openGridStackableBoxFileName,
  openGridStackableBoxStlFileName,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  validateOpenGridStackableBoxParameters,
} from '../../../../cad-contract/units'
import type { ModelDefinition, ParameterField } from '../types'

const OPENGRID_STACKABLE_BOX_PARAMETER_SCHEMA: ReadonlyArray<ParameterField> = [
  {
    key: 'x',
    label: 'X 格數',
    axis: 'X',
    unit: '格',
    control: 'range',
    defaultValue: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultX,
    min: OPENGRID_STACKABLE_BOX_CONFIGURATION.minX,
    max: OPENGRID_STACKABLE_BOX_CONFIGURATION.maxX,
    step: OPENGRID_STACKABLE_BOX_CONFIGURATION.gridStep,
  },
  {
    key: 'y',
    label: 'Y 格數',
    axis: 'Y',
    unit: '格',
    control: 'range',
    defaultValue: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultY,
    min: OPENGRID_STACKABLE_BOX_CONFIGURATION.minY,
    max: OPENGRID_STACKABLE_BOX_CONFIGURATION.maxY,
    step: OPENGRID_STACKABLE_BOX_CONFIGURATION.gridStep,
  },
  {
    key: 'height',
    label: '盒內淨高',
    axis: 'Z',
    unit: 'mm',
    control: 'range-text',
    defaultValue: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultHeight,
    min: OPENGRID_STACKABLE_BOX_CONFIGURATION.minHeight,
    max: OPENGRID_STACKABLE_BOX_CONFIGURATION.maxHeight,
    step: 1,
    sliderMin: OPENGRID_STACKABLE_BOX_CONFIGURATION.minHeight,
    sliderMax: OPENGRID_STACKABLE_BOX_CONFIGURATION.maxHeight,
  },
]

function validateDefinitionParameters(value: unknown) {
  const validation = validateOpenGridStackableBoxParameters(value)
  if (!validation.valid) return validation
  return {
    valid: true as const,
    value: {
      modelId: 'opengrid-stackable-box' as const,
      parameters: validation.value,
    },
  }
}

function boundsForDefinition(parameters: ModelParameterValues) {
  if (!isOpenGridStackableBoxParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-stackable-box')
  }
  return boundsForOpenGridStackableBox(parameters)
}

function exportFileName(parameters: ModelParameterValues): string {
  if (!isOpenGridStackableBoxParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-stackable-box')
  }
  return openGridStackableBoxFileName(parameters)
}

function exportStlFileName(parameters: ModelParameterValues): string {
  if (!isOpenGridStackableBoxParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-stackable-box')
  }
  return openGridStackableBoxStlFileName(parameters)
}

export const opengridStackableBoxDefinition: ModelDefinition = {
  id: 'opengrid-stackable-box',
  buildKey: 'opengrid-stackable-box',
  family: 'opengrid',
  displayName: 'OpenGrid 堆疊盒',
  selectionDescription: '',
  parameterSchema: OPENGRID_STACKABLE_BOX_PARAMETER_SCHEMA,
  defaultParameters: {
    x: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultX,
    y: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultY,
    height: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultHeight,
    cornerBottomHoles:
      OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultCornerBottomHoles,
    fullBottomHoleGrid:
      OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultFullBottomHoleGrid,
    basePlateMode: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultBasePlateMode,
  },
  previewMetadata: { centeredOnXY: true, baseAtZ: 0 },
  validateParameters: validateDefinitionParameters,
  boundsForParameters: boundsForDefinition,
  exportFileName,
  stlFileName: exportStlFileName,
}
