import { getOC, makeCylinder, Sketcher, Solid, type Shape3D } from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import {
  OPENGRID_DIVIDER_CONFIGURATION,
  openGridDividerPegCentersFor,
  openGridDividerTransitionHeightFor,
  validateOpenGridDividerParameters,
  type OpenGridDividerParameters,
} from '../../../cad-contract/units'

export type OpenGridDividerBuildContext = {
  yieldToEventLoop?: () => Promise<void>
  isGenerationCurrent?: () => boolean
  reportProgress?: (progress: {
    stage: 'building'
    completed?: number
    total?: number
    unit?: 'steps'
  }) => void
}

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // Cleanup must not replace the original geometry error.
  }
}

function assertGenerationCurrent(context: OpenGridDividerBuildContext): void {
  if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
    throw new Error('STALE_GENERATION')
  }
}

async function yieldAtSafeBoundary(
  context: OpenGridDividerBuildContext,
): Promise<void> {
  await context.yieldToEventLoop?.()
}

function reportProgress(
  context: OpenGridDividerBuildContext,
  completed: number,
  total: number,
): void {
  context.reportProgress?.({
    stage: 'building',
    completed,
    total,
    unit: 'steps',
  })
}

const FILLET_RADIUS_EPSILON = 0.0001
const FILLET_RADIUS_SAFETY_MARGIN =
  OPENGRID_DIVIDER_CONFIGURATION.geometrySafetyMargin

function boundedRadius(nominalRadius: number, maximumRadius: number): number {
  return Math.max(
    0,
    Math.min(nominalRadius, maximumRadius - FILLET_RADIUS_SAFETY_MARGIN),
  )
}

function transitionSupportHeightFor(
  parameters: OpenGridDividerParameters,
): number {
  return openGridDividerTransitionHeightFor(parameters) > FILLET_RADIUS_EPSILON
    ? OPENGRID_DIVIDER_CONFIGURATION.geometrySafetyMargin
    : 0
}

function upperStraightHeightForGeometry(
  parameters: OpenGridDividerParameters,
): number {
  return Math.max(
    0,
    parameters.height -
      openGridDividerTransitionHeightFor(parameters) -
      transitionSupportHeightFor(parameters),
  )
}

function sideFilletRadiusForGeometry(
  parameters: OpenGridDividerParameters,
): number {
  const { sideFilletRadius } = OPENGRID_DIVIDER_CONFIGURATION
  const localRadius = Math.max(
    0,
    Math.min(
      sideFilletRadius,
      parameters.wallThickness / 2 - FILLET_RADIUS_EPSILON,
      parameters.height / 2 - FILLET_RADIUS_SAFETY_MARGIN,
    ),
  )
  const topRadius = topFilletRadiusForGeometry(parameters)
  const transitionHeight = openGridDividerTransitionHeightFor(parameters)
  if (transitionHeight <= FILLET_RADIUS_EPSILON) return localRadius
  const upperStraightHeight = upperStraightHeightForGeometry(parameters)
  return Math.min(
    localRadius,
    Math.max(0, topRadius - FILLET_RADIUS_SAFETY_MARGIN),
    Math.max(0, upperStraightHeight - FILLET_RADIUS_SAFETY_MARGIN),
  )
}

function topFilletRadiusForGeometry(
  parameters: OpenGridDividerParameters,
): number {
  const { topFilletRadius } = OPENGRID_DIVIDER_CONFIGURATION
  const upperStraightHeight = upperStraightHeightForGeometry(parameters)
  return boundedRadius(
    topFilletRadius,
    Math.min(parameters.wallThickness / 2, upperStraightHeight / 2),
  )
}

function transitionFilletRadiusForGeometry(
  parameters: OpenGridDividerParameters,
): number {
  const transitionHeight = openGridDividerTransitionHeightFor(parameters)
  if (transitionHeight <= FILLET_RADIUS_EPSILON) return 0
  const maximumRadius = Math.min(
    parameters.wallThickness / 2,
    transitionHeight / 2,
  )
  return Math.max(
    0,
    Math.min(
      OPENGRID_DIVIDER_CONFIGURATION.transitionFilletRadius,
      maximumRadius - FILLET_RADIUS_EPSILON,
    ),
  )
}

