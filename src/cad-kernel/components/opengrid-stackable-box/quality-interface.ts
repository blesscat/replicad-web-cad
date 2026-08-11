import { measureVolume, type Shape3D } from 'replicad'
import {
  externalOpenGridStackableBoxHeightFor,
  nominalOpenGridStackableBoxFootprintFor,
  openGridStackableBoxDerivedGeometryFor,
  openGridStackableBoxOrdinaryBottomHoleCentersFor,
  openGridStackableBoxSocketCentersFor,
  openGridStackableBoxUpperInnerRimZFor,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_BOX_OPENING_DIRECTIONS,
  type OpenGridStackableBoxParameters,
} from '../../../cad-contract/units'
import {
  applyStackingProfile,
  bottomGridSeamApexTopZ,
  bottomGridSeamsFor,
  bottomGuideSupportInset,
  bottomGuideTransitionTopZ,
  bottomStackingProfileTopZ,
  bottomStackingSupportTopZ,
  makeBoxShell,
} from './geometry'
import {
  countFortyFiveDegreeFaces,
  countFortyFiveDegreeFacesNearSeam,
  countHorizontalReliefClosureFaces,
  countReliefApexFaces,
  countRoundedProfileContinuationFaces,
  countRoundedProfileFacesWithRadius,
  countVerticalProfileFaces,
  edgeBandExpectedVolumes,
  edgeBandVolumes,
  volumeInBox,
} from './quality-metrics'
import {
  countOrdinaryBottomHoleFaces,
  inspectCaptiveSocketInterface,
  measureMountingHoleProfiles,
  measureMountingHoleStepVolumes,
} from './quality-holes'
import {
  measureBottomGridSeamBand,
  measureBottomGridSeamSupportThickness,
} from './quality-seams'
import type { OpenGridStackableBoxInterfaceQualityReport } from './quality-types'
import { deleteShape, readBounds } from './shared'

function thicknessesFromVolumes(
  volumes: number[],
  expectedVolumes: number[],
  nominalThickness: number,
): number[] {
  return volumes.map((volume, index) => {
    const expectedVolume = expectedVolumes[index] ?? 0
    if (expectedVolume <= 0) return 0
    return (volume / expectedVolume) * nominalThickness
  })
}

function floorProbeCenter(
  width: number,
  depth: number,
  halfExtent: number,
  parameters: OpenGridStackableBoxParameters,
): [number, number] | null {
  const socketCenters = openGridStackableBoxSocketCentersFor(parameters)
  const ordinaryHoleCenters =
    openGridStackableBoxOrdinaryBottomHoleCentersFor(parameters)
  const holeCenters = [...socketCenters, ...ordinaryHoleCenters]
  const socketRadius =
    OPENGRID_STACKABLE_BOX_CONFIGURATION.baseHoleTopOpeningDiameter / 2
  const seams = bottomGridSeamsFor(parameters)
  const seamHalfOpening =
    OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomGridSeamOpeningWidth / 2
  const axisCandidates = (span: number, axis: 'x' | 'y'): number[] => {
    const seamPositions = seams
      .filter((seam) => seam.axis === axis)
      .map((seam) => seam.position)
      .sort((first, second) => first - second)
    const minimum =
      -span / 2 +
      OPENGRID_STACKABLE_BOX_CONFIGURATION.wallThickness +
      halfExtent
    const maximum =
      span / 2 - OPENGRID_STACKABLE_BOX_CONFIGURATION.wallThickness - halfExtent
    const candidates: number[] = []
    let intervalStart = minimum
    const addIntervalCandidates = (start: number, end: number): void => {
      const intervalWidth = end - start
      if (intervalWidth <= 0) return
      const inset = Math.min(0.5, intervalWidth / 10)
      candidates.push(start + inset, (start + end) / 2, end - inset)
    }

    for (const seamPosition of seamPositions) {
      const blockedStart = Math.max(
        minimum,
        seamPosition - seamHalfOpening - halfExtent,
      )
      const blockedEnd = Math.min(
        maximum,
        seamPosition + seamHalfOpening + halfExtent,
      )
      if (blockedStart > intervalStart) {
        addIntervalCandidates(intervalStart, blockedStart)
      }
      intervalStart = Math.max(intervalStart, blockedEnd)
    }
    if (maximum > intervalStart) {
      addIntervalCandidates(intervalStart, maximum)
    }
    return candidates
  }

  const candidateX = axisCandidates(width, 'x')
  const candidateY = axisCandidates(depth, 'y')
  for (const centerX of candidateX) {
    for (const centerY of candidateY) {
      const overlapsHole = holeCenters.some(([holeX, holeY]) => {
        const distanceX = Math.max(Math.abs(centerX - holeX) - halfExtent, 0)
        const distanceY = Math.max(Math.abs(centerY - holeY) - halfExtent, 0)
        return Math.hypot(distanceX, distanceY) < socketRadius
      })
      const overlapsSeam = seams.some((seam) => {
        const coordinate = seam.axis === 'x' ? centerX : centerY
        return (
          Math.abs(coordinate - seam.position) < seamHalfOpening + halfExtent
        )
      })
      if (!overlapsHole && !overlapsSeam) return [centerX, centerY]
    }
  }

  return null
}

