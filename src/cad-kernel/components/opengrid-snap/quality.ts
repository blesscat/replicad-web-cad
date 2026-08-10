import {
  getOC,
  makeBox,
  makeCylinder,
  measureVolume,
  Solid,
  type Shape3D,
} from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import {
  boundsForOpenGridSnap,
  OPENGRID_SNAP_CONFIGURATION,
  type ModelBounds,
  type OpenGridSnapParameters,
} from '../../../cad-contract/units'
import {
  openGridSnapLocatingHoleCentersFor,
  openGridSnapProfileFor,
} from './profile'
import type { MeshSnapshot } from '../../../cad-contract/messages'
import type { MeshData } from '../../mesh'

const QUALITY_TOLERANCE = 0.05
// Meshing an offset assembly can add a small OCC boundary epsilon to the
// extracted solid boxes; keep this separate from fixed-core volume checks.
export const OPENGRID_SNAP_GENERATED_ENVELOPE_TOLERANCE = 0.15
// Cloning and meshing the imported zero-offset compound can expand OCC's
// cached envelope by this deterministic amount without changing its solids.
const ZERO_OFFSET_ENVELOPE_TOLERANCE = 0.15

type Probe = {
  min: [number, number, number]
  max: [number, number, number]
}

export type OpenGridSnapQualityReport = {
  passed: boolean
  failures: string[]
  bounds: ModelBounds | null
  expectedBounds: ModelBounds
  solidCount: number | null
  centralBounds: ModelBounds | null
  centralVolume: number | null
  internalProbeVolumes: number[]
  optionalFeatureProbeVolumes: number[]
  meshTriangleCount: number
}

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // Quality cleanup must not hide the original diagnostic.
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

function readAssemblyBounds(shape: Shape3D): ModelBounds {
  const oc = getOC()
  const explorer = new oc.TopExp_Explorer_2(
    shape.wrapped,
    oc.TopAbs_ShapeEnum.TopAbs_SOLID as unknown as TopAbs_ShapeEnum,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE as unknown as TopAbs_ShapeEnum,
  )
  let bounds: ModelBounds | null = null
  try {
    while (explorer.More()) {
      const solid = new Solid(oc.TopoDS.Solid_1(explorer.Current()))
      try {
        const solidBounds = readBounds(solid)
        if (!bounds) {
          bounds = solidBounds
        } else {
          bounds = {
            min: [
              Math.min(bounds.min[0], solidBounds.min[0]),
              Math.min(bounds.min[1], solidBounds.min[1]),
              Math.min(bounds.min[2], solidBounds.min[2]),
            ],
            max: [
              Math.max(bounds.max[0], solidBounds.max[0]),
              Math.max(bounds.max[1], solidBounds.max[1]),
              Math.max(bounds.max[2], solidBounds.max[2]),
            ],
          }
        }
      } finally {
        solid.delete()
      }
      explorer.Next()
    }
  } finally {
    explorer.delete()
  }
  if (!bounds) throw new Error('OPENGRID_SNAP_ASSEMBLY_EMPTY')
  return bounds
}

function isClose(
  first: number,
  second: number,
  tolerance = QUALITY_TOLERANCE,
): boolean {
  return Math.abs(first - second) <= tolerance
}

