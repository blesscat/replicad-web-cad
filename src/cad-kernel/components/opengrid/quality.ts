import {
  getOC,
  makeBox,
  makeCompound,
  measureVolume,
  type Shape3D,
} from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import {
  boundsForOpenGrid,
  cellCenterForOpenGrid,
  OPENGRID_CONFIGURATION,
  type ModelBounds,
  type OpenGridParameters,
} from '../../../cad-contract/units'
import type { MeshSnapshot } from '../../../cad-contract/messages'
import type { MeshData } from '../../mesh'

export type OpenGridQualityReport = {
  passed: boolean
  failures: string[]
  bounds: ModelBounds | null
  expectedBounds: ModelBounds
  volume: number | null
  solidCount: number | null
  cellOpeningCount: number
  meshTriangleCount: number
}

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // Quality cleanup must not hide the original diagnostic.
  }
}

function isClose(first: number, second: number): boolean {
  return Math.abs(first - second) <= 0.05
}

function readBounds(shape: Shape3D): ModelBounds {
  const boundingBox = shape.boundingBox
  try {
    const [min, max] = boundingBox.bounds as [
      [number, number, number],
      [number, number, number],
    ]
    return { min, max }
  } finally {
    boundingBox.delete()
  }
}

function boundsMatch(actual: ModelBounds, expected: ModelBounds): boolean {
  return [...actual.min, ...actual.max].every((coordinate, index) => {
    const expectedCoordinate = [...expected.min, ...expected.max][index]
    return isClose(coordinate, expectedCoordinate)
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

function volumeInProbe(
  shape: Shape3D,
  min: [number, number, number],
  max: [number, number, number],
): number {
  const probe = makeBox(min, max)
  let intersection: Shape3D | null = null
  try {
    intersection = shape.intersect(probe)
    return measureVolume(intersection)
  } finally {
    if (intersection && intersection !== shape) deleteShape(intersection)
    deleteShape(probe)
  }
}

function inspectOfficialProfile(
  shape: Shape3D,
  parameters: OpenGridParameters,
  failures: string[],
): void {
  const board = boundsForOpenGrid(parameters)
  const [firstCellX, firstCellY] = cellCenterForOpenGrid(parameters, 0, 0)
  const layerThickness =
    parameters.variant === 'Heavy'
      ? OPENGRID_CONFIGURATION.variants.Full.thickness
      : board.max[2]
  const zLevels =
    parameters.variant === 'Heavy'
      ? [
          layerThickness / 2,
          layerThickness + OPENGRID_CONFIGURATION.heavyGap + layerThickness / 2,
        ]
      : [layerThickness / 2]
  const probeHalfWidth = 0.5
  const probeHalfHeight = Math.min(0.2, layerThickness / 8)
  const inspectOuterRail = parameters.rows * parameters.columns <= 4

  for (const zLevel of zLevels) {
    if (inspectOuterRail) {
      const outerRailVolume = volumeInProbe(
        shape,
        [
          firstCellX - probeHalfWidth,
          board.max[1] - 0.7,
          zLevel - probeHalfHeight,
        ],
        [
          firstCellX + probeHalfWidth,
          board.max[1] - 0.3,
          zLevel + probeHalfHeight,
        ],
      )
      if (outerRailVolume <= 0.01) {
        failures.push(`profile:outer-rail-missing@${zLevel}`)
      }
    }

    const innerCaptureVolume = volumeInProbe(
      shape,
      [
        firstCellX - probeHalfWidth,
        board.max[1] - 1.35,
        zLevel - probeHalfHeight,
      ],
      [
        firstCellX + probeHalfWidth,
        board.max[1] - 1.15,
        zLevel + probeHalfHeight,
      ],
    )
    if (innerCaptureVolume > 0.01) {
      failures.push(`profile:inner-capture-missing@${zLevel}`)
    }
  }
}

function inspectCellOpenings(
  shape: Shape3D,
  parameters: OpenGridParameters,
  failures: string[],
): number {
  let openingCount = 0
  const board = boundsForOpenGrid(parameters)
  const probeWidth = 2
  const probeDepth = 2

  const inspectCell = (row: number, column: number): boolean => {
    const [centerX, centerY] = cellCenterForOpenGrid(parameters, row, column)
    let probe: Shape3D | null = null
    let intersection: Shape3D | null = null
    try {
      probe = makeBox(
        [centerX - probeWidth / 2, centerY - probeDepth / 2, -0.5],
        [
          centerX + probeWidth / 2,
          centerY + probeDepth / 2,
          board.max[2] + 0.5,
        ],
      )
      intersection = shape.intersect(probe)
      const volume = measureVolume(intersection)
      if (volume > 0.01) {
        failures.push(`openings:cell-${row}-${column}-not-through`)
        return false
      }
      return true
    } catch (error) {
      failures.push(
        `openings:cell-${row}-${column}:${error instanceof Error ? error.message : String(error)}`,
      )
      return false
    } finally {
      if (intersection && intersection !== shape) deleteShape(intersection)
      deleteShape(probe)
    }
  }

  for (let row = 0; row < parameters.rows; row += 1) {
    const rowProbes: Shape3D[] = []
    let rowProbe: Shape3D | null = null
    let rowIntersection: Shape3D | null = null
    try {
      for (let column = 0; column < parameters.columns; column += 1) {
        const [centerX, centerY] = cellCenterForOpenGrid(
          parameters,
          row,
          column,
        )
        rowProbes.push(
          makeBox(
            [centerX - probeWidth / 2, centerY - probeDepth / 2, -0.5],
            [
              centerX + probeWidth / 2,
              centerY + probeDepth / 2,
              board.max[2] + 0.5,
            ],
          ),
        )
      }
      rowProbe = makeCompound(rowProbes).asShape3D()
      rowIntersection = shape.intersect(rowProbe)
      const rowVolume = measureVolume(rowIntersection)
      if (rowVolume <= 0.01) {
        openingCount += parameters.columns
        continue
      }

      for (let column = 0; column < parameters.columns; column += 1) {
        if (inspectCell(row, column)) openingCount += 1
      }
    } catch (error) {
      failures.push(
        `openings:row-${row}:${error instanceof Error ? error.message : String(error)}`,
      )
      for (let column = 0; column < parameters.columns; column += 1) {
        if (inspectCell(row, column)) openingCount += 1
      }
    } finally {
      if (rowIntersection && rowIntersection !== shape) {
        deleteShape(rowIntersection)
      }
      deleteShape(rowProbe)
      for (const probe of rowProbes) deleteShape(probe)
    }
  }
  return openingCount
}

export function inspectOpenGridShapeQuality(
  shape: Shape3D,
  parameters: OpenGridParameters,
  mesh: MeshData | MeshSnapshot,
): OpenGridQualityReport {
  const expectedBounds = boundsForOpenGrid(parameters)
  const failures: string[] = []
  let bounds: ModelBounds | null = null
  let volume: number | null = null
  let solidCount: number | null = null

  try {
    bounds = readBounds(shape)
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

  const cellOpeningCount = inspectCellOpenings(shape, parameters, failures)
  if (cellOpeningCount !== parameters.rows * parameters.columns) {
    failures.push('openings:incomplete-cell-coverage')
  }
  inspectOfficialProfile(shape, parameters, failures)
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
    cellOpeningCount,
    meshTriangleCount: mesh.triangleCount,
  }
}

export function assertOpenGridShapeQuality(
  shape: Shape3D,
  parameters: OpenGridParameters,
  mesh: MeshData | MeshSnapshot,
): OpenGridQualityReport {
  const report = inspectOpenGridShapeQuality(shape, parameters, mesh)
  if (!report.passed) {
    throw new Error(`OPENGRID_QUALITY_INVALID:${report.failures.join(';')}`)
  }
  return report
}