function inspectShellThickness(
  shape: Shape3D,
  parameters: OpenGridStackableBoxParameters,
  width: number,
  depth: number,
) {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const sideWallProbeBottom = configuration.bottomAssemblyHeight + 0.05
  const upperInnerRimZ = openGridStackableBoxUpperInnerRimZFor(parameters)
  const sideWallProbeTop = Math.min(
    upperInnerRimZ - configuration.topRailInnerChamfer - 0.1,
    sideWallProbeBottom + 0.5,
  )
  const maximumFloorProbeHalfExtent = Math.min(1.2, width / 8, depth / 8)
  let floorProbeHalfExtent = maximumFloorProbeHalfExtent
  let floorProbeCenterCoordinates: [number, number] | null = null
  for (const scale of [1, 0.75, 0.5, 0.35, 0.25]) {
    const candidateHalfExtent = maximumFloorProbeHalfExtent * scale
    const candidateCenter = floorProbeCenter(
      width,
      depth,
      candidateHalfExtent,
      parameters,
    )
    if (candidateCenter !== null) {
      floorProbeHalfExtent = candidateHalfExtent
      floorProbeCenterCoordinates = candidateCenter
      break
    }
  }
  if (floorProbeCenterCoordinates === null) {
    throw new Error('OPENGRID_STACKABLE_BOX_FLOOR_PROBE_INVALID')
  }
  const [floorProbeCenterX, floorProbeCenterY] = floorProbeCenterCoordinates
  const floorProbeVolumes = [
    volumeInBox(
      shape,
      [
        floorProbeCenterX - floorProbeHalfExtent,
        floorProbeCenterY - floorProbeHalfExtent,
        configuration.bottomAssemblyHeight -
          configuration.floorThickness -
          0.01,
      ],
      [
        floorProbeCenterX + floorProbeHalfExtent,
        floorProbeCenterY + floorProbeHalfExtent,
        configuration.bottomAssemblyHeight + 0.01,
      ],
    ),
  ]
  const floorProbeArea = (2 * floorProbeHalfExtent) ** 2
  const floorProbeThicknesses = floorProbeVolumes.map(
    (volume) => volume / floorProbeArea,
  )
  const sideWallProbeVolumes = edgeBandVolumes(
    shape,
    width,
    depth,
    configuration.wallThickness + 0.05,
    0.05,
    sideWallProbeBottom,
    sideWallProbeTop,
  )
  const sideWallProbeExpectedVolumes = edgeBandExpectedVolumes(
    width,
    depth,
    configuration.wallThickness + 0.05,
    0.05,
    sideWallProbeBottom,
    sideWallProbeTop,
  )
  const sideWallProbeThicknesses = thicknessesFromVolumes(
    sideWallProbeVolumes,
    sideWallProbeExpectedVolumes,
    configuration.wallThickness,
  )
  return {
    floorProbeVolumes,
    floorProbeThicknesses,
    sideWallProbeVolumes,
    sideWallProbeExpectedVolumes,
    sideWallProbeThicknesses,
  }
}

