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
  pillarLengthForMode,
  PILLAR_CONFIGURATION,
  validatePillarParameters,
  type PillarParameters,
} from '../../../cad-contract/units'
import {
  measureBooleanInScope,
  type BooleanOperationScope,
  type BooleanOperationReporter,
} from '../../boolean-progress'

const GEOMETRY_TOLERANCE = 0.02

export type PillarBuildContext = {
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

function fusePartsAsSingleSolid(
  first: Shape3D,
  second: Shape3D,
  scope: BooleanOperationScope | undefined,
): Solid {
  let fused: Shape3D | null = null
  let solid: Solid | null = null
  try {
    fused = measureBooleanInScope(scope, 'fuse', () => first.fuse(second))
    if (!isShape3D(fused)) throw new Error('PILLAR_FUSE_RESULT_NOT_3D')
    solid = asSingleSolid(fused)
    return solid
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('PILLAR_')) {
      throw error
    }
    throw new Error('PILLAR_FUSE_FAILED', { cause: error })
  } finally {
    deleteUniqueShapes(
      [first, second, fused].filter(
        (shape): shape is Shape3D => shape !== null && shape !== solid,
      ),
    )
  }
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

function buildFixedPillar(
  parameters: PillarParameters,
  scope: BooleanOperationScope | undefined,
): Solid {
  const totalLength = pillarLengthForMode(parameters.mode)
  const flange = makeCylinder(
    PILLAR_CONFIGURATION.baseDiameter / 2,
    PILLAR_CONFIGURATION.baseHeight,
    [0, 0, 0],
  )
  const body = makeCylinder(
    PILLAR_CONFIGURATION.bodyDiameter / 2,
    totalLength - PILLAR_CONFIGURATION.baseHeight,
    [0, 0, PILLAR_CONFIGURATION.baseHeight],
  )
  return fusePartsAsSingleSolid(flange, body, scope)
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
  const fuseScope = context.booleanOperations?.createScope(1)
  try {
    shape = buildFixedPillar(parameters, fuseScope)

    assertGenerationCurrent(context)
    await yieldAtSafeBoundary(context)

    shape = chamferAtStations(
      shape,
      [pillarLengthForMode(parameters.mode)],
      PILLAR_CONFIGURATION.upperChamfer,
    )

    assertGenerationCurrent(context)
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
