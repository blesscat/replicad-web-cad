import { getOC, measureVolume, type Shape3D } from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import type { ModelBounds } from '../../../cad-contract/units'
import type { MeshSnapshot } from '../../../cad-contract/messages'
import type { MeshData } from '../../mesh'
import {
  OPENGRID_WALL_COVER_TEXT_CONFIGURATION,
  openGridWallCoverTextTopZ,
} from './flat-text'

const QUALITY_TOLERANCE = 0.05
const BODY_ENVELOPE_TOLERANCE = 0.45

export type OpenGridWallCoverQualityReport = {
  passed: true
  failures: readonly []
  bounds: ModelBounds
  referenceBounds: ModelBounds
  solidCount: number
  meshTriangleCount: number
}

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // Quality cleanup must not hide the primary diagnostic.
  }
}

function readBounds(shape: Shape3D): ModelBounds {
  const boundingBox = shape.boundingBox
  try {
    const [min, max] = boundingBox.bounds as [
      [number, number, number],
      [number, number, number],
    ]
    return { min: [...min], max: [...max] }
  } finally {
    boundingBox.delete()
  }
}

function isClose(first: number, second: number): boolean {
  return Math.abs(first - second) <= QUALITY_TOLERANCE
}

function boundsAreFinite(bounds: ModelBounds): boolean {
  return [...bounds.min, ...bounds.max].every(Number.isFinite)
}

function boundsMatch(
  first: ModelBounds,
  second: ModelBounds,
  tolerance = QUALITY_TOLERANCE,
): boolean {
  const firstCoordinates = [...first.min, ...first.max]
  const secondCoordinates = [...second.min, ...second.max]
  return firstCoordinates.every(
    (value, index) => Math.abs(value - secondCoordinates[index]!) <= tolerance,
  )
}

function countSolids(shape: Shape3D): number {
  const oc = getOC()
  const explorer = new oc.TopExp_Explorer_2(
    shape.wrapped,
    oc.TopAbs_ShapeEnum.TopAbs_SOLID as unknown as TopAbs_ShapeEnum,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE as unknown as TopAbs_ShapeEnum,
  )
  let count = 0
  try {
    while (explorer.More()) {
      count += 1
      explorer.Next()
    }
    return count
  } finally {
    explorer.delete()
  }
}

function meshIsFinite(mesh: MeshData | MeshSnapshot): boolean {
  const positions =
    mesh.positions instanceof ArrayBuffer
      ? new Float32Array(mesh.positions)
      : mesh.positions
  const normals =
    mesh.normals instanceof ArrayBuffer
      ? new Float32Array(mesh.normals)
      : mesh.normals
  const indices =
    mesh.indices instanceof ArrayBuffer
      ? new Uint32Array(mesh.indices)
      : mesh.indices
  return (
    positions.length > 0 &&
    normals.length === positions.length &&
    indices.length > 0 &&
    indices.length % 3 === 0 &&
    [...positions, ...normals].every(Number.isFinite) &&
    [...indices].every(Number.isSafeInteger)
  )
}

function assertTextIsContained(bodyShape: Shape3D, textShape: Shape3D): void {
  let intersection: Shape3D | null = null
  try {
    const textVolume = measureVolume(textShape)
    intersection = bodyShape.intersect(textShape)
    const containedVolume = measureVolume(intersection)
    if (
      !Number.isFinite(textVolume) ||
      textVolume <= 0 ||
      !Number.isFinite(containedVolume) ||
      Math.abs(textVolume - containedVolume) > QUALITY_TOLERANCE
    ) {
      throw new Error('OPENGRID_WALL_COVER_TEXT_NOT_CONTAINED')
    }
  } finally {
    deleteShape(intersection)
  }
}

function assertTextDoesNotIntersectBody(
  bodyShape: Shape3D,
  textShape: Shape3D,
): void {
  let intersection: Shape3D | null = null
  try {
    intersection = bodyShape.intersect(textShape)
    const overlapVolume = measureVolume(intersection)
    if (!Number.isFinite(overlapVolume) || overlapVolume > QUALITY_TOLERANCE) {
      throw new Error('OPENGRID_WALL_COVER_TEXT_CAVITY_INVALID')
    }
  } finally {
    deleteShape(intersection)
  }
}

export function assertOpenGridWallCoverShapeQuality(
  baseShape: Shape3D,
  bodyShape: Shape3D,
  textShape: Shape3D,
  baseMesh: MeshData | MeshSnapshot,
  textMesh: MeshData | MeshSnapshot,
  reference: Shape3D,
): OpenGridWallCoverQualityReport {
  const baseBounds = readBounds(baseShape)
  const referenceBounds = readBounds(reference)
  const bodyBounds = readBounds(bodyShape)
  const textBounds = readBounds(textShape)
  const expectedTop = openGridWallCoverTextTopZ()
  const expectedBottom =
    expectedTop - OPENGRID_WALL_COVER_TEXT_CONFIGURATION.depth
  const textCoordinates = [...textBounds.min, ...textBounds.max]
  const failures: string[] = []
  const baseSolidCount = countSolids(baseShape)
  if (
    !boundsAreFinite(baseBounds) ||
    !boundsAreFinite(referenceBounds) ||
    !boundsMatch(baseBounds, referenceBounds, BODY_ENVELOPE_TOLERANCE)
  ) {
    failures.push('reference-envelope')
  }
  if (baseSolidCount !== 9 || countSolids(reference) !== 9) {
    failures.push('reference-solids')
  }
  if (countSolids(bodyShape) !== 9) failures.push('body-solids')
  if (countSolids(textShape) === 0) failures.push('text-solids')
  if (textCoordinates.some((coordinate) => !Number.isFinite(coordinate))) {
    failures.push('text-coordinates')
  }
  if (
    Math.abs(bodyBounds.max[2] - baseBounds.max[2]) > BODY_ENVELOPE_TOLERANCE
  ) {
    failures.push('body-top')
  }
  if (!meshIsFinite(baseMesh)) failures.push('base-mesh-values')
  if (baseMesh.triangleCount <= 0) failures.push('base-mesh-triangles')
  if (!isClose(textBounds.min[2], expectedBottom)) failures.push('text-bottom')
  if (!isClose(textBounds.max[2], expectedTop)) failures.push('text-top')
  if (!meshIsFinite(textMesh)) failures.push('text-mesh-values')
  if (textMesh.triangleCount <= 0) failures.push('text-mesh-triangles')
  if (failures.length > 0) {
    throw new Error(
      `OPENGRID_WALL_COVER_QUALITY_INVALID:flat-text-bounds:${failures.join(',')}`,
    )
  }

  assertTextDoesNotIntersectBody(bodyShape, textShape)
  assertTextIsContained(baseShape, textShape)
  return {
    passed: true,
    failures: [],
    bounds: baseBounds,
    referenceBounds,
    solidCount: baseSolidCount,
    meshTriangleCount: baseMesh.triangleCount,
  }
}