type MatingClearanceFixture = {
  height: number
  lower: Shape3D
  upper: Shape3D
}

let cachedMatingClearanceFixture: MatingClearanceFixture | null = null

function matingClearanceFixtureFor(height: number): MatingClearanceFixture {
  if (cachedMatingClearanceFixture?.height === height) {
    return cachedMatingClearanceFixture
  }
  if (cachedMatingClearanceFixture !== null) {
    deleteShape(cachedMatingClearanceFixture.lower)
    deleteShape(cachedMatingClearanceFixture.upper)
    cachedMatingClearanceFixture = null
  }

  const lowerParameters: OpenGridStackableBoxParameters = {
    ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
    x: 1,
    y: 4,
    height,
  }
  const upperParameters: OpenGridStackableBoxParameters = {
    ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
    x: 1,
    y: 1,
    height,
  }
  let lower = makeBoxShell(lowerParameters)
  let upper = makeBoxShell(upperParameters)
  try {
    lower = applyStackingProfile(lower, lowerParameters, {})
    upper = applyStackingProfile(upper, upperParameters, {})
    cachedMatingClearanceFixture = { height, lower, upper }
    return cachedMatingClearanceFixture
  } catch (error) {
    deleteShape(lower)
    deleteShape(upper)
    throw error
  }
}

function inspectStackingClearance(parameters: OpenGridStackableBoxParameters): {
  stackingClearanceNominalIntersectionVolume: number
  stackingClearanceBelowNominalIntersectionVolume: number
} {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const stackDatum =
    parameters.height +
    configuration.bottomAssemblyHeight +
    configuration.topRailInnerChamfer +
    configuration.topRailInnerVerticalHeight
  const belowNominalDrop = configuration.stackingClearance + 0.05
  const fixture = matingClearanceFixtureFor(parameters.height)
  const intersectionVolume = (candidate: Shape3D): number => {
    const intersection = fixture.lower.intersect(candidate)
    try {
      return measureVolume(intersection)
    } finally {
      deleteShape(intersection)
    }
  }
  const nominal = fixture.upper
    .clone()
    .translate(0, 0, stackDatum + configuration.stackingClearance)
  const belowNominal = fixture.upper
    .clone()
    .translate(
      0,
      0,
      stackDatum + configuration.stackingClearance - belowNominalDrop,
    )
  try {
    return {
      stackingClearanceNominalIntersectionVolume: intersectionVolume(nominal),
      stackingClearanceBelowNominalIntersectionVolume:
        intersectionVolume(belowNominal),
    }
  } finally {
    deleteShape(nominal)
    deleteShape(belowNominal)
  }
}

function chooseSafeCrossCenter(
  length: number,
  seamAxis: 'x' | 'y',
  parameters: OpenGridStackableBoxParameters,
): number {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const seams = bottomGridSeamsFor(parameters).filter(
    (seam) => seam.axis === seamAxis,
  )
  const derived = openGridStackableBoxDerivedGeometryFor(parameters)
  const openingDirections = OPENGRID_STACKABLE_BOX_OPENING_DIRECTIONS.filter(
    (direction) =>
      (seamAxis === 'x' && (direction === '+Y' || direction === '-Y')) ||
      (seamAxis === 'y' && (direction === '+X' || direction === '-X')),
  )
  const openings = openingDirections.map(
    (direction) => derived.openings[direction],
  )
  const probeHalfLength = Math.min(2, length / 2)
  const cornerCandidate = Math.max(
    0,
    length / 2 - configuration.outerCornerRadius - probeHalfLength - 0.15,
  )
  const candidates = [
    0,
    -length / 4 + 3.5,
    length / 4 - 3.5,
    -length / 2 + 4,
    length / 2 - 4,
    -cornerCandidate,
    cornerCandidate,
  ]
  const minimumSeamDistance =
    configuration.bottomGridSeamBedOpeningWidth / 2 + 0.25
  return (
    candidates.find(
      (candidate) =>
        seams.every(
          (seam) => Math.abs(candidate - seam.position) > minimumSeamDistance,
        ) &&
        openings.every(
          (opening) =>
            !opening.enabled ||
            Math.abs(candidate) - probeHalfLength >
              opening.upperWidth / 2 + 0.2,
        ),
    ) ?? 0
  )
}

