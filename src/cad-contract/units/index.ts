import {
  OPENGRID_CONFIGURATION,
  boundsForOpenGrid,
  openGridFileName,
  openGridStlFileName,
  validateOpenGridParameters,
  isOpenGridParameters,
} from './opengrid'
import type { OpenGridParameterKey, OpenGridParameters } from './opengrid'
import {
  boundsForOpenGridStackableBox,
  isOpenGridStackableBoxParameters,
  nominalOpenGridStackableBoxFootprintFor,
  nominalOpenGridStackableBoxBottomGridAxisPositionsFor,
  nominalOpenGridStackableBoxBottomGridCentersFor,
  openGridStackableBoxFileName,
  openGridStackableBoxOrdinaryBottomHoleCentersFor,
  openGridStackableBoxSocketCentersFor,
  openGridStackableBoxStlFileName,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  validateOpenGridStackableBoxParameters,
} from './opengrid-stackable-box'
import type {
  OpenGridStackableBoxParameterKey,
  OpenGridStackableBoxParameters,
  OpenGridStackableBoxPoint2D,
  OpenGridStackableBoxValidation,
  OpenGridStackableBoxValidationIssue,
} from './opengrid-stackable-box'
import {
  boundsForOpenGridSnap,
  isOpenGridSnapParameters,
  openGridSnapFileName,
  openGridSnapStlFileName,
  OPENGRID_SNAP_CONFIGURATION,
  validateOpenGridSnapParameters,
} from './opengrid-snap'
import type {
  OpenGridSnapParameterKey,
  OpenGridSnapParameters,
  OpenGridSnapValidation,
} from './opengrid-snap'
import {
  boundsForOpenGridDivider,
  classifyOpenGridDividerShape,
  isOpenGridDividerParameters,
  normalizeOpenGridDividerParameters,
  openGridDividerAxisFor,
  openGridDividerFileName,
  openGridDividerPegCentersFor,
  openGridDividerPlanDimensionsFor,
  openGridDividerStlFileName,
  OPENGRID_DIVIDER_CONFIGURATION,
  validateOpenGridDividerParameters,
} from './opengrid-divider'
import type {
  OpenGridDividerAxis,
  OpenGridDividerParameterKey,
  OpenGridDividerParameters,
  OpenGridDividerPlanDimensions,
  OpenGridDividerPoint2D,
  OpenGridDividerShape,
  OpenGridDividerValidation,
  OpenGridDividerValidationIssue,
} from './opengrid-divider'
import {
  boundsForPillar,
  isPillarParameters,
  pillarFileName,
  pillarStlFileName,
  PILLAR_CONFIGURATION,
  validatePillarParameters,
} from './pillar'
import type {
  PillarBounds,
  PillarParameterKey,
  PillarParameters,
  PillarValidation,
  PillarValidationIssue,
} from './pillar'

