import { OPENGRID_GRID_CONFIGURATION } from './opengrid-grid'

export type OpenGridOpenConnectShelfParameterKey = 'columns' | 'rows' | 'angle'

export type OpenGridOpenConnectShelfParameters = {
  columns: number
  rows: number
  angle: number
}

export type OpenGridOpenConnectShelfPoint3D = [number, number, number]

export type OpenGridOpenConnectShelfValidationIssue = {
  field: OpenGridOpenConnectShelfParameterKey | 'parameters'
  messageId: string
  params?: Readonly<Record<string, string | number | boolean>>
}

export type OpenGridOpenConnectShelfValidation =
  | { valid: true; value: OpenGridOpenConnectShelfParameters }
  | { valid: false; issues: OpenGridOpenConnectShelfValidationIssue[] }

export const OPENGRID_OPENCONNECT_SHELF_CONFIGURATION = {
  gridPitch: OPENGRID_GRID_CONFIGURATION.fullPitch,
  fullThickness: 6.8,
  rearHeight: 28,
  rearThickness: 3.2,
  supportThickness: 2,
  minimumFrontHeight: 7,
  minGridCount: 1,
  maxGridCount: 10,
  minAngle: 1,
  angleStep: 0.5,
  defaultColumns: 3,
  defaultRows: 3,
  defaultAngle: 14,
} as const

export const OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS = {
  columns: OPENGRID_OPENCONNECT_SHELF_CONFIGURATION.defaultColumns,
  rows: OPENGRID_OPENCONNECT_SHELF_CONFIGURATION.defaultRows,
  angle: OPENGRID_OPENCONNECT_SHELF_CONFIGURATION.defaultAngle,
} as const satisfies OpenGridOpenConnectShelfParameters

const PARAMETER_KEYS: readonly OpenGridOpenConnectShelfParameterKey[] = [
  'columns',
  'rows',
  'angle',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(value: Record<string, unknown>): boolean {
  return (
    Object.keys(value).length === PARAMETER_KEYS.length &&
    PARAMETER_KEYS.every((key) =>
      Object.prototype.hasOwnProperty.call(value, key),
    )
  )
}

function isSafeIntegerInRange(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= minimum &&
    value <= maximum
  )
}

function isFiniteNumberAtStepInRange(
  value: unknown,
  minimum: number,
  maximum: number,
  step: number,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= minimum &&
    value <= maximum &&
    Number.isSafeInteger((value - minimum) / step)
  )
}

export function openGridOpenConnectShelfMaximumAngleForRows(
  rows: number,
): number {
  const configuration = OPENGRID_OPENCONNECT_SHELF_CONFIGURATION
  const depth = rows * configuration.gridPitch
  const maximumRise =
    configuration.rearHeight - configuration.minimumFrontHeight
  return Math.floor((Math.atan(maximumRise / depth) * 180) / Math.PI)
}

export function openGridOpenConnectShelfAngleRadiansFor(angle: number): number {
  return (angle * Math.PI) / 180
}

export function openGridOpenConnectShelfWidthFor(
  parameters: Pick<OpenGridOpenConnectShelfParameters, 'columns'>,
): number {
  return parameters.columns * OPENGRID_OPENCONNECT_SHELF_CONFIGURATION.gridPitch
}

export function openGridOpenConnectShelfDepthFor(
  parameters: Pick<OpenGridOpenConnectShelfParameters, 'rows'>,
): number {
  return parameters.rows * OPENGRID_OPENCONNECT_SHELF_CONFIGURATION.gridPitch
}

export function openGridOpenConnectShelfFrontHeightFor(
  parameters: Pick<OpenGridOpenConnectShelfParameters, 'rows' | 'angle'>,
): number {
  const configuration = OPENGRID_OPENCONNECT_SHELF_CONFIGURATION
  const depth = openGridOpenConnectShelfDepthFor(parameters)
  const rise =
    depth * Math.tan(openGridOpenConnectShelfAngleRadiansFor(parameters.angle))
  return configuration.rearHeight - rise
}

export function openGridOpenConnectShelfSlotOriginsFor(
  parameters: Pick<OpenGridOpenConnectShelfParameters, 'columns'>,
): OpenGridOpenConnectShelfPoint3D[] {
  const configuration = OPENGRID_OPENCONNECT_SHELF_CONFIGURATION
  return Array.from({ length: parameters.columns }, (_, column) => [
    (column - (parameters.columns - 1) / 2) * configuration.gridPitch,
    configuration.rearThickness,
    configuration.rearHeight / 2,
  ])
}