function inspectBottomSupport(
  shape: Shape3D,
  width: number,
  depth: number,
  parameters: OpenGridStackableBoxParameters,
) {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const crossCenters = {
    x: chooseSafeCrossCenter(width, 'x', parameters),
    y: chooseSafeCrossCenter(depth, 'y', parameters),
  }
  const supportInset = bottomGuideSupportInset()
  const footInset = supportInset + configuration.bottomFootChamferHeight
  const footBandOuterDistance = footInset - 0.1
  const footBandInnerDistance = footBandOuterDistance + 0.2
  const supportBandOuterDistance = supportInset - 0.1
  const supportBandInnerDistance = supportInset + 0.1
  const bottomGuideProtrusionVolumes = edgeBandVolumes(
    shape,
    width,
    depth,
    footBandInnerDistance,
    footBandOuterDistance,
    -0.01,
    configuration.bottomFootChamferHeight * 0.45,
    crossCenters,
  )
  const bottomSupportVolumes = edgeBandVolumes(
    shape,
    width,
    depth,
    supportBandInnerDistance,
    supportBandOuterDistance,
    configuration.bottomFootChamferHeight - 0.05,
    bottomStackingSupportTopZ() + 0.05,
    crossCenters,
  )
  const bottomPerimeterResidualVolumes = edgeBandVolumes(
    shape,
    width,
    depth,
    footBandInnerDistance,
    footBandOuterDistance,
    -0.01,
    configuration.bottomFootChamferHeight * 0.25,
    crossCenters,
  )
  const bottomSupportFloorOuterDistance = supportBandOuterDistance
  const bottomSupportFloorInnerDistance = supportBandInnerDistance
  const bottomSupportFloorVolumes = edgeBandVolumes(
    shape,
    width,
    depth,
    bottomSupportFloorInnerDistance,
    bottomSupportFloorOuterDistance,
    bottomStackingProfileTopZ() + 0.05,
    configuration.bottomAssemblyHeight + 0.01,
    crossCenters,
  )
  const bottomSupportFloorExpectedVolumes = edgeBandExpectedVolumes(
    width,
    depth,
    bottomSupportFloorInnerDistance,
    bottomSupportFloorOuterDistance,
    bottomStackingProfileTopZ() + 0.05,
    configuration.bottomAssemblyHeight + 0.01,
  )
  const bottomSupportFloorThicknesses = thicknessesFromVolumes(
    bottomSupportFloorVolumes,
    bottomSupportFloorExpectedVolumes,
    configuration.floorThickness,
  )
  const bottomTransitionInnerDistance = supportInset + 0.1
  const bottomTransitionOuterDistance = supportInset - 0.1
  const bottomTransitionVolumes = edgeBandVolumes(
    shape,
    width,
    depth,
    bottomTransitionInnerDistance,
    bottomTransitionOuterDistance,
    bottomStackingSupportTopZ() - 0.05,
    bottomGuideTransitionTopZ() + 0.05,
    crossCenters,
  )
  const bottomTransitionExpectedVolumes = edgeBandExpectedVolumes(
    width,
    depth,
    bottomTransitionInnerDistance,
    bottomTransitionOuterDistance,
    bottomStackingSupportTopZ() - 0.05,
    bottomGuideTransitionTopZ() + 0.05,
  )
  const bottomTransitionSupportThicknesses = thicknessesFromVolumes(
    bottomTransitionVolumes,
    bottomTransitionExpectedVolumes,
    configuration.floorThickness,
  )
  return {
    bottomGuideProtrusionVolumes,
    bottomSupportVolumes,
    bottomFootChamferVolumes: bottomPerimeterResidualVolumes,
    bottomSupportBandVolumes: bottomSupportVolumes,
    bottomPerimeterResidualVolumes,
    bottomSupportFloorThicknesses,
    bottomTransitionSupportThicknesses,
  }
}