export {
  OPENGRID_CONFIGURATION,
  OPENGRID_CONNECTOR_SIDES,
  boundsForOpenGrid,
  cellCenterForOpenGrid,
  deterministicOpenGridCustomScrewPositions,
  isOpenGridGenerationSupported,
  isOpenGridParameters,
  normalizeOpenGridParameters,
  openGridBoardConfiguration,
  openGridConnectorLocationsFor,
  openGridCustomPositionFingerprint,
  openGridFileName,
  openGridScrewCentersFor,
  openGridScrewLatticeDimensions,
  openGridScrewPositionsFor,
  openGridStlFileName,
  screwCenterForOpenGrid,
  validateOpenGridGenerationSupport,
  validateOpenGridParameters,
} from './opengrid'
export {
  boundsForOpenGridDivider,
  classifyOpenGridDividerShape,
  isOpenGridDividerParameters,
  normalizeOpenGridDividerParameters,
  openGridDividerAxisFor,
  openGridDividerFileName,
  openGridDividerPegCentersFor,
  openGridDividerPlanDimensionsFor,
  openGridDividerStlFileName,
  OPENGRID_DIVIDER_CONFIGURATION,
  validateOpenGridDividerParameters,
} from './opengrid-divider'
export {
  boundsForOpenGridStackableBox,
  isOpenGridStackableBoxParameters,
  nominalOpenGridStackableBoxFootprintFor,
  nominalOpenGridStackableBoxBottomGridAxisPositionsFor,
  nominalOpenGridStackableBoxBottomGridCentersFor,
  openGridStackableBoxFileName,
  openGridStackableBoxOrdinaryBottomHoleCentersFor,
  openGridStackableBoxSocketCentersFor,
  openGridStackableBoxStlFileName,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  validateOpenGridStackableBoxParameters,
} from './opengrid-stackable-box'
export {
  boundsForOpenGridSnap,
  isOpenGridSnapParameters,
  openGridSnapFileName,
  openGridSnapStlFileName,
  OPENGRID_SNAP_CONFIGURATION,
  parseOpenGridSnapDecimalInput,
  validateOpenGridSnapParameters,
} from './opengrid-snap'
export type {
  OpenGridSnapBounds,
  OpenGridSnapParameterKey,
  OpenGridSnapParameters,
  OpenGridSnapValidation,
  OpenGridSnapValidationIssue,
  OpenGridSnapVariant,
} from './opengrid-snap'
export type {
  OpenGridStackableBoxParameterKey,
  OpenGridStackableBoxParameters,
  OpenGridStackableBoxPoint2D,
  OpenGridStackableBoxValidation,
  OpenGridStackableBoxValidationIssue,
} from './opengrid-stackable-box'
export type {
  OpenGridBoardConfiguration,
  OpenGridChamferMode,
  OpenGridCornerFlags,
  OpenGridConnectorLocation,
  OpenGridConnectorSide,
  OpenGridDirection3D,
  OpenGridGenerationSupportValidation,
  OpenGridPoint2D,
  OpenGridScrewDimensions,
  OpenGridScrewKind,
  OpenGridScrewMode,
  OpenGridScrewPreset,
  OpenGridScrewPosition,
  OpenGridSideFlags,
  OpenGridVariant,
  OpenGridValidation,
  OpenGridValidationIssue,
  OpenGridConnectorHoles,
  OpenGridParameters,
  OpenGridParameterKey,
} from './opengrid'
export type {
  OpenGridDividerAxis,
  OpenGridDividerParameterKey,
  OpenGridDividerParameters,
  OpenGridDividerPlanDimensions,
  OpenGridDividerPoint2D,
  OpenGridDividerShape,
  OpenGridDividerValidation,
  OpenGridDividerValidationIssue,
} from './opengrid-divider'
export {
  boundsForPillar,
  isPillarParameters,
  pillarFileName,
  pillarStlFileName,
  PILLAR_CONFIGURATION,
  validatePillarParameters,
} from './pillar'
export type {
  PillarBounds,
  PillarParameterKey,
  PillarParameters,
  PillarValidation,
  PillarValidationIssue,
} from './pillar'

export const HSW_CELL_CONFIGURATION = {
  maxGridCount: 20,
  outerWidth: 27.250933249878,
  outerDepth: 23.60000049802324,
  outerHeight: 8,
  columnPitch: 20.4381999374085,
  rowPitch: 23.60000049802324,
  staggerY: 11.80000024901162,
} as const

export const BOX_NORMAL_CONFIGURATION = {
  gridX: 10.219,
  gridY: 11.8,
  defaultX: 2,
  defaultY: 2,
  defaultHeight: 10,
  minX: 2,
  maxX: 40,
  minY: 2,
  maxY: 35,
  minHeight: 10,
  maxHeight: 500,
  heightSliderMax: 500,
  clearanceTotal: 0.15,
  cornerPostHeight: 7,
  cornerPostCrossSectionRotationDegrees: 0,
  cornerPostAttachmentTransitionLength: 0,
  wallThickness: 1,
  floorThickness: 1,
  outerCornerRadius: 1,
  canonicalWidth: 20.438,
  canonicalDepth: 23.6,
  canonicalHeight: 10,
} as const

export type HexagonalColumnOrientation = 'lying' | 'standing'

