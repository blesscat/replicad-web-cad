import {
  externalOpenGridStackableBoxHeightFor,
  openGridStackableBoxUpperInnerRimZFor,
  nominalOpenGridStackableBoxFootprintFor,
  openGridStackableBoxOrdinaryBottomHoleCentersFor,
  openGridStackableBoxSocketCentersFor,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  type OpenGridStackableBoxParameters,
} from '../../../cad-contract/units'
import {
  countRoundedProfileFacesWithRadius,
  edgeBandExpectedVolumes,
  edgeBandVolumes,
  volumeInBox,
  readFaceQualityRecords,
} from './quality-metrics'
import {
  countOrdinaryBottomHoleFaces,
  inspectCaptiveSocketInterface,
  measureMountingHoleProfiles,
  measureMountingHoleStepVolumes,
} from './quality-holes'
import { closeEnough, readBounds } from './shared'
import type { Shape3D } from 'replicad'

export type OpenGridStackableBoxThinShellQualityReport = {
  floorProbeVolumes: number[]
  floorProbeThicknesses: number[]
  sideWallProbeThicknesses: number[]
  bottomChamferFaceCount: number
  topChamferFaceCount: number
  topRimHorizontalPlanarFaceCount: number
  innerFloorFilletFaceCount: number
  mountingHoleStepVolumes: number[]
  mountingHoleProfiles: ReturnType<typeof measureMountingHoleProfiles>
  captiveSocketRecords: ReturnType<typeof inspectCaptiveSocketInterface>[]
  ordinaryBottomHoleCount: number
  expectedOrdinaryBottomHoleCount: number
  measuredExternalHeight: number
}

function floorProbeCenterFor(
  width: number,
  depth: number,
  halfExtent: number,
  parameters: OpenGridStackableBoxParameters,
): [number, number] {
  const holes = [
    ...openGridStackableBoxSocketCentersFor(parameters),
    ...openGridStackableBoxOrdinaryBottomHoleCentersFor(parameters),
  ]
  const holeRadius =
    OPENGRID_STACKABLE_BOX_CONFIGURATION.baseHoleTopOpeningDiameter / 2
  const xLimit =
    width / 2 -
    OPENGRID_STACKABLE_BOX_CONFIGURATION.thinShellWallThickness -
    halfExtent
  const yLimit =
    depth / 2 -
    OPENGRID_STACKABLE_BOX_CONFIGURATION.thinShellWallThickness -
    halfExtent
  const candidates: Array<[number, number]> = [
    [0, 0],
    [-width / 4, 0],
    [width / 4, 0],
    [0, -depth / 4],
    [0, depth / 4],
    [-width / 4, -depth / 4],
    [width / 4, -depth / 4],
    [-width / 4, depth / 4],
    [width / 4, depth / 4],
  ]
  return (
    candidates.find(([x, y]) => {
      if (Math.abs(x) > xLimit || Math.abs(y) > yLimit) return false
      return holes.every(
        ([holeX, holeY]) =>
          Math.hypot(x - holeX, y - holeY) > holeRadius + halfExtent + 0.1,
      )
    }) ?? [0, 0]
  )
}

function thicknessesFromVolumes(
  volumes: number[],
  expectedVolumes: number[],
  nominalThickness: number,
): number[] {
  return volumes.map((volume, index) => {
    const expected = expectedVolumes[index] ?? 0
    if (expected <= 0) return 0
    return (volume / expected) * nominalThickness
  })
}

function countChamferFaces(
  shape: Shape3D,
  zMin: number,
  zMax: number,
  expectedSpan: number,
): number {
  const records = readFaceQualityRecords(shape)
  return records.filter((record) => {
    if (record.surfaceType !== 'PLANE' || record.normal === null) return false
    const span = record.max[2] - record.min[2]
    return (
      span >= expectedSpan * 0.7 &&
      span <= expectedSpan * 1.3 &&
      record.min[2] >= zMin - 0.03 &&
      record.max[2] <= zMax + 0.03 &&
      closeEnough(Math.abs(record.normal[2]), Math.SQRT1_2, 0.12)
    )
  }).length
}

