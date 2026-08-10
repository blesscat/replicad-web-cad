## MODIFIED Requirements

### Requirement: Identical box-to-box stacking interface

Every generated stackable box MUST have the same box-to-box interface and MUST be usable as either the lower or upper box without an upper/lower variant or mode switch. The stacking guide MUST use a reference-style independent stepped top rail fused into the nominal 2 mm side wall and continuous box rim. The top rail MUST remain inside the requested external envelope and MUST use the fixed upper sequence of a 2 mm inner 45° lead-in, 1.6 mm vertical segment, 0.8 mm 45° transition, 1 mm vertical segment, and 2 mm 45° return to the side wall. It MUST mate with a fixed complementary bottom relief/support profile consisting of a 2 mm outer 45° lead-in, a 1.6 mm vertical support segment at a 2 mm inset, and a 0.8 mm bed-facing foot chamfer. The bottom MUST expose one straight open V-shaped sliding groove along every internal 28 mm grid seam. Each V groove MUST be 1.6 mm wide at the bed-facing opening, 0.8 mm deep, and composed of two 45° side faces without a horizontal suspended ceiling. The top rail, fixed bottom profile, and grid-seam V grooves MUST provide complementary guide faces, a positive bearing land, and a dedicated sliding clearance of 0.25 mm. The bottom stacking surface MUST NOT rely on permanently protruding positioning posts, a thin unsupported perimeter lip, or a continuous recessed groove around the outer perimeter. The receiving geometry MUST provide a continuous sliding path rather than only isolated circular holes.

#### Scenario: Same model stacks with itself

- **WHEN** one generated stackable box is placed above another generated stackable box with compatible footprints
- **THEN** the upper box's grid-seam V grooves MUST remain aligned with the lower box's integrated guide geometry
- **AND** the two boxes MUST remain laterally guided without requiring different model types
- **AND** the upper box MUST mate with the lower box's fused stepped top rail through the fixed bottom relief/support profile and seat on a continuous bearing land without stacking posts

#### Scenario: Printable integrated guide interface

- **WHEN** a stackable box guide interface is generated
- **THEN** the stepped top rail MUST remain continuously fused to the 2 mm side wall and rim
- **AND** the bottom MUST expose one 1.6 mm × 0.8 mm open V groove along every internal 28 mm grid seam, with two 45° side faces
- **AND** each seam groove MUST remain connected to the 5 mm floor with approximately 4.2 mm of material above its apex, without a horizontal suspended ceiling or unconnected overhanging lip
- **AND** the mating clearance MUST be independent of the 0.15 mm OpenGrid footprint clearance

#### Scenario: Smaller box slides on a longer box

- **WHEN** a single 1×1 box is placed on a 1×4 box
- **THEN** the 1×1 box MUST be able to slide continuously along the 1×4 long axis while remaining captured by the integrated guide geometry
- **AND** the interface MUST NOT force the 1×1 box to stop only at isolated 28 mm holes

#### Scenario: Larger box bridges adjacent boxes

- **WHEN** two 1×2 boxes are placed side by side to form a 2×2 footprint and a 2×2 box is placed above them
- **THEN** the upper 2×2 box MUST be supported by the combined outer guide geometry
- **AND** the seam between the two lower boxes MUST NOT prevent the upper box from seating
- **AND** the upper box MUST remain a valid member of the same stackable-box model

### Requirement: Full-hole geometry quality and exports

The stackable-box builder MUST validate full-hole mode as part of the accepted parameter snapshot. A valid full-hole result MUST remain watertight, keep the ordinary holes open through the 5 mm bottom floor without penetrating the integrated guide rim or walls, preserve the special corner retaining seats, and remain previewable and exportable through the existing STEP and STL workflows. Each special corner socket MUST use a Ø5.05 mm opening through the outside/lower 3.0 mm of the floor and a Ø7.05 mm opening through the inside/upper 2.0 mm.

#### Scenario: Full-hole generation succeeds

- **WHEN** a valid full-hole snapshot completes geometry generation and validation
- **THEN** the candidate MUST contain the requested nominal grid and special corner profiles
- **AND** the candidate MUST preserve the integrated side guide and internal grid-seam V grooves
- **AND** the candidate MUST be eligible for preview, STEP export, and STL export

#### Scenario: Full-hole geometry fails validation

