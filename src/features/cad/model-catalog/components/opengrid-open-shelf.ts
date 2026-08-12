import type { ModelParameterValues } from '../../../../cad-contract/units'
import {
  boundsForOpenGridOpenShelf,
  isOpenGridOpenShelfParameters,
  openGridOpenShelfFileName,
  openGridOpenShelfStlFileName,
  OPENGRID_OPEN_SHELF_CONFIGURATION,
  OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
  validateOpenGridOpenShelfParameters,
} from '../../../../cad-contract/units'
import type { ModelDefinition, ParameterField } from '../types'

const OPENGRID_OPEN_SHELF_PARAMETER_SCHEMA: ReadonlyArray<ParameterField> = [
  {
    key: 'x',
    label: '外框 X 格數',
    axis: 'X',
    unit: '格',
    control: 'range',
    defaultValue: OPENGRID_OPEN_SHELF_CONFIGURATION.defaultX,
    min: OPENGRID_OPEN_SHELF_CONFIGURATION.minX,
    max: OPENGRID_OPEN_SHELF_CONFIGURATION.maxX,
    step: OPENGRID_OPEN_SHELF_CONFIGURATION.gridStep,
  },
  {
    key: 'y',
    label: '外框 Y 格數',
    axis: 'Y',
    unit: '格',
    control: 'range',
    defaultValue: OPENGRID_OPEN_SHELF_CONFIGURATION.defaultY,
    min: OPENGRID_OPEN_SHELF_CONFIGURATION.minY,
    max: OPENGRID_OPEN_SHELF_CONFIGURATION.maxY,
    step: OPENGRID_OPEN_SHELF_CONFIGURATION.gridStep,
  },
  {
    key: 'height',
    label: '整體高度',
    axis: 'Z',
    unit: 'mm',
    control: 'range-text',
    defaultValue: OPENGRID_OPEN_SHELF_CONFIGURATION.defaultHeight,
    min: OPENGRID_OPEN_SHELF_CONFIGURATION.minHeight,
    max: OPENGRID_OPEN_SHELF_CONFIGURATION.maxHeight,
    step: 1,
    sliderMin: OPENGRID_OPEN_SHELF_CONFIGURATION.minHeight,
    sliderMax: OPENGRID_OPEN_SHELF_CONFIGURATION.heightSliderMax,
  },
  {
    key: 'cellX',
    label: '內部 X 格數',
    axis: 'X',
    unit: '格',
    control: 'range',
    defaultValue: OPENGRID_OPEN_SHELF_CONFIGURATION.defaultCellX,
    min: OPENGRID_OPEN_SHELF_CONFIGURATION.minCellX,
    max: OPENGRID_OPEN_SHELF_CONFIGURATION.maxCellX,
    step: 1,
  },
  {
    key: 'cellZ',
    label: '內部 Z 格數',
    axis: 'Z',
    unit: '格',
    control: 'range',
    defaultValue: OPENGRID_OPEN_SHELF_CONFIGURATION.defaultCellZ,
    min: OPENGRID_OPEN_SHELF_CONFIGURATION.minCellZ,
    max: OPENGRID_OPEN_SHELF_CONFIGURATION.maxCellZ,
    step: 1,
  },
  {
    key: 'angle',
    label: '前方開口仰角',
    axis: 'Y/Z',
    unit: '°',
    control: 'range-text',
    defaultValue: OPENGRID_OPEN_SHELF_CONFIGURATION.defaultAngle,
    min: OPENGRID_OPEN_SHELF_CONFIGURATION.minAngle,
    max: OPENGRID_OPEN_SHELF_CONFIGURATION.maxAngle,
    step: 1,
    sliderMin: OPENGRID_OPEN_SHELF_CONFIGURATION.minAngle,
    sliderMax: OPENGRID_OPEN_SHELF_CONFIGURATION.maxAngle,
  },
]

function validateDefinitionParameters(value: unknown) {
  const validation = validateOpenGridOpenShelfParameters(value)
  if (!validation.valid) return validation
  return {
    valid: true as const,
    value: {
      modelId: 'opengrid-open-shelf' as const,
      parameters: validation.value,
    },
  }
}

function boundsForDefinition(parameters: ModelParameterValues) {
  if (!isOpenGridOpenShelfParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-open-shelf')
  }
  return boundsForOpenGridOpenShelf(parameters)
}

function exportFileName(parameters: ModelParameterValues): string {
  if (!isOpenGridOpenShelfParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-open-shelf')
  }
  return openGridOpenShelfFileName(parameters)
}

function exportStlFileName(parameters: ModelParameterValues): string {
  if (!isOpenGridOpenShelfParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-open-shelf')
  }
  return openGridOpenShelfStlFileName(parameters)
}

export const opengridOpenShelfDefinition: ModelDefinition = {
  id: 'opengrid-open-shelf',
  buildKey: 'opengrid-open-shelf',
  family: 'opengrid',
  displayName: 'OpenGrid Open Shelf (斜開格櫃)',
  selectionLabel: 'Open Shelf (斜開格櫃)',
  selectionDescription:
    '前方開口、整體向前上仰的 OpenGrid 格櫃；可調整外框尺寸、內部分格、總高與仰角。',
  parameterSchema: OPENGRID_OPEN_SHELF_PARAMETER_SCHEMA,
  defaultParameters: { ...OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS },
  previewMetadata: { centeredOnXY: true, baseAtZ: -3 },
  previewImage: {
    src: '/model-previews/opengrid-open-shelf.png',
    alt: 'OpenGrid Open Shelf (斜開格櫃) 預覽',
    width: 640,
    height: 400,
  },
  validateParameters: validateDefinitionParameters,
  boundsForParameters: boundsForDefinition,
  exportFileName,
  stlFileName: exportStlFileName,
}
