export type OpenGridVariant = 'Full' | 'Lite' | 'Heavy'
export type OpenGridChamferMode = 'none' | 'corners' | 'everywhere'
export type OpenGridScrewKind = 'official-default' | 'custom'
export type OpenGridScrewMode =
  'none' | 'corners' | 'everywhere' | 'by-row-column' | 'custom'
export type OpenGridConnectorHoles = 'none' | 'enabled'
export type OpenGridConnectorSide = 'top' | 'right' | 'bottom' | 'left'

export type OpenGridParameterKey =
  | 'variant'
  | 'rows'
  | 'columns'
  | 'chamfers'
  | 'chamferCorners'
  | 'connectorHoles'
  | 'connectorSides'
  | 'screwKind'
  | 'screwMode'
  | 'screwEveryRows'
  | 'screwEveryColumns'
  | 'screwDiameter'
  | 'screwHeadDiameter'
  | 'screwHeadInset'
  | 'screwHeadIsCountersunk'
  | 'screwHeadCountersunkDegree'
  | 'customScrewPositions'

export type OpenGridScrewPosition = {
  /** Zero-based internal seam row, counted from the top of the board. */
  row: number
  /** Zero-based internal seam column, counted from the left of the board. */
  column: number
}

export type OpenGridCornerFlags = {
  topLeft: boolean
  topRight: boolean
  bottomLeft: boolean
  bottomRight: boolean
}

export type OpenGridSideFlags = {
  top: boolean
  right: boolean
  bottom: boolean
  left: boolean
}

export type OpenGridParameters = {
  variant: OpenGridVariant
  rows: number
  columns: number
  chamfers: OpenGridChamferMode
  chamferCorners: OpenGridCornerFlags
  connectorHoles: OpenGridConnectorHoles
  connectorSides: OpenGridSideFlags
  screwKind: OpenGridScrewKind
  screwMode: OpenGridScrewMode
  screwEveryRows: number
  screwEveryColumns: number
  screwDiameter: number
  screwHeadDiameter: number
  screwHeadInset: number
  screwHeadIsCountersunk: boolean
  screwHeadCountersunkDegree: number
  customScrewPositions: OpenGridScrewPosition[]
}

export type OpenGridScrewDimensions = {
  diameter: number
  headDiameter: number
  headInset: number
  headIsCountersunk: boolean
  headCountersunkDegree: number
}

export type OpenGridBoardConfiguration = {
  width: number
  depth: number
  height: number
}

export type OpenGridPoint2D = [number, number]
export type OpenGridDirection3D = [number, number, number]

export type OpenGridConnectorLocation = {
  side: OpenGridConnectorSide
  center: OpenGridPoint2D
  direction: OpenGridDirection3D
}

const DEFAULT_SCREW_DIMENSIONS: OpenGridScrewDimensions = {
  diameter: 4.1,
  headDiameter: 7.2,
  headInset: 1,
  headIsCountersunk: true,
  headCountersunkDegree: 90,
}

const DEFAULT_CHAMFER_CORNERS: OpenGridCornerFlags = {
  topLeft: true,
  topRight: true,
  bottomLeft: true,
  bottomRight: true,
}

const DEFAULT_CONNECTOR_SIDES: OpenGridSideFlags = {
  top: true,
  right: true,
  bottom: true,
  left: true,
}

