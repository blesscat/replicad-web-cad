export const HSW_CELL_CONFIGURATION = {
  maxGridCount: 20,
  outerWidth: 27.250933249878,
  outerDepth: 23.60000049802324,
  outerHeight: 8,
  columnPitch: 20.4381999374085,
  rowPitch: 23.60000049802324,
  staggerY: 11.80000024901162,
} as const

export const PROTOTYPE_CONFIGURATION = {
  defaultDimensions: { width: 20, depth: 30, height: 40 },
  minDimension: 1,
  maxDimension: 500,
  inputStep: 1,
  inputDebounceMs: 500,
  boundsTolerance: 0.01,
  engineInitializationTimeoutMs: 60_000,
  operationTimeoutMs: 120_000,
  recoveryRetries: 1,
  pendingCandidateLimit: 2,
  candidateTtlMs: 30_000,
  stepExtension: '.step',
  stepMime: 'model/step',
  stlExtension: '.stl',
  stlMime: 'model/stl',
  stlTolerance: 0.001,
  stlAngularTolerance: 0.1,
  modularGridBase: {
    maxGridCount: 20,
    cellWidth: 20,
    cellDepth: 20,
    height: 5,
    cutoutWidth: 17.5,
    cutoutDepth: 17.5,
    outerCornerRadius: 2.5,
  },
  hswCell: HSW_CELL_CONFIGURATION,
} as const

export type DimensionKey = 'width' | 'depth' | 'height'
export type GridParameterKey = 'rows' | 'columns'
export type ModelParameterKey = DimensionKey | GridParameterKey
export type ModelId = 'box' | 'modular-grid-base' | 'hsw-cell'

export type BoxParameters = Record<DimensionKey, number>
export type ModularGridBaseParameters = Record<GridParameterKey, number>
export type HswCellParameters = Record<GridParameterKey, number>

export type ModelParameters =
  | { modelId: 'box'; parameters: BoxParameters }
  | {
      modelId: 'modular-grid-base'
      parameters: ModularGridBaseParameters
    }
  | { modelId: 'hsw-cell'; parameters: HswCellParameters }

export type ModelParameterValues = ModelParameters['parameters']

export type ModelBounds = {
  min: [number, number, number]
  max: [number, number, number]
}

export type BoxBounds = ModelBounds

export type ValidationIssue = {
  field: ModelParameterKey | 'parameters'
  message: string
}

export type BoxValidation =
  | { valid: true; value: BoxParameters }
  | { valid: false; issues: ValidationIssue[] }

export type ModularGridBaseValidation =
  | { valid: true; value: ModularGridBaseParameters }
  | { valid: false; issues: ValidationIssue[] }

export type HswCellValidation =
  | { valid: true; value: HswCellParameters }
  | { valid: false; issues: ValidationIssue[] }

export type HswCellOffset = [number, number]

export type ModelValidation =
  | { valid: true; value: ModelParameters }
  | { valid: false; issues: ValidationIssue[] }

const DIMENSIONS: DimensionKey[] = ['width', 'depth', 'height']
const GRID_PARAMETERS: GridParameterKey[] = ['rows', 'columns']

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  return (
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
  )
}

export function parseDimensionInput(raw: string): number | null {
  const value = raw.trim()
  if (!/^-?\d+$/.test(value)) return null

  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : null
}

export function validateBoxParameters(value: unknown): BoxValidation {
  if (!value || typeof value !== 'object') {
    return {
      valid: false,
      issues: [{ field: 'parameters', message: '需要提供方塊尺寸。' }],
    }
  }

  const candidate = value as Partial<Record<DimensionKey, unknown>> &
    Record<string, unknown>
  const issues: ValidationIssue[] = []

  if (!hasExactKeys(candidate, DIMENSIONS)) {
    issues.push({ field: 'parameters', message: '包含不支援的參數欄位。' })
  }

  for (const field of DIMENSIONS) {
    const dimension = candidate[field]
    if (typeof dimension !== 'number' || !Number.isFinite(dimension)) {
      issues.push({ field, message: '必須是有限的整數。' })
      continue
    }
    if (!Number.isInteger(dimension)) {
      issues.push({ field, message: '只接受整數 mm，不會自動四捨五入。' })
      continue
    }
    if (
      dimension < PROTOTYPE_CONFIGURATION.minDimension ||
      dimension > PROTOTYPE_CONFIGURATION.maxDimension
    ) {
      issues.push({
        field,
        message: `必須介於 ${PROTOTYPE_CONFIGURATION.minDimension}–${PROTOTYPE_CONFIGURATION.maxDimension} mm。`,
      })
    }
  }

  if (issues.length > 0) return { valid: false, issues }

  return {
    valid: true,
    value: {
      width: candidate.width as number,
      depth: candidate.depth as number,
      height: candidate.height as number,
    },
  }
}

