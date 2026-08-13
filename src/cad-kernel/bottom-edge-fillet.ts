import type { Edge, Shape3D } from 'replicad'

function edgeIsNearZ(edge: Edge, z: number, tolerance = 0.02): boolean {
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

function edgeHasMinimumPlanSpan(edge: Edge, minimumPlanSpan: number): boolean {
  if (minimumPlanSpan <= 0) return true
  const boundingBox = edge.boundingBox
  try {
    const [[minX, minY], [maxX, maxY]] = boundingBox.bounds as number[][]
    return Math.max(maxX - minX, maxY - minY) >= minimumPlanSpan
  } finally {
    boundingBox.delete()
  }
}

export function filletEdgesAtZ(
  shape: Shape3D,
  z: number,
  radius: number,
  tolerance = 0.02,
  minimumPlanSpan = 0,
): Shape3D {
  if (radius <= 0) return shape
  const rounded = shape.fillet((edge) =>
    edgeIsNearZ(edge, z, tolerance) &&
    edgeHasMinimumPlanSpan(edge, minimumPlanSpan)
      ? radius
      : null,
  )
  if (rounded !== shape) shape.delete()
  return rounded
}
