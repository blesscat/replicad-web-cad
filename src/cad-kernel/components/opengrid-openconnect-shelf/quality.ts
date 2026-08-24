import {
  getOC,
  makeBox,
  makeCompound,
  measureVolume,
  type Shape3D,
} from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import {
  boundsForOpenGridOpenConnectShelf,
  openGridOpenConnectShelfAngleRadiansFor,
  openGridOpenConnectShelfFrontHeightFor,
  openGridOpenConnectShelfSlotOriginsFor,
  openGridOpenConnectShelfWidthFor,
  OPENGRID_OPENCONNECT_SHELF_CONFIGURATION,
  type OpenGridOpenConnectShelfParameters,
} from '../../../cad-contract/units'
import { placeOpenGridOpenConnectShelfLockedSlot } from './slot'

type MeshLike = {
  bounds: { min: number[]; max: number[] }
}

type PlanarFaceRecord = {
  min: [number, number, number]
  max: [number, number, number]
  normal: [number, number, number]
}

export type OpenGridOpenConnectShelfQualityReport = {
  passed: boolean
  failures: string[]
  validBRep: boolean
  volume: number
  solidCount: number
  slotCount: number
  slotResidualVolumes: number[]
}

const SLOT_RESIDUAL_VOLUME_TOLERANCE = 0.01
const UNDERSIDE_OBSTRUCTION_VOLUME_TOLERANCE = 0.01
const GROUND_RIB_MISSING_VOLUME_TOLERANCE = 0.05

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // Cleanup must not replace the quality result.
  }
}

