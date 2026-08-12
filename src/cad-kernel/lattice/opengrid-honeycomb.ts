import { Sketcher, type Shape3D } from 'replicad'
import {
  nominalOpenGridStackableBoxFootprintFor,
  openGridStackableBoxActiveFloorTopZFor,
  openGridStackableBoxActiveUpperInnerRimZFor,
  openGridStackableBoxDerivedGeometryFor,
  openGridStackableBoxOrdinaryBottomHoleCentersFor,
  openGridStackableBoxSocketCentersFor,
  openGridStackableCylinderDerivedGeometryFor,
  openGridStackableCylinderHoleCentersFor,
  OPENGRID_HONEYCOMB_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  OPENGRID_STACKABLE_CYLINDER_CONFIGURATION,
  type OpenGridStackableBoxOpeningDirection,
  type OpenGridStackableBoxParameters,
  type OpenGridStackableCylinderOpeningDirection,
  type OpenGridStackableCylinderParameters,
} from '../../cad-contract/units'

type Plane = 'XY' | 'YZ' | 'XZ'
type Point2D = [number, number]
type BoxSide = OpenGridStackableBoxOpeningDirection

const EPSILON = 0.0001

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // Cleanup must not replace the original geometry error.
  }
}

function hexagonPoints(center: Point2D): Point2D[] {
  const points: Point2D[] = []
  for (let index = 0; index < 6; index += 1) {
    const angle = (Math.PI / 3) * index
    points.push([
      center[0] + OPENGRID_HONEYCOMB_CONFIGURATION.cellRadius * Math.cos(angle),
      center[1] + OPENGRID_HONEYCOMB_CONFIGURATION.cellRadius * Math.sin(angle),
    ])
  }
  return points
}

function extrudePolygon(
  plane: Plane,
  origin: [number, number, number],
  points: readonly Point2D[],
  distance: number,
  direction?: [number, number, number],
): Shape3D {
  const sketcher = new Sketcher(plane, origin)
  let sketch: ReturnType<Sketcher['close']> | null = null
  try {
    const first = points[0]
    if (!first) throw new Error('OPENGRID_HONEYCOMB_PROFILE_EMPTY')
    sketcher.movePointerTo(first)
    for (const point of points.slice(1)) sketcher.lineTo(point)
    sketch = sketcher.close()
    if (direction) {
      return sketch.extrude(distance, { extrusionDirection: direction })
    }
    return sketch.extrude(distance)
  } finally {
    deleteShape(sketch)
    sketcher.delete()
  }
}

function latticeCenters(
  spanU: number,
  spanV: number,
  frameU: number,
  frameV: number,
): Point2D[] {
  const configuration = OPENGRID_HONEYCOMB_CONFIGURATION
  const minimumU = -spanU / 2 + frameU + configuration.cellRadius
  const maximumU = spanU / 2 - frameU - configuration.cellRadius
  const minimumV = -spanV / 2 + frameV + configuration.cellRadius
  const maximumV = spanV / 2 - frameV - configuration.cellRadius
  if (maximumU < minimumU || maximumV < minimumV) return []

  const centers: Point2D[] = []
  let row = 0
  for (let v = minimumV; v <= maximumV + EPSILON; v += configuration.rowPitch) {
    const offset = row % 2 === 0 ? 0 : configuration.anchorPitch / 2
    for (
      let u = minimumU + offset;
      u <= maximumU + EPSILON;
      u += configuration.anchorPitch
    ) {
      if (u >= minimumU - EPSILON && u <= maximumU + EPSILON) {
        centers.push([u, v])
      }
    }
    row += 1
  }
  return centers
}

function distanceSquared(first: Point2D, second: Point2D): number {
  const du = first[0] - second[0]
  const dv = first[1] - second[1]
  return du * du + dv * dv
}

function intersectsProtectedCircle(
  center: Point2D,
  radius: number,
  protectedCenter: Point2D,
  protectedRadius: number,
): boolean {
  const reach = radius + protectedRadius
  return distanceSquared(center, protectedCenter) <= reach * reach
}

function intersectsProtectedBand(
  center: Point2D,
  radius: number,
  axis: 0 | 1,
  position: number,
  halfWidth: number,
): boolean {
  return Math.abs(center[axis] - position) <= halfWidth + radius
}

