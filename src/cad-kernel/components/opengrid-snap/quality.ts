import { getOC, makeBox, measureVolume, Solid, type Shape3D } from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import {
  boundsForOpenGridSnap,
  OPENGRID_SNAP_CONFIGURATION,
  type ModelBounds,
  type OpenGridSnapParameters,
} from '../../../cad-contract/units'
import type { MeshSnapshot } from '../../../cad-contract/messages'
import type { MeshData } from '../../mesh'

const QUALITY_TOLERANCE = 0.05
// Meshing an offset assembly can add a small OCC boundary epsilon to the
// extracted solid boxes; keep this separate from fixed-core volume checks.
const GENERATED_ENVELOPE_TOLERANCE = 0.1
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
  const height = bounds.max[2] + 0.2
  const probes: Probe[] = []
  if (parameters.halfCellX !== 'none') {
    const isLeft = parameters.halfCellX === 'left'
    const x = isLeft ? bounds.min[0] : bounds.max[0]
    const minX = isLeft ? x : x - probeWidth
    const maxX = isLeft ? x + probeWidth : x
    probes.push({ min: [minX, -1, -0.1], max: [maxX, 1, height] })
  }
  if (parameters.halfCellY !== 'none') {
    const isBottom = parameters.halfCellY === 'bottom'
    const y = isBottom ? bounds.min[1] : bounds.max[1]
    const minY = isBottom ? y : y - probeWidth
    const maxY = isBottom ? y + probeWidth : y
    probes.push({ min: [-1, minY, -0.1], max: [1, maxY, height] })
  }
  return probes
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

  try {
    let envelopeTolerance = GENERATED_ENVELOPE_TOLERANCE
    if (parameters.offset === 0 && !hasHalfCell(parameters)) {
      envelopeTolerance = ZERO_OFFSET_ENVELOPE_TOLERANCE
    }
    bounds = readAssemblyBounds(shape)
    if (!boundsMatch(bounds, expectedBounds, envelopeTolerance)) {
      failures.push('bounds:expected-centered-envelope')
    }
    if (
      !isClose(bounds.min[2], 0, envelopeTolerance) ||
      !isClose(
        bounds.max[2],
        OPENGRID_SNAP_CONFIGURATION.variantHeights[parameters.variant],
        envelopeTolerance,
      )
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
    } else if (solidCount !== 9) {
      failures.push('topology:expected-nine-solids')
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
  } else {
    const fixedCore = compareFixedCore(
      shape,
      reference,
      OPENGRID_SNAP_CONFIGURATION.variantHeights[parameters.variant],
      failures,
    )
    centralBounds = fixedCore.centralBounds
    centralVolume = fixedCore.centralVolume
    internalProbeVolumes = fixedCore.internalProbeVolumes
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
