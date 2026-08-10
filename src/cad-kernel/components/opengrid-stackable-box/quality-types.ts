import type { OpenGridStackableBoxBottomGridSeam } from './geometry'
import type { Bounds } from './shared'

export type OpenGridStackableBoxCaptiveSocketRecord = {
  seatedIntersectionVolume: number
  loweredIntersectionVolume: number
  bottomOpeningBoundaryVolume: number
  shaftBounds: Bounds
}

export type OpenGridStackableBoxMountingHoleProfile = {
  center: [number, number]
  lowerBoreDiameter: number
  lowerBoreDepth: number
  upperBoreDiameter: number
  upperBoreDepth: number
}

export type OpenGridStackableBoxInterfaceQualityReport = {
  externalHeight: number
  measuredExternalHeight: number
  upperInnerRimZ: number
  bottomAssemblyHeight: number
  topRailProfileHeight: number
  bottomGuideProfileHeight: number
  topRailProfileSegmentFaceCounts: {
    innerLeadIn: number
    innerVertical: number
    middleTransition: number
    outerVertical: number
    outerReturn: number
  }
  topRailCornerContinuationFaceCount: number
  topRailInnerCornerRadiusFaceCount: number
  topRailOuterCornerRadiusFaceCount: number
  bottomGuideProfileSegmentFaceCounts: {
    bedFoot: number
    verticalSupport: number
    floorTransition: number
  }
  floorProbeVolumes: number[]
  floorProbeThicknesses: number[]
  stackingClearanceNominalIntersectionVolume: number
  stackingClearanceBelowNominalIntersectionVolume: number
  sideWallProbeVolumes: number[]
  sideWallProbeExpectedVolumes: number[]
  sideWallProbeThicknesses: number[]
  topGuideLeadInFaceCount: number
  bottomGuideLeadInFaceCount: number
  bottomGridSeamSlopeFaceCount: number
  bottomGridSeamCount: number
  bottomGridSeams: OpenGridStackableBoxBottomGridSeam[]
  bottomGridSeamClearanceVolumes: number[]
  bottomGridSeamSupportVolumes: number[]
  bottomGridSeamSupportThicknesses: number[]
  bottomGridSeamSlopeFaceCounts: number[]
  bottomGridSeamApexFaceCounts: number[]
  bottomGridSeamApexFaceCount: number
  bottomGridSeamClosureFaceCount: number
  bottomGridSeamFloorVolumes: number[]
  bearingLandVolumes: number[]
  topRailProbeVolumes: number[]
  bottomGuideProtrusionVolumes: number[]
  bottomSupportVolumes: number[]
  bottomFootChamferVolumes: number[]
  bottomSupportBandVolumes: number[]
  bottomPerimeterResidualVolumes: number[]
  bottomSupportFloorThicknesses: number[]
  bottomTransitionSupportThicknesses: number[]
  mountingHoleStepVolumes: number[]
  mountingHoleProfiles: OpenGridStackableBoxMountingHoleProfile[]
  captiveSocketRecords: OpenGridStackableBoxCaptiveSocketRecord[]
  ordinaryBottomHoleCount: number
  expectedOrdinaryBottomHoleCount: number
}