export const HEXAGONAL_COLUMN_CONFIGURATION = {
  defaultHeight: 8,
  minHeight: 1,
  maxHeight: 999,
  heightSliderMax: 200,
  defaultCount: 1,
  minCount: 1,
  defaultGap: 1,
  minGap: 1,
  maxGap: 99,
  gapSliderMax: 10,
  maxCount: 20,
  defaultOrientation: 'lying' as HexagonalColumnOrientation,
  endTransitionLength: 0.2,
  crossSectionRotationDegrees: 30,
  referenceCrossSectionExtentY: 4.243524,
  crossSectionExtentX: 4.243524,
  crossSectionExtentY: 4.7,
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
  opengrid: OPENGRID_CONFIGURATION,
  boxNormal: BOX_NORMAL_CONFIGURATION,
  opengridStackableBox: OPENGRID_STACKABLE_BOX_CONFIGURATION,
  opengridDivider: OPENGRID_DIVIDER_CONFIGURATION,
} as const

export type DimensionKey = 'width' | 'depth' | 'height'
export type GridParameterKey = 'rows' | 'columns'
export type BoxNormalParameterKey = 'x' | 'y' | 'height' | 'cornerPosts'
export type HexagonalColumnParameterKey =
  'height' | 'count' | 'gap' | 'orientation'
export type ModelParameterKey =
  | DimensionKey
  | GridParameterKey
  | BoxNormalParameterKey
  | HexagonalColumnParameterKey
  | OpenGridParameterKey
  | OpenGridStackableBoxParameterKey
  | OpenGridSnapParameterKey
  | OpenGridDividerParameterKey
  | PillarParameterKey
export type ScalarModelParameterKey =
  | DimensionKey
  | GridParameterKey
  | HexagonalColumnParameterKey
  | OpenGridDividerParameterKey
  | 'offset'
  | 'length'
export type ModelId =
  | 'box'
  | 'box-normal'
  | 'modular-grid-base'
  | 'hsw-cell'
  | 'hexagonal-column'
  | 'opengrid'
  | 'opengrid-stackable-box'
  | 'opengrid-snap'
  | 'opengrid-snap-remover'
  | 'opengrid-divider'
  | 'pillar'

export type BoxParameters = Record<DimensionKey, number>
export type ModularGridBaseParameters = Record<GridParameterKey, number>
export type HswCellParameters = Record<GridParameterKey, number>
export type BoxNormalParameters = {
  x: number
  y: number
  height: number
  cornerPosts: boolean
}
export type HexagonalColumnParameters = {
  height: number
  count: number
  gap: number
  orientation: HexagonalColumnOrientation
}
export type OpenGridSnapRemoverParameters = Record<never, never>

export type ModelParameters =
  | { modelId: 'box'; parameters: BoxParameters }
  | { modelId: 'box-normal'; parameters: BoxNormalParameters }
  | {
      modelId: 'modular-grid-base'
      parameters: ModularGridBaseParameters
    }
  | { modelId: 'hsw-cell'; parameters: HswCellParameters }
  | {
      modelId: 'hexagonal-column'
      parameters: HexagonalColumnParameters
    }
  | { modelId: 'opengrid'; parameters: OpenGridParameters }
  | {
      modelId: 'opengrid-stackable-box'
      parameters: OpenGridStackableBoxParameters
    }
  | { modelId: 'opengrid-snap'; parameters: OpenGridSnapParameters }
  | {
      modelId: 'opengrid-snap-remover'
      parameters: OpenGridSnapRemoverParameters
    }
  | {
      modelId: 'opengrid-divider'
      parameters: OpenGridDividerParameters
    }
  | { modelId: 'pillar'; parameters: PillarParameters }

export type ModelParameterValues = ModelParameters['parameters']

export type ModelBounds = {
  min: [number, number, number]
  max: [number, number, number]
}

export type BoxBounds = ModelBounds
export type BoxNormalBounds = ModelBounds

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

export type BoxNormalValidation =
  | { valid: true; value: BoxNormalParameters }
  | { valid: false; issues: ValidationIssue[] }

export type OpenGridStackableBoxModelValidation =
  | {
      valid: true
      value: {
        modelId: 'opengrid-stackable-box'
        parameters: OpenGridStackableBoxParameters
      }
    }
  | { valid: false; issues: ValidationIssue[] }

