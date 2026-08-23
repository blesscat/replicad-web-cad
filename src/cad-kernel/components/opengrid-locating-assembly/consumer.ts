import { makeBox, makeCompound, measureVolume, type Shape3D } from 'replicad'
import {
  OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION,
  type OpenGridStackableBoxPoint2D,
} from '../../../cad-contract/units'
import {
  measureBooleanInScope,
  type BooleanOperationReporter,
} from '../../boolean-progress'
import {
  assertOpenGridDetachableCornerSeatReference,
  buildOpenGridDetachableCornerSeatIndicatorCutter,
  buildOpenGridDetachableCornerSeatSocketVoid,
  placeOpenGridDetachableCornerSeatMaleShape,
  placeOpenGridDetachableCornerSeatIndicatorShape,
  placeOpenGridDetachableCornerSeatSocketShape,
  type OpenGridDetachableCornerSeatIndicatorPlacement,
  type OpenGridDetachableCornerSeatSocketPlacement,
} from './reference'

export type OpenGridDetachableCornerSeatConsumerContext = {
  detachableCornerSeatReference?: Shape3D
  detachableCornerSeatHolderReference?: Shape3D
  isGenerationCurrent?: () => boolean
  booleanOperations?: BooleanOperationReporter
}

export type OpenGridDetachableCornerSeatConsumerPlacement =
  OpenGridDetachableCornerSeatSocketPlacement

export type OpenGridDetachableCornerSeatConsumerQualityRecord = {
  center: OpenGridStackableBoxPoint2D
  socketVoidResidualVolume: number
  indicatorResidualVolume: number
  maleCollisionVolume: number
  roofVolume: number
}

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // Cleanup must not replace the primary geometry diagnostic.
  }
}

function assertGenerationCurrent(
  context: OpenGridDetachableCornerSeatConsumerContext,
): void {
  if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
    throw new Error('STALE_GENERATION')
  }
}

function directionForRotation(
  rotationDegrees: OpenGridDetachableCornerSeatSocketPlacement['rotationDegrees'],
): [number, number] {
  if (rotationDegrees === 0) return [1, 0]
  if (rotationDegrees === 90) return [0, 1]
  if (rotationDegrees === 180) return [-1, 0]
  return [0, -1]
}

function rotationForCenter(
  center: OpenGridStackableBoxPoint2D,
): OpenGridDetachableCornerSeatSocketPlacement['rotationDegrees'] {
  const [x, y] = center
  if (Math.abs(x) >= Math.abs(y)) return x < 0 ? 180 : 0
  return y < 0 ? 270 : 90
}

export function openGridDetachableCornerSeatConsumerPlacementsFor(
  centers: ReadonlyArray<OpenGridStackableBoxPoint2D>,
): OpenGridDetachableCornerSeatConsumerPlacement[] {
  return centers.map((center) => ({
    center,
    rotationDegrees: rotationForCenter(center),
  }))
}

export function openGridDetachableCornerSeatIndicatorPlacementFor(
  placement: OpenGridDetachableCornerSeatConsumerPlacement,
): OpenGridDetachableCornerSeatIndicatorPlacement {
  const configuration = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION
  const direction = directionForRotation(placement.rotationDegrees)
  const offsetFromSocket =
    configuration.female.outerDiameter / 2 +
    configuration.indicator.socketBoundaryClearance +
    configuration.indicator.radialLength / 2
  return {
    center: [
      placement.center[0] + direction[0] * offsetFromSocket,
      placement.center[1] + direction[1] * offsetFromSocket,
    ],
    rotationDegrees: placement.rotationDegrees,
  }
}

function placedIndicatorFor(
  source: Shape3D,
  placement: OpenGridDetachableCornerSeatConsumerPlacement,
): Shape3D {
  return placeOpenGridDetachableCornerSeatIndicatorShape(
    source,
    openGridDetachableCornerSeatIndicatorPlacementFor(placement),
  )
}

export function cutOpenGridDetachableCornerSeatConsumers(
  shape: Shape3D,
  centers: ReadonlyArray<OpenGridStackableBoxPoint2D>,
  context: OpenGridDetachableCornerSeatConsumerContext,
  errorCode: string,
): Shape3D {
  if (centers.length === 0) return shape
  const holderReference = context.detachableCornerSeatHolderReference
  const maleReference = context.detachableCornerSeatReference
  if (!holderReference) {
    deleteShape(shape)
    throw new Error(`${errorCode}:HOLDER_REFERENCE_MISSING`)
  }
  if (!maleReference) {
    deleteShape(shape)
    throw new Error(`${errorCode}:MALE_REFERENCE_MISSING`)
  }

  const placements = openGridDetachableCornerSeatConsumerPlacementsFor(centers)
  const sourceVoid =
    buildOpenGridDetachableCornerSeatSocketVoid(holderReference)
  let sourceIndicator: Shape3D | null = null
  let compound: Shape3D | null = null
  const cutters: Shape3D[] = []
  try {
    sourceIndicator = buildOpenGridDetachableCornerSeatIndicatorCutter()
    for (const placement of placements) {
      assertGenerationCurrent(context)
      cutters.push(
        placeOpenGridDetachableCornerSeatSocketShape(sourceVoid, placement),
      )
      cutters.push(placedIndicatorFor(sourceIndicator, placement))
    }
    compound = makeCompound(cutters).asShape3D()
    if (!compound) throw new Error(`${errorCode}:CUTTER_EMPTY`)
    const result = measureBooleanInScope(
      context.booleanOperations?.createScope(1),
      'cut',
      () => shape.cut(compound!, { optimisation: 'none' }),
    )
    deleteShape(shape)
    return result
  } catch (error) {
    if (error instanceof Error && error.message === 'STALE_GENERATION') {
      deleteShape(shape)
      throw error
    }
    deleteShape(shape)
    throw new Error(
      `${errorCode}:${error instanceof Error ? error.message : String(error)}`,
    )
  } finally {
    deleteShape(compound)
    cutters.forEach(deleteShape)
    deleteShape(sourceIndicator)
    deleteShape(sourceVoid)
  }
}