function boundsMatch(
  actual: ModelBounds,
  expected: ModelBounds,
  tolerance = QUALITY_TOLERANCE,
): boolean {
  return [...actual.min, ...actual.max].every((coordinate, index) => {
    const expectedCoordinate = [...expected.min, ...expected.max][index]
    return isClose(coordinate, expectedCoordinate, tolerance)
  })
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

function largestSolid(shape: Shape3D): Solid {
  const oc = getOC()
  const explorer = new oc.TopExp_Explorer_2(
    shape.wrapped,
    oc.TopAbs_ShapeEnum.TopAbs_SOLID as unknown as TopAbs_ShapeEnum,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE as unknown as TopAbs_ShapeEnum,
  )
  let selected: Solid | null = null
  let selectedVolume = -Infinity
  try {
    while (explorer.More()) {
      const solid = new Solid(oc.TopoDS.Solid_1(explorer.Current()))
      const volume = measureVolume(solid)
      if (volume > selectedVolume) {
        deleteShape(selected)
        selected = solid
        selectedVolume = volume
      } else {
        solid.delete()
      }
      explorer.Next()
    }
  } finally {
    explorer.delete()
  }
  if (!selected) throw new Error('OPENGRID_SNAP_CENTRAL_SOLID_MISSING')
  return selected
}

function volumeInProbe(shape: Shape3D, probeBounds: Probe): number {
  const probe = makeBox(probeBounds.min, probeBounds.max)
  let intersection: Shape3D | null = null
  try {
    intersection = shape.intersect(probe)
    return measureVolume(intersection)
  } finally {
    if (intersection && intersection !== shape) deleteShape(intersection)
    deleteShape(probe)
  }
}

function volumeInCylinder(
  shape: Shape3D,
  center: [number, number],
  radius: number,
  bounds: ModelBounds,
): number {
  const cylinder = makeCylinder(radius, bounds.max[2] - bounds.min[2] + 0.4, [
    center[0],
    center[1],
    bounds.min[2] - 0.2,
  ])
  let intersection: Shape3D | null = null
  try {
    intersection = shape.intersect(cylinder)
    return measureVolume(intersection)
  } finally {
    if (intersection && intersection !== shape) deleteShape(intersection)
    deleteShape(cylinder)
  }
}

function volumeInCylindricalAnnulus(
  shape: Shape3D,
  center: [number, number],
  innerRadius: number,
  outerRadius: number,
  bounds: ModelBounds,
): number {
  const outer = makeCylinder(outerRadius, bounds.max[2] - bounds.min[2] + 0.4, [
    center[0],
    center[1],
    bounds.min[2] - 0.2,
  ])
  const inner = makeCylinder(innerRadius, bounds.max[2] - bounds.min[2] + 0.6, [
    center[0],
    center[1],
    bounds.min[2] - 0.3,
  ])
  let annulus: Shape3D | null = null
  let intersection: Shape3D | null = null
  try {
    annulus = outer.cut(inner)
    intersection = shape.intersect(annulus)
    return measureVolume(intersection)
  } finally {
    if (intersection && intersection !== shape) deleteShape(intersection)
    if (annulus && annulus !== outer && annulus !== inner) deleteShape(annulus)
    deleteShape(outer)
    deleteShape(inner)
  }
}

function volumeInBoxProbe(shape: Shape3D, bounds: Probe): number {
  return volumeInProbe(shape, bounds)
}

function probeFitsInBounds(
  point: [number, number],
  radius: number,
  bounds: ModelBounds,
): boolean {
  return (
    point[0] >= bounds.min[0] + radius &&
    point[0] <= bounds.max[0] - radius &&
    point[1] >= bounds.min[1] + radius &&
    point[1] <= bounds.max[1] - radius
  )
}

function featureTranslationFor(
  parameters: OpenGridSnapParameters,
): [number, number] {
  const fullBounds = boundsForOpenGridSnap({
    variant: parameters.variant,
    profile: parameters.profile,
    offset: parameters.offset,
    halfCellX: 'none',
    halfCellY: 'none',
  })
  const sourceMinX =
    fullBounds.min[0] -
    (parameters.halfCellX === 'none' ? 0 : parameters.offset / 2)
  const sourceMaxX =
    fullBounds.max[0] +
    (parameters.halfCellX === 'none' ? 0 : parameters.offset / 2)
  const sourceMinY =
    fullBounds.min[1] -
    (parameters.halfCellY === 'none' ? 0 : parameters.offset / 2)
  const sourceMaxY =
    fullBounds.max[1] +
    (parameters.halfCellY === 'none' ? 0 : parameters.offset / 2)

  let translationX = 0
  let translationY = 0
  if (parameters.halfCellX === 'left') {
    translationX = -(sourceMinX + 0) / 2
  }
  if (parameters.halfCellX === 'right') {
    translationX = -(0 + sourceMaxX) / 2
  }
  if (parameters.halfCellY === 'bottom') {
    translationY = -(sourceMinY + 0) / 2
  }
  if (parameters.halfCellY === 'top') {
    translationY = -(0 + sourceMaxY) / 2
  }
  return [translationX, translationY]
}

function translateFeaturePoint(
  point: [number, number],
  translation: [number, number],
): [number, number] {
  return [point[0] + translation[0], point[1] + translation[1]]
}

function centerRemoverProbe(
  definition: ReturnType<typeof openGridSnapProfileFor>,
  center: [number, number],
  halfWidth: number,
  zMin: number,
  zMax: number,
): Probe {
  const margin = 0.1
  return {
    min: [
      center[0] - halfWidth + margin,
      center[1] - definition.centerRemoverHalfDepth + margin,
      zMin,
    ],
    max: [
      center[0] + halfWidth - margin,
      center[1] + definition.centerRemoverHalfDepth - margin,
      zMax,
    ],
  }
}

function centerRemoverLedgeProbe(
  definition: ReturnType<typeof openGridSnapProfileFor>,
  center: [number, number],
  bounds: ModelBounds,
): Probe {
  return {
    min: [
      center[0] + definition.centerRemoverUpperHalfWidth + 0.2,
      center[1] - definition.centerRemoverHalfDepth + 0.2,
      definition.centerRemoverStepZ + 0.1,
    ],
    max: [
      center[0] + definition.centerRemoverLowerHalfWidth - 0.2,
      center[1] + definition.centerRemoverHalfDepth - 0.2,
      Math.min(definition.centerRemoverStepZ + 0.4, bounds.max[2] - 0.1),
    ],
  }
}

function inspectOptionalFeatureProbes(
  shape: Shape3D,
  parameters: OpenGridSnapParameters,
  bounds: ModelBounds | null,
  failures: string[],
): number[] {
  if (!bounds) return []

  const definition = openGridSnapProfileFor(
    parameters.profile,
    parameters.variant,
  )
  const translation = featureTranslationFor(parameters)
  const central = largestSolid(shape)
  const probeVolumes: number[] = []
  try {
    if (parameters.fourCornerLocatingHoles) {
      const probeRadius = definition.locatingHoleRadius - 0.15
      for (const sourceCenter of openGridSnapLocatingHoleCentersFor(
        definition,
      )) {
        const center = translateFeaturePoint(sourceCenter, translation)
        if (
          !probeFitsInBounds(
            center,
            definition.locatingHoleRadius + 0.15,
            bounds,
          )
        ) {
          continue
        }
        const volume = volumeInCylinder(central, center, probeRadius, bounds)
        const annulusVolume = volumeInCylindricalAnnulus(
          central,
          center,
          definition.locatingHoleRadius - 0.15,
          definition.locatingHoleRadius + 0.15,
          bounds,
        )
        probeVolumes.push(volume)
        if (volume > QUALITY_TOLERANCE) {
          failures.push('features:locating-hole-missing')
        }
        if (annulusVolume <= QUALITY_TOLERANCE) {
          failures.push('features:locating-hole-diameter-or-center-invalid')
        }
      }
    } else {
      for (const sourceCenter of openGridSnapLocatingHoleCentersFor(
        definition,
      )) {
        const center = translateFeaturePoint(sourceCenter, translation)
        if (!probeFitsInBounds(center, 0.75, bounds)) continue
        const volume = volumeInCylinder(central, center, 0.75, bounds)
        probeVolumes.push(volume)
        if (volume <= QUALITY_TOLERANCE) {
          failures.push('features:locating-hole-unexpected')
        }
      }
    }

    if (parameters.centerRemoverHole) {
      const center = translateFeaturePoint([0, 0], translation)
      if (
        !probeFitsInBounds(
          center,
          definition.centerRemoverLowerHalfWidth + 0.2,
          bounds,
        )
      ) {
        return probeVolumes
      }
      const lowerProbeVolume = volumeInBoxProbe(
        central,
        centerRemoverProbe(
          definition,
          center,
          definition.centerRemoverLowerHalfWidth,
          bounds.min[2] - 0.2,
          definition.centerRemoverStepZ - 0.1,
        ),
      )
      const upperProbeVolume = volumeInBoxProbe(
        central,
        centerRemoverProbe(
          definition,
          center,
          definition.centerRemoverUpperHalfWidth,
          definition.centerRemoverStepZ + 0.1,
          bounds.max[2] + 0.2,
        ),
      )
      const ledgeProbeVolume = volumeInBoxProbe(
        central,
        centerRemoverLedgeProbe(definition, center, bounds),
      )
      probeVolumes.push(lowerProbeVolume, upperProbeVolume, ledgeProbeVolume)
      if (
        lowerProbeVolume > QUALITY_TOLERANCE ||
        upperProbeVolume > QUALITY_TOLERANCE ||
        ledgeProbeVolume <= QUALITY_TOLERANCE
      ) {
        failures.push('features:center-remover-missing')
      }
    } else {
      const center = translateFeaturePoint([0, 0], translation)
      if (!probeFitsInBounds(center, 0.75, bounds)) {
        return probeVolumes
      }
      const lowerBodyVolume = volumeInBoxProbe(
        central,
        centerRemoverProbe(
          definition,
          center,
          0.5,
          bounds.min[2] - 0.2,
          definition.centerRemoverStepZ - 0.1,
        ),
      )
      const upperBodyVolume = volumeInBoxProbe(
        central,
        centerRemoverProbe(
          definition,
          center,
          0.5,
          definition.centerRemoverStepZ + 0.1,
          bounds.max[2] + 0.2,
        ),
      )
      probeVolumes.push(lowerBodyVolume, upperBodyVolume)
      if (
        lowerBodyVolume <= QUALITY_TOLERANCE ||
        upperBodyVolume <= QUALITY_TOLERANCE
      ) {
        failures.push('features:center-remover-unexpected')
      }
    }
  } finally {
    deleteShape(central)
  }
  return probeVolumes
}

function fixedInternalProbes(height: number): Probe[] {
  const probeHeight = height + 0.4
  return [
    { min: [-1, -1, -0.2], max: [1, 1, probeHeight] },
    { min: [-5, -1, -0.2], max: [-3, 1, probeHeight] },
    { min: [-1, -5, -0.2], max: [1, -3, probeHeight] },
  ]
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

function isBRepValid(shape: Shape3D): boolean {
  const oc = getOC()
  const analyzer = new oc.BRepCheck_Analyzer(shape.wrapped, true, true)
  try {
    return analyzer.IsValid_2()
  } finally {
    analyzer.delete()
  }
}

function compareFixedCore(
  shape: Shape3D,
  reference: Shape3D,
  height: number,
  failures: string[],
): {
  centralBounds: ModelBounds | null
  centralVolume: number | null
  internalProbeVolumes: number[]
} {
  let centralBounds: ModelBounds | null = null
  let centralVolume: number | null = null
  const internalProbeVolumes: number[] = []
  let central: Solid | null = null
  let referenceCentral: Solid | null = null
  try {
    central = largestSolid(shape)
    referenceCentral = largestSolid(reference)
    centralBounds = readBounds(central)
    const referenceBounds = readBounds(referenceCentral)
    centralVolume = measureVolume(central)
    const referenceVolume = measureVolume(referenceCentral)
    if (!boundsMatch(centralBounds, referenceBounds)) {
      failures.push('fixed-core:central-bounds-changed')
    }
    if (!isClose(centralVolume, referenceVolume)) {
      failures.push('fixed-core:central-volume-changed')
    }

    for (const probe of fixedInternalProbes(height)) {
      const actual = volumeInProbe(shape, probe)
      const expected = volumeInProbe(reference, probe)
      internalProbeVolumes.push(actual)
      if (!isClose(actual, expected)) {
        failures.push('fixed-core:internal-probe-changed')
      }
    }
  } catch (error) {
    failures.push(
      `fixed-core:${error instanceof Error ? error.message : String(error)}`,
    )
  } finally {
    deleteShape(central)
    deleteShape(referenceCentral)
  }

  return { centralBounds, centralVolume, internalProbeVolumes }
}

function hasHalfCell(parameters: OpenGridSnapParameters): boolean {
  return parameters.halfCellX !== 'none' || parameters.halfCellY !== 'none'
}

function halfCellBoundaryProbes(
  parameters: OpenGridSnapParameters,
  bounds: ModelBounds,
): Probe[] {
  const probeWidth = 0.6
  const orthogonalMargin = 0.2
  const height = bounds.max[2] + 0.2
  const probes: Probe[] = []
  if (parameters.halfCellX !== 'none') {
    const isLeft = parameters.halfCellX === 'left'
    const x = isLeft ? bounds.min[0] : bounds.max[0]
    const minX = isLeft ? x : x - probeWidth
    const maxX = isLeft ? x + probeWidth : x
    probes.push({
      min: [minX, bounds.min[1] + orthogonalMargin, -0.1],
      max: [maxX, bounds.max[1] - orthogonalMargin, height],
    })
  }
  if (parameters.halfCellY !== 'none') {
    const isBottom = parameters.halfCellY === 'bottom'
    const y = isBottom ? bounds.min[1] : bounds.max[1]
    const minY = isBottom ? y : y - probeWidth
    const maxY = isBottom ? y + probeWidth : y
    probes.push({
      min: [bounds.min[0] + orthogonalMargin, minY, -0.1],
      max: [bounds.max[0] - orthogonalMargin, maxY, height],
    })
  }
  return probes
}

function boundaryTouches(min: number, max: number, boundary: number): boolean {
  return min <= boundary + 0.2 && max >= boundary - 0.2
}

function hasDiagonalBoundaryFace(
  shape: Shape3D,
  axis: 'x' | 'y',
  boundary: number,
): boolean {
  for (const face of shape.faces) {
    try {
      if (face.geomType !== 'PLANE') continue
      const normal = face.normalAt()
      const faceBounds = face.boundingBox
      try {
        const [min, max] = faceBounds.bounds as [
          [number, number, number],
          [number, number, number],
        ]
        const touches =
          axis === 'x'
            ? boundaryTouches(min[0], max[0], boundary)
            : boundaryTouches(min[1], max[1], boundary)
        const hasZSpan = max[2] - min[2] > 0.05
        const hasSlopedZChamfer =
          Math.abs(normal.z) > 0.1 && Math.abs(normal.z) < 0.99
        const hasPlanarLockingCorner =
          Math.abs(normal.z) < 0.1 &&
          Math.abs(normal.x) > 0.1 &&
          Math.abs(normal.y) > 0.1
        if (
          touches &&
          hasZSpan &&
          (hasSlopedZChamfer || hasPlanarLockingCorner)
        ) {
          return true
        }
      } finally {
        faceBounds.delete()
        normal.delete()
      }
    } finally {
      face.delete()
    }
  }
  return false
}

function inspectProfileQuality(
  shape: Shape3D,
  parameters: OpenGridSnapParameters,
  bounds: ModelBounds | null,
  reference: Shape3D,
  failures: string[],
): void {
  const definition = openGridSnapProfileFor(
    parameters.profile,
    parameters.variant,
  )
  if (parameters.profile === 'Directional' && bounds) {
    if (definition.assemblyKind !== 'fused-directional') {
      failures.push('profile:directional-assembly-kind-invalid')
    }
    if (!hasHalfCell(parameters)) {
      const xSpan = bounds.max[0] - bounds.min[0]
      const ySpan = bounds.max[1] - bounds.min[1]
      const expectedAsymmetry =
        definition.expectedBounds.max[1] -
        definition.expectedBounds.min[1] -
        (definition.expectedBounds.max[0] - definition.expectedBounds.min[0])
      if (Math.abs(ySpan - xSpan - expectedAsymmetry) > 0.15) {
        failures.push('profile:directional-asymmetry-missing')
      }
      if (
        !parameters.fourCornerLocatingHoles &&
        !parameters.centerRemoverHole &&
        parameters.offset === 0 &&
        Math.abs(measureVolume(shape) - measureVolume(reference)) >
          QUALITY_TOLERANCE
      ) {
        failures.push('profile:directional-baseline-changed')
      }
    }
  }
}

function snapHalfCellSourceInterfaceX(
  direction: OpenGridSnapParameters['halfCellX'],
): number {
  if (direction === 'left') return -4
  if (direction === 'right') return 4
  return 0
}

function snapHalfCellSourceInterfaceY(
  direction: OpenGridSnapParameters['halfCellY'],
): number {
  if (direction === 'bottom') return -4
  if (direction === 'top') return 4
  return 0
}

function snapHalfCellTranslationX(
  direction: OpenGridSnapParameters['halfCellX'],
): number {
  if (direction === 'left') return 6.4
  if (direction === 'right') return -6.4
  return 0
}

function snapHalfCellTranslationY(
  direction: OpenGridSnapParameters['halfCellY'],
): number {
  if (direction === 'bottom') return 6.4
  if (direction === 'top') return -6.4
  return 0
}

function inspectHalfCellQuality(
  shape: Shape3D,
  parameters: OpenGridSnapParameters,
  bounds: ModelBounds | null,
  failures: string[],
): number[] {
  if (!bounds) return []
  const translatedInterfaceX =
    snapHalfCellSourceInterfaceX(parameters.halfCellX) +
    snapHalfCellTranslationX(parameters.halfCellX)
  const translatedInterfaceY =
    snapHalfCellSourceInterfaceY(parameters.halfCellY) +
    snapHalfCellTranslationY(parameters.halfCellY)
  const probeHalfSize = 0.8
  const centralProbe: Probe = {
    min: [
      translatedInterfaceX - probeHalfSize,
      translatedInterfaceY - probeHalfSize,
      -0.2,
    ],
    max: [
      translatedInterfaceX + probeHalfSize,
      translatedInterfaceY + probeHalfSize,
      bounds.max[2] + 0.2,
    ],
  }
  const centralVolume = volumeInProbe(shape, centralProbe)
  const internalProbeVolumes = [centralVolume]
  if (centralVolume <= 0.01) {
    failures.push('half-cell:central-interface-missing')
  }

  for (const probe of halfCellBoundaryProbes(parameters, bounds)) {
    if (volumeInProbe(shape, probe) <= 0.01) {
      failures.push('half-cell:outer-support-missing')
    }
  }
  if (parameters.halfCellX === 'left') {
    if (!hasDiagonalBoundaryFace(shape, 'x', bounds.min[0])) {
      failures.push('half-cell:left-locking-profile-missing')
    }
  }
  if (parameters.halfCellX === 'right') {
    if (!hasDiagonalBoundaryFace(shape, 'x', bounds.max[0])) {
      failures.push('half-cell:right-locking-profile-missing')
    }
  }
  if (parameters.halfCellY === 'bottom') {
    if (!hasDiagonalBoundaryFace(shape, 'y', bounds.min[1])) {
      failures.push('half-cell:bottom-locking-profile-missing')
    }
  }
  if (parameters.halfCellY === 'top') {
    if (!hasDiagonalBoundaryFace(shape, 'y', bounds.max[1])) {
      failures.push('half-cell:top-locking-profile-missing')
    }
  }
  return internalProbeVolumes
}

export function inspectOpenGridSnapShapeQuality(
  shape: Shape3D,
  parameters: OpenGridSnapParameters,
  mesh: MeshData | MeshSnapshot,
  reference: Shape3D,
): OpenGridSnapQualityReport {
  const expectedBounds = boundsForOpenGridSnap(parameters)
  const failures: string[] = []
  let bounds: ModelBounds | null = null
  let solidCount: number | null = null
  let centralBounds: ModelBounds | null = null
  let centralVolume: number | null = null
  let internalProbeVolumes: number[] = []
  let optionalFeatureProbeVolumes: number[] = []

  try {
    let envelopeTolerance = OPENGRID_SNAP_GENERATED_ENVELOPE_TOLERANCE
    if (parameters.offset === 0 && !hasHalfCell(parameters)) {
      envelopeTolerance = ZERO_OFFSET_ENVELOPE_TOLERANCE
    }
    bounds = readAssemblyBounds(shape)
    if (!boundsMatch(bounds, expectedBounds, envelopeTolerance)) {
      failures.push('bounds:expected-centered-envelope')
    }
    const expectedZMin = expectedBounds.min[2]
    const expectedZMax = expectedBounds.max[2]
    if (
      !isClose(bounds.min[2], expectedZMin, envelopeTolerance) ||
      !isClose(bounds.max[2], expectedZMax, envelopeTolerance)
    ) {
      failures.push('bounds:z-profile-changed')
    }
  } catch (error) {
    failures.push(
      `bounds:${error instanceof Error ? error.message : String(error)}`,
    )
  }

  try {
    solidCount = countSolids(shape)
    if (hasHalfCell(parameters)) {
      if (solidCount < 1) failures.push('topology:half-cell-empty')
    } else {
      const expectedSolidCount = openGridSnapProfileFor(
        parameters.profile,
        parameters.variant,
      ).expectedSolidCount
      if (solidCount !== expectedSolidCount) {
        failures.push('topology:expected-profile-solids')
      }
    }
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

  if (hasHalfCell(parameters)) {
    internalProbeVolumes = inspectHalfCellQuality(
      shape,
      parameters,
      bounds,
      failures,
    )
    try {
      const central = largestSolid(shape)
      centralBounds = readBounds(central)
      centralVolume = measureVolume(central)
      deleteShape(central)
    } catch (error) {
      failures.push(
        `half-cell:central-solid:${error instanceof Error ? error.message : String(error)}`,
      )
    }
  } else if (
    parameters.profile === 'Standard' &&
    !parameters.fourCornerLocatingHoles &&
    !parameters.centerRemoverHole
  ) {
    const fixedCore = compareFixedCore(
      shape,
      reference,
      OPENGRID_SNAP_CONFIGURATION.variantHeights[parameters.variant],
      failures,
    )
    centralBounds = fixedCore.centralBounds
    centralVolume = fixedCore.centralVolume
    internalProbeVolumes = fixedCore.internalProbeVolumes
  } else {
    try {
      const central = largestSolid(shape)
      centralBounds = readBounds(central)
      centralVolume = measureVolume(central)
      deleteShape(central)
    } catch (error) {
      failures.push(
        `profile:central-solid:${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  try {
    optionalFeatureProbeVolumes = inspectOptionalFeatureProbes(
      shape,
      parameters,
      bounds,
      failures,
    )
  } catch (error) {
    failures.push(
      `features:${error instanceof Error ? error.message : String(error)}`,
    )
  }

  try {
    inspectProfileQuality(shape, parameters, bounds, reference, failures)
  } catch (error) {
    failures.push(
      `profile:${error instanceof Error ? error.message : String(error)}`,
    )
  }

  if (mesh.triangleCount <= 0 || !meshIsFinite(mesh)) {
    failures.push('mesh:empty-or-non-finite')
  }

  return {
    passed: failures.length === 0,
    failures,
    bounds,
    expectedBounds,
    solidCount,
    centralBounds,
    centralVolume,
    internalProbeVolumes,
    optionalFeatureProbeVolumes,
    meshTriangleCount: mesh.triangleCount,
  }
}

export function assertOpenGridSnapShapeQuality(
  shape: Shape3D,
  parameters: OpenGridSnapParameters,
  mesh: MeshData | MeshSnapshot,
  reference: Shape3D,
): OpenGridSnapQualityReport {
  const report = inspectOpenGridSnapShapeQuality(
    shape,
    parameters,
    mesh,
    reference,
  )
  if (!report.passed) {
    throw new Error(
      `OPENGRID_SNAP_QUALITY_INVALID:${report.failures.join(';')}`,
    )
  }
  return report
}