export function openGridOpenConnectShelfInstalledBoundsFor(
  parameters: Pick<OpenGridOpenConnectShelfParameters, 'columns' | 'rows'>,
) {
  const configuration = OPENGRID_OPENCONNECT_SHELF_CONFIGURATION
  const width = openGridOpenConnectShelfWidthFor(parameters)
  const depth = openGridOpenConnectShelfDepthFor(parameters)
  return {
    min: [-width / 2, -depth, 0] as OpenGridOpenConnectShelfPoint3D,
    max: [
      width / 2,
      configuration.rearThickness,
      configuration.rearHeight,
    ] as OpenGridOpenConnectShelfPoint3D,
  }
}

export function boundsForOpenGridOpenConnectShelf(
  parameters: OpenGridOpenConnectShelfParameters,
) {
  const configuration = OPENGRID_OPENCONNECT_SHELF_CONFIGURATION
  const width = openGridOpenConnectShelfWidthFor(parameters)
  const depth = openGridOpenConnectShelfDepthFor(parameters)
  const radians = openGridOpenConnectShelfAngleRadiansFor(parameters.angle)
  return {
    min: [
      -width / 2,
      -(
        depth * Math.cos(radians) +
        configuration.rearHeight * Math.sin(radians)
      ),
      0,
    ] as OpenGridOpenConnectShelfPoint3D,
    max: [
      width / 2,
      configuration.rearThickness * Math.cos(radians),
      configuration.rearHeight * Math.cos(radians) +
        configuration.rearThickness * Math.sin(radians),
    ] as OpenGridOpenConnectShelfPoint3D,
  }
}

function invalidRangeIssue(
  field: OpenGridOpenConnectShelfParameterKey,
  minimum: number,
  maximum: number,
  unit: 'count' | 'degree',
): OpenGridOpenConnectShelfValidationIssue {
  return {
    field,
    messageId: 'validation.invalid',
    params: { min: minimum, max: maximum, unit },
  }
}

export function validateOpenGridOpenConnectShelfParameters(
  value: unknown,
): OpenGridOpenConnectShelfValidation {
  if (!isRecord(value)) {
    return {
      valid: false,
      issues: [{ field: 'parameters', messageId: 'validation.invalid' }],
    }
  }

  const configuration = OPENGRID_OPENCONNECT_SHELF_CONFIGURATION
  const issues: OpenGridOpenConnectShelfValidationIssue[] = []
  if (!hasExactKeys(value)) {
    issues.push({ field: 'parameters', messageId: 'validation.invalid' })
  }

  const columnsValid = isSafeIntegerInRange(
    value.columns,
    configuration.minGridCount,
    configuration.maxGridCount,
  )
  if (!columnsValid) {
    issues.push(
      invalidRangeIssue(
        'columns',
        configuration.minGridCount,
        configuration.maxGridCount,
        'count',
      ),
    )
  }

  const rows = value.rows
  const rowsValid = isSafeIntegerInRange(
    rows,
    configuration.minGridCount,
    configuration.maxGridCount,
  )
  if (!rowsValid) {
    issues.push(
      invalidRangeIssue(
        'rows',
        configuration.minGridCount,
        configuration.maxGridCount,
        'count',
      ),
    )
  }

  const maximumAngle = rowsValid
    ? openGridOpenConnectShelfMaximumAngleForRows(rows)
    : openGridOpenConnectShelfMaximumAngleForRows(configuration.minGridCount)
  if (
    !isFiniteNumberAtStepInRange(
      value.angle,
      configuration.minAngle,
      maximumAngle,
      configuration.angleStep,
    )
  ) {
    issues.push(
      invalidRangeIssue(
        'angle',
        configuration.minAngle,
        maximumAngle,
        'degree',
      ),
    )
  }

  if (issues.length > 0) return { valid: false, issues }
  return {
    valid: true,
    value: {
      columns: value.columns as number,
      rows: value.rows as number,
      angle: value.angle as number,
    },
  }
}

export function isOpenGridOpenConnectShelfParameters(
  value: unknown,
): value is OpenGridOpenConnectShelfParameters {
  return validateOpenGridOpenConnectShelfParameters(value).valid
}

export function openGridOpenConnectShelfFileName(
  parameters: OpenGridOpenConnectShelfParameters,
): string {
  return `opengrid-openconnect-shelf-c${parameters.columns}-r${parameters.rows}-a${parameters.angle}.step`
}

export function openGridOpenConnectShelfStlFileName(
  parameters: OpenGridOpenConnectShelfParameters,
): string {
  return openGridOpenConnectShelfFileName(parameters).replace(/\.step$/, '.stl')
}