function boxOpeningKeepout(
  parameters: OpenGridStackableBoxParameters,
  side: BoxSide,
  center: Point2D,
): boolean {
  const opening =
    openGridStackableBoxDerivedGeometryFor(parameters).openings[side]
  if (!opening.enabled) return false
  const tangentHalfWidth =
    opening.upperWidth / 2 + OPENGRID_HONEYCOMB_CONFIGURATION.featureClearance
  const tangentIndex = opening.tangentAxis === 'x' ? 0 : 1
  const tangentValue = center[tangentIndex]
  const verticalValue = center[1]
  return (
    Math.abs(tangentValue) <=
      tangentHalfWidth + OPENGRID_HONEYCOMB_CONFIGURATION.cellRadius &&
    verticalValue >=
      opening.bottomZ -
        OPENGRID_HONEYCOMB_CONFIGURATION.featureClearance -
        OPENGRID_HONEYCOMB_CONFIGURATION.cellRadius
  )
}

function boxSideCutter(
  parameters: OpenGridStackableBoxParameters,
  side: BoxSide,
  center: Point2D,
): Shape3D {
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const wallThickness = parameters.thinShellMode
    ? configuration.thinShellWallThickness
    : configuration.wallThickness
  const margin = OPENGRID_HONEYCOMB_CONFIGURATION.cutterMargin
  const distance = wallThickness + margin * 2
  const normalIsX = side === '+X' || side === '-X'
  if (normalIsX) {
    const x =
      side === '+X' ? width / 2 - wallThickness - margin : -width / 2 - margin
    return extrudePolygon(
      'YZ',
      [x, 0, 0],
      hexagonPoints(center),
      distance,
      [1, 0, 0],
    )
  }

  const y =
    side === '+Y' ? depth / 2 - wallThickness - margin : -depth / 2 - margin
  return extrudePolygon(
    'XZ',
    [0, y, 0],
    hexagonPoints(center),
    distance,
    [0, 1, 0],
  )
}

export function makeOpenGridStackableBoxSideHoneycombCutters(
  parameters: OpenGridStackableBoxParameters,
): Shape3D[] {
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  const derived = openGridStackableBoxDerivedGeometryFor(parameters)
  const lowerZ =
    derived.activeFloorTopZ + OPENGRID_HONEYCOMB_CONFIGURATION.lowerFrame
  const upperZ =
    derived.activeUpperInnerRimZ - OPENGRID_HONEYCOMB_CONFIGURATION.topFrame
  const cutters: Shape3D[] = []
  try {
    for (const side of ['+X', '-X', '+Y', '-Y'] as const) {
      const tangentSpan = side === '+X' || side === '-X' ? depth : width
      const panelHeight = upperZ - lowerZ
      if (tangentSpan < OPENGRID_HONEYCOMB_CONFIGURATION.minimumPanelSpan)
        continue
      if (panelHeight < OPENGRID_HONEYCOMB_CONFIGURATION.minimumPanelSpan)
        continue

      const centers = latticeCenters(
        tangentSpan,
        panelHeight,
        OPENGRID_HONEYCOMB_CONFIGURATION.sideFrame,
        0,
      )
      for (const [tangent, localZ] of centers) {
        const center: Point2D = [tangent, localZ + (lowerZ + upperZ) / 2]
        if (boxOpeningKeepout(parameters, side, center)) continue
        cutters.push(boxSideCutter(parameters, side, center))
      }
    }
    return cutters
  } catch (error) {
    cutters.forEach(deleteShape)
    throw error
  }
}

