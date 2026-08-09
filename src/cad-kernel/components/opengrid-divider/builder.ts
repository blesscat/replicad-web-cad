import { getOC, makeBox, makeCylinder, Solid, type Shape3D } from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import {
  OPENGRID_DIVIDER_CONFIGURATION,
  openGridDividerPegCentersFor,
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

function edgeIsAtZ(
  edge: {
    startPoint: { z?: number; delete: () => void }
    endPoint: { z?: number; delete: () => void }
  },
  z: number,
  tolerance = 0.02,
): boolean {
  const start = edge.startPoint
  const end = edge.endPoint
  try {
    return (
      start.z !== undefined &&
      end.z !== undefined &&
      Math.abs(start.z - z) <= tolerance &&
      Math.abs(end.z - z) <= tolerance
    )
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

function makeHorizontalWall(parameters: OpenGridDividerParameters): Shape3D {
  const { gridPitch, wallWidth } = OPENGRID_DIVIDER_CONFIGURATION
  return makeBox(
    [-parameters.left * gridPitch, -wallWidth / 2, 0],
    [parameters.right * gridPitch, wallWidth / 2, parameters.height],
  )
}

function makeVerticalWall(parameters: OpenGridDividerParameters): Shape3D {
  const { gridPitch, wallWidth } = OPENGRID_DIVIDER_CONFIGURATION
  return makeBox(
    [-wallWidth / 2, -parameters.down * gridPitch, 0],
    [wallWidth / 2, parameters.up * gridPitch, parameters.height],
  )
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
): Solid {
  let rounded: Shape3D | null = null
  let solid: Solid | null = null
  try {
    rounded = wall.fillet((edge) => {
      if (edgeIsAtZ(edge, parameters.height)) {
        return OPENGRID_DIVIDER_CONFIGURATION.topFilletRadius
      }
      return null
    })
    solid = asSingleSolid(rounded)
    return solid
  } finally {
    deleteShape(wall)
    if (rounded && rounded !== solid) deleteShape(rounded)
  }
}

function makeContinuousWall(parameters: OpenGridDividerParameters): Shape3D {
  const horizontalActive = parameters.left > 0 || parameters.right > 0
  const verticalActive = parameters.up > 0 || parameters.down > 0

  let horizontal: Solid | null = null
  let vertical: Solid | null = null
  try {
    horizontal = horizontalActive
      ? roundedWallPart(makeHorizontalWall(parameters), parameters)
      : null
    vertical = verticalActive
      ? roundedWallPart(makeVerticalWall(parameters), parameters)
      : null

    if (!horizontal && !vertical) {
      throw new Error('OPENGRID_DIVIDER_WALL_EMPTY')
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
    current = makeContinuousWall(parameters)
    completedSteps += 1
    reportProgress(context, completedSteps, totalSteps)
    assertGenerationCurrent(context)
    await yieldAtSafeBoundary(context)
    assertGenerationCurrent(context)

    current = translateToCenteredEnvelope(current, parameters)
    completedSteps += 2
    reportProgress(context, completedSteps, totalSteps)
    assertGenerationCurrent(context)
    await yieldAtSafeBoundary(context)
    assertGenerationCurrent(context)

    const [centerX, centerY] = rawPlanCenter(parameters)
    for (const [rawX, rawY] of pegCenters) {
      assertGenerationCurrent(context)
      const peg = makePeg([rawX - centerX, rawY - centerY])
      try {
        const fused = fuseAsSingleSolid(current, peg)
        current = fused
      } catch (error) {
        deleteShape(peg)
        throw error
      }
      completedSteps += 1
      reportProgress(context, completedSteps, totalSteps)
      assertGenerationCurrent(context)
      await yieldAtSafeBoundary(context)
      assertGenerationCurrent(context)
    }

    const result = current
    current = null
    return result
  } catch (error) {
    deleteShape(current)
    throw error
  }
}
