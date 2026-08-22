const NOMINAL_DIAMETER = 5
const ASSEMBLY_INCREMENT = 0.05
const TEST_SHAFT_DIAMETER = 5
const TEST_FLANGE_DIAMETER = 7
const TEST_SHAFT_EXTERIOR_ALLOWANCE = 1
const INTEGRATED_SEAT_DIAMETER = NOMINAL_DIAMETER
const INTEGRATED_SEAT_HEIGHT = 3
const BOTTOM_EDGE_FILLET_RADIUS = 0.5

export const OPENGRID_LOCATING_SEAT_MODES = [
  'none',
  'hole',
  'integrated',
] as const

export type OpenGridLocatingSeatMode =
  (typeof OPENGRID_LOCATING_SEAT_MODES)[number]

export const OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION = {
  nominalDiameter: NOMINAL_DIAMETER,
  assemblyIncrement: ASSEMBLY_INCREMENT,
  assemblyOpeningDiameter: NOMINAL_DIAMETER + ASSEMBLY_INCREMENT,
  testShaftDiameter: TEST_SHAFT_DIAMETER,
  shaftOpeningDiameter: TEST_SHAFT_DIAMETER,
  testFlangeDiameter: TEST_FLANGE_DIAMETER,
  retainingOpeningDiameter: TEST_FLANGE_DIAMETER + ASSEMBLY_INCREMENT,
  testFlangeHeight: 0.8,
  testShaftExposure: TEST_SHAFT_EXTERIOR_ALLOWANCE,
  integratedSeatDiameter: INTEGRATED_SEAT_DIAMETER,
  integratedSeatHeight: INTEGRATED_SEAT_HEIGHT,
  integratedSeatMinZ: -INTEGRATED_SEAT_HEIGHT,
  bottomEdgeFilletRadius: BOTTOM_EDGE_FILLET_RADIUS,
  testShaftLengthForFloor: (floorThickness: number): number =>
    floorThickness + TEST_SHAFT_EXTERIOR_ALLOWANCE,
} as const

export const OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION = {
  geometryTolerance: 0.02,
  volumeTolerance: 0.02,
  intersectionVolumeTolerance: 1e-6,
  minimumSocketRoof: 0.5,
  male: {
    bodyDiameter: 5,
    bodyHeight: 3,
    leadInHeight: 0.2,
    leadInTipDiameter: 4.6,
    keyWidth: 1.8,
    taperTopZ: 4.35,
    wearHeight: 0.15,
    totalHeight: 4.5,
    nominalVolume: 66.7032674,
    bounds: {
      min: [-2.5, -2.5, 0],
      max: [2.5, 2.5, 4.5],
    },
  },
  female: {
    outerDiameter: 7,
    depth: 1.5,
    passageWidth: 2,
    keySideClearance: 0.1,
    sourceMinZ: 3,
    sourceMaxZ: 4.5,
    nominalVolume: 38.4253392,
    bounds: {
      min: [-3.5, -3.5, 3],
      max: [3.5, 3.5, 4.5],
    },
  },
} as const
