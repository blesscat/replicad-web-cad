const NOMINAL_DIAMETER = 5
const ASSEMBLY_INCREMENT = 0.05
const TEST_SHAFT_DIAMETER = 5
const TEST_FLANGE_DIAMETER = 7
const TEST_SHAFT_EXTERIOR_ALLOWANCE = 1

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
  testShaftLengthForFloor: (floorThickness: number): number =>
    floorThickness + TEST_SHAFT_EXTERIOR_ALLOWANCE,
} as const