export const OPENGRID_CONFIGURATION = {
  gridPitch: 28,
  workspaceMaxDimension: 500,
  maxGridCount: Math.floor(500 / 28),
  tileInnerSize: 25,
  outsideExtrusion: 0.8,
  insideGridTopChamfer: 0.4,
  insideGridMiddleChamfer: 1,
  topCaptureInitialInset: 2.4,
  cornerSquareThickness: 2.6,
  intersectionDistance: 4.2,
  heavyGap: 0.2,
  connector: {
    primaryRadius: 2.6,
    dimpleRadius: 2.7,
    separation: 2.5,
    cutoutHeight: 2.4,
    liteCutoutDistanceFromTop: 1,
  },
  balancedFuseBatchSize: 4,
  variants: {
    Full: { thickness: 6.8 },
    Lite: { thickness: 4 },
    Heavy: { thickness: 13.8 },
  } satisfies Record<OpenGridVariant, { thickness: number }>,
  defaultScrew: DEFAULT_SCREW_DIMENSIONS,
  defaultParameters: {
    variant: 'Lite' as OpenGridVariant,
    rows: 2,
    columns: 2,
    chamfers: 'corners' as OpenGridChamferMode,
    chamferCorners: DEFAULT_CHAMFER_CORNERS,
    connectorHoles: 'enabled' as OpenGridConnectorHoles,
    connectorSides: DEFAULT_CONNECTOR_SIDES,
    screwKind: 'official-default' as OpenGridScrewKind,
    screwMode: 'corners' as OpenGridScrewMode,
    screwEveryRows: 1,
    screwEveryColumns: 2,
    screwDiameter: DEFAULT_SCREW_DIMENSIONS.diameter,
    screwHeadDiameter: DEFAULT_SCREW_DIMENSIONS.headDiameter,
    screwHeadInset: DEFAULT_SCREW_DIMENSIONS.headInset,
    screwHeadIsCountersunk: DEFAULT_SCREW_DIMENSIONS.headIsCountersunk,
    screwHeadCountersunkDegree: DEFAULT_SCREW_DIMENSIONS.headCountersunkDegree,
    customScrewPositions: [] as OpenGridScrewPosition[],
  },
} as const

export const OPENGRID_CONNECTOR_SIDES: readonly OpenGridConnectorSide[] = [
  'top',
  'right',
  'bottom',
  'left',
]

const OPEN_GRID_PARAMETER_KEYS: readonly OpenGridParameterKey[] = [
  'variant',
  'rows',
  'columns',
  'chamfers',
  'chamferCorners',
  'connectorHoles',
  'connectorSides',
  'screwKind',
  'screwMode',
  'screwEveryRows',
  'screwEveryColumns',
  'screwDiameter',
  'screwHeadDiameter',
  'screwHeadInset',
  'screwHeadIsCountersunk',
  'screwHeadCountersunkDegree',
  'customScrewPositions',
]

export type OpenGridValidationIssue = {
  field: OpenGridParameterKey | 'parameters'
  message: string
}

export type OpenGridValidation =
  | { valid: true; value: OpenGridParameters }
  | { valid: false; issues: OpenGridValidationIssue[] }

export type OpenGridGenerationSupportValidation = OpenGridValidation

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  return (
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
  )
}

function isOpenGridVariant(value: unknown): value is OpenGridVariant {
  return value === 'Full' || value === 'Lite' || value === 'Heavy'
}

function isOpenGridChamferMode(value: unknown): value is OpenGridChamferMode {
  return value === 'none' || value === 'corners' || value === 'everywhere'
}

function isOpenGridScrewKind(value: unknown): value is OpenGridScrewKind {
  return value === 'official-default' || value === 'custom'
}

function isOpenGridScrewMode(value: unknown): value is OpenGridScrewMode {
  return (
    value === 'none' ||
    value === 'corners' ||
    value === 'everywhere' ||
    value === 'by-row-column' ||
    value === 'custom'
  )
}