function closeEnough(first: number, second: number, tolerance = 0.15): boolean {
  return Math.abs(first - second) <= tolerance
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

function planarFaces(shape: Shape3D): PlanarFaceRecord[] {
  const records: PlanarFaceRecord[] = []
  for (const face of shape.faces) {
    const bounds = face.boundingBox
    let normal: ReturnType<typeof face.normalAt> | null = null
    try {
      if (face.surface.surfaceType !== 'PLANE') continue
      normal = face.normalAt()
      const [min, max] = bounds.bounds as [
        [number, number, number],
        [number, number, number],
      ]
      records.push({
        min: [...min],
        max: [...max],
        normal: [normal.x, normal.y, normal.z],
      })
    } finally {
      normal?.delete()
      bounds.delete()
      face.delete()
    }
  }
  return records
}

function dot(
  first: readonly [number, number, number],
  second: readonly [number, number, number],
): number {
  return first[0] * second[0] + first[1] * second[1] + first[2] * second[2]
}

function parallel(
  first: readonly [number, number, number],
  second: readonly [number, number, number],
  tolerance = 0.01,
): boolean {
  return Math.abs(Math.abs(dot(first, second)) - 1) <= tolerance
}

function span(face: PlanarFaceRecord, axis: 0 | 1 | 2): number {
  return face.max[axis] - face.min[axis]
}

function makeQualityProbeCompound(probes: Shape3D[]): Shape3D {
  const firstProbe = probes[0]
  if (!firstProbe) {
    throw new Error('OPENGRID_OPENCONNECT_SHELF_PROBES_EMPTY')
  }
  if (probes.length === 1) return firstProbe
  return makeCompound(probes).asShape3D()
}

function deleteQualityProbes(
  compound: Shape3D | null,
  probes: Shape3D[],
): void {
  if (compound && compound !== probes[0]) deleteShape(compound)
  probes.forEach(deleteShape)
}

function inspectInterfaceFaces(
  shape: Shape3D,
  parameters: OpenGridOpenConnectShelfParameters,
  failures: string[],
): void {
  const radians = openGridOpenConnectShelfAngleRadiansFor(parameters.angle)
  const topNormal: [number, number, number] = [
    0,
    -Math.sin(radians),
    Math.cos(radians),
  ]
  const rearNormal: [number, number, number] = [
    0,
    Math.cos(radians),
    Math.sin(radians),
  ]
  if (!closeEnough(dot(topNormal, rearNormal), 0, 1e-9)) {
    failures.push('functional-interface-angle')
  }

  const faces = planarFaces(shape)
  if (!faces.some((face) => parallel(face.normal, topNormal))) {
    failures.push('opengrid-plane')
  }
  if (!faces.some((face) => parallel(face.normal, rearNormal))) {
    failures.push('openconnect-plane')
  }

  const width = openGridOpenConnectShelfWidthFor(parameters)
  const buildFaces = faces.filter(
    (face) =>
      parallel(face.normal, [0, 0, 1]) &&
      face.min[2] <= 0.05 &&
      face.max[2] <= 0.05 &&
      span(face, 1) > 1,
  )
  const buildSurface =
    buildFaces.length > 0 &&
    Math.min(...buildFaces.map((face) => face.min[0])) <= -width * 0.45 &&
    Math.max(...buildFaces.map((face) => face.max[0])) >= width * 0.45
  if (!buildSurface) failures.push('sloped-build-surface')
}

function inspectOpenUnderside(
  shape: Shape3D,
  parameters: OpenGridOpenConnectShelfParameters,
  failures: string[],
): void {
  const configuration = OPENGRID_OPENCONNECT_SHELF_CONFIGURATION
  const radians = openGridOpenConnectShelfAngleRadiansFor(parameters.angle)
  const bayHalfWidth =
    configuration.gridPitch / 2 - configuration.supportThickness - 0.5
  const bayHalfDepth = configuration.gridPitch / 4
  const probes: Shape3D[] = []
  let compound: Shape3D | null = null
  let obstruction: Shape3D | null = null
  let obstructionVolume = Number.POSITIVE_INFINITY
  try {
    for (let row = 0; row < parameters.rows; row += 1) {
      const installedCenterY = -(row + 0.5) * configuration.gridPitch
      const printCenterY = installedCenterY / Math.cos(radians)
      for (let column = 0; column < parameters.columns; column += 1) {
        const centerX =
          (column - (parameters.columns - 1) / 2) * configuration.gridPitch
        probes.push(
          makeBox(
            [centerX - bayHalfWidth, printCenterY - bayHalfDepth, 0.2],
            [
              centerX + bayHalfWidth,
              printCenterY + bayHalfDepth,
              configuration.supportThickness - 0.2,
            ],
          ),
        )
      }
    }
    compound = makeQualityProbeCompound(probes)
    obstruction = shape.intersect(compound)
    obstructionVolume = measureVolume(obstruction)
  } catch {
    obstructionVolume = Number.POSITIVE_INFINITY
  } finally {
    deleteShape(obstruction)
    deleteQualityProbes(compound, probes)
  }
  if (
    !Number.isFinite(obstructionVolume) ||
    obstructionVolume > UNDERSIDE_OBSTRUCTION_VOLUME_TOLERANCE
  ) {
    failures.push('open-underside')
  }
}

function inspectGroundedTransverseRibs(
  shape: Shape3D,
  parameters: OpenGridOpenConnectShelfParameters,
  failures: string[],
): void {
  if (parameters.rows === 1) return

  const configuration = OPENGRID_OPENCONNECT_SHELF_CONFIGURATION
  const radians = openGridOpenConnectShelfAngleRadiansFor(parameters.angle)
  const bayHalfWidth =
    configuration.gridPitch / 2 - configuration.supportThickness - 0.5
  const probes: Shape3D[] = []
  let compound: Shape3D | null = null
  let covered: Shape3D | null = null
  let missingVolume = Number.POSITIVE_INFINITY
  try {
    for (let rowBoundary = 1; rowBoundary < parameters.rows; rowBoundary += 1) {
      const installedBoundaryY = -rowBoundary * configuration.gridPitch
      const printBoundaryY = installedBoundaryY / Math.cos(radians)
      for (let column = 0; column < parameters.columns; column += 1) {
        const centerX =
          (column - (parameters.columns - 1) / 2) * configuration.gridPitch
        probes.push(
          makeBox(
            [centerX - bayHalfWidth, printBoundaryY - 0.4, 0],
            [centerX + bayHalfWidth, printBoundaryY + 0.4, 0.5],
          ),
        )
      }
    }
    compound = makeQualityProbeCompound(probes)
    const expectedVolume = measureVolume(compound)
    covered = shape.intersect(compound)
    missingVolume = expectedVolume - measureVolume(covered)
  } catch {
    missingVolume = Number.POSITIVE_INFINITY
  } finally {
    deleteShape(covered)
    deleteQualityProbes(compound, probes)
  }
  if (
    !Number.isFinite(missingVolume) ||
    missingVolume > GROUND_RIB_MISSING_VOLUME_TOLERANCE
  ) {
    failures.push('x-ground-ribs')
  }
}

function inspectLockedSlots(
  shape: Shape3D,
  parameters: OpenGridOpenConnectShelfParameters,
  lockedSlot: Shape3D,
  failures: string[],
): number[] {
  const residualVolumes: number[] = []
  const angle = parameters.angle
  for (const [index, origin] of openGridOpenConnectShelfSlotOriginsFor(
    parameters,
  ).entries()) {
    let cutter: Shape3D | null = null
    let intersection: Shape3D | null = null
    let residualVolume = Number.POSITIVE_INFINITY
    try {
      cutter = placeOpenGridOpenConnectShelfLockedSlot(lockedSlot, origin)
      const printCutter = cutter.rotate(angle, [0, 0, 0], [1, 0, 0])
      if (printCutter !== cutter) deleteShape(cutter)
      cutter = printCutter
      intersection = shape.intersect(cutter)
      residualVolume = measureVolume(intersection)
    } catch {
      residualVolume = Number.POSITIVE_INFINITY
    } finally {
      deleteShape(intersection)
      deleteShape(cutter)
    }
    residualVolumes.push(residualVolume)
    if (
      !Number.isFinite(residualVolume) ||
      residualVolume > SLOT_RESIDUAL_VOLUME_TOLERANCE
    ) {
      failures.push(`locked-slot-${index}`)
    }
  }
  return residualVolumes
}

export function inspectOpenGridOpenConnectShelfShapeQuality(
  shape: Shape3D,
  parameters: OpenGridOpenConnectShelfParameters,
  mesh: MeshLike,
  lockedSlot: Shape3D,
): OpenGridOpenConnectShelfQualityReport {
  const failures: string[] = []
  const validBRep = isBRepValid(shape)
  if (!validBRep) {
    return {
      passed: false,
      failures: ['invalid-brep'],
      validBRep: false,
      volume: 0,
      solidCount: 0,
      slotCount: 0,
      slotResidualVolumes: [],
    }
  }
  const expected = boundsForOpenGridOpenConnectShelf(parameters)
  for (let axis = 0; axis < 3; axis += 1) {
    if (
      !closeEnough(mesh.bounds.min[axis] ?? Number.NaN, expected.min[axis]!)
    ) {
      failures.push(`mesh.min[${axis}]`)
    }
    if (
      !closeEnough(mesh.bounds.max[axis] ?? Number.NaN, expected.max[axis]!)
    ) {
      failures.push(`mesh.max[${axis}]`)
    }
  }

  const solidCount = countSolids(shape)
  if (solidCount !== 1) failures.push('single-solid')
  const volume = measureVolume(shape)
  if (!(volume > 0)) failures.push('positive-volume')
  if (
    openGridOpenConnectShelfFrontHeightFor(parameters) <
    OPENGRID_OPENCONNECT_SHELF_CONFIGURATION.minimumFrontHeight - 0.01
  ) {
    failures.push('minimum-front-height')
  }
  inspectInterfaceFaces(shape, parameters, failures)
  inspectOpenUnderside(shape, parameters, failures)
  inspectGroundedTransverseRibs(shape, parameters, failures)
  const slotResidualVolumes = inspectLockedSlots(
    shape,
    parameters,
    lockedSlot,
    failures,
  )
  const slotCount = slotResidualVolumes.filter(
    (residualVolume) =>
      Number.isFinite(residualVolume) &&
      residualVolume <= SLOT_RESIDUAL_VOLUME_TOLERANCE,
  ).length

  return {
    passed: failures.length === 0,
    failures,
    validBRep,
    volume,
    solidCount,
    slotCount,
    slotResidualVolumes,
  }
}

export function assertOpenGridOpenConnectShelfShapeQuality(
  shape: Shape3D,
  parameters: OpenGridOpenConnectShelfParameters,
  mesh: MeshLike,
  lockedSlot: Shape3D,
): void {
  const report = inspectOpenGridOpenConnectShelfShapeQuality(
    shape,
    parameters,
    mesh,
    lockedSlot,
  )
  if (!report.passed) {
    throw new Error(
      `OPENGRID_OPENCONNECT_SHELF_QUALITY_FAILED:${report.failures.join(',')}`,
    )
  }
}
