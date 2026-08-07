import {
  makeBox,
  makeCompound,
  makeCylinder,
  sketchRectangle,
  type Shape3D,
} from 'replicad'
import {
  PROTOTYPE_CONFIGURATION,
  type BoxBounds,
} from '../../../cad-contract/units'

export const OPENGRID_BENCHMARK_CONFIGURATION = {
  gridPitch: 28,
  workspaceMaxDimension: PROTOTYPE_CONFIGURATION.maxDimension,
  maxGridCount: Math.floor(PROTOTYPE_CONFIGURATION.maxDimension / 28),
  openingWidth: 16,
  openingDepth: 16,
  screwOffset: 9.5,
  balancedFuseBatchSize: 4,
  variants: {
    Full: { thickness: 6.8 },
    Lite: { thickness: 4 },
    Heavy: { thickness: 13.8 },
  },
  screwKinds: {
    'm3-through': {
      throughRadius: 1.6,
      counterboreRadius: null,
      counterboreDepth: null,
    },
    'm4-counterbore': {
      throughRadius: 2.1,
      counterboreRadius: 3.8,
      counterboreDepth: 1.5,
    },
    'm5-counterbore': {
      throughRadius: 2.7,
      counterboreRadius: 4.5,
      counterboreDepth: 2.2,
    },
  },
  connectorKinds: {
    none: { radius: 0, depth: 0 },
    small: { radius: 2.5, depth: 4 },
    large: { radius: 4.5, depth: 7 },
  },
} as const

export type OpenGridVariant =
  keyof typeof OPENGRID_BENCHMARK_CONFIGURATION.variants
export type OpenGridScrewKind =
  keyof typeof OPENGRID_BENCHMARK_CONFIGURATION.screwKinds
export type OpenGridConnectorHoles =
  keyof typeof OPENGRID_BENCHMARK_CONFIGURATION.connectorKinds
export type OpenGridScrewMode = 'none' | 'corners' | 'all' | 'custom'
export type OpenGridGeometryStrategy =
  'whole-profile' | 'row-block' | 'cell-balanced'

export type OpenGridScrewSlot =
  'south-west' | 'south-east' | 'north-west' | 'north-east'

export type OpenGridScrewPosition = {
  row: number
  column: number
  slot: OpenGridScrewSlot
}

export type OpenGridPreviewConfig = {
  tolerance: number
  angularTolerance: number
}

export type OpenGridBenchmarkRequest = {
  variant: OpenGridVariant
  rows: number
  columns: number
  screwMode: OpenGridScrewMode
  screwKind: OpenGridScrewKind
  customScrewPositions?: readonly OpenGridScrewPosition[]
  connectorHoles: OpenGridConnectorHoles
  previewConfig: OpenGridPreviewConfig
}

export type OpenGridBenchmarkBuildContext = {
  yieldToEventLoop?: () => Promise<void>
  isGenerationCurrent?: () => boolean
  reportProgress?: (progress: {
    stage: 'building'
    completed?: number
    total?: number
    unit?: 'cells' | 'batches' | 'steps'
  }) => void
  reportPhase?: (
    phase: 'profile' | 'extrude' | 'assembly-fuse' | 'boolean-cut',
    durationMs: number,
  ) => void
  reportPhaseStart?: (
    phase: 'profile' | 'extrude' | 'assembly-fuse' | 'boolean-cut',
  ) => void
}

export type OpenGridBoardConfiguration = {
  width: number
  depth: number
  height: number
}

type ProfileTimings = {
  profileMs: number
  extrudeMs: number
  assemblyFuseMs: number
  booleanCutMs: number
}

type Point2D = [number, number]

type CutterGroup = {
  shape: Shape3D
  parts: readonly Shape3D[]
}