function isOpenGridConnectorHoles(
  value: unknown,
): value is OpenGridConnectorHoles {
  return value === 'none' || value === 'enabled'
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isBooleanRecord(
  value: unknown,
  keys: readonly string[],
): value is Record<string, boolean> {
  if (!isRecord(value) || !hasExactKeys(value, keys)) return false
  return keys.every((key) => typeof value[key] === 'boolean')
}

function positionKey(position: OpenGridScrewPosition): string {
  return `${position.row}:${position.column}`
}

function comparePositions(
  first: OpenGridScrewPosition,
  second: OpenGridScrewPosition,
): number {
  if (first.row !== second.row) return first.row - second.row
  return first.column - second.column
}

function validatePosition(
  value: unknown,
  rows: number,
  columns: number,
): value is OpenGridScrewPosition {
  if (!isRecord(value) || !hasExactKeys(value, ['row', 'column'])) {
    return false
  }
  return (
    Number.isSafeInteger(value.row) &&
    (value.row as number) >= 0 &&
    (value.row as number) < Math.max(rows - 1, 0) &&
    Number.isSafeInteger(value.column) &&
    (value.column as number) >= 0 &&
    (value.column as number) < Math.max(columns - 1, 0)
  )
}

function areEqualScrewDimensions(
  value: OpenGridParameters,
  expected: OpenGridScrewDimensions,
): boolean {
  return (
    value.screwDiameter === expected.diameter &&
    value.screwHeadDiameter === expected.headDiameter &&
    value.screwHeadInset === expected.headInset &&
    value.screwHeadIsCountersunk === expected.headIsCountersunk &&
    value.screwHeadCountersunkDegree === expected.headCountersunkDegree
  )
}

export function validateOpenGridParameters(value: unknown): OpenGridValidation {
  if (!isRecord(value)) {
    return {
      valid: false,
      issues: [
        { field: 'parameters', message: '需要提供完整的 OpenGrid 參數。' },
      ],
    }
  }

  const issues: OpenGridValidationIssue[] = []
  if (!hasExactKeys(value, OPEN_GRID_PARAMETER_KEYS)) {
    issues.push({
      field: 'parameters',
      message:
        '包含不支援或缺少的 OpenGrid 參數欄位；請使用官方 SCAD 對應的欄位。',
    })
  }

  if (!isOpenGridVariant(value.variant)) {
    issues.push({
      field: 'variant',
      message: '板型必須是 Full、Lite 或 Heavy。',
    })
  }

  for (const field of ['rows', 'columns'] as const) {
    const count = value[field]
    if (!Number.isSafeInteger(count)) {
      issues.push({ field, message: '格數必須是安全範圍內的整數。' })
      continue
    }
    if (
      (count as number) < 1 ||
      (count as number) > OPENGRID_CONFIGURATION.maxGridCount
    ) {
      issues.push({
        field,
        message: `格數必須介於 1–${OPENGRID_CONFIGURATION.maxGridCount}。`,
      })
    }
  }

  if (!isOpenGridChamferMode(value.chamfers)) {
    issues.push({ field: 'chamfers', message: '倒角模式不受支援。' })
  }
  if (
    !isBooleanRecord(value.chamferCorners, [
      'topLeft',
      'topRight',
      'bottomLeft',
      'bottomRight',
    ])
  ) {
    issues.push({
      field: 'chamferCorners',
      message: '外角倒角旗標格式不正確。',
    })
  }

  if (!isOpenGridConnectorHoles(value.connectorHoles)) {
    issues.push({ field: 'connectorHoles', message: '連接孔模式不受支援。' })
  }
  if (
    !isBooleanRecord(value.connectorSides, ['top', 'right', 'bottom', 'left'])
  ) {
    issues.push({
      field: 'connectorSides',
      message: '連接孔側邊旗標格式不正確。',
    })
  }

  if (!isOpenGridScrewKind(value.screwKind)) {
    issues.push({ field: 'screwKind', message: '螺絲種類不受支援。' })
  }
  if (!isOpenGridScrewMode(value.screwMode)) {
    issues.push({ field: 'screwMode', message: '螺絲孔模式不受支援。' })
  }

  for (const field of ['screwEveryRows', 'screwEveryColumns'] as const) {
    const interval = value[field]
    if (
      !Number.isSafeInteger(interval) ||
      (interval as number) < 1 ||
      (interval as number) > OPENGRID_CONFIGURATION.maxGridCount
    ) {
      issues.push({ field, message: '螺絲孔間隔必須是 1–17 的整數。' })
    }
  }

  for (const field of [
    'screwDiameter',
    'screwHeadDiameter',
    'screwHeadInset',
    'screwHeadCountersunkDegree',
  ] as const) {
    if (!isFiniteNumber(value[field])) {
      issues.push({ field, message: '螺絲尺寸必須是有限數值。' })
    }
  }
  if (typeof value.screwHeadIsCountersunk !== 'boolean') {
    issues.push({
      field: 'screwHeadIsCountersunk',
      message: '是否沉頭必須是布林值。',
    })
  }

  const rowCount = Number.isSafeInteger(value.rows)
    ? (value.rows as number)
    : null
  const columnCount = Number.isSafeInteger(value.columns)
    ? (value.columns as number)
    : null
  const rowsAreValid = rowCount !== null && rowCount >= 1
  const columnsAreValid = columnCount !== null && columnCount >= 1
  const screwDiameter = isFiniteNumber(value.screwDiameter)
    ? value.screwDiameter
    : null
  const screwHeadDiameter = isFiniteNumber(value.screwHeadDiameter)
    ? value.screwHeadDiameter
    : null
  const screwHeadInset = isFiniteNumber(value.screwHeadInset)
    ? value.screwHeadInset
    : null
  const screwHeadCountersunkDegree = isFiniteNumber(
    value.screwHeadCountersunkDegree,
  )
    ? value.screwHeadCountersunkDegree
    : null
  const dimensionsAreValid =
    screwDiameter !== null &&
    screwHeadDiameter !== null &&
    screwHeadInset !== null &&
    screwHeadCountersunkDegree !== null

  if (dimensionsAreValid) {
    if (screwDiameter <= 0 || screwDiameter > screwHeadDiameter) {
      issues.push({
        field: 'screwDiameter',
        message: '螺絲通孔直徑必須大於 0 且不大於頭部直徑。',
      })
    }
    if (
      screwHeadDiameter <= 0 ||
      screwHeadDiameter > OPENGRID_CONFIGURATION.gridPitch
    ) {
      issues.push({
        field: 'screwHeadDiameter',
        message: '螺絲頭直徑必須大於 0 且不超過格距。',
      })
    }
    if (screwHeadInset < 0) {
      issues.push({
        field: 'screwHeadInset',
        message: '螺絲頭內縮不可小於 0。',
      })
    }
    if (screwHeadCountersunkDegree <= 0 || screwHeadCountersunkDegree >= 180) {
      issues.push({
        field: 'screwHeadCountersunkDegree',
        message: '沉頭角度必須介於 0–180 度之間。',
      })
    }
    if (
      isOpenGridVariant(value.variant) &&
      screwHeadInset > OPENGRID_CONFIGURATION.variants[value.variant].thickness
    ) {
      issues.push({
        field: 'screwHeadInset',
        message: '螺絲頭內縮不可超過板材厚度。',
      })
    }
  }

  if (value.screwKind === 'official-default' && dimensionsAreValid) {
    const candidate = {
      screwDiameter,
      screwHeadDiameter,
      screwHeadInset,
      screwHeadIsCountersunk: value.screwHeadIsCountersunk,
      screwHeadCountersunkDegree,
    } as OpenGridParameters
    if (!areEqualScrewDimensions(candidate, DEFAULT_SCREW_DIMENSIONS)) {
      issues.push({
        field: 'screwKind',
        message:
          'official-default 必須使用官方 SCAD 的螺絲尺寸；其他尺寸請選 custom。',
      })
    }
  }

  const customPositions = value.customScrewPositions
  const positions: OpenGridScrewPosition[] = []
  if (!Array.isArray(customPositions)) {
    issues.push({
      field: 'customScrewPositions',
      message: 'customScrewPositions 必須是陣列。',
    })
  } else if (rowsAreValid && columnsAreValid) {
    const seen = new Set<string>()
    for (const position of customPositions) {
      if (
        !validatePosition(
          position,
          value.rows as number,
          value.columns as number,
        )
      ) {
        issues.push({
          field: 'customScrewPositions',
          message: '自訂螺絲孔位必須位於內部交界格點。',
        })
        continue
      }
      const normalizedPosition = {
        row: position.row,
        column: position.column,
      }
      const key = positionKey(normalizedPosition)
      if (seen.has(key)) {
        issues.push({
          field: 'customScrewPositions',
          message: '自訂螺絲孔位不可重複。',
        })
        continue
      }
      seen.add(key)
      positions.push(normalizedPosition)
    }
  }

  if (value.screwMode !== 'custom' && positions.length > 0) {
    issues.push({
      field: 'customScrewPositions',
      message: '只有 custom 模式可以保存自訂螺絲孔位。',
    })
  }

  if (issues.length > 0) return { valid: false, issues }

  return {
    valid: true,
    value: {
      variant: value.variant as OpenGridVariant,
      rows: value.rows as number,
      columns: value.columns as number,
      chamfers: value.chamfers as OpenGridChamferMode,
      chamferCorners: { ...(value.chamferCorners as OpenGridCornerFlags) },
      connectorHoles: value.connectorHoles as OpenGridConnectorHoles,
      connectorSides: { ...(value.connectorSides as OpenGridSideFlags) },
      screwKind: value.screwKind as OpenGridScrewKind,
      screwMode: value.screwMode as OpenGridScrewMode,
      screwEveryRows: value.screwEveryRows as number,
      screwEveryColumns: value.screwEveryColumns as number,
      screwDiameter: value.screwDiameter as number,
      screwHeadDiameter: value.screwHeadDiameter as number,
      screwHeadInset: value.screwHeadInset as number,
      screwHeadIsCountersunk: value.screwHeadIsCountersunk as boolean,
      screwHeadCountersunkDegree: value.screwHeadCountersunkDegree as number,
      customScrewPositions: positions.sort(comparePositions),
    },
  }
}

export function normalizeOpenGridParameters(
  value: unknown,
): OpenGridParameters {
  const validation = validateOpenGridParameters(value)
  if (!validation.valid) throw new Error('OPENGRID_PARAMETERS_INVALID')
  return validation.value
}

export function isOpenGridParameters(
  value: unknown,
): value is OpenGridParameters {
  return validateOpenGridParameters(value).valid
}

export function validateOpenGridGenerationSupport(
  value: unknown,
): OpenGridGenerationSupportValidation {
  return validateOpenGridParameters(value)
}

export function isOpenGridGenerationSupported(
  parameters: OpenGridParameters,
): boolean {
  return validateOpenGridGenerationSupport(parameters).valid
}

export function openGridBoardConfiguration(
  parameters: Pick<OpenGridParameters, 'variant' | 'rows' | 'columns'>,
): OpenGridBoardConfiguration {
  return {
    width: parameters.columns * OPENGRID_CONFIGURATION.gridPitch,
    depth: parameters.rows * OPENGRID_CONFIGURATION.gridPitch,
    height: OPENGRID_CONFIGURATION.variants[parameters.variant].thickness,
  }
}

export function boundsForOpenGrid(
  parameters: Pick<OpenGridParameters, 'variant' | 'rows' | 'columns'>,
) {
  const board = openGridBoardConfiguration(parameters)
  return {
    min: [-board.width / 2, -board.depth / 2, 0] as [number, number, number],
    max: [board.width / 2, board.depth / 2, board.height] as [
      number,
      number,
      number,
    ],
  }
}

export function cellCenterForOpenGrid(
  parameters: Pick<OpenGridParameters, 'rows' | 'columns'>,
  row: number,
  column: number,
): OpenGridPoint2D {
  return [
    (column - (parameters.columns - 1) / 2) * OPENGRID_CONFIGURATION.gridPitch,
    ((parameters.rows - 1) / 2 - row) * OPENGRID_CONFIGURATION.gridPitch,
  ]
}

export function openGridScrewLatticeDimensions(
  parameters: Pick<OpenGridParameters, 'rows' | 'columns'>,
): { rows: number; columns: number } {
  return {
    rows: Math.max(parameters.rows - 1, 0),
    columns: Math.max(parameters.columns - 1, 0),
  }
}

export function screwCenterForOpenGrid(
  parameters: Pick<OpenGridParameters, 'rows' | 'columns'>,
  position: OpenGridScrewPosition,
): OpenGridPoint2D {
  return [
    (position.column - (parameters.columns - 2) / 2) *
      OPENGRID_CONFIGURATION.gridPitch,
    ((parameters.rows - 2) / 2 - position.row) *
      OPENGRID_CONFIGURATION.gridPitch,
  ]
}

export function deterministicOpenGridCustomScrewPositions(
  rows: number,
  columns: number,
): OpenGridScrewPosition[] {
  if (
    !Number.isSafeInteger(rows) ||
    !Number.isSafeInteger(columns) ||
    rows < 1 ||
    columns < 1 ||
    rows > OPENGRID_CONFIGURATION.maxGridCount ||
    columns > OPENGRID_CONFIGURATION.maxGridCount
  ) {
    throw new Error('OPENGRID_INVALID_GRID')
  }
  const positions: OpenGridScrewPosition[] = []
  for (let row = 0; row < rows - 1; row += 1) {
    for (let column = 0; column < columns - 1; column += 1) {
      if ((row * 3 + column * 5) % 4 === 0) {
        positions.push({ row, column })
      }
    }
  }
  return positions
}

function allInternalScrewPositions(
  parameters: Pick<OpenGridParameters, 'rows' | 'columns'>,
): OpenGridScrewPosition[] {
  const lattice = openGridScrewLatticeDimensions(parameters)
  const positions: OpenGridScrewPosition[] = []
  for (let row = 0; row < lattice.rows; row += 1) {
    for (let column = 0; column < lattice.columns; column += 1) {
      positions.push({ row, column })
    }
  }
  return positions
}

function addUniquePosition(
  positions: OpenGridScrewPosition[],
  seen: Set<string>,
  position: OpenGridScrewPosition,
): void {
  const key = positionKey(position)
  if (seen.has(key)) return
  seen.add(key)
  positions.push(position)
}

function positionsByRowAndColumn(
  parameters: Pick<
    OpenGridParameters,
    'rows' | 'columns' | 'screwEveryRows' | 'screwEveryColumns'
  >,
): OpenGridScrewPosition[] {
  const lattice = openGridScrewLatticeDimensions(parameters)
  if (lattice.rows === 0 || lattice.columns === 0) return []

  const rowInterval = Math.max(1, parameters.screwEveryRows)
  const columnInterval = Math.max(1, parameters.screwEveryColumns)

  // BOSL2's grid_copies(size=[(count-1)*pitch], spacing=interval*pitch)
  // centers the copy list first and then applies the source's half-pitch
  // parity translation. Convert those world positions back to our stable
  // top-to-bottom/left-to-right internal-intersection indices.
  function axisIndices(
    intersectionCount: number,
    interval: number,
    direction: 'row' | 'column',
  ): number[] {
    const span = intersectionCount - 1
    const copyCount = Math.floor(span / interval) + 1
    const centeredOffset = ((copyCount - 1) * interval) / 2
    const halfPitchTranslation =
      span % interval === 0 ? 0 : direction === 'column' ? -0.5 : 0.5
    const indices: number[] = []
    for (let copy = 0; copy < copyCount; copy += 1) {
      const coordinate =
        -centeredOffset + copy * interval + halfPitchTranslation
      const index =
        direction === 'column' ? coordinate + span / 2 : span / 2 - coordinate
      if (Number.isSafeInteger(index)) indices.push(index)
    }
    return indices.sort((first, second) => first - second)
  }

  const rows = axisIndices(lattice.rows, rowInterval, 'row')
  const columns = axisIndices(lattice.columns, columnInterval, 'column')
  return rows.flatMap((row) => columns.map((column) => ({ row, column })))
}

export function openGridScrewPositionsFor(
  parameters: OpenGridParameters,
): OpenGridScrewPosition[] {
  if (parameters.screwMode === 'none') return []
  if (parameters.screwMode === 'custom') {
    return parameters.customScrewPositions.map((position) => ({ ...position }))
  }
  if (parameters.screwMode === 'everywhere') {
    return allInternalScrewPositions(parameters)
  }
  if (parameters.screwMode === 'by-row-column') {
    return positionsByRowAndColumn(parameters)
  }

  const lattice = openGridScrewLatticeDimensions(parameters)
  const positions: OpenGridScrewPosition[] = []
  const seen = new Set<string>()
  const cornerRows = lattice.rows === 0 ? [] : [0, lattice.rows - 1]
  const cornerColumns = lattice.columns === 0 ? [] : [0, lattice.columns - 1]
  for (const row of cornerRows) {
    for (const column of cornerColumns) {
      addUniquePosition(positions, seen, { row, column })
    }
  }
  return positions.sort(comparePositions)
}

export function openGridScrewCentersFor(
  parameters: OpenGridParameters,
): OpenGridPoint2D[] {
  if (parameters.screwMode !== 'corners') {
    return openGridScrewPositionsFor(parameters).map((position) =>
      screwCenterForOpenGrid(parameters, position),
    )
  }

  const board = openGridBoardConfiguration(parameters)
  const xCandidates = [
    -board.width / 2 + OPENGRID_CONFIGURATION.gridPitch,
    board.width / 2 - OPENGRID_CONFIGURATION.gridPitch,
  ]
  const yCandidates = [
    -board.depth / 2 + OPENGRID_CONFIGURATION.gridPitch,
    board.depth / 2 - OPENGRID_CONFIGURATION.gridPitch,
  ]
  const centers: OpenGridPoint2D[] = []
  const seen = new Set<string>()
  for (const x of xCandidates) {
    for (const y of yCandidates) {
      const key = `${x}:${y}`
      if (seen.has(key)) continue
      seen.add(key)
      centers.push([x, y])
    }
  }
  return centers
}

function seamCoordinates(count: number): number[] {
  const positions: number[] = []
  for (let index = 0; index < Math.max(count - 1, 0); index += 1) {
    positions.push((index - (count - 2) / 2) * OPENGRID_CONFIGURATION.gridPitch)
  }
  return positions
}

export function openGridConnectorLocationsFor(
  parameters: Pick<
    OpenGridParameters,
    'rows' | 'columns' | 'connectorHoles' | 'connectorSides'
  >,
): OpenGridConnectorLocation[] {
  if (parameters.connectorHoles === 'none') return []
  const board = openGridBoardConfiguration({
    variant: 'Full',
    rows: parameters.rows,
    columns: parameters.columns,
  })
  const locations: OpenGridConnectorLocation[] = []
  const addSide = (
    side: OpenGridConnectorSide,
    center: OpenGridPoint2D,
    direction: OpenGridDirection3D,
  ) => {
    locations.push({ side, center, direction })
  }

  if (parameters.connectorSides.top) {
    for (const x of seamCoordinates(parameters.columns)) {
      addSide('top', [x, board.depth / 2], [0, -1, 0])
    }
  }
  if (parameters.connectorSides.right) {
    for (const y of seamCoordinates(parameters.rows)) {
      addSide('right', [board.width / 2, y], [-1, 0, 0])
    }
  }
  if (parameters.connectorSides.bottom) {
    for (const x of seamCoordinates(parameters.columns)) {
      addSide('bottom', [x, -board.depth / 2], [0, 1, 0])
    }
  }
  if (parameters.connectorSides.left) {
    for (const y of seamCoordinates(parameters.rows)) {
      addSide('left', [-board.width / 2, y], [1, 0, 0])
    }
  }
  return locations
}

function fnv1a(value: string): string {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

export function openGridCustomPositionFingerprint(
  parameters: Pick<OpenGridParameters, 'screwMode' | 'customScrewPositions'>,
): string {
  if (parameters.screwMode !== 'custom') return 'none'
  return fnv1a(parameters.customScrewPositions.map(positionKey).join('|'))
}

function buildOpenGridFileName(
  parameters: OpenGridParameters,
  extension: '.step' | '.stl',
): string {
  const fingerprint =
    parameters.screwMode === 'custom'
      ? `-${openGridCustomPositionFingerprint(parameters)}`
      : ''
  return `opengrid-${parameters.variant.toLowerCase()}-${parameters.columns}x${parameters.rows}-${parameters.screwKind}-${parameters.screwMode}-${parameters.chamfers}-${parameters.connectorHoles}${fingerprint}${extension}`
}

export function openGridFileName(parameters: OpenGridParameters): string {
  return buildOpenGridFileName(parameters, '.step')
}

export function openGridStlFileName(parameters: OpenGridParameters): string {
  return buildOpenGridFileName(parameters, '.stl')
}
