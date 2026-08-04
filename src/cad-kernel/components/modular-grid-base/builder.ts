import { importSTEP, getOC, Solid, type Edge, type Shape3D } from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import {
  boundsForModularGridBase,
  PROTOTYPE_CONFIGURATION,
  type ModularGridBaseParameters,
} from '../../../cad-contract/units'

export const modularGridBaseTemplateUrl = new URL(
  './cell-template.step',
  import.meta.url,
)
const EDGE_TOLERANCE = 0.01

type PointTuple = [number, number, number]
type CellOffset = [number, number]

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // Cleanup must not replace the original geometry error.
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
    for (const solid of solids) solid.delete()
    throw new Error('GRID_TEMPLATE_NOT_SINGLE_SOLID')
  }
  return solids[0]
}

function readPoint(point: {
  toTuple: () => PointTuple
  delete: () => void
}): PointTuple {
  try {
    return point.toTuple()
  } finally {
    point.delete()
  }
}

function isClose(first: number, second: number): boolean {
  return Math.abs(first - second) <= EDGE_TOLERANCE
}

function isExternalVerticalEdge(
  edge: Edge,
  parameters: ModularGridBaseParameters,
): boolean {
  if (edge.geomType !== 'LINE') return false

  const start = readPoint(edge.startPoint)
  const end = readPoint(edge.endPoint)
  const bounds = boundsForModularGridBase(parameters)
  const width = bounds.max[0] - bounds.min[0]
  const depth = bounds.max[1] - bounds.min[1]
  const height = bounds.max[2] - bounds.min[2]
  const hasVerticalSpan = isClose(Math.abs(start[2] - end[2]), height)
  const hasStableXY = isClose(start[0], end[0]) && isClose(start[1], end[1])
  const isAtExternalCorner =
    isClose(Math.abs(start[0]), width / 2) &&
    isClose(Math.abs(start[1]), depth / 2)

  return hasVerticalSpan && hasStableXY && isAtExternalCorner
}

function readShapeBounds(shape: Shape3D): PointTuple[] {
  const boundingBox = shape.boundingBox
  try {
    return boundingBox.bounds as PointTuple[]
  } finally {
    boundingBox.delete()
  }
}

function assertTemplateBounds(shape: Shape3D): void {
  const [[minX, minY, minZ], [maxX, maxY, maxZ]] = readShapeBounds(shape)
  const expected = boundsForModularGridBase({ rows: 1, columns: 1 })
  const matches = [
    [minX, expected.min[0]],
    [minY, expected.min[1]],
    [minZ, expected.min[2]],
    [maxX, expected.max[0]],
    [maxY, expected.max[1]],
    [maxZ, expected.max[2]],
  ].every(([actual, wanted]) => isClose(actual, wanted))

  if (!matches) throw new Error('GRID_TEMPLATE_INVALID_BOUNDS')
}

export function cellOffsetsForGrid(
  parameters: ModularGridBaseParameters,
): CellOffset[] {
  const grid = PROTOTYPE_CONFIGURATION.modularGridBase
  const offsets: CellOffset[] = []
  const centerRow = (parameters.rows - 1) / 2
  const centerColumn = (parameters.columns - 1) / 2

  for (let row = 0; row < parameters.rows; row += 1) {
    for (let column = 0; column < parameters.columns; column += 1) {
      offsets.push([
        (column - centerColumn) * grid.cellWidth,
        (row - centerRow) * grid.cellDepth,
      ])
    }
  }

  return offsets
}

export function externalCornerCoordinates(
  parameters: ModularGridBaseParameters,
): CellOffset[] {
  const bounds = boundsForModularGridBase(parameters)
  return [
    [bounds.min[0], bounds.min[1]],
    [bounds.max[0], bounds.min[1]],
    [bounds.min[0], bounds.max[1]],
    [bounds.max[0], bounds.max[1]],
  ]
}

export function buildModularGridBase(
  parameters: ModularGridBaseParameters,
  template: Shape3D,
): Shape3D {
  let combined: Shape3D | null = null

  try {
    for (const [x, y] of cellOffsetsForGrid(parameters)) {
      const cell = template.clone().translate(x, y, 0)
      if (!combined) {
        combined = cell
        continue
      }

      const previous: Shape3D = combined
      try {
        combined = previous.fuse(cell, { optimisation: 'sameFace' })
      } finally {
        deleteShape(previous)
        deleteShape(cell)
      }
    }

    if (!combined) throw new Error('GRID_TEMPLATE_EMPTY')

    const rounded = combined.fillet((edge) => {
      if (isExternalVerticalEdge(edge, parameters)) {
        return PROTOTYPE_CONFIGURATION.modularGridBase.outerCornerRadius
      }
      return null
    })
    deleteShape(combined)
    combined = null
    let singleSolid: Solid | null = null
    try {
      singleSolid = asSingleSolid(rounded)
      return singleSolid
    } finally {
      if (singleSolid !== rounded) deleteShape(rounded)
    }
  } catch (error) {
    deleteShape(combined)
    throw error
  }
}

export async function importModularGridBaseTemplate(
  blob: Blob,
): Promise<Shape3D> {
  let imported: Shape3D
  try {
    imported = (await importSTEP(blob)).asShape3D()
  } catch {
    throw new Error('GRID_TEMPLATE_INVALID')
  }

  let singleSolid: Solid | null = null
  try {
    singleSolid = asSingleSolid(imported)
    assertTemplateBounds(singleSolid)
    return singleSolid
  } catch (error) {
    if (singleSolid) deleteShape(singleSolid)
    throw error
  } finally {
    if (singleSolid !== imported) deleteShape(imported)
  }
}

export async function loadModularGridBaseTemplate(
  fetcher: typeof fetch = fetch,
): Promise<Shape3D> {
  const response = await fetcher(modularGridBaseTemplateUrl)
  if (!response.ok) throw new Error('GRID_TEMPLATE_LOAD_FAILED')
  return importModularGridBaseTemplate(await response.blob())
}