const SCREW_SLOTS: Readonly<Record<OpenGridScrewSlot, Point2D>> = {
  'south-west': [
    -OPENGRID_BENCHMARK_CONFIGURATION.screwOffset,
    -OPENGRID_BENCHMARK_CONFIGURATION.screwOffset,
  ],
  'south-east': [
    OPENGRID_BENCHMARK_CONFIGURATION.screwOffset,
    -OPENGRID_BENCHMARK_CONFIGURATION.screwOffset,
  ],
  'north-west': [
    -OPENGRID_BENCHMARK_CONFIGURATION.screwOffset,
    OPENGRID_BENCHMARK_CONFIGURATION.screwOffset,
  ],
  'north-east': [
    OPENGRID_BENCHMARK_CONFIGURATION.screwOffset,
    OPENGRID_BENCHMARK_CONFIGURATION.screwOffset,
  ],
}

const SLOT_ORDER: readonly OpenGridScrewSlot[] = [
  'south-west',
  'south-east',
  'north-west',
  'north-east',
]

const SLOT_SET = new Set<OpenGridScrewSlot>(SLOT_ORDER)

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // Cleanup must not hide the primary geometry error.
  }
}

function assertPositiveInteger(value: number, name: string): void {
  if (
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > OPENGRID_BENCHMARK_CONFIGURATION.maxGridCount
  ) {
    throw new Error(`OPENGRID_INVALID_${name.toUpperCase()}`)
  }
}

function assertPreviewConfig(config: OpenGridPreviewConfig): void {
  if (
    !Number.isFinite(config.tolerance) ||
    config.tolerance <= 0 ||
    !Number.isFinite(config.angularTolerance) ||
    config.angularTolerance <= 0
  ) {
    throw new Error('OPENGRID_INVALID_PREVIEW_CONFIG')
  }
}

function assertScrewMode(mode: OpenGridScrewMode): void {
  if (!['none', 'corners', 'all', 'custom'].includes(mode)) {
    throw new Error('OPENGRID_INVALID_SCREW_MODE')
  }
}

function assertCustomPosition(
  position: OpenGridScrewPosition,
  rows: number,
  columns: number,
): void {
  if (
    !Number.isSafeInteger(position.row) ||
    position.row < 0 ||
    position.row >= rows ||
    !Number.isSafeInteger(position.column) ||
    position.column < 0 ||
    position.column >= columns ||
    !SLOT_SET.has(position.slot)
  ) {
    throw new Error('OPENGRID_INVALID_CUSTOM_SCREW_POSITION')
  }
}

export function normalizeOpenGridBenchmarkRequest(
  request: OpenGridBenchmarkRequest,
): OpenGridBenchmarkRequest {
  if (
    !Object.prototype.hasOwnProperty.call(
      OPENGRID_BENCHMARK_CONFIGURATION.variants,
      request.variant,
    )
  ) {
    throw new Error('OPENGRID_INVALID_VARIANT')
  }
  if (
    !Object.prototype.hasOwnProperty.call(
      OPENGRID_BENCHMARK_CONFIGURATION.screwKinds,
      request.screwKind,
    )
  ) {
    throw new Error('OPENGRID_INVALID_SCREW_KIND')
  }
  if (
    !Object.prototype.hasOwnProperty.call(
      OPENGRID_BENCHMARK_CONFIGURATION.connectorKinds,
      request.connectorHoles,
    )
  ) {
    throw new Error('OPENGRID_INVALID_CONNECTOR_KIND')
  }

  assertPositiveInteger(request.rows, 'rows')
  assertPositiveInteger(request.columns, 'columns')
  assertPreviewConfig(request.previewConfig)
  assertScrewMode(request.screwMode)

  const customScrewPositions = request.customScrewPositions
    ? request.customScrewPositions.map((position) => ({ ...position }))
    : undefined
  for (const position of customScrewPositions ?? []) {
    assertCustomPosition(position, request.rows, request.columns)
  }
  if (request.screwMode === 'custom' && !customScrewPositions) {
    throw new Error('OPENGRID_CUSTOM_SCREW_POSITIONS_REQUIRED')
  }

  return {
    ...request,
    customScrewPositions,
  }
}

export function openGridBoardConfiguration(
  request: Pick<OpenGridBenchmarkRequest, 'variant' | 'rows' | 'columns'>,
): OpenGridBoardConfiguration {
  const variant = OPENGRID_BENCHMARK_CONFIGURATION.variants[request.variant]
  return {
    width: request.columns * OPENGRID_BENCHMARK_CONFIGURATION.gridPitch,
    depth: request.rows * OPENGRID_BENCHMARK_CONFIGURATION.gridPitch,
    height: variant.thickness,
  }
}