function boxBottomProtected(
  parameters: OpenGridStackableBoxParameters,
  center: Point2D,
): boolean {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const protectedRadius =
    Math.max(
      configuration.baseHoleTopOpeningDiameter,
      configuration.bottomGridHoleDiameter,
    ) /
      2 +
    OPENGRID_HONEYCOMB_CONFIGURATION.featureClearance
  const holes = [
    ...openGridStackableBoxSocketCentersFor(parameters),
    ...openGridStackableBoxOrdinaryBottomHoleCentersFor(parameters),
  ]
  if (
    holes.some((hole) =>
      intersectsProtectedCircle(
        center,
        OPENGRID_HONEYCOMB_CONFIGURATION.cellRadius,
        hole,
        protectedRadius,
      ),
    )
  ) {
    return true
  }

  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  const seamHalfWidth =
    configuration.bottomGridSeamSupportOpeningWidth / 2 +
    OPENGRID_HONEYCOMB_CONFIGURATION.featureClearance
  for (let index = 1; index < Math.ceil(parameters.x); index += 1) {
    const position = -width / 2 + index * configuration.gridPitch
    if (
      intersectsProtectedBand(
        center,
        OPENGRID_HONEYCOMB_CONFIGURATION.cellRadius,
        0,
        position,
        seamHalfWidth,
      )
    )
      return true
  }
  for (let index = 1; index < Math.ceil(parameters.y); index += 1) {
    const position = -depth / 2 + index * configuration.gridPitch
    if (
      intersectsProtectedBand(
        center,
        OPENGRID_HONEYCOMB_CONFIGURATION.cellRadius,
        1,
        position,
        seamHalfWidth,
      )
    )
      return true
  }

  const centralKeepout =
    configuration.baseFlangeDiameter / 2 +
    OPENGRID_HONEYCOMB_CONFIGURATION.featureClearance
  return (
    distanceSquared(center, [0, 0]) <=
    (centralKeepout + OPENGRID_HONEYCOMB_CONFIGURATION.cellRadius) ** 2
  )
}

export function makeOpenGridStackableBoxBottomHoneycombCutters(
  parameters: OpenGridStackableBoxParameters,
): Shape3D[] {
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  const floorTop = openGridStackableBoxActiveFloorTopZFor(parameters)
  const centers = latticeCenters(
    width,
    depth,
    OPENGRID_HONEYCOMB_CONFIGURATION.bottomFrame,
    OPENGRID_HONEYCOMB_CONFIGURATION.bottomFrame,
  )
  const margin = OPENGRID_HONEYCOMB_CONFIGURATION.cutterMargin
  const cutters: Shape3D[] = []
  try {
    for (const center of centers) {
      if (boxBottomProtected(parameters, center)) continue
      cutters.push(
        extrudePolygon(
          'XY',
          [0, 0, -margin],
          hexagonPoints(center),
          floorTop + margin * 2,
        ),
      )
    }
    return cutters
  } catch (error) {
    cutters.forEach(deleteShape)
    throw error
  }
}

function normalizedAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle))
}

function angularDistance(first: number, second: number): number {
  return Math.abs(normalizedAngle(first - second))
}

function cylinderOpeningKeepout(
  parameters: OpenGridStackableCylinderParameters,
  center: Point2D,
): boolean {
  const derived = openGridStackableCylinderDerivedGeometryFor(parameters)
  const radius = parameters.diameter / 2
  const angle = center[0] / radius
  const directions: ReadonlyArray<
    readonly [OpenGridStackableCylinderOpeningDirection, number]
  > = [
    ['+X', 0],
    ['+Y', Math.PI / 2],
    ['-X', Math.PI],
    ['-Y', -Math.PI / 2],
  ]
  for (const [direction, directionAngle] of directions) {
    const opening = derived.openings[direction]
    if (!opening.enabled) continue
    const angularKeepout =
      opening.angularHalfWidth +
      (OPENGRID_HONEYCOMB_CONFIGURATION.cellRadius +
        OPENGRID_HONEYCOMB_CONFIGURATION.featureClearance) /
        radius
    if (
      center[1] >=
        opening.bottomZ -
          OPENGRID_HONEYCOMB_CONFIGURATION.featureClearance -
          OPENGRID_HONEYCOMB_CONFIGURATION.cellRadius &&
      angularDistance(angle, directionAngle) <= angularKeepout
    ) {
      return true
    }
  }
  return false
}

function rotateAroundZ(shape: Shape3D, angleDegrees: number): Shape3D {
  if (Math.abs(angleDegrees) < EPSILON) return shape
  const rotated = shape.rotate(angleDegrees, [0, 0, 0], [0, 0, 1])
  if (rotated !== shape) deleteShape(shape)
  return rotated
}