function filletRadiusForEdge(
  edge: {
    startPoint: { x?: number; y?: number; z?: number; delete: () => void }
    endPoint: { x?: number; y?: number; z?: number; delete: () => void }
  },
  parameters: OpenGridDividerParameters,
  armAxis: 'x' | 'y',
  tolerance = 0.02,
): number | null {
  const start = edge.startPoint
  const end = edge.endPoint
  try {
    const atTop =
      start.z !== undefined &&
      end.z !== undefined &&
      Math.abs(start.z - parameters.height) <= tolerance &&
      Math.abs(end.z - parameters.height) <= tolerance &&
      (armAxis === 'x'
        ? Math.abs((end.x ?? 0) - (start.x ?? 0))
        : Math.abs((end.y ?? 0) - (start.y ?? 0))) > tolerance
    if (atTop) {
      return topFilletRadiusForGeometry(parameters)
    }

    const isVertical =
      start.x !== undefined &&
      end.x !== undefined &&
      start.y !== undefined &&
      end.y !== undefined &&
      start.z !== undefined &&
      end.z !== undefined &&
      Math.abs(start.x - end.x) <= tolerance &&
      Math.abs(start.y - end.y) <= tolerance &&
      Math.abs(start.z - end.z) > tolerance
    if (isVertical) {
      const transitionHeight = openGridDividerTransitionHeightFor(parameters)
      const lowerZ = Math.min(start.z ?? 0, end.z ?? 0)
      if (transitionHeight > FILLET_RADIUS_EPSILON && lowerZ <= tolerance) {
        return null
      }
      return sideFilletRadiusForGeometry(parameters)
    }

    const armCoordinateDelta =
      armAxis === 'x'
        ? Math.abs((end.x ?? 0) - (start.x ?? 0))
        : Math.abs((end.y ?? 0) - (start.y ?? 0))
    const transverseCoordinateDelta =
      armAxis === 'x'
        ? Math.abs((end.y ?? 0) - (start.y ?? 0))
        : Math.abs((end.x ?? 0) - (start.x ?? 0))
    const isTransitionSlope =
      armCoordinateDelta <= tolerance &&
      transverseCoordinateDelta > tolerance &&
      start.z !== undefined &&
      end.z !== undefined &&
      Math.abs(end.z - start.z) > tolerance
    if (isTransitionSlope) {
      return transitionFilletRadiusForGeometry(parameters)
    }

    return null
  } finally {
    start.delete()
    end.delete()
  }
}

function rawPlanCenter(
  parameters: OpenGridDividerParameters,
): [number, number] {
  const { gridPitch, wallWidth } = OPENGRID_DIVIDER_CONFIGURATION
  const minX = Math.min(-parameters.left * gridPitch, -wallWidth / 2)
  const maxX = Math.max(parameters.right * gridPitch, wallWidth / 2)
  const minY = Math.min(-parameters.down * gridPitch, -wallWidth / 2)
  const maxY = Math.max(parameters.up * gridPitch, wallWidth / 2)
  return [(minX + maxX) / 2, (minY + maxY) / 2]
}

type DividerProfilePlane = 'YZ' | 'XZ'

function makeProfiledArm(
  parameters: OpenGridDividerParameters,
  plane: DividerProfilePlane,
  origin: [number, number, number],
  distance: number,
  direction: [number, number, number],
): Shape3D {
  const { wallWidth } = OPENGRID_DIVIDER_CONFIGURATION
  const halfBaseWidth = wallWidth / 2
  const halfWallThickness = parameters.wallThickness / 2
  const transitionHeight = openGridDividerTransitionHeightFor(parameters)
  const baseSupportHeight = transitionSupportHeightFor(parameters)
  const upperStartHeight = baseSupportHeight + transitionHeight
  const upperStraightHeight = parameters.height - upperStartHeight
  const sketcher = new Sketcher(plane, origin)
  let sketch: ReturnType<Sketcher['close']> | null = null

  try {
    sketcher.movePointerTo([-halfBaseWidth, 0])
    sketcher.lineTo([halfBaseWidth, 0])

    if (transitionHeight <= FILLET_RADIUS_EPSILON) {
      sketcher.lineTo([halfWallThickness, parameters.height])
      sketcher.lineTo([-halfWallThickness, parameters.height])
      sketcher.lineTo([-halfWallThickness, 0])
    } else {
      sketcher.lineTo([halfBaseWidth, baseSupportHeight])
      sketcher.lineTo([halfWallThickness, upperStartHeight])
      if (upperStraightHeight > FILLET_RADIUS_EPSILON) {
        sketcher.lineTo([halfWallThickness, parameters.height])
      }
      sketcher.lineTo([-halfWallThickness, parameters.height])
      if (upperStraightHeight > FILLET_RADIUS_EPSILON) {
        sketcher.lineTo([-halfWallThickness, upperStartHeight])
      }
      sketcher.lineTo([-halfBaseWidth, baseSupportHeight])
      sketcher.lineTo([-halfBaseWidth, 0])
    }

    sketch = sketcher.close()
    return sketch.extrude(distance, { extrusionDirection: direction })
  } finally {
    deleteShape(sketch)
    sketcher.delete()
  }
}