- **WHEN** full-hole generation produces overlapping cutters, a non-watertight result, a non-14 mm ordinary center interval, damage to a special corner retaining seat, or a thin unsupported bottom interface
- **THEN** the candidate MUST be rejected with a diagnosable model error
- **AND** the failed candidate MUST NOT replace the last valid committed revision
- **AND** export MUST remain disabled for the failed revision

### Requirement: Stackable-box geometry quality and exports

The stackable-box builder MUST produce a valid CAD result for every accepted parameter snapshot, including its open top, nominal 5 mm bottom floor, nominal 2 mm side wall, fused reference-style stepped top rail, fixed complementary bottom relief/support profile, integrated guide interface, retaining sockets, and supported half-cell layout. A successful result MUST be previewable and exportable through the existing STEP and STL workflows, while an invalid or failed mating/geometry validation MUST keep the result stale or invalid and MUST NOT enable export for that snapshot.

#### Scenario: Successful stackable-box generation

- **WHEN** a valid stackable-box snapshot completes generation and validation
- **THEN** the workspace MUST commit a non-empty preview shape with bounds matching the requested footprint and height within tolerance
- **AND** the main floor and side-wall regions MUST meet the nominal 5 mm floor and 2 mm wall thickness contract outside the intentional bottom and upper-inner lead-in transitions
- **AND** STEP and STL export MUST be available for the committed revision

#### Scenario: Failed geometry validation

- **WHEN** a generated shape has self-intersections, overlapping retaining sockets, invalid half-cell placement, an unsupported bottom interface, or a failed integrated-interface quality check
- **THEN** the candidate MUST be rejected with a diagnosable model error
- **AND** the failed candidate MUST NOT replace the last valid committed revision
- **AND** export MUST remain disabled for the failed revision

## ADDED Requirements

### Requirement: Printable thickened shell

The generated stackable box MUST use a nominal 5.0 mm floor measured from the bed-facing bottom plane to the interior floor and a nominal 2.0 mm main side-wall thickness. The outer bottom perimeter MUST transition continuously to the supported floor with a fixed 2.0 mm 45° outer lead-in, a 1.6 mm vertical support segment at a 2 mm inset, and a 0.8 mm bed-facing foot chamfer. The top MUST include the fixed reference-style stepped rail with its 2 / 1.6 / 0.8 / 1 / 2 mm sequence. Every internal 28 mm grid seam's open V groove MUST leave approximately 4.2 mm of material above its 0.8 mm apex depth. The geometry MUST NOT intentionally leave a continuous recessed groove around the outer perimeter, the former unsupported outer membrane, or a horizontal seam-relief ceiling. The overall footprint, centered placement, base Z, and height parameter semantics MUST remain unchanged.

#### Scenario: Thickened 1×1 box

- **WHEN** a valid 1×1 stackable box is generated
- **THEN** its main bottom floor MUST measure 5.0 mm within the geometry tolerance
- **AND** its main side wall MUST measure 2.0 mm within the geometry tolerance
- **AND** its 2.0 mm bottom perimeter lead-in, 1.6 mm vertical support segment at a 2 mm inset, and 0.8 mm bed-facing foot chamfer MUST be continuous around the printable outer edge
- **AND** its fixed stepped top rail MUST be fused to the wall and remain inside the requested external bounds
- **AND** the upper inner rim MUST retain its 2.0 mm lead-in while the outer stacking datum remains intact

#### Scenario: Thickened multi-cell bottom

- **WHEN** a valid multi-cell stackable box is generated
- **THEN** the 5 mm floor MUST remain continuously supported across internal cell seams
- **AND** each internal 28 mm grid seam's V groove and 45° side faces MUST remain fused to the floor without a horizontal membrane
- **AND** the outer envelope MUST remain the requested 28 mm half-cell footprint minus the existing 0.15 mm clearance

#### Scenario: Height and mounting compatibility are preserved

- **WHEN** the thickened shell is generated with any accepted height, Snap socket mode, or full bottom-hole mode
- **THEN** the requested external height and centered footprint MUST remain unchanged
- **AND** the special Snap socket profile and optional ordinary hole positions MUST remain compatible with their existing contracts
- **AND** each corner Snap socket MUST retain the two-stage Ø5.05 mm/3.0 mm plus Ø7.05 mm/2.0 mm floor profile