export function validateModularGridBaseParameters(
  value: unknown,
): ModularGridBaseValidation {
  if (!value || typeof value !== 'object') {
    return {
      valid: false,
      issues: [{ field: 'parameters', message: '需要提供網格列數與行數。' }],
    }
  }

  const candidate = value as Partial<Record<GridParameterKey, unknown>> &
    Record<string, unknown>
  const issues: ValidationIssue[] = []
  const grid = PROTOTYPE_CONFIGURATION.modularGridBase

  if (!hasExactKeys(candidate, GRID_PARAMETERS)) {
    issues.push({ field: 'parameters', message: '包含不支援的參數欄位。' })
  }

  for (const field of GRID_PARAMETERS) {
    const count = candidate[field]
    if (typeof count !== 'number' || !Number.isFinite(count)) {
      issues.push({ field, message: '必須是有限的整數。' })
      continue
    }
    if (!Number.isInteger(count)) {
      issues.push({ field, message: '只接受整數格數，不會自動四捨五入。' })
      continue
    }
    if (count < PROTOTYPE_CONFIGURATION.minDimension) {
      issues.push({ field, message: '格數必須是正整數。' })
      continue
    }
    if (count > grid.maxGridCount) {
      issues.push({
        field,
        message: `格數不得超過 ${grid.maxGridCount}。`,
      })
    }
  }

  if (issues.length > 0) return { valid: false, issues }

  const parameters: ModularGridBaseParameters = {
    rows: candidate.rows as number,
    columns: candidate.columns as number,
  }
  const width = parameters.columns * grid.cellWidth
  const depth = parameters.rows * grid.cellDepth

  if (width > PROTOTYPE_CONFIGURATION.maxDimension) {
    issues.push({
      field: 'columns',
      message: `寬度不得超過 ${PROTOTYPE_CONFIGURATION.maxDimension} mm。`,
    })
  }
  if (depth > PROTOTYPE_CONFIGURATION.maxDimension) {
    issues.push({
      field: 'rows',
      message: `深度不得超過 ${PROTOTYPE_CONFIGURATION.maxDimension} mm。`,
    })
  }

  if (issues.length > 0) return { valid: false, issues }
  return { valid: true, value: parameters }
}

export function validateHswCellParameters(value: unknown): HswCellValidation {
  if (!value || typeof value !== 'object') {
    return {
      valid: false,
      issues: [
        { field: 'parameters', message: '需要提供 HSW 蜂巢列數與行數。' },
      ],
    }
  }

  const candidate = value as Partial<Record<GridParameterKey, unknown>> &
    Record<string, unknown>
  const issues: ValidationIssue[] = []
  const grid = HSW_CELL_CONFIGURATION

  if (!hasExactKeys(candidate, GRID_PARAMETERS)) {
    issues.push({ field: 'parameters', message: '包含不支援的參數欄位。' })
  }

  for (const field of GRID_PARAMETERS) {
    const count = candidate[field]
    if (typeof count !== 'number' || !Number.isFinite(count)) {
      issues.push({ field, message: '必須是有限的整數。' })
      continue
    }
    if (!Number.isInteger(count)) {
      issues.push({ field, message: '只接受整數格數，不會自動四捨五入。' })
      continue
    }
    if (count < 1) {
      issues.push({ field, message: '格數必須是正整數。' })
      continue
    }
    if (count > grid.maxGridCount) {
      issues.push({
        field,
        message: `格數不得超過 ${grid.maxGridCount}。`,
      })
    }
  }

  if (issues.length > 0) return { valid: false, issues }

  const parameters: HswCellParameters = {
    rows: candidate.rows as number,
    columns: candidate.columns as number,
  }
  const bounds = boundsForHswCell(parameters)
  const width = bounds.max[0] - bounds.min[0]
  const depth = bounds.max[1] - bounds.min[1]

  if (width > PROTOTYPE_CONFIGURATION.maxDimension) {
    issues.push({
      field: 'columns',
      message: `寬度不得超過 ${PROTOTYPE_CONFIGURATION.maxDimension} mm。`,
    })
  }
  if (depth > PROTOTYPE_CONFIGURATION.maxDimension) {
    issues.push({
      field: 'rows',
      message: `深度不得超過 ${PROTOTYPE_CONFIGURATION.maxDimension} mm。`,
    })
  }

  if (issues.length > 0) return { valid: false, issues }
  return { valid: true, value: parameters }
}

export function validateModelParameters(
  modelId: unknown,
  value: unknown,
): ModelValidation {
  if (modelId === 'box') {
    const validation = validateBoxParameters(value)
    if (!validation.valid) return validation
    return { valid: true, value: { modelId, parameters: validation.value } }
  }

  if (modelId === 'modular-grid-base') {
    const validation = validateModularGridBaseParameters(value)
    if (!validation.valid) return validation
    return {
      valid: true,
      value: { modelId, parameters: validation.value },
    }
  }

  if (modelId === 'hsw-cell') {
    const validation = validateHswCellParameters(value)
    if (!validation.valid) return validation
    return { valid: true, value: { modelId, parameters: validation.value } }
  }

  return {
    valid: false,
    issues: [{ field: 'parameters', message: '找不到指定的 CAD component。' }],
  }
}

