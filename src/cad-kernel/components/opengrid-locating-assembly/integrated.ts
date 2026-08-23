import { isShape3D, makeCylinder, type Shape3D } from 'replicad'
import { OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION } from '../../../cad-contract/units'

const GEOMETRY_TOLERANCE = 0.02

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

function edgeIsAtZ(edge: EdgeWithPoints, z: number): boolean {
  const start = edge.startPoint
  const end = edge.endPoint
  try {
    return (
      start.z !== undefined &&
      end.z !== undefined &&
      Math.abs(start.z - z) <= GEOMETRY_TOLERANCE &&
      Math.abs(end.z - z) <= GEOMETRY_TOLERANCE
    )
  } finally {
    start.delete()
    end.delete()
  }
}

function chamferBottomEdge(
  shape: Shape3D,
  z: number,
  distance: number,
): Shape3D {
  let chamfered: Shape3D | null = null
  let returned = false
  try {
    chamfered = shape.chamfer(distance, (finder) =>
      finder.when(({ element }) => edgeIsAtZ(element, z)),
    )
    if (!isShape3D(chamfered)) {
      throw new Error('OPENGRID_INTEGRATED_SEAT_CHAMFER_NOT_3D')
    }
    returned = true
    return chamfered
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'OPENGRID_INTEGRATED_SEAT_CHAMFER_NOT_3D'
    ) {
      throw error
    }
    throw new Error('OPENGRID_INTEGRATED_SEAT_CHAMFER_FAILED', {
      cause: error,
    })
  } finally {
    if (!returned) deleteShape(chamfered)
    if (chamfered !== shape) deleteShape(shape)
  }
}

export function makeOpenGridIntegratedSeat(
  center: readonly [number, number],
  hostOverlap = 0,
): Shape3D {
  if (!Number.isFinite(hostOverlap) || hostOverlap < 0) {
    throw new Error('OPENGRID_INTEGRATED_SEAT_INVALID_OVERLAP')
  }

  const configuration = OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION
  const seat = makeCylinder(
    configuration.integratedSeatDiameter / 2,
    configuration.integratedSeatHeight + hostOverlap,
    [center[0], center[1], configuration.integratedSeatMinZ],
  )
  return chamferBottomEdge(
    seat,
    configuration.integratedSeatMinZ,
    configuration.integratedSeatBottomChamfer,
  )
}