function makeHorizontalWall(parameters: OpenGridDividerParameters): Shape3D {
  const { gridPitch } = OPENGRID_DIVIDER_CONFIGURATION
  return makeProfiledArm(
    parameters,
    'YZ',
    [-parameters.left * gridPitch, 0, 0],
    (parameters.left + parameters.right) * gridPitch,
    [1, 0, 0],
  )
}

function makeVerticalWall(parameters: OpenGridDividerParameters): Shape3D {
  const { gridPitch } = OPENGRID_DIVIDER_CONFIGURATION
  const wall = makeProfiledArm(
    parameters,
    'YZ',
    [-parameters.down * gridPitch, 0, 0],
    (parameters.down + parameters.up) * gridPitch,
    [1, 0, 0],
  )
  try {
    const rotated = wall.rotate(90, [0, 0, 0], [0, 0, 1])
    if (rotated !== wall) deleteShape(wall)
    return rotated
  } catch (error) {
    deleteShape(wall)
    throw error
  }
}

function fuseShapes(first: Shape3D, second: Shape3D): Shape3D {
  let fused: Shape3D | null = null
  try {
    fused = first.fuse(second)
    if (fused !== first) deleteShape(first)
    if (fused !== second) deleteShape(second)
    return fused
  } catch (error) {
    if (fused && fused !== first && fused !== second) deleteShape(fused)
    throw error
  }
}

function asSingleSolid(shape: Shape3D): Solid {
  const oc = getOC()
  const solidType = oc.TopAbs_ShapeEnum
    .TopAbs_SOLID as unknown as TopAbs_ShapeEnum
  const shapeType = oc.TopAbs_ShapeEnum
    .TopAbs_SHAPE as unknown as TopAbs_ShapeEnum
  const explorer = new oc.TopExp_Explorer_2(shape.wrapped, solidType, shapeType)
  const solids: Solid[] = []
  try {
    while (explorer.More()) {
      solids.push(new Solid(oc.TopoDS.Solid_1(explorer.Current())))
      explorer.Next()
    }
  } finally {
    explorer.delete()
  }

  if (solids.length !== 1) {
    for (const solid of solids) deleteShape(solid)
    throw new Error('OPENGRID_DIVIDER_NOT_SINGLE_SOLID')
  }
  return solids[0]
}

function fuseAsSingleSolid(first: Shape3D, second: Shape3D): Solid {
  const fused = fuseShapes(first, second)
  let solid: Solid | null = null
  try {
    solid = asSingleSolid(fused)
    return solid
  } finally {
    if (solid !== fused) deleteShape(fused)
  }
}

function roundedWallPart(
  wall: Shape3D,
  parameters: OpenGridDividerParameters,
  armAxis: 'x' | 'y',
): Solid {
  let rounded: Shape3D | null = null
  let solid: Solid | null = null
  try {
    if (
      topFilletRadiusForGeometry(parameters) <= FILLET_RADIUS_EPSILON &&
      sideFilletRadiusForGeometry(parameters) <= FILLET_RADIUS_EPSILON &&
      transitionFilletRadiusForGeometry(parameters) <= FILLET_RADIUS_EPSILON
    ) {
      solid = asSingleSolid(wall)
      return solid
    }
    try {
      rounded = wall.fillet((edge) => {
        return filletRadiusForEdge(edge, parameters, armAxis)
      })
    } catch (error) {
      throw new Error(`OPENGRID_DIVIDER_FILLET_FAILED:${armAxis}`, {
        cause: error,
      })
    }
    solid = asSingleSolid(rounded)
    return solid
  } finally {
    deleteShape(wall)
    if (rounded && rounded !== solid) deleteShape(rounded)
  }
}

