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