function inspectGridSeams(
  shape: Shape3D,
  parameters: OpenGridStackableBoxParameters,
) {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const bottomGridSeams = bottomGridSeamsFor(parameters)
  const seamProbeHalfWidth = Math.min(
    0.25,
    configuration.bottomGridSeamOpeningWidth / 2 - 0.08,
  )
  const bottomGridSeamClearanceVolumes = bottomGridSeams.map((seam) =>
    measureBottomGridSeamBand(
      shape,
      seam,
      parameters,
      0.08,
      configuration.bottomGrooveDepth * 0.3,
      seamProbeHalfWidth,
    ),
  )
  const bottomGridSeamSupportVolumes = bottomGridSeams.map((seam) =>
    measureBottomGridSeamBand(
      shape,
      seam,
      parameters,
      configuration.bottomFootChamferHeight + 0.03,
      bottomStackingSupportTopZ() - 0.03,
      0.2,
      configuration.bottomGridSeamSupportOpeningWidth / 2 + 0.25,
    ),
  )
  const bottomGridSeamSupportThicknesses = bottomGridSeams.map((seam) =>
    measureBottomGridSeamSupportThickness(shape, seam, parameters),
  )
  const bottomGridSeamFloorVolumes = bottomGridSeams.map((seam) =>
    measureBottomGridSeamBand(
      shape,
      seam,
      parameters,
      bottomGridSeamApexTopZ() + 0.03,
      configuration.bottomAssemblyHeight + 0.01,
      Math.max(0.1, configuration.bottomGridSeamOpeningWidth / 2 - 0.05),
    ),
  )
  const bottomGridSeamSlopeFaceCounts = bottomGridSeams.map((seam) =>
    countFortyFiveDegreeFacesNearSeam(
      shape,
      seam,
      bottomStackingSupportTopZ() - 0.03,
      bottomGridSeamApexTopZ() + 0.03,
      configuration.bottomGridSeamSupportOpeningWidth / 2,
      0,
    ),
  )
  const bottomGridSeamClosureFaceCount = countHorizontalReliefClosureFaces(
    shape,
    bottomGridSeams,
    bottomStackingProfileTopZ(),
    configuration.bottomGridSeamOpeningWidth / 2,
  )
  const bottomGridSeamApexFaceCounts = bottomGridSeams.map((seam) =>
    countReliefApexFaces(
      shape,
      [seam],
      bottomStackingSupportTopZ(),
      bottomGridSeamApexTopZ(),
      configuration.bottomGridSeamOpeningWidth / 2,
      bottomGridSeamApexTopZ() - bottomStackingSupportTopZ(),
    ),
  )
  const bottomGridSeamApexFaceCount = bottomGridSeamApexFaceCounts.reduce(
    (total, faceCount) => total + faceCount,
    0,
  )
  return {
    bottomGridSeams,
    bottomGridSeamClearanceVolumes,
    bottomGridSeamSupportVolumes,
    bottomGridSeamSupportThicknesses,
    bottomGridSeamFloorVolumes,
    bottomGridSeamSlopeFaceCounts,
    bottomGridSeamApexFaceCounts,
    bottomGridSeamApexFaceCount,
    bottomGridSeamClosureFaceCount,
  }
}