type ContinuousWallBuildCallbacks = {
  onWallReady: () => void
  onPegCompleted: () => void
}

function armAxisForPeg(
  center: [number, number],
  horizontalActive: boolean,
): 'x' | 'y' {
  const [x, y] = center
  return y === 0 && (x !== 0 || horizontalActive) ? 'x' : 'y'
}

async function makeContinuousWall(
  parameters: OpenGridDividerParameters,
  pegCenters: [number, number][],
  context: OpenGridDividerBuildContext,
  callbacks: ContinuousWallBuildCallbacks,
): Promise<Shape3D> {
  const horizontalActive = parameters.left > 0 || parameters.right > 0
  const verticalActive = parameters.up > 0 || parameters.down > 0

  let horizontal: Solid | null = null
  let vertical: Solid | null = null
  try {
    horizontal = horizontalActive
      ? roundedWallPart(makeHorizontalWall(parameters), parameters, 'x')
      : null
    vertical = verticalActive
      ? roundedWallPart(makeVerticalWall(parameters), parameters, 'y')
      : null

    if (!horizontal && !vertical) {
      throw new Error('OPENGRID_DIVIDER_WALL_EMPTY')
    }

    callbacks.onWallReady()
    for (const center of pegCenters) {
      assertGenerationCurrent(context)
      const peg = makePeg(center)
      try {
        if (armAxisForPeg(center, horizontalActive) === 'x') {
          if (!horizontal) throw new Error('OPENGRID_DIVIDER_WALL_EMPTY')
          horizontal = fuseAsSingleSolid(horizontal, peg)
        } else {
          if (!vertical) throw new Error('OPENGRID_DIVIDER_WALL_EMPTY')
          vertical = fuseAsSingleSolid(vertical, peg)
        }
      } catch (error) {
        deleteShape(peg)
        throw error
      }
      callbacks.onPegCompleted()
      await yieldAtSafeBoundary(context)
      assertGenerationCurrent(context)
    }

    if (!horizontal) return vertical as Shape3D
    if (!vertical) return horizontal
    const fused = fuseAsSingleSolid(horizontal, vertical)
    horizontal = null
    vertical = null
    return fused
  } catch (error) {
    deleteShape(horizontal)
    deleteShape(vertical)
    throw error
  }
}

function translateToCenteredEnvelope(
  shape: Shape3D,
  parameters: OpenGridDividerParameters,
): Shape3D {
  const [centerX, centerY] = rawPlanCenter(parameters)
  const translated = shape.translate(-centerX, -centerY, 0)
  deleteShape(shape)
  return translated
}

function makePeg(center: [number, number]): Shape3D {
  const overlapIntoWall = 0.02
  return makeCylinder(
    OPENGRID_DIVIDER_CONFIGURATION.pegDiameter / 2,
    OPENGRID_DIVIDER_CONFIGURATION.pegLength + overlapIntoWall,
    [center[0], center[1], -OPENGRID_DIVIDER_CONFIGURATION.pegLength],
  )
}

export async function buildOpenGridDivider(
  parameters: OpenGridDividerParameters,
  context: OpenGridDividerBuildContext = {},
): Promise<Shape3D> {
  const validation = validateOpenGridDividerParameters(parameters)
  if (!validation.valid) throw new Error('OPENGRID_DIVIDER_PARAMETERS_INVALID')

  const pegCenters = openGridDividerPegCentersFor(parameters)
  const totalSteps = pegCenters.length + 3
  let completedSteps = 0
  let current: Shape3D | null = null

  try {
    assertGenerationCurrent(context)
    current = await makeContinuousWall(parameters, pegCenters, context, {
      onWallReady: () => {
        completedSteps += 1
        reportProgress(context, completedSteps, totalSteps)
      },
      onPegCompleted: () => {
        completedSteps += 1
        reportProgress(context, completedSteps, totalSteps)
      },
    })
    assertGenerationCurrent(context)
    await yieldAtSafeBoundary(context)
    assertGenerationCurrent(context)

    current = translateToCenteredEnvelope(current, parameters)
    completedSteps += 2
    reportProgress(context, completedSteps, totalSteps)
    assertGenerationCurrent(context)
    await yieldAtSafeBoundary(context)
    assertGenerationCurrent(context)

    const result = current
    current = null
    return result
  } catch (error) {
    deleteShape(current)
    throw error
  }
}