export function boundsForBox(parameters: BoxParameters): BoxBounds {
  return {
    min: [-parameters.width / 2, -parameters.depth / 2, 0],
    max: [parameters.width / 2, parameters.depth / 2, parameters.height],
  }
}

export function boundsForModularGridBase(
  parameters: ModularGridBaseParameters,
): ModelBounds {
  const grid = PROTOTYPE_CONFIGURATION.modularGridBase
  const width = parameters.columns * grid.cellWidth
  const depth = parameters.rows * grid.cellDepth
  return {
    min: [-width / 2, -depth / 2, 0],
    max: [width / 2, depth / 2, grid.height],
  }
}

export function hswCellOffsetFor(
  parameters: HswCellParameters,
  row: number,
  column: number,
): HswCellOffset {
  const grid = HSW_CELL_CONFIGURATION
  const centeringOffsetY = parameters.columns === 1 ? 0 : grid.staggerY / 2
  return [
    (column - (parameters.columns - 1) / 2) * grid.columnPitch,
    (row - (parameters.rows - 1) / 2) * grid.rowPitch +
      (column % 2) * grid.staggerY -
      centeringOffsetY,
  ]
}

export function hswCellOffsetsForGrid(
  parameters: HswCellParameters,
): HswCellOffset[] {
  const offsets: HswCellOffset[] = []
  for (let row = 0; row < parameters.rows; row += 1) {
    for (let column = 0; column < parameters.columns; column += 1) {
      offsets.push(hswCellOffsetFor(parameters, row, column))
    }
  }
  return offsets
}

export function boundsForHswCell(parameters: HswCellParameters): ModelBounds {
  const grid = HSW_CELL_CONFIGURATION
  const width = grid.outerWidth + (parameters.columns - 1) * grid.columnPitch
  const depth =
    grid.outerDepth *
    (parameters.columns === 1 ? parameters.rows : parameters.rows + 0.5)
  return {
    min: [-width / 2, -depth / 2, 0],
    max: [width / 2, depth / 2, grid.outerHeight],
  }
}

export function boxFileName(parameters: BoxParameters): string {
  return `box-${parameters.width}x${parameters.depth}x${parameters.height}${PROTOTYPE_CONFIGURATION.stepExtension}`
}

export function boxStlFileName(parameters: BoxParameters): string {
  return `box-${parameters.width}x${parameters.depth}x${parameters.height}${PROTOTYPE_CONFIGURATION.stlExtension}`
}

export function modularGridBaseFileName(
  parameters: ModularGridBaseParameters,
): string {
  return `modular-grid-base-${parameters.columns}x${parameters.rows}${PROTOTYPE_CONFIGURATION.stepExtension}`
}

export function modularGridBaseStlFileName(
  parameters: ModularGridBaseParameters,
): string {
  return `modular-grid-base-${parameters.columns}x${parameters.rows}${PROTOTYPE_CONFIGURATION.stlExtension}`
}

export function hswCellFileName(parameters: HswCellParameters): string {
  return `hsw-cell-${parameters.columns}x${parameters.rows}${PROTOTYPE_CONFIGURATION.stepExtension}`
}

export function hswCellStlFileName(parameters: HswCellParameters): string {
  return `hsw-cell-${parameters.columns}x${parameters.rows}${PROTOTYPE_CONFIGURATION.stlExtension}`
}

export function isBoxParameters(value: unknown): value is BoxParameters {
  return validateBoxParameters(value).valid
}

export function isModularGridBaseParameters(
  value: unknown,
): value is ModularGridBaseParameters {
  return validateModularGridBaseParameters(value).valid
}

export function isHswCellParameters(
  value: unknown,
): value is HswCellParameters {
  return validateHswCellParameters(value).valid
}

export function isModelParameters(value: unknown): value is ModelParameters {
  if (!value || typeof value !== 'object') return false
  const model = value as { modelId?: unknown; parameters?: unknown }
  return validateModelParameters(model.modelId, model.parameters).valid
}

export function boundsForModel(model: ModelParameters): ModelBounds {
  switch (model.modelId) {
    case 'box':
      return boundsForBox(model.parameters)
    case 'modular-grid-base':
      return boundsForModularGridBase(model.parameters)
    case 'hsw-cell':
      return boundsForHswCell(model.parameters)
  }
}

export function modelFileName(model: ModelParameters): string {
  switch (model.modelId) {
    case 'box':
      return boxFileName(model.parameters)
    case 'modular-grid-base':
      return modularGridBaseFileName(model.parameters)
    case 'hsw-cell':
      return hswCellFileName(model.parameters)
  }
}

export function modelStlFileName(model: ModelParameters): string {
  switch (model.modelId) {
    case 'box':
      return boxStlFileName(model.parameters)
    case 'modular-grid-base':
      return modularGridBaseStlFileName(model.parameters)
    case 'hsw-cell':
      return hswCellStlFileName(model.parameters)
  }
}