function countTopRimHorizontalPlanarFaces(
  shape: Shape3D,
  lowerRimZ: number,
  outerHighRimZ: number,
): number {
  const records = readFaceQualityRecords(shape)
  return records.filter((record) => {
    if (record.surfaceType !== 'PLANE' || record.normal === null) return false
    const zSpan = record.max[2] - record.min[2]
    return (
      zSpan <= 0.03 &&
      record.min[2] >= lowerRimZ - 0.03 &&
      record.max[2] <= outerHighRimZ + 0.03 &&
      Math.abs(record.normal[2]) >= 0.95
    )
  }).length
}

export function inspectOpenGridStackableBoxThinShell(
  shape: Shape3D,
  parameters: OpenGridStackableBoxParameters,
): OpenGridStackableBoxThinShellQualityReport {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  const halfExtent = Math.min(1, width / 8, depth / 8)
  const [centerX, centerY] = floorProbeCenterFor(
    width,
    depth,
    halfExtent,
    parameters,
  )
  const floorProbeVolumes = [
    volumeInBox(
      shape,
      [centerX - halfExtent, centerY - halfExtent, -0.01],
      [
        centerX + halfExtent,
        centerY + halfExtent,
        configuration.thinShellFloorThickness + 0.01,
      ],
    ),
  ]
  const floorProbeArea = (2 * halfExtent) ** 2
  const floorProbeThicknesses = floorProbeVolumes.map(
    (volume) => volume / floorProbeArea,
  )

  const sideWallProbeBottom =
    configuration.thinShellFloorThickness +
    configuration.thinShellInnerFloorFilletRadius +
    0.2
  const sideWallProbeTop = Math.min(
    openGridStackableBoxUpperInnerRimZFor(parameters) - 0.2,
    sideWallProbeBottom + 1,
  )
  const sideWallProbeVolumes = edgeBandVolumes(
    shape,
    width,
    depth,
    configuration.thinShellWallThickness + 0.05,
    0.05,
    sideWallProbeBottom,
    sideWallProbeTop,
  )
  const sideWallProbeExpectedVolumes = edgeBandExpectedVolumes(
    width,
    depth,
    configuration.thinShellWallThickness + 0.05,
    0.05,
    sideWallProbeBottom,
    sideWallProbeTop,
  )
  const sideWallProbeThicknesses = thicknessesFromVolumes(
    sideWallProbeVolumes,
    sideWallProbeExpectedVolumes,
    configuration.thinShellWallThickness,
  )
  const socketCenters = openGridStackableBoxSocketCentersFor(parameters)
  const ordinaryCenters =
    openGridStackableBoxOrdinaryBottomHoleCentersFor(parameters)

  return {
    floorProbeVolumes,
    floorProbeThicknesses,
    sideWallProbeThicknesses,
    bottomChamferFaceCount: countChamferFaces(
      shape,
      0,
      configuration.thinShellOuterBottomChamfer,
      configuration.thinShellOuterBottomChamfer,
    ),
    topChamferFaceCount: countChamferFaces(
      shape,
      openGridStackableBoxUpperInnerRimZFor(parameters),
      externalOpenGridStackableBoxHeightFor(parameters),
      configuration.thinShellTopChamfer,
    ),
    topRimHorizontalPlanarFaceCount: countTopRimHorizontalPlanarFaces(
      shape,
      openGridStackableBoxUpperInnerRimZFor(parameters),
      externalOpenGridStackableBoxHeightFor(parameters),
    ),
    innerFloorFilletFaceCount: countRoundedProfileFacesWithRadius(
      shape,
      configuration.thinShellFloorThickness,
      configuration.thinShellFloorThickness +
        configuration.thinShellInnerFloorFilletRadius +
        0.05,
      configuration.thinShellInnerFloorFilletRadius,
    ),
    mountingHoleStepVolumes: measureMountingHoleStepVolumes(
      shape,
      socketCenters,
      parameters,
    ),
    mountingHoleProfiles: measureMountingHoleProfiles(shape, socketCenters, {
      lower: [-0.03, configuration.thinShellBottomHoleStepHeight],
      upper: [
        configuration.thinShellBottomHoleStepHeight,
        configuration.thinShellFloorThickness,
      ],
    }),
    captiveSocketRecords: socketCenters.map((center) =>
      inspectCaptiveSocketInterface(shape, center, parameters),
    ),
    ordinaryBottomHoleCount: countOrdinaryBottomHoleFaces(
      shape,
      ordinaryCenters,
      parameters,
    ),
    expectedOrdinaryBottomHoleCount: ordinaryCenters.length,
    measuredExternalHeight: readBounds(shape)[1][2],
  }
}