function inspectProfileSegments(
  shape: Shape3D,
  upperInnerRimZ: number,
): {
  topRailProfileSegmentFaceCounts: OpenGridStackableBoxInterfaceQualityReport['topRailProfileSegmentFaceCounts']
  bottomGuideProfileSegmentFaceCounts: OpenGridStackableBoxInterfaceQualityReport['bottomGuideProfileSegmentFaceCounts']
} {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const topInnerVerticalStart =
    upperInnerRimZ + configuration.topRailInnerChamfer
  const topMiddleTransitionStart =
    topInnerVerticalStart + configuration.topRailInnerVerticalHeight
  const topOuterVerticalStart =
    topMiddleTransitionStart + configuration.topRailMiddleChamfer
  const topOuterReturnStart =
    topOuterVerticalStart + configuration.topRailOuterVerticalHeight
  const topRailProfileSegmentFaceCounts = {
    innerLeadIn: countFortyFiveDegreeFaces(
      shape,
      upperInnerRimZ - 0.03,
      topInnerVerticalStart + 0.03,
      configuration.topRailInnerChamfer,
      0,
    ),
    innerVertical: countVerticalProfileFaces(
      shape,
      topInnerVerticalStart - 0.03,
      topMiddleTransitionStart + 0.03,
      configuration.topRailInnerVerticalHeight,
    ),
    middleTransition: countFortyFiveDegreeFaces(
      shape,
      topMiddleTransitionStart - 0.03,
      topOuterVerticalStart + 0.03,
      configuration.topRailMiddleChamfer,
      0,
    ),
    outerVertical: countVerticalProfileFaces(
      shape,
      topOuterVerticalStart - 0.03,
      topOuterReturnStart + 0.03,
      configuration.topRailOuterVerticalHeight,
    ),
    outerReturn: countFortyFiveDegreeFaces(
      shape,
      topOuterReturnStart - 0.03,
      upperInnerRimZ + configuration.topRailHeight + 0.03,
      configuration.topRailOuterChamfer,
      0,
      0.35,
    ),
  }
  const bottomSupportTop = bottomStackingSupportTopZ()
  const bottomTransitionTop = bottomGuideTransitionTopZ()
  const bottomGuideProfileSegmentFaceCounts = {
    bedFoot: countFortyFiveDegreeFaces(
      shape,
      -0.03,
      configuration.bottomFootChamferHeight + 0.03,
      configuration.bottomFootChamferHeight,
      0,
    ),
    verticalSupport: countVerticalProfileFaces(
      shape,
      configuration.bottomFootChamferHeight - 0.03,
      bottomSupportTop + 0.03,
      configuration.bottomSupportBandHeight,
    ),
    floorTransition: countFortyFiveDegreeFaces(
      shape,
      bottomSupportTop - 0.03,
      bottomTransitionTop + 0.03,
      bottomGuideSupportInset(),
      0,
    ),
  }
  return {
    topRailProfileSegmentFaceCounts,
    bottomGuideProfileSegmentFaceCounts,
  }
}