function volumeInBox(
  shape: Shape3D,
  minimum: [number, number, number],
  maximum: [number, number, number],
): number {
  const probe = makeBox(minimum, maximum)
  let intersection: Shape3D | null = null
  try {
    intersection = shape.intersect(probe)
    return measureVolume(intersection)
  } finally {
    deleteShape(intersection)
    deleteShape(probe)
  }
}

function intersectionVolume(first: Shape3D, second: Shape3D): number {
  const intersection = first.intersect(second)
  try {
    return measureVolume(intersection)
  } finally {
    deleteShape(intersection)
  }
}

export function inspectOpenGridDetachableCornerSeatConsumers(
  shape: Shape3D,
  centers: ReadonlyArray<OpenGridStackableBoxPoint2D>,
  context: OpenGridDetachableCornerSeatConsumerContext,
): OpenGridDetachableCornerSeatConsumerQualityRecord[] {
  if (centers.length === 0) return []
  const holderReference = context.detachableCornerSeatHolderReference
  const maleReference = context.detachableCornerSeatReference
  if (!holderReference) throw new Error('HOLDER_REFERENCE_MISSING')
  if (!maleReference) throw new Error('MALE_REFERENCE_MISSING')

  assertOpenGridDetachableCornerSeatReference(maleReference)
  const sourceVoid =
    buildOpenGridDetachableCornerSeatSocketVoid(holderReference)
  let sourceIndicator: Shape3D | null = null
  try {
    sourceIndicator = buildOpenGridDetachableCornerSeatIndicatorCutter()
    const placements =
      openGridDetachableCornerSeatConsumerPlacementsFor(centers)
    return placements.map((placement) => {
      assertGenerationCurrent(context)
      const placedVoid = placeOpenGridDetachableCornerSeatSocketShape(
        sourceVoid,
        placement,
      )
      const placedIndicator = placedIndicatorFor(sourceIndicator!, placement)
      const placedMale = placeOpenGridDetachableCornerSeatMaleShape(
        maleReference,
        placement,
      )
      try {
        const halfProbe = 0.1
        const roofMinZ =
          OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.female.depth + 0.05
        const roofMaxZ =
          roofMinZ +
          OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.minimumSocketRoof -
          0.05
        return {
          center: placement.center,
          socketVoidResidualVolume: intersectionVolume(shape, placedVoid),
          indicatorResidualVolume: intersectionVolume(shape, placedIndicator),
          maleCollisionVolume: intersectionVolume(shape, placedMale),
          roofVolume: volumeInBox(
            shape,
            [
              placement.center[0] - halfProbe,
              placement.center[1] - halfProbe,
              roofMinZ,
            ],
            [
              placement.center[0] + halfProbe,
              placement.center[1] + halfProbe,
              roofMaxZ,
            ],
          ),
        }
      } finally {
        deleteShape(placedVoid)
        deleteShape(placedIndicator)
        deleteShape(placedMale)
      }
    })
  } finally {
    deleteShape(sourceIndicator)
    deleteShape(sourceVoid)
  }
}

export function assertOpenGridDetachableCornerSeatConsumers(
  shape: Shape3D,
  centers: ReadonlyArray<OpenGridStackableBoxPoint2D>,
  context: OpenGridDetachableCornerSeatConsumerContext,
  errorCode: string,
): void {
  const records = inspectOpenGridDetachableCornerSeatConsumers(
    shape,
    centers,
    context,
  )
  const tolerance =
    OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.intersectionVolumeTolerance
  for (const record of records) {
    if (record.socketVoidResidualVolume > tolerance) {
      throw new Error(`${errorCode}:SOCKET_VOID:${record.center.join(',')}`)
    }
    if (record.indicatorResidualVolume > tolerance) {
      throw new Error(`${errorCode}:INDICATOR:${record.center.join(',')}`)
    }
    if (record.maleCollisionVolume > tolerance) {
      throw new Error(`${errorCode}:MALE_COLLISION:${record.center.join(',')}`)
    }
    if (record.roofVolume <= 0.001) {
      throw new Error(`${errorCode}:SOCKET_ROOF:${record.center.join(',')}`)
    }
  }
}
