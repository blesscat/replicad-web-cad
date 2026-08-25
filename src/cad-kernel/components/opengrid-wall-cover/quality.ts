import { getOC, measureVolume, type Shape3D } from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import {
  OPENGRID_SNAP_CONFIGURATION,
  type ModelBounds,
  type OpenGridSnapParameters,
} from '../../../cad-contract/units'
import type { MeshSnapshot } from '../../../cad-contract/messages'
import type { MeshData } from '../../mesh'
import {
  assertOpenGridSnapShapeQuality,
  type OpenGridSnapQualityReport,
} from '../opengrid-snap/quality'
import {
  OPENGRID_WALL_COVER_TEXT_CONFIGURATION,
  openGridWallCoverTextTopZ,
} from './flat-text'

const QUALITY_TOLERANCE = 0.05
const BODY_ENVELOPE_TOLERANCE = 0.45

const PLACEHOLDER_PARAMETERS: OpenGridSnapParameters = {
  ...OPENGRID_SNAP_CONFIGURATION.defaultParameters,
  variant: 'Lite',
  profile: 'Standard',
  offset: 0,
  footprint: 'full',
  fourCornerLocatingHoles: false,
  centerRemoverHole: false,
  openConnect: false,
  topText: 'none',
  magnetHoleShape: 'none',
  magnetHoleLength: 0,
  magnetHoleWidth: 0,
  magnetHoleDiameter: 0,
  magnetHoleThickness: 0,
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
): OpenGridSnapQualityReport {
  const baseBounds = readBounds(baseShape)
  const bodyBounds = readBounds(bodyShape)
  const textBounds = readBounds(textShape)
  const report = assertOpenGridSnapShapeQuality(
    baseShape,
    PLACEHOLDER_PARAMETERS,
    baseMesh,
    reference,
  )
  const expectedTop = openGridWallCoverTextTopZ()
  const expectedBottom =
    expectedTop - OPENGRID_WALL_COVER_TEXT_CONFIGURATION.depth
  const textCoordinates = [...textBounds.min, ...textBounds.max]
  const failures: string[] = []
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
  return report
}