export function inspectOpenGridStackableBoxInterface(
  shape: Shape3D,
  parameters: OpenGridStackableBoxParameters,
): OpenGridStackableBoxInterfaceQualityReport {
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const upperInnerRimZ = openGridStackableBoxUpperInnerRimZFor(parameters)
  const shell = inspectShellThickness(shape, parameters, width, depth)
  const stackingClearance = inspectStackingClearance(parameters)
  const profileSegments = inspectProfileSegments(shape, upperInnerRimZ)
  const topRailCornerContinuationFaceCount =
    countRoundedProfileContinuationFaces(
      shape,
      upperInnerRimZ,
      upperInnerRimZ + configuration.topRailHeight,
    )
  const topRailInnerCornerRadiusFaceCount = countRoundedProfileFacesWithRadius(
    shape,
    upperInnerRimZ,
    upperInnerRimZ + configuration.topRailHeight,
    0.8,
  )
  const topRailOuterCornerRadiusFaceCount = countRoundedProfileFacesWithRadius(
    shape,
    upperInnerRimZ,
    upperInnerRimZ + configuration.topRailHeight,
    configuration.outerCornerRadius,
  )
  const railCrossCenters = {
    x: chooseSafeCrossCenter(width, 'x', parameters),
    y: chooseSafeCrossCenter(depth, 'y', parameters),
  }
  const bearingLandVolumes = edgeBandVolumes(
    shape,
    width,
    depth,
    configuration.topRailWidth + 0.1,
    configuration.topRailOuterInset + 0.15,
    upperInnerRimZ +
      configuration.topRailHeight -
      configuration.topRailOuterChamfer -
      0.35,
    upperInnerRimZ +
      configuration.topRailHeight -
      configuration.topRailOuterChamfer -
      0.05,
    railCrossCenters,
  )
  const topRailProbeVolumes = edgeBandVolumes(
    shape,
    width,
    depth,
    configuration.topRailWidth + 0.1,
    0.15,
    upperInnerRimZ +
      configuration.topRailHeight -
      configuration.topRailOuterChamfer -
      0.55,
    upperInnerRimZ +
      configuration.topRailHeight -
      configuration.topRailOuterChamfer -
      0.05,
    railCrossCenters,
  )
  const bottom = inspectBottomSupport(shape, width, depth, parameters)
  const grid = inspectGridSeams(shape, parameters)
  const topGuideLeadInFaceCount = countFortyFiveDegreeFaces(
    shape,
    upperInnerRimZ - 0.03,
    upperInnerRimZ + configuration.topRailInnerChamfer + 0.03,
    configuration.topRailInnerChamfer,
    0,
  )
  const bottomGuideLeadInFaceCount = countFortyFiveDegreeFaces(
    shape,
    bottomStackingSupportTopZ() - 0.03,
    bottomGuideTransitionTopZ() + 0.03,
    bottomGuideSupportInset(),
    -1,
  )
  const bottomGridSeamSlopeFaceCount =
    grid.bottomGridSeamSlopeFaceCounts.reduce(
      (total, faceCount) => total + faceCount,
      0,
    )
  const socketCenters = openGridStackableBoxSocketCentersFor(parameters)
  const mountingHoleStepVolumes = measureMountingHoleStepVolumes(
    shape,
    socketCenters,
    parameters,
  )
  const mountingHoleProfiles = measureMountingHoleProfiles(shape, socketCenters)
  const ordinaryBottomHoleCenters =
    openGridStackableBoxOrdinaryBottomHoleCentersFor(parameters)
  const captiveSocketRecords = socketCenters.map((center) =>
    inspectCaptiveSocketInterface(shape, center, parameters),
  )

  return {
    externalHeight: externalOpenGridStackableBoxHeightFor(parameters),
    measuredExternalHeight: readBounds(shape)[1][2],
    upperInnerRimZ,
    bottomAssemblyHeight: configuration.bottomAssemblyHeight,
    topRailProfileHeight: configuration.topRailHeight,
    bottomGuideProfileHeight: bottomGuideTransitionTopZ(),
    ...profileSegments,
    topRailCornerContinuationFaceCount,
    topRailInnerCornerRadiusFaceCount,
    topRailOuterCornerRadiusFaceCount,
    ...shell,
    ...stackingClearance,
    topGuideLeadInFaceCount,
    bottomGuideLeadInFaceCount,
    bottomGridSeamSlopeFaceCount,
    bottomGridSeamCount: grid.bottomGridSeams.length,
    ...grid,
    bearingLandVolumes,
    topRailProbeVolumes,
    ...bottom,
    mountingHoleStepVolumes,
    mountingHoleProfiles,
    captiveSocketRecords,
    ordinaryBottomHoleCount: countOrdinaryBottomHoleFaces(
      shape,
      ordinaryBottomHoleCenters,
      parameters,
    ),
    expectedOrdinaryBottomHoleCount: ordinaryBottomHoleCenters.length,
  }
}