export function makeOpenGridStackableCylinderSideHoneycombCutters(
  parameters: OpenGridStackableCylinderParameters,
): Shape3D[] {
  const configuration = OPENGRID_STACKABLE_CYLINDER_CONFIGURATION
  const honeycomb = OPENGRID_HONEYCOMB_CONFIGURATION
  const derived = openGridStackableCylinderDerivedGeometryFor(parameters)
  const radius = parameters.diameter / 2
  const lowerZ = derived.outerTransitionEndZ + honeycomb.lowerFrame
  const upperZ = parameters.height - honeycomb.topFrame
  const tangentSpan = 2 * Math.PI * radius
  const panelHeight = upperZ - lowerZ
  if (panelHeight < honeycomb.minimumPanelSpan) return []
  if (tangentSpan < honeycomb.minimumPanelSpan) return []

  const wallDistance = derived.wallThickness + honeycomb.cutterMargin * 2
  const centers = latticeCenters(
    tangentSpan,
    panelHeight,
    honeycomb.sideFrame,
    0,
  )
  const cutters: Shape3D[] = []
  try {
    for (const [tangent, localZ] of centers) {
      const center: Point2D = [tangent, localZ + (lowerZ + upperZ) / 2]
      if (Math.abs(tangent) > tangentSpan / 2 - honeycomb.sideFrame) continue
      if (cylinderOpeningKeepout(parameters, center)) continue
      let base: Shape3D | null = null
      try {
        base = extrudePolygon(
          'YZ',
          [radius - derived.wallThickness - honeycomb.cutterMargin, 0, 0],
          hexagonPoints([0, center[1]]),
          wallDistance,
          [1, 0, 0],
        )
        cutters.push(rotateAroundZ(base, (tangent / radius) * (180 / Math.PI)))
        base = null
      } finally {
        deleteShape(base)
      }
    }
    return cutters
  } catch (error) {
    cutters.forEach(deleteShape)
    throw error
  }
}

function cylinderBottomProtected(
  parameters: OpenGridStackableCylinderParameters,
  center: Point2D,
): boolean {
  const configuration = OPENGRID_STACKABLE_CYLINDER_CONFIGURATION
  const honeycomb = OPENGRID_HONEYCOMB_CONFIGURATION
  const derived = openGridStackableCylinderDerivedGeometryFor(parameters)
  const radius = parameters.diameter / 2

  const protectedRadius =
    Math.max(
      configuration.bottomHoleDiameter,
      configuration.innerHoleDiameter,
    ) /
      2 +
    honeycomb.featureClearance
  if (
    openGridStackableCylinderHoleCentersFor(parameters).some((hole) =>
      intersectsProtectedCircle(
        center,
        honeycomb.cellRadius,
        hole,
        protectedRadius,
      ),
    )
  ) {
    return true
  }

  const floorKeepout = Math.max(
    0,
    derived.flatFloorRadius - honeycomb.bottomFrame,
  )
  if (Math.hypot(center[0], center[1]) > floorKeepout) return true
  return (
    Math.hypot(center[0], center[1]) + honeycomb.cellRadius >
    radius - configuration.outerEdgeClearance
  )
}

function cylinderBottomHoneycombCenters(
  parameters: OpenGridStackableCylinderParameters,
): Point2D[] {
  const derived = openGridStackableCylinderDerivedGeometryFor(parameters)
  const radius = parameters.diameter / 2
  const span = Math.max(0, derived.flatFloorRadius * 2)
  const centers = latticeCenters(
    span,
    span,
    OPENGRID_HONEYCOMB_CONFIGURATION.bottomFrame,
    OPENGRID_HONEYCOMB_CONFIGURATION.bottomFrame,
  )
  return centers.filter((center) => {
    if (
      Math.hypot(center[0], center[1]) +
        OPENGRID_HONEYCOMB_CONFIGURATION.cellRadius >
      radius - OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.outerEdgeClearance
    ) {
      return false
    }
    return !cylinderBottomProtected(parameters, center)
  })
}

function cylinderBottomHoneycombLowerZ(
  parameters: OpenGridStackableCylinderParameters,
): number | null {
  const derived = openGridStackableCylinderDerivedGeometryFor(parameters)
  const honeycomb = OPENGRID_HONEYCOMB_CONFIGURATION
  const lowerInterfaceZ =
    derived.profile === 'thin'
      ? derived.floorThickness
      : OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.bottomVerticalHeight
  const lowerZ = Math.max(honeycomb.bottomSkinThickness, lowerInterfaceZ)
  return lowerZ < derived.floorThickness - honeycomb.cutterMargin
    ? lowerZ
    : null
}

