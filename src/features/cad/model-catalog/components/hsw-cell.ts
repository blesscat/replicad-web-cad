import type { ModelParameterValues } from '../../../../cad-contract/units'
import {
  boundsForHswCell,
  hswCellFileName,
  hswCellStlFileName,
  HSW_CELL_CONFIGURATION,
  isHswCellParameters,
  validateHswCellParameters,
} from '../../../../cad-contract/units'
import type { ModelDefinition, ParameterField } from '../types'

const HSW_PARAMETER_SCHEMA: ReadonlyArray<ParameterField> = [
  {
    key: 'rows',
    label: '行數',
    axis: 'Y',
    unit: '格',
    control: 'range',
    defaultValue: 1,
    min: 1,
    max: HSW_CELL_CONFIGURATION.maxGridCount,
    step: 1,
  },
  {
    key: 'columns',
    label: '列數',
    axis: 'X',
    unit: '格',
    control: 'range',
    defaultValue: 1,
    min: 1,
    max: HSW_CELL_CONFIGURATION.maxGridCount,
    step: 1,
  },
]

function exportHswCellFileName(parameters: ModelParameterValues): string {
  if (!isHswCellParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:hsw-cell')
  }
  return hswCellFileName(parameters)
}

function validateHswCellDefinitionParameters(value: unknown) {
  const validation = validateHswCellParameters(value)
  if (!validation.valid) return validation
  return {
    valid: true as const,
    value: {
      modelId: 'hsw-cell' as const,
      parameters: validation.value,
    },
  }
}

function boundsForHswCellDefinition(parameters: ModelParameterValues) {
  if (!isHswCellParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:hsw-cell')
  }
  return boundsForHswCell(parameters)
}

export const hswCellDefinition: ModelDefinition = {
  id: 'hsw-cell',
  buildKey: 'hsw-cell',
  family: 'hsw',
  displayName: 'HSW 六角蜂巢',
  selectionDescription:
    '固定約 27.25 × 23.60 × 8 mm 的平頂六角單元，以交錯 columns 排列成蜂巢。',
  parameterSchema: HSW_PARAMETER_SCHEMA,
  defaultParameters: { rows: 1, columns: 1 },
  previewMetadata: { centeredOnXY: true, baseAtZ: 0 },
  validateParameters: validateHswCellDefinitionParameters,
  boundsForParameters: boundsForHswCellDefinition,
  exportFileName: exportHswCellFileName,
  stlFileName: (parameters) => {
    if (!isHswCellParameters(parameters)) {
      throw new Error('MODEL_PARAMETERS_MISMATCH:hsw-cell')
    }
    return hswCellStlFileName(parameters)
  },
}