export type HexagonalColumnValidation =
  | { valid: true; value: HexagonalColumnParameters }
  | { valid: false; issues: ValidationIssue[] }

export type OpenGridSnapModelValidation = OpenGridSnapValidation
export type OpenGridDividerModelValidation =
  | {
      valid: true
      value: {
        modelId: 'opengrid-divider'
        parameters: OpenGridDividerParameters
      }
    }
  | { valid: false; issues: ValidationIssue[] }

export type OpenGridSnapRemoverValidation =
  | { valid: true; value: OpenGridSnapRemoverParameters }
  | { valid: false; issues: ValidationIssue[] }

export type PillarModelValidation =
  | {
      valid: true
      value: { modelId: 'pillar'; parameters: PillarParameters }
    }
  | { valid: false; issues: ValidationIssue[] }

export type HswCellOffset = [number, number]

export type ModelValidation =
  | { valid: true; value: ModelParameters }
  | { valid: false; issues: ValidationIssue[] }

const DIMENSIONS: DimensionKey[] = ['width', 'depth', 'height']
const GRID_PARAMETERS: GridParameterKey[] = ['rows', 'columns']
const BOX_NORMAL_PARAMETERS: BoxNormalParameterKey[] = [
  'x',
  'y',
  'height',
  'cornerPosts',
]
const HEXAGONAL_COLUMN_PARAMETERS: HexagonalColumnParameterKey[] = [
  'height',
  'count',
  'gap',
  'orientation',
]
const HEXAGONAL_COLUMN_REQUIRED_PARAMETERS: HexagonalColumnParameterKey[] = [
  'height',
  'count',
  'gap',
]

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  return (
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
  )
}

function hasOnlySupportedKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  return Object.keys(value).every((key) => keys.includes(key))
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

