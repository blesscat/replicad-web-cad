## ADDED Requirements

### Requirement: Shared OpenGrid locating and assembly dimensions

The system MUST expose one shared OpenGrid locating and assembly interface contract for runtime CAD contracts and Worker quality fixtures. The contract MUST define a nominal locating diameter of exactly 5 mm, a shared assembly increment of exactly 0.05 mm, an assembly opening of exactly 5.05 mm, a test shaft diameter of exactly 4 mm, a shaft opening of exactly 4.05 mm, a test flange diameter of exactly 7 mm, and a test flange height of exactly 0.8 mm. The assembly opening MUST equal the nominal locating diameter plus the shared increment, and the shaft opening MUST equal the test shaft diameter plus that same increment.

#### Scenario: Shared dimensions are published once

- **WHEN** an OpenGrid CAD contract or Worker quality fixture reads the locating and assembly interface
- **THEN** it MUST receive nominalDiameter=5, assemblyIncrement=0.05, assemblyOpeningDiameter=5.05, testShaftDiameter=4, shaftOpeningDiameter=4.05, testFlangeDiameter=7, and testFlangeHeight=0.8
- **AND** no consumer MUST define a conflicting copy of these shared interface dimensions

#### Scenario: Nominal locating consumers remain Ø5 mm

- **WHEN** the system builds Snap locating holes, Divider locating pegs, an OpenGrid Pillar, or a Stackable Box nominal base-hole compatibility record
- **THEN** Snap MUST use a 2.5 mm locating-hole radius
- **AND** Divider pegDiameter, Pillar bodyDiameter, and Stackable Box baseHoleDiameter MUST remain 5 mm

#### Scenario: Assembly openings use the shared increment

- **WHEN** the system builds a Stackable Box special lower bore, a Stackable Box ordinary bottom-grid hole, or a Stackable Cylinder lower bottom-hole section
- **THEN** the resulting opening MUST be Ø5.05 mm
- **AND** each value MUST resolve from the shared Ø5 mm nominal and +0.05 mm increment

#### Scenario: Stop-side openings use the Ø4 shaft interface

- **WHEN** the system builds a Stackable Box special upper/interior section or a Stackable Cylinder inner bottom-hole section
- **THEN** the opening MUST be Ø4.05 mm
- **AND** the opening MUST resolve from the shared Ø4 mm test shaft and +0.05 mm increment
- **AND** the ordinary Stackable Box bottom-grid hole MUST remain a straight Ø5.05 mm hole without this stop-side section

### Requirement: Floor-thickness-dependent compatibility fixture

The system MUST define the Box and Cylinder compatibility test insert as a Ø7 mm × 0.8 mm flange fused to a Ø4 mm shaft. The shaft length MUST equal the active floor or base-plate thickness plus 1 mm of exterior allowance. The fixture MUST be used for quality and integration validation and MUST NOT become a user-configurable model parameter or alter the OpenGrid Pillar model's Ø5 mm body.

#### Scenario: Thin floor fixture

- **WHEN** a Box or Cylinder quality test selects a 3 mm thin or base-plate floor
- **THEN** the fixture shaft MUST be Ø4 mm × 4 mm
- **AND** the flange MUST be Ø7 mm × 0.8 mm
- **AND** the Ø7 mm flange MUST be stopped by the Ø4.05 mm shoulder-side opening

#### Scenario: Normal floor fixture

- **WHEN** a Box or Cylinder quality test selects a 5 mm normal floor
- **THEN** the fixture shaft MUST be Ø4 mm × 6 mm
- **AND** the flange MUST be Ø7 mm × 0.8 mm
- **AND** the fixture MUST preserve the agreed 1 mm exterior allowance

#### Scenario: Fixture does not change the Pillar model

- **WHEN** the OpenGrid Pillar model is generated
- **THEN** its body MUST remain nominally Ø5 mm
- **AND** the Ø4 mm shaft MUST appear only in the Stackable Box/Cylinder compatibility fixture

### Requirement: Socket de-duplication derives from nominal interface size

The Stackable Box socket layout MUST use the shared nominal locating diameter of 5 mm as its socket de-duplication distance. This threshold MUST remain a positional merge rule for coincident or overlapping nominal socket locations and MUST NOT be treated as the assembly increment, an opening diameter, or a general quality tolerance.

#### Scenario: Half-cell socket locations are merged

- **WHEN** two nominal socket endpoint positions are closer than 5 mm
- **THEN** the layout MUST emit one midpoint socket position
- **AND** the requested half-cell footprint MUST remain unchanged

#### Scenario: Separated socket locations remain distinct

- **WHEN** two nominal socket endpoint positions are at least 5 mm apart
- **THEN** the layout MUST NOT merge them solely because of the de-duplication threshold
- **AND** other flange-envelope quality checks MUST remain independently applicable