export function makeOpenGridStackableCylinderBottomHoneycombCutters(
  parameters: OpenGridStackableCylinderParameters,
): Shape3D[] {
  const derived = openGridStackableCylinderDerivedGeometryFor(parameters)
  const honeycomb = OPENGRID_HONEYCOMB_CONFIGURATION
  const lowerZ = cylinderBottomHoneycombLowerZ(parameters)
  if (lowerZ === null) return []
  const margin = honeycomb.cutterMargin
  const centers = cylinderBottomHoneycombCenters(parameters)
  const cutters: Shape3D[] = []
  try {
    for (const center of centers) {
      cutters.push(
        extrudePolygon(
          'XY',
          [0, 0, lowerZ + margin],
          hexagonPoints(center),
          derived.floorThickness - lowerZ + margin,
        ),
      )
    }
    return cutters
  } catch (error) {
    cutters.forEach(deleteShape)
    throw error
  }
}

export function openGridStackableCylinderBottomHoneycombCellCountFor(
  parameters: OpenGridStackableCylinderParameters,
): number {
  if (!parameters.honeycombMode) return 0
  if (cylinderBottomHoneycombLowerZ(parameters) === null) return 0
  return cylinderBottomHoneycombCenters(parameters).length
}

export function openGridStackableBoxHoneycombCellCountFor(
  parameters: OpenGridStackableBoxParameters,
): number {
  if (!parameters.honeycombMode) return 0
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  const derived = openGridStackableBoxDerivedGeometryFor(parameters)
  const lowerZ =
    derived.activeFloorTopZ + OPENGRID_HONEYCOMB_CONFIGURATION.lowerFrame
  const upperZ =
    derived.activeUpperInnerRimZ - OPENGRID_HONEYCOMB_CONFIGURATION.topFrame
  let count = 0
  for (const side of ['+X', '-X', '+Y', '-Y'] as const) {
    const tangentSpan = side === '+X' || side === '-X' ? depth : width
    const panelHeight = upperZ - lowerZ
    if (tangentSpan < OPENGRID_HONEYCOMB_CONFIGURATION.minimumPanelSpan)
      continue
    if (panelHeight < OPENGRID_HONEYCOMB_CONFIGURATION.minimumPanelSpan)
      continue
    for (const [tangent, localZ] of latticeCenters(
      tangentSpan,
      panelHeight,
      OPENGRID_HONEYCOMB_CONFIGURATION.sideFrame,
      0,
    )) {
      const center: Point2D = [tangent, localZ + (lowerZ + upperZ) / 2]
      if (!boxOpeningKeepout(parameters, side, center)) count += 1
    }
  }

  for (const center of latticeCenters(
    width,
    depth,
    OPENGRID_HONEYCOMB_CONFIGURATION.bottomFrame,
    OPENGRID_HONEYCOMB_CONFIGURATION.bottomFrame,
  )) {
    if (!boxBottomProtected(parameters, center)) count += 1
  }
  return count
}

export function openGridStackableCylinderHoneycombCellCountFor(
  parameters: OpenGridStackableCylinderParameters,
): number {
  if (!parameters.honeycombMode) return 0
  const configuration = OPENGRID_HONEYCOMB_CONFIGURATION
  const derived = openGridStackableCylinderDerivedGeometryFor(parameters)
  const radius = parameters.diameter / 2
  const lowerZ = derived.outerTransitionEndZ + configuration.lowerFrame
  const upperZ = parameters.height - configuration.topFrame
  const tangentSpan = 2 * Math.PI * radius
  const panelHeight = upperZ - lowerZ
  let count = 0
  if (
    panelHeight >= configuration.minimumPanelSpan &&
    tangentSpan >= configuration.minimumPanelSpan
  ) {
    for (const [tangent, localZ] of latticeCenters(
      tangentSpan,
      panelHeight,
      configuration.sideFrame,
      0,
    )) {
      const center: Point2D = [tangent, localZ + (lowerZ + upperZ) / 2]
      if (Math.abs(tangent) <= tangentSpan / 2 - configuration.sideFrame) {
        if (!cylinderOpeningKeepout(parameters, center)) count += 1
      }
    }
  }

  count += openGridStackableCylinderBottomHoneycombCellCountFor(parameters)
  return count
}