export function expectedOpenGridBounds(
  request: Pick<OpenGridBenchmarkRequest, 'variant' | 'rows' | 'columns'>,
): BoxBounds {
  const board = openGridBoardConfiguration(request)
  return {
    min: [-board.width / 2, -board.depth / 2, 0],
    max: [board.width / 2, board.depth / 2, board.height],
  }
}

export function deterministicCustomScrewPositions(
  rows: number,
  columns: number,
): OpenGridScrewPosition[] {
  assertPositiveInteger(rows, 'rows')
  assertPositiveInteger(columns, 'columns')
  const positions: OpenGridScrewPosition[] = []
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if ((row * 3 + column * 5) % 4 !== 0) continue
      positions.push({ row, column, slot: 'north-east' })
    }
  }
  return positions
}

export function screwPositionsForRequest(
  request: OpenGridBenchmarkRequest,
): OpenGridScrewPosition[] {
  const normalized = normalizeOpenGridBenchmarkRequest(request)
  if (normalized.screwMode === 'none') return []
  if (normalized.screwMode === 'custom') {
    return [...(normalized.customScrewPositions ?? [])]
  }
  if (normalized.screwMode === 'all') {
    const positions: OpenGridScrewPosition[] = []
    for (let row = 0; row < normalized.rows; row += 1) {
      for (let column = 0; column < normalized.columns; column += 1) {
        for (const slot of SLOT_ORDER) {
          positions.push({ row, column, slot })
        }
      }
    }
    return positions
  }

  const corners: OpenGridScrewPosition[] = [
    { row: 0, column: 0, slot: 'south-west' },
    {
      row: 0,
      column: normalized.columns - 1,
      slot: 'south-east',
    },
    {
      row: normalized.rows - 1,
      column: 0,
      slot: 'north-west',
    },
    {
      row: normalized.rows - 1,
      column: normalized.columns - 1,
      slot: 'north-east',
    },
  ]
  const seen = new Set<string>()
  return corners.filter((position) => {
    const key = `${position.row}:${position.column}:${position.slot}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function cellCenter(
  request: OpenGridBenchmarkRequest,
  row: number,
  column: number,
): Point2D {
  const pitch = OPENGRID_BENCHMARK_CONFIGURATION.gridPitch
  return [
    (column - (request.columns - 1) / 2) * pitch,
    (row - (request.rows - 1) / 2) * pitch,
  ]
}

function screwCenter(
  request: OpenGridBenchmarkRequest,
  position: OpenGridScrewPosition,
): Point2D {
  const [cellX, cellY] = cellCenter(request, position.row, position.column)
  const [offsetX, offsetY] = SCREW_SLOTS[position.slot]
  return [cellX + offsetX, cellY + offsetY]
}

function createCompoundCutter(parts: Shape3D[]): CutterGroup | null {
  if (parts.length === 0) return null
  if (parts.length === 1) {
    return { shape: parts[0], parts }
  }
  try {
    const compound = makeCompound(parts).asShape3D()
    return { shape: compound, parts }
  } catch (error) {
    for (const part of parts) deleteShape(part)
    throw error
  }
}

function disposeCutter(group: CutterGroup | null): void {
  if (!group) return
  deleteShape(group.shape)
  for (const part of group.parts) {
    if (part !== group.shape) deleteShape(part)
  }
}

function createGridOpeningCutter(
  request: OpenGridBenchmarkRequest,
  context: OpenGridBenchmarkBuildContext,
): CutterGroup {
  const board = openGridBoardConfiguration(request)
  const parts: Shape3D[] = []
  try {
    for (let row = 0; row < request.rows; row += 1) {
      for (let column = 0; column < request.columns; column += 1) {
        assertGenerationCurrent(context)
        const [centerX, centerY] = cellCenter(request, row, column)
        parts.push(
          makeBox(
            [
              centerX - OPENGRID_BENCHMARK_CONFIGURATION.openingWidth / 2,
              centerY - OPENGRID_BENCHMARK_CONFIGURATION.openingDepth / 2,
              -1,
            ],
            [
              centerX + OPENGRID_BENCHMARK_CONFIGURATION.openingWidth / 2,
              centerY + OPENGRID_BENCHMARK_CONFIGURATION.openingDepth / 2,
              board.height + 1,
            ],
          ),
        )
      }
    }
    const group = createCompoundCutter(parts)
    if (!group) throw new Error('OPENGRID_OPENING_CUTTER_EMPTY')
    return group
  } catch (error) {
    for (const part of parts) deleteShape(part)
    throw error
  }
}

function createScrewCutterGroups(
  request: OpenGridBenchmarkRequest,
  context: OpenGridBenchmarkBuildContext,
): CutterGroup[] {
  const positions = screwPositionsForRequest(request)
  if (positions.length === 0) return []

  const board = openGridBoardConfiguration(request)
  const screw = OPENGRID_BENCHMARK_CONFIGURATION.screwKinds[request.screwKind]
  const throughParts: Shape3D[] = []
  const counterboreParts: Shape3D[] = []
  const groups: CutterGroup[] = []

  try {
    for (const position of positions) {
      assertGenerationCurrent(context)
      const [x, y] = screwCenter(request, position)
      throughParts.push(
        makeCylinder(screw.throughRadius, board.height + 2, [x, y, -1]),
      )
      if (screw.counterboreRadius !== null && screw.counterboreDepth !== null) {
        counterboreParts.push(
          makeCylinder(screw.counterboreRadius, screw.counterboreDepth, [
            x,
            y,
            board.height - screw.counterboreDepth,
          ]),
        )
      }
    }

    const through = createCompoundCutter(throughParts)
    if (through) groups.push(through)
    const counterbore = createCompoundCutter(counterboreParts)
    if (counterbore) groups.push(counterbore)
    return groups
  } catch (error) {
    for (const group of groups) disposeCutter(group)
    for (const part of throughParts) deleteShape(part)
    for (const part of counterboreParts) deleteShape(part)
    throw error
  }
}

function createConnectorCutter(
  request: OpenGridBenchmarkRequest,
  context: OpenGridBenchmarkBuildContext,
): CutterGroup | null {
  if (request.connectorHoles === 'none') return null

  const board = openGridBoardConfiguration(request)
  const connector =
    OPENGRID_BENCHMARK_CONFIGURATION.connectorKinds[request.connectorHoles]
  const parts: Shape3D[] = []
  const z = board.height / 2
  const yPositions = [
    -board.depth / 2 + OPENGRID_BENCHMARK_CONFIGURATION.gridPitch / 2,
    board.depth / 2 - OPENGRID_BENCHMARK_CONFIGURATION.gridPitch / 2,
  ]
  const xPositions = [
    -board.width / 2 + OPENGRID_BENCHMARK_CONFIGURATION.gridPitch / 2,
    board.width / 2 - OPENGRID_BENCHMARK_CONFIGURATION.gridPitch / 2,
  ]

  try {
    for (const y of yPositions) {
      assertGenerationCurrent(context)
      parts.push(
        makeCylinder(
          connector.radius,
          connector.depth + 1,
          [-board.width / 2 - 1, y, z],
          [1, 0, 0],
        ),
      )
      parts.push(
        makeCylinder(
          connector.radius,
          connector.depth + 1,
          [board.width / 2 + 1, y, z],
          [-1, 0, 0],
        ),
      )
    }
    for (const x of xPositions) {
      assertGenerationCurrent(context)
      parts.push(
        makeCylinder(
          connector.radius,
          connector.depth + 1,
          [x, -board.depth / 2 - 1, z],
          [0, 1, 0],
        ),
      )
      parts.push(
        makeCylinder(
          connector.radius,
          connector.depth + 1,
          [x, board.depth / 2 + 1, z],
          [0, -1, 0],
        ),
      )
    }
    return createCompoundCutter(parts)
  } catch (error) {
    for (const part of parts) deleteShape(part)
    throw error
  }
}

function assertGenerationCurrent(context: OpenGridBenchmarkBuildContext): void {
  if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
    throw new Error('STALE_GENERATION')
  }
}

async function yieldAtSafeBoundary(
  context: OpenGridBenchmarkBuildContext,
): Promise<void> {
  assertGenerationCurrent(context)
  await context.yieldToEventLoop?.()
  assertGenerationCurrent(context)
}

function reportProgress(
  context: OpenGridBenchmarkBuildContext,
  completed: number,
  total: number,
): void {
  context.reportProgress?.({
    stage: 'building',
    completed,
    total,
    unit: 'cells',
  })
}

function buildExtrudedRectangle(
  width: number,
  depth: number,
  height: number,
  origin: Point2D,
  timings: ProfileTimings,
  context: OpenGridBenchmarkBuildContext,
): Shape3D {
  context.reportPhaseStart?.('profile')
  const profileStartedAt = performance.now()
  let sketch: ReturnType<typeof sketchRectangle> | null = sketchRectangle(
    width,
    depth,
    {
      plane: 'XY',
      origin: [origin[0], origin[1], 0],
    },
  )
  timings.profileMs += performance.now() - profileStartedAt

  const extrudeStartedAt = performance.now()
  try {
    context.reportPhaseStart?.('extrude')
    const shape = sketch.extrude(height)
    sketch = null
    timings.extrudeMs += performance.now() - extrudeStartedAt
    return shape
  } catch (error) {
    deleteShape(sketch)
    throw error
  }
}

function cutShape(source: Shape3D, cutter: Shape3D): Shape3D {
  const result = source.cut(cutter, { optimisation: 'sameFace' })
  if (result !== source) deleteShape(source)
  return result
}

function buildCellTile(
  request: OpenGridBenchmarkRequest,
  row: number,
  column: number,
  timings: ProfileTimings,
  context: OpenGridBenchmarkBuildContext,
): Shape3D {
  const board = openGridBoardConfiguration(request)
  const [centerX, centerY] = cellCenter(request, row, column)
  let tile: Shape3D | null = null
  let opening: Shape3D | null = null

  try {
    assertGenerationCurrent(context)
    tile = buildExtrudedRectangle(
      OPENGRID_BENCHMARK_CONFIGURATION.gridPitch,
      OPENGRID_BENCHMARK_CONFIGURATION.gridPitch,
      board.height,
      [centerX, centerY],
      timings,
      context,
    )
    context.reportPhaseStart?.('boolean-cut')
    opening = makeBox(
      [
        centerX - OPENGRID_BENCHMARK_CONFIGURATION.openingWidth / 2,
        centerY - OPENGRID_BENCHMARK_CONFIGURATION.openingDepth / 2,
        -1,
      ],
      [
        centerX + OPENGRID_BENCHMARK_CONFIGURATION.openingWidth / 2,
        centerY + OPENGRID_BENCHMARK_CONFIGURATION.openingDepth / 2,
        board.height + 1,
      ],
    )
    const booleanStartedAt = performance.now()
    const cut = cutShape(tile, opening)
    timings.booleanCutMs += performance.now() - booleanStartedAt
    deleteShape(opening)
    tile = cut
    opening = null
    return cut
  } catch (error) {
    deleteShape(tile)
    throw error
  } finally {
    deleteShape(opening)
  }
}

class OwnedShapeGroup {
  private readonly shapes = new Set<Shape3D>()

  add(shape: Shape3D): void {
    this.shapes.add(shape)
  }

  remove(shape: Shape3D): void {
    this.shapes.delete(shape)
  }

  release(shape: Shape3D): void {
    if (!this.shapes.delete(shape)) return
    deleteShape(shape)
  }

  dispose(): void {
    for (const shape of this.shapes) deleteShape(shape)
    this.shapes.clear()
  }
}

async function cloneAndTranslate(
  shape: Shape3D,
  x: number,
  y: number,
  owned: OwnedShapeGroup,
  context: OpenGridBenchmarkBuildContext,
): Promise<Shape3D> {
  assertGenerationCurrent(context)
  context.reportPhaseStart?.('assembly-fuse')
  const clone = shape.clone()
  owned.add(clone)
  const translated = clone.translate(x, y, 0)
  if (translated !== clone) owned.release(clone)
  owned.add(translated)
  await yieldAtSafeBoundary(context)
  assertGenerationCurrent(context)
  return translated
}

async function fuseBalanced(
  shapes: Shape3D[],
  owned: OwnedShapeGroup,
  context: OpenGridBenchmarkBuildContext,
  timings: ProfileTimings,
): Promise<Shape3D> {
  let current = shapes
  while (current.length > 1) {
    assertGenerationCurrent(context)
    const next: Shape3D[] = []
    for (
      let start = 0;
      start < current.length;
      start += OPENGRID_BENCHMARK_CONFIGURATION.balancedFuseBatchSize
    ) {
      const batch = current.slice(
        start,
        start + OPENGRID_BENCHMARK_CONFIGURATION.balancedFuseBatchSize,
      )
      let combined = batch[0]
      if (!combined) throw new Error('OPENGRID_CELL_EMPTY')
      for (const shape of batch.slice(1)) {
        assertGenerationCurrent(context)
        context.reportPhaseStart?.('assembly-fuse')
        const fuseStartedAt = performance.now()
        const fused = combined.fuse(shape, { optimisation: 'sameFace' })
        timings.assemblyFuseMs += performance.now() - fuseStartedAt
        if (fused !== combined) owned.release(combined)
        if (fused !== shape) owned.release(shape)
        owned.add(fused)
        combined = fused
        await yieldAtSafeBoundary(context)
        assertGenerationCurrent(context)
      }
      next.push(combined)
    }
    current = next
  }

  const result = current[0]
  if (!result) throw new Error('OPENGRID_CELL_EMPTY')
  return result
}

async function buildCellBalancedAssembly(
  request: OpenGridBenchmarkRequest,
  context: OpenGridBenchmarkBuildContext,
  timings: ProfileTimings,
): Promise<Shape3D> {
  const owned = new OwnedShapeGroup()
  const cells: Shape3D[] = []
  const total = request.rows * request.columns
  let completed = 0

  try {
    reportProgress(context, 0, total)
    for (let row = 0; row < request.rows; row += 1) {
      for (let column = 0; column < request.columns; column += 1) {
        assertGenerationCurrent(context)
        const cell = buildCellTile(request, row, column, timings, context)
        owned.add(cell)
        cells.push(cell)
        completed += 1
        reportProgress(context, completed, total)
        await yieldAtSafeBoundary(context)
      }
    }
    const combined = await fuseBalanced(cells, owned, context, timings)
    owned.remove(combined)
    return combined
  } finally {
    owned.dispose()
  }
}

async function buildRowBlockAssembly(
  request: OpenGridBenchmarkRequest,
  context: OpenGridBenchmarkBuildContext,
  timings: ProfileTimings,
): Promise<Shape3D> {
  const owned = new OwnedShapeGroup()
  const firstRow = -(request.rows - 1) / 2
  const total = request.rows * request.columns
  let completed = 0

  try {
    reportProgress(context, 0, total)
    const firstRowCells: Shape3D[] = []
    for (let column = 0; column < request.columns; column += 1) {
      assertGenerationCurrent(context)
      const cell = buildCellTile(request, 0, column, timings, context)
      owned.add(cell)
      const [unusedX, firstRowY] = cellCenter(request, 0, column)
      void unusedX
      context.reportPhaseStart?.('assembly-fuse')
      const translated = cell.translate(
        0,
        firstRow * OPENGRID_BENCHMARK_CONFIGURATION.gridPitch - firstRowY,
        0,
      )
      if (translated !== cell) owned.release(cell)
      owned.add(translated)
      firstRowCells.push(translated)
      completed += 1
      reportProgress(context, completed, total)
      await yieldAtSafeBoundary(context)
    }

    const canonicalRow = await fuseBalanced(
      firstRowCells,
      owned,
      context,
      timings,
    )
    const rows: Shape3D[] = [canonicalRow]
    for (let row = 1; row < request.rows; row += 1) {
      assertGenerationCurrent(context)
      const targetY =
        (row - (request.rows - 1) / 2) *
        OPENGRID_BENCHMARK_CONFIGURATION.gridPitch
      const currentY = firstRow * OPENGRID_BENCHMARK_CONFIGURATION.gridPitch
      const translated = await cloneAndTranslate(
        canonicalRow,
        0,
        targetY - currentY,
        owned,
        context,
      )
      rows.push(translated)
      completed += request.columns
      reportProgress(context, completed, total)
    }

    const combined = await fuseBalanced(rows, owned, context, timings)
    owned.remove(combined)
    return combined
  } finally {
    owned.dispose()
  }
}

function buildWholeBoardProfile(
  request: OpenGridBenchmarkRequest,
  timings: ProfileTimings,
  context: OpenGridBenchmarkBuildContext,
): Shape3D {
  const board = openGridBoardConfiguration(request)
  return buildExtrudedRectangle(
    board.width,
    board.depth,
    board.height,
    [0, 0],
    timings,
    context,
  )
}

function applyBatchedCuts(
  source: Shape3D,
  request: OpenGridBenchmarkRequest,
  timings: ProfileTimings,
  includeGridOpenings: boolean,
  context: OpenGridBenchmarkBuildContext,
): Shape3D {
  let current = source
  const groups: CutterGroup[] = []
  try {
    assertGenerationCurrent(context)
    context.reportPhaseStart?.('boolean-cut')
    if (includeGridOpenings)
      groups.push(createGridOpeningCutter(request, context))
    groups.push(...createScrewCutterGroups(request, context))
    const connectors = createConnectorCutter(request, context)
    if (connectors) groups.push(connectors)

    while (groups.length > 0) {
      assertGenerationCurrent(context)
      const group = groups.shift()
      if (!group) continue
      context.reportPhaseStart?.('boolean-cut')
      const booleanStartedAt = performance.now()
      try {
        current = cutShape(current, group.shape)
        timings.booleanCutMs += performance.now() - booleanStartedAt
      } finally {
        disposeCutter(group)
      }
    }
    return current
  } catch (error) {
    for (const group of groups) disposeCutter(group)
    deleteShape(current)
    throw error
  }
}

function reportTimings(
  context: OpenGridBenchmarkBuildContext,
  timings: ProfileTimings,
  strategy: OpenGridGeometryStrategy,
): void {
  context.reportPhase?.('profile', timings.profileMs)
  context.reportPhase?.('extrude', timings.extrudeMs)
  if (strategy !== 'whole-profile' && timings.assemblyFuseMs > 0) {
    context.reportPhase?.('assembly-fuse', timings.assemblyFuseMs)
  }
  context.reportPhase?.('boolean-cut', timings.booleanCutMs)
}

export async function buildOpenGridBenchmarkShape(
  inputRequest: OpenGridBenchmarkRequest,
  strategy: OpenGridGeometryStrategy,
  context: OpenGridBenchmarkBuildContext = {},
): Promise<Shape3D> {
  const request = normalizeOpenGridBenchmarkRequest(inputRequest)
  const timings: ProfileTimings = {
    profileMs: 0,
    extrudeMs: 0,
    assemblyFuseMs: 0,
    booleanCutMs: 0,
  }
  let base: Shape3D | null = null
  try {
    assertGenerationCurrent(context)
    if (strategy === 'whole-profile') {
      base = buildWholeBoardProfile(request, timings, context)
      assertGenerationCurrent(context)
      base = applyBatchedCuts(base, request, timings, true, context)
    } else if (strategy === 'row-block') {
      base = await buildRowBlockAssembly(request, context, timings)
      base = applyBatchedCuts(base, request, timings, false, context)
    } else {
      base = await buildCellBalancedAssembly(request, context, timings)
      base = applyBatchedCuts(base, request, timings, false, context)
    }
    assertGenerationCurrent(context)
    reportTimings(context, timings, strategy)
    return base
  } catch (error) {
    deleteShape(base)
    throw error
  }
}