export function validateBoxNormalParameters(
  value: unknown,
): BoxNormalValidation {
  if (!value || typeof value !== 'object') {
    return {
      valid: false,
      issues: [{ field: 'parameters', message: '需要提供 box-normal 參數。' }],
    }
  }

  const candidate = value as Partial<Record<BoxNormalParameterKey, unknown>> &
    Record<string, unknown>
  const issues: ValidationIssue[] = []
  const configuration = BOX_NORMAL_CONFIGURATION

  if (!hasExactKeys(candidate, BOX_NORMAL_PARAMETERS)) {
    issues.push({ field: 'parameters', message: '包含不支援的參數欄位。' })
  }

  const integerFields: Array<{
    field: 'x' | 'y' | 'height'
    min: number
    max: number
    label: string
  }> = [
    {
      field: 'x',
      min: configuration.minX,
      max: configuration.maxX,
      label: 'X 格數',
    },
    {
      field: 'y',
      min: configuration.minY,
      max: configuration.maxY,
      label: 'Y 格數',
    },
    {
      field: 'height',
      min: configuration.minHeight,
      max: configuration.maxHeight,
      label: '盒體高度',
    },
  ]

  for (const { field, min, max, label } of integerFields) {
    const number = candidate[field]
    if (typeof number !== 'number' || !Number.isFinite(number)) {
      issues.push({ field, message: '必須是有限的整數。' })
      continue
    }
    if (!Number.isSafeInteger(number)) {
      issues.push({ field, message: '只接受安全範圍內的整數。' })
      continue
    }
    if (number < min || number > max) {
      issues.push({ field, message: `${label}必須介於 ${min}–${max}。` })
    }
  }

  if (typeof candidate.cornerPosts !== 'boolean') {
    issues.push({ field: 'cornerPosts', message: '必須是布林值。' })
  }

  if (issues.length > 0) return { valid: false, issues }

  return {
    valid: true,
    value: {
      x: candidate.x as number,
      y: candidate.y as number,
      height: candidate.height as number,
      cornerPosts: candidate.cornerPosts as boolean,
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

export function validateHexagonalColumnParameters(
  value: unknown,
): HexagonalColumnValidation {
  if (!value || typeof value !== 'object') {
    return {
      valid: false,
      issues: [{ field: 'parameters', message: '需要提供六角柱參數。' }],
    }
  }

  const candidate = value as Partial<
    Record<HexagonalColumnParameterKey, unknown>
  > &
    Record<string, unknown>
  const issues: ValidationIssue[] = []

  if (
    !hasOnlySupportedKeys(candidate, HEXAGONAL_COLUMN_PARAMETERS) ||
    !HEXAGONAL_COLUMN_REQUIRED_PARAMETERS.every((key) =>
      Object.prototype.hasOwnProperty.call(candidate, key),
    )
  ) {
    issues.push({ field: 'parameters', message: '包含不支援的參數欄位。' })
  }

  const height = candidate.height
  if (typeof height !== 'number' || !Number.isFinite(height)) {
    issues.push({ field: 'height', message: '必須是有限的整數。' })
  } else if (!Number.isSafeInteger(height)) {
    issues.push({ field: 'height', message: '只接受安全範圍內的整數 mm。' })
  } else if (
    height < HEXAGONAL_COLUMN_CONFIGURATION.minHeight ||
    height > HEXAGONAL_COLUMN_CONFIGURATION.maxHeight
  ) {
    issues.push({
      field: 'height',
      message: `必須介於 ${HEXAGONAL_COLUMN_CONFIGURATION.minHeight}–${HEXAGONAL_COLUMN_CONFIGURATION.maxHeight} mm。`,
    })
  }

  const count = candidate.count
  if (typeof count !== 'number' || !Number.isFinite(count)) {
    issues.push({ field: 'count', message: '必須是有限的整數。' })
  } else if (!Number.isSafeInteger(count)) {
    issues.push({ field: 'count', message: '只接受安全範圍內的整數格數。' })
  } else if (
    count < HEXAGONAL_COLUMN_CONFIGURATION.minCount ||
    count > HEXAGONAL_COLUMN_CONFIGURATION.maxCount
  ) {
    issues.push({
      field: 'count',
      message: `支數必須介於 ${HEXAGONAL_COLUMN_CONFIGURATION.minCount}–${HEXAGONAL_COLUMN_CONFIGURATION.maxCount}。`,
    })
  }

  const gap = candidate.gap
  if (typeof gap !== 'number' || !Number.isFinite(gap)) {
    issues.push({ field: 'gap', message: '必須是有限的整數 mm。' })
  } else if (!Number.isSafeInteger(gap)) {
    issues.push({ field: 'gap', message: '只接受安全範圍內的整數 mm。' })
  } else if (
    gap < HEXAGONAL_COLUMN_CONFIGURATION.minGap ||
    gap > HEXAGONAL_COLUMN_CONFIGURATION.maxGap
  ) {
    issues.push({
      field: 'gap',
      message: `間隙必須介於 ${HEXAGONAL_COLUMN_CONFIGURATION.minGap}–${HEXAGONAL_COLUMN_CONFIGURATION.maxGap} mm。`,
    })
  }

  const orientation =
    candidate.orientation ?? HEXAGONAL_COLUMN_CONFIGURATION.defaultOrientation
  if (orientation !== 'lying' && orientation !== 'standing') {
    issues.push({
      field: 'orientation',
      message: '擺放方向必須是 lying 或 standing。',
    })
  }

  if (issues.length > 0) return { valid: false, issues }

  const parameters: HexagonalColumnParameters = {
    height: height as number,
    count: count as number,
    gap: gap as number,
    orientation: orientation as HexagonalColumnOrientation,
  }
  const bounds = boundsForHexagonalColumn(parameters)
  const rowExtent = bounds.max[1] - bounds.min[1]
  let lengthExtent = bounds.max[2] - bounds.min[2]
  if (parameters.orientation === 'lying') {
    lengthExtent = bounds.max[0] - bounds.min[0]
  }
  const exceedsWorkspace =
    rowExtent > PROTOTYPE_CONFIGURATION.maxDimension ||
    lengthExtent > HEXAGONAL_COLUMN_CONFIGURATION.maxHeight

  if (exceedsWorkspace) {
    if (rowExtent > PROTOTYPE_CONFIGURATION.maxDimension) {
      issues.push({
        field: 'gap',
        message: `排列寬度不得超過 ${PROTOTYPE_CONFIGURATION.maxDimension} mm。`,
      })
    }
    if (lengthExtent > HEXAGONAL_COLUMN_CONFIGURATION.maxHeight) {
      issues.push({
        field: 'height',
        message: `高度不得超過 ${HEXAGONAL_COLUMN_CONFIGURATION.maxHeight} mm。`,
      })
    }
  }

  if (issues.length > 0) return { valid: false, issues }
  return { valid: true, value: parameters }
}

function isPlainEmptyObject(
  value: unknown,
): value is OpenGridSnapRemoverParameters {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) return false
  return Object.keys(value).length === 0
}

export function validateOpenGridSnapRemoverParameters(
  value: unknown,
): OpenGridSnapRemoverValidation {
  if (!isPlainEmptyObject(value)) {
    return {
      valid: false,
      issues: [{ field: 'parameters', message: '此 component 不接受參數。' }],
    }
  }

  return { valid: true, value }
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

  if (modelId === 'box-normal') {
    const validation = validateBoxNormalParameters(value)
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

  if (modelId === 'hexagonal-column') {
    const validation = validateHexagonalColumnParameters(value)
    if (!validation.valid) return validation
    return { valid: true, value: { modelId, parameters: validation.value } }
  }

  if (modelId === 'opengrid') {
    const validation = validateOpenGridParameters(value)
    if (!validation.valid) return validation
    return { valid: true, value: { modelId, parameters: validation.value } }
  }

  if (modelId === 'opengrid-stackable-box') {
    const validation = validateOpenGridStackableBoxParameters(value)
    if (!validation.valid) {
      return {
        valid: false,
        issues: validation.issues.map((issue) => ({
          field: issue.field,
          message: issue.message,
        })),
      }
    }
    return { valid: true, value: { modelId, parameters: validation.value } }
  }

  if (modelId === 'opengrid-snap') {
    const validation = validateOpenGridSnapParameters(value)
    if (!validation.valid) {
      return {
        valid: false,
        issues: validation.issues.map((issue) => ({
          field: issue.field as ValidationIssue['field'],
          message: issue.message,
        })),
      }
    }
    return { valid: true, value: { modelId, parameters: validation.value } }
  }

  if (modelId === 'opengrid-snap-remover') {
    const validation = validateOpenGridSnapRemoverParameters(value)
    if (!validation.valid) return validation
    return {
      valid: true,
      value: { modelId, parameters: validation.value },
    }
  }

  if (modelId === 'opengrid-divider') {
    const validation = validateOpenGridDividerParameters(value)
    if (!validation.valid) {
      return {
        valid: false,
        issues: validation.issues.map((issue) => ({
          field: issue.field,
          message: issue.message,
        })),
      }
    }
    return { valid: true, value: { modelId, parameters: validation.value } }
  }

  if (modelId === 'pillar') {
    const validation = validatePillarParameters(value)
    if (!validation.valid) {
      return {
        valid: false,
        issues: validation.issues.map((issue) => ({
          field: issue.field,
          message: issue.message,
        })),
      }
    }
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

export function boxNormalNominalFootprintFor(
  parameters: BoxNormalParameters,
): [number, number] {
  return [
    parameters.x * BOX_NORMAL_CONFIGURATION.gridX,
    parameters.y * BOX_NORMAL_CONFIGURATION.gridY,
  ]
}

export function boxNormalPostCentersFor(
  parameters: BoxNormalParameters,
): Array<[number, number]> {
  const xOffset = ((parameters.x - 1) * BOX_NORMAL_CONFIGURATION.gridX) / 2
  const yOffset = ((parameters.y - 1) * BOX_NORMAL_CONFIGURATION.gridY) / 2
  return [
    [-xOffset, -yOffset],
    [-xOffset, yOffset],
    [xOffset, -yOffset],
    [xOffset, yOffset],
  ]
}

export function boundsForBoxNormal(
  parameters: BoxNormalParameters,
): BoxNormalBounds {
  const [nominalWidth, nominalDepth] = boxNormalNominalFootprintFor(parameters)
  const width = nominalWidth - BOX_NORMAL_CONFIGURATION.clearanceTotal
  const depth = nominalDepth - BOX_NORMAL_CONFIGURATION.clearanceTotal
  const baseHeight = parameters.cornerPosts
    ? BOX_NORMAL_CONFIGURATION.cornerPostHeight
    : 0

  return {
    min: [-width / 2, -depth / 2, 0],
    max: [width / 2, depth / 2, baseHeight + parameters.height],
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

export function boundsForHexagonalColumn(
  parameters: HexagonalColumnParameters,
): ModelBounds {
  const rowExtent =
    HEXAGONAL_COLUMN_CONFIGURATION.crossSectionExtentY * parameters.count +
    parameters.gap * (parameters.count - 1)
  if (parameters.orientation === 'lying') {
    return {
      min: [-parameters.height / 2, -rowExtent / 2, 0],
      max: [
        parameters.height / 2,
        rowExtent / 2,
        HEXAGONAL_COLUMN_CONFIGURATION.crossSectionExtentX,
      ],
    }
  }

  return {
    min: [
      -HEXAGONAL_COLUMN_CONFIGURATION.crossSectionExtentX / 2,
      -rowExtent / 2,
      0,
    ],
    max: [
      HEXAGONAL_COLUMN_CONFIGURATION.crossSectionExtentX / 2,
      rowExtent / 2,
      parameters.height,
    ],
  }
}

export function boxFileName(parameters: BoxParameters): string {
  return `box-${parameters.width}x${parameters.depth}x${parameters.height}${PROTOTYPE_CONFIGURATION.stepExtension}`
}

export function boxStlFileName(parameters: BoxParameters): string {
  return `box-${parameters.width}x${parameters.depth}x${parameters.height}${PROTOTYPE_CONFIGURATION.stlExtension}`
}

export function boxNormalFileName(parameters: BoxNormalParameters): string {
  const postMode = parameters.cornerPosts ? 'posts' : 'plain'
  return `box-normal-${parameters.x}x${parameters.y}-h${parameters.height}-${postMode}${PROTOTYPE_CONFIGURATION.stepExtension}`
}

export function boxNormalStlFileName(parameters: BoxNormalParameters): string {
  const postMode = parameters.cornerPosts ? 'posts' : 'plain'
  return `box-normal-${parameters.x}x${parameters.y}-h${parameters.height}-${postMode}${PROTOTYPE_CONFIGURATION.stlExtension}`
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

export function hexagonalColumnFileName(
  parameters: HexagonalColumnParameters,
): string {
  return `hexagonal-column-${parameters.height}x${parameters.count}-g${parameters.gap}-${parameters.orientation}${PROTOTYPE_CONFIGURATION.stepExtension}`
}

export function hexagonalColumnStlFileName(
  parameters: HexagonalColumnParameters,
): string {
  return `hexagonal-column-${parameters.height}x${parameters.count}-g${parameters.gap}-${parameters.orientation}${PROTOTYPE_CONFIGURATION.stlExtension}`
}

export function openGridSnapRemoverFileName(
  parameters: OpenGridSnapRemoverParameters,
): string {
  if (!isOpenGridSnapRemoverParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-snap-remover')
  }
  return `snap remover${PROTOTYPE_CONFIGURATION.stepExtension}`
}

export function openGridSnapRemoverStlFileName(
  parameters: OpenGridSnapRemoverParameters,
): string {
  if (!isOpenGridSnapRemoverParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-snap-remover')
  }
  return `snap remover${PROTOTYPE_CONFIGURATION.stlExtension}`
}

export function boundsForOpenGridSnapRemover(
  parameters: OpenGridSnapRemoverParameters,
): ModelBounds {
  if (!isOpenGridSnapRemoverParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-snap-remover')
  }

  return {
    min: [-17.202743248030416, -20.00551582963562, -5.005506125135993],
    max: [21.276570355137718, 20.00551582963562, 5.005506125135993],
  }
}

export function isBoxParameters(value: unknown): value is BoxParameters {
  return validateBoxParameters(value).valid
}

export function isBoxNormalParameters(
  value: unknown,
): value is BoxNormalParameters {
  return validateBoxNormalParameters(value).valid
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

export function isHexagonalColumnParameters(
  value: unknown,
): value is HexagonalColumnParameters {
  return validateHexagonalColumnParameters(value).valid
}

export function isOpenGridModelParameters(
  value: unknown,
): value is OpenGridParameters {
  return isOpenGridParameters(value)
}

export function isOpenGridStackableBoxModelParameters(
  value: unknown,
): value is OpenGridStackableBoxParameters {
  return isOpenGridStackableBoxParameters(value)
}

export function isOpenGridSnapModelParameters(
  value: unknown,
): value is OpenGridSnapParameters {
  return isOpenGridSnapParameters(value)
}

export function isOpenGridSnapRemoverParameters(
  value: unknown,
): value is OpenGridSnapRemoverParameters {
  return validateOpenGridSnapRemoverParameters(value).valid
}

export function isOpenGridDividerModelParameters(
  value: unknown,
): value is OpenGridDividerParameters {
  return isOpenGridDividerParameters(value)
}

export function isPillarModelParameters(
  value: unknown,
): value is PillarParameters {
  return isPillarParameters(value)
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
    case 'box-normal':
      return boundsForBoxNormal(model.parameters)
    case 'modular-grid-base':
      return boundsForModularGridBase(model.parameters)
    case 'hsw-cell':
      return boundsForHswCell(model.parameters)
    case 'hexagonal-column':
      return boundsForHexagonalColumn(model.parameters)
    case 'opengrid':
      return boundsForOpenGrid(model.parameters)
    case 'opengrid-stackable-box':
      return boundsForOpenGridStackableBox(model.parameters)
    case 'opengrid-snap':
      return boundsForOpenGridSnap(model.parameters)
    case 'opengrid-snap-remover':
      return boundsForOpenGridSnapRemover(model.parameters)
    case 'opengrid-divider':
      return boundsForOpenGridDivider(model.parameters)
    case 'pillar':
      return boundsForPillar(model.parameters)
  }
}

export function modelFileName(model: ModelParameters): string {
  switch (model.modelId) {
    case 'box':
      return boxFileName(model.parameters)
    case 'box-normal':
      return boxNormalFileName(model.parameters)
    case 'modular-grid-base':
      return modularGridBaseFileName(model.parameters)
    case 'hsw-cell':
      return hswCellFileName(model.parameters)
    case 'hexagonal-column':
      return hexagonalColumnFileName(model.parameters)
    case 'opengrid':
      return openGridFileName(model.parameters)
    case 'opengrid-stackable-box':
      return openGridStackableBoxFileName(model.parameters)
    case 'opengrid-snap':
      return openGridSnapFileName(model.parameters)
    case 'opengrid-snap-remover':
      return openGridSnapRemoverFileName(model.parameters)
    case 'opengrid-divider':
      return openGridDividerFileName(model.parameters)
    case 'pillar':
      return pillarFileName(model.parameters)
  }
}

export function modelStlFileName(model: ModelParameters): string {
  switch (model.modelId) {
    case 'box':
      return boxStlFileName(model.parameters)
    case 'box-normal':
      return boxNormalStlFileName(model.parameters)
    case 'modular-grid-base':
      return modularGridBaseStlFileName(model.parameters)
    case 'hsw-cell':
      return hswCellStlFileName(model.parameters)
    case 'hexagonal-column':
      return hexagonalColumnStlFileName(model.parameters)
    case 'opengrid':
      return openGridStlFileName(model.parameters)
    case 'opengrid-stackable-box':
      return openGridStackableBoxStlFileName(model.parameters)
    case 'opengrid-snap':
      return openGridSnapStlFileName(model.parameters)
    case 'opengrid-snap-remover':
      return openGridSnapRemoverStlFileName(model.parameters)
    case 'opengrid-divider':
      return openGridDividerStlFileName(model.parameters)
    case 'pillar':
      return pillarStlFileName(model.parameters)
  }
}
