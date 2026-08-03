import type {
  BoxBounds,
  BoxParameters,
  DimensionKey,
} from "../../../cad-contract/units"

export type Point3 = [number, number, number]
export type LineSegment = readonly [Point3, Point3]

export type DimensionAnnotation = {
  key: DimensionKey
  axis: "X" | "Y" | "Z"
  label: string
  value: number
  valueLabel: string
  ariaLabel: string
  dimensionLine: LineSegment
  extensionLines: readonly LineSegment[]
  endTicks: readonly LineSegment[]
  labelPosition: Point3
}

const DIMENSION_OFFSET_RATIO = 0.15
const END_TICK_RATIO = 0.35

function point(x: number, y: number, z: number): Point3 {
  return [x, y, z]
}

function segment(start: Point3, end: Point3): LineSegment {
  return [start, end]
}

function createAnnotation({
  key,
  axis,
  label,
  value,
  dimensionLine,
  extensionLines,
  endTicks,
  labelPosition,
}: Omit<DimensionAnnotation, "valueLabel" | "ariaLabel">): DimensionAnnotation {
  const valueLabel = `${value} mm`
  return {
    key,
    axis,
    label,
    value,
    valueLabel,
    ariaLabel: `${label} ${axis} ${valueLabel}`,
    dimensionLine,
    extensionLines,
    endTicks,
    labelPosition,
  }
}

function createWidthAnnotation(
  bounds: BoxBounds,
  parameters: BoxParameters,
  offset: number,
  tickSize: number,
): DimensionAnnotation {
  const lineStart = point(bounds.min[0], bounds.min[1] - offset, bounds.min[2])
  const lineEnd = point(bounds.max[0], bounds.min[1] - offset, bounds.min[2])

  return createAnnotation({
    key: "width",
    axis: "X",
    label: "寬度",
    value: parameters.width,
    dimensionLine: segment(lineStart, lineEnd),
    extensionLines: [
      segment(point(bounds.min[0], bounds.min[1], bounds.min[2]), lineStart),
      segment(point(bounds.max[0], bounds.min[1], bounds.min[2]), lineEnd),
    ],
    endTicks: [
      segment(
        point(lineStart[0], lineStart[1] - tickSize / 2, lineStart[2]),
        point(lineStart[0], lineStart[1] + tickSize / 2, lineStart[2]),
      ),
      segment(
        point(lineEnd[0], lineEnd[1] - tickSize / 2, lineEnd[2]),
        point(lineEnd[0], lineEnd[1] + tickSize / 2, lineEnd[2]),
      ),
    ],
    labelPosition: point(
      (bounds.min[0] + bounds.max[0]) / 2,
      bounds.min[1] - offset,
      bounds.min[2],
    ),
  })
}

function createDepthAnnotation(
  bounds: BoxBounds,
  parameters: BoxParameters,
  offset: number,
  tickSize: number,
): DimensionAnnotation {
  const lineStart = point(bounds.max[0] + offset, bounds.min[1], bounds.min[2])
  const lineEnd = point(bounds.max[0] + offset, bounds.max[1], bounds.min[2])

  return createAnnotation({
    key: "depth",
    axis: "Y",
    label: "深度",
    value: parameters.depth,
    dimensionLine: segment(lineStart, lineEnd),
    extensionLines: [
      segment(point(bounds.max[0], bounds.min[1], bounds.min[2]), lineStart),
      segment(point(bounds.max[0], bounds.max[1], bounds.min[2]), lineEnd),
    ],
    endTicks: [
      segment(
        point(lineStart[0] - tickSize / 2, lineStart[1], lineStart[2]),
        point(lineStart[0] + tickSize / 2, lineStart[1], lineStart[2]),
      ),
      segment(
        point(lineEnd[0] - tickSize / 2, lineEnd[1], lineEnd[2]),
        point(lineEnd[0] + tickSize / 2, lineEnd[1], lineEnd[2]),
      ),
    ],
    labelPosition: point(
      bounds.max[0] + offset,
      (bounds.min[1] + bounds.max[1]) / 2,
      bounds.min[2],
    ),
  })
}

function createHeightAnnotation(
  bounds: BoxBounds,
  parameters: BoxParameters,
  offset: number,
  tickSize: number,
): DimensionAnnotation {
  const lineStart = point(
    bounds.max[0] + offset,
    bounds.max[1] + offset,
    bounds.min[2],
  )
  const lineEnd = point(
    bounds.max[0] + offset,
    bounds.max[1] + offset,
    bounds.max[2],
  )

  return createAnnotation({
    key: "height",
    axis: "Z",
    label: "高度",
    value: parameters.height,
    dimensionLine: segment(lineStart, lineEnd),
    extensionLines: [
      segment(point(bounds.max[0], bounds.max[1], bounds.min[2]), lineStart),
      segment(point(bounds.max[0], bounds.max[1], bounds.max[2]), lineEnd),
    ],
    endTicks: [
      segment(
        point(lineStart[0] - tickSize / 2, lineStart[1], lineStart[2]),
        point(lineStart[0] + tickSize / 2, lineStart[1], lineStart[2]),
      ),
      segment(
        point(lineEnd[0] - tickSize / 2, lineEnd[1], lineEnd[2]),
        point(lineEnd[0] + tickSize / 2, lineEnd[1], lineEnd[2]),
      ),
    ],
    labelPosition: point(
      bounds.max[0] + offset,
      bounds.max[1] + offset,
      (bounds.min[2] + bounds.max[2]) / 2,
    ),
  })
}

export function createDimensionAnnotations(
  bounds: BoxBounds,
  parameters: BoxParameters,
): DimensionAnnotation[] {
  const sizeX = bounds.max[0] - bounds.min[0]
  const sizeY = bounds.max[1] - bounds.min[1]
  const sizeZ = bounds.max[2] - bounds.min[2]
  const offset = Math.max(sizeX, sizeY, sizeZ) * DIMENSION_OFFSET_RATIO
  const tickSize = offset * END_TICK_RATIO

  return [
    createWidthAnnotation(bounds, parameters, offset, tickSize),
    createDepthAnnotation(bounds, parameters, offset, tickSize),
    createHeightAnnotation(bounds, parameters, offset, tickSize),
  ]
}
