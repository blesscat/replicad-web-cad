import { getOC, measureVolume, type Shape3D } from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import {
  boundsForOpenGridDivider,
  OPENGRID_DIVIDER_CONFIGURATION,
  openGridDividerPegCentersFor,
  type ModelBounds,
  type OpenGridDividerParameters,
} from '../../../cad-contract/units'
import type { MeshSnapshot } from '../../../cad-contract/messages'
import type { MeshData } from '../../mesh'

export type OpenGridDividerQualityReport = {
  passed: boolean
  failures: string[]
  bounds: ModelBounds | null
  expectedBounds: ModelBounds
  volume: number | null
  solidCount: number | null
  bottomPegFaceCount: number
  expectedPegCount: number
  topFilletFaceCount: number
  meshTriangleCount: number
}

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // Quality cleanup must not hide the original diagnostic.
  }
}

function readMeshBounds(mesh: MeshData | MeshSnapshot): ModelBounds {
  const bounds = mesh.bounds
  return {
    min: [...bounds.min] as [number, number, number],
    max: [...bounds.max] as [number, number, number],
  }
}

function boundsMatch(actual: ModelBounds, expected: ModelBounds): boolean {
  return [...actual.min, ...actual.max].every((coordinate, index) => {
    const expectedCoordinate = [...expected.min, ...expected.max][index]
    return Math.abs(coordinate - expectedCoordinate) <= 0.05
  })
}

function countSolids(shape: Shape3D): number {
  const oc = getOC()
  const solidType = oc.TopAbs_ShapeEnum
    .TopAbs_SOLID as unknown as TopAbs_ShapeEnum
  const shapeType = oc.TopAbs_ShapeEnum
    .TopAbs_SHAPE as unknown as TopAbs_ShapeEnum
  const explorer = new oc.TopExp_Explorer_2(shape.wrapped, solidType, shapeType)
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

function isBRepValid(shape: Shape3D): boolean {
  const oc = getOC()
  const analyzer = new oc.BRepCheck_Analyzer(shape.wrapped, true, true)
  try {
    return analyzer.IsValid_2()
  } finally {
    analyzer.delete()
  }
}

function faceCountInZBand(
  shape: Shape3D,
  predicate: (surfaceType: string, minZ: number, maxZ: number) => boolean,
): number {
  let count = 0
  for (const face of shape.faces) {
    const boundingBox = face.boundingBox
    try {
      const [[, , minZ], [, , maxZ]] = boundingBox.bounds as number[][]
      if (predicate(face.surface.surfaceType, minZ, maxZ)) count += 1
    } finally {
      boundingBox.delete()
      face.delete()
    }
  }
  return count
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

export function inspectOpenGridDividerShapeQuality(
  shape: Shape3D,
  parameters: OpenGridDividerParameters,
  mesh: MeshData | MeshSnapshot,
): OpenGridDividerQualityReport {
  const expectedBounds = boundsForOpenGridDivider(parameters)
  const failures: string[] = []
  let bounds: ModelBounds | null = null
  let volume: number | null = null
  let solidCount: number | null = null

  try {
    bounds = readMeshBounds(mesh)
    if (!boundsMatch(bounds, expectedBounds)) {
      failures.push('bounds:expected-envelope-or-placement')
    }
  } catch (error) {
    failures.push(
      `bounds:${error instanceof Error ? error.message : String(error)}`,
    )
  }

  try {
    volume = measureVolume(shape)
    if (!(volume > 0)) failures.push('volume:non-positive')
  } catch (error) {
    failures.push(
      `volume:${error instanceof Error ? error.message : String(error)}`,
    )
  }

  try {
    solidCount = countSolids(shape)
    if (solidCount !== 1) failures.push('topology:not-single-solid')
  } catch (error) {
    failures.push(
      `topology:${error instanceof Error ? error.message : String(error)}`,
    )
  }

  try {
    if (!isBRepValid(shape)) failures.push('topology:brep-invalid')
  } catch (error) {
    failures.push(
      `topology:${error instanceof Error ? error.message : String(error)}`,
    )
  }

  const bottomPegFaceCount = faceCountInZBand(
    shape,
    (surfaceType, minZ, maxZ) =>
      surfaceType === 'CYLINDRE' &&
      minZ <= -OPENGRID_DIVIDER_CONFIGURATION.pegLength + 0.05 &&
      maxZ <= 0.1,
  )
  // OpenCascade may split a single peg's cylindrical face at wall intersections;
  // the integration fixture probes every expected center instead of treating
  // this diagnostic face count as an exact peg count.
  const expectedPegCount = openGridDividerPegCentersFor(parameters).length
  const topFilletFaceCount = faceCountInZBand(
    shape,
    (surfaceType, minZ, maxZ) =>
      surfaceType === 'CYLINDRE' &&
      minZ >=
        parameters.height -
          OPENGRID_DIVIDER_CONFIGURATION.topFilletRadius -
          0.05 &&
      maxZ >= parameters.height - 0.05,
  )
  if (topFilletFaceCount < 1) failures.push('fillet:top-edge-rounding-missing')

  if (mesh.triangleCount <= 0 || !meshIsFinite(mesh)) {
    failures.push('mesh:empty-or-non-finite')
  }

  return {
    passed: failures.length === 0,
    failures,
    bounds,
    expectedBounds,
    volume,
    solidCount,
    bottomPegFaceCount,
    expectedPegCount,
    topFilletFaceCount,
    meshTriangleCount: mesh.triangleCount,
  }
}

export function assertOpenGridDividerShapeQuality(
  shape: Shape3D,
  parameters: OpenGridDividerParameters,
  mesh: MeshData | MeshSnapshot,
): OpenGridDividerQualityReport {
  const report = inspectOpenGridDividerShapeQuality(shape, parameters, mesh)
  if (!report.passed) {
    throw new Error(
      `OPENGRID_DIVIDER_QUALITY_INVALID:${report.failures.join(';')}`,
    )
  }
  return report
}
