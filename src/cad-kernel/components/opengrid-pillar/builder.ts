import {
  getOC,
  isShape3D,
  makeCylinder,
  measureVolume,
  Solid,
  type Shape3D,
} from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import {
  boundsForPillar,
  pillarBodyDiameterForParameters,
  PILLAR_CONFIGURATION,
  validatePillarParameters,
  type PillarParameters,
} from '../../../cad-contract/units'
import type { BooleanOperationReporter } from '../../boolean-progress'
import { buildOpenGridDetachableCornerSeatFromReference } from '../opengrid-locating-assembly/reference'

const GEOMETRY_TOLERANCE = 0.02

export type PillarBuildContext = {
  detachableCornerSeatReference?: Shape3D
  yieldToEventLoop?: () => Promise<void>
  isGenerationCurrent?: () => boolean
  booleanOperations?: BooleanOperationReporter
}

type PointOnEdge = {
  z?: number
  delete: () => void
}

type EdgeWithPoints = {
  startPoint: PointOnEdge
  endPoint: PointOnEdge
}

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // Cleanup must not replace the primary geometry error.
  }
}

function deleteUniqueShapes(shapes: readonly Shape3D[]): void {
  const deleted = new Set<Shape3D>()
  for (const shape of shapes) {
    if (deleted.has(shape)) continue
    deleted.add(shape)
    deleteShape(shape)
  }
}

function assertGenerationCurrent(context: PillarBuildContext): void {
  if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
    throw new Error('STALE_GENERATION')
  }
}

async function yieldAtSafeBoundary(context: PillarBuildContext): Promise<void> {
  await context.yieldToEventLoop?.()
}

function edgeIsAtZ(
  edge: EdgeWithPoints,
  station: number,
  tolerance = GEOMETRY_TOLERANCE,
): boolean {
  const start = edge.startPoint
  const end = edge.endPoint
  try {
    return (
      start.z !== undefined &&
      end.z !== undefined &&
      Math.abs(start.z - station) <= tolerance &&
      Math.abs(end.z - station) <= tolerance
    )
  } finally {
    start.delete()
    end.delete()
  }
}

function edgeIsAtAnyStation(
  edge: EdgeWithPoints,
  stations: readonly number[],
): boolean {
  return stations.some((station) => edgeIsAtZ(edge, station))
}

function chamferAtStations(
  shape: Shape3D,
  stations: readonly number[],
  distance: number,
): Shape3D {
  let chamfered: Shape3D | null = null
  try {
    chamfered = shape.chamfer(distance, (finder) =>
      finder.when(({ element }) => edgeIsAtAnyStation(element, stations)),
    )
    if (!isShape3D(chamfered)) {
      throw new Error('PILLAR_CHAMFER_RESULT_NOT_3D')
    }
    return chamfered
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('PILLAR_')) {
      throw error
    }
    const stationLabel = stations.join(',')
    throw new Error(`PILLAR_CHAMFER_FAILED:${stationLabel}`, {
      cause: error,
    })
  } finally {
    if (chamfered !== shape) deleteShape(shape)
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
    deleteUniqueShapes(solids)
    throw new Error('PILLAR_NOT_SINGLE_SOLID')
  }
  return solids[0]
}

function readBounds(shape: Shape3D): number[][] {
  const boundingBox = shape.boundingBox
  try {
    return boundingBox.bounds as number[][]
  } finally {
    boundingBox.delete()
  }
}

function assertFiniteShape(shape: Shape3D, parameters: PillarParameters): void {
  const bounds = readBounds(shape)
  const values = bounds.flat()
  if (!values.every(Number.isFinite)) {
    throw new Error('PILLAR_INVALID_BOUNDS')
  }

  const expected = boundsForPillar(parameters)
  const expectedBounds = [expected.min, expected.max]
  const matches = expectedBounds.every((expectedPoint, pointIndex) =>
    expectedPoint.every(
      (coordinate, coordinateIndex) =>
        Math.abs(
          (bounds[pointIndex]?.[coordinateIndex] ?? Number.NaN) - coordinate,
        ) <= GEOMETRY_TOLERANCE,
    ),
  )
  if (!matches) throw new Error('PILLAR_INVALID_BOUNDS')

  const volume = measureVolume(shape)
  if (!Number.isFinite(volume) || volume <= 0) {
    throw new Error('PILLAR_INVALID_VOLUME')
  }
}

function buildPositioningPillar(
  parameters: Extract<PillarParameters, { mode: 'positioning' }>,
): Shape3D {
  const cylinder = makeCylinder(
    pillarBodyDiameterForParameters(parameters) / 2,
    parameters.length,
    [0, 0, 0],
  )
  const lowerChamfered = chamferAtStations(
    cylinder,
    [0],
    PILLAR_CONFIGURATION.positioningLowerChamfer,
  )
  return chamferAtStations(
    lowerChamfered,
    [parameters.length],
    PILLAR_CONFIGURATION.positioningUpperChamfer,
  )
}

export async function buildPillar(
  parameters: PillarParameters,
  context: PillarBuildContext = {},
): Promise<Solid> {
  const validation = validatePillarParameters(parameters)
  if (!validation.valid) throw new Error('PILLAR_PARAMETERS_INVALID')

  assertGenerationCurrent(context)
  await yieldAtSafeBoundary(context)

  let shape: Shape3D | null = null
  let finalSolid: Solid | null = null
  try {
    if (parameters.mode === 'detachable-corner-seat') {
      if (!context.detachableCornerSeatReference) {
        throw new Error('PILLAR_DETACHABLE_CORNER_SEAT_REFERENCE_MISSING')
      }
      shape = buildOpenGridDetachableCornerSeatFromReference(
        context.detachableCornerSeatReference,
      )
    } else if (parameters.mode === 'positioning') {
      shape = buildPositioningPillar(parameters)
    }

    assertGenerationCurrent(context)
    await yieldAtSafeBoundary(context)

    assertGenerationCurrent(context)
    if (!shape) throw new Error('PILLAR_SHAPE_MISSING')
    finalSolid = asSingleSolid(shape)
    deleteShape(shape)
    shape = null
    assertFiniteShape(finalSolid, parameters)
    return finalSolid
  } catch (error) {
    deleteShape(shape)
    deleteShape(finalSolid)
    throw error
  }
}
