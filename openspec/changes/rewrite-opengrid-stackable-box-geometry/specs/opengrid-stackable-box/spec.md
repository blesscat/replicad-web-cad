## MODIFIED Requirements

### Requirement: Identical box-to-box stacking interface

Every generated stackable box MUST have the same box-to-box interface and MUST be usable as either the lower or upper box without an upper/lower variant or mode switch. The stacking guide MUST use the reference-style independent stepped top rail fused into the nominal 1.2 mm side wall and continuous box rim, with the reference 3.75 mm external corner radius and compact 0.8 mm inner rail corner radius. The top rail MUST remain within the derived external envelope and MUST use the fixed reference sequence of a 1.75 mm 45° inner lead-in, 1.2 mm vertical sliding-block segment, 0.8 mm 45° transition, 1.8 mm vertical segment, and 2.0 mm 45° return to the side wall. Each straight-side sliding-block face MUST continue into the rounded corner transition without a square-cut termination, isolated post, or detached triangular remnant. It MUST mate with the fixed complementary bottom guide profile based on a 0.8 mm bed-facing foot chamfer, a 1.8 mm vertical support segment, and a reference-aligned 2.15 mm 45° perimeter transition into the outer floor envelope. Internal cell-seam relief MUST use the fixed 1.2 mm 45° transition from the supported band to the 3.8 mm datum, then continue on the same 45° plane to a single central apex at 4.6 mm; it MUST NOT leave a horizontal upper land at the 3.8 mm datum. The bottom guide MUST follow the reference cell-boundary and internal-seam relief pattern rather than a separate suspended perimeter plate or an isolated hole-only interface. The top rail and bottom guide MUST provide complementary guide faces, a positive bearing land, and a dedicated sliding clearance of 0.25 mm. The bottom stacking surface MUST NOT rely on permanently protruding positioning posts, a thin unsupported perimeter lip, or a continuous recessed groove around the outer perimeter. Every internal relief MUST end at the lower surface of the supported floor and MUST leave the box interior floor continuous. The receiving geometry MUST provide a continuous sliding path rather than only isolated circular holes.

#### Scenario: Same model stacks with itself

- **WHEN** one generated stackable box is placed above another generated stackable box with compatible footprints
- **THEN** the upper box's internal-seam relief MUST remain aligned with the lower box's integrated guide geometry
- **AND** the two boxes MUST remain laterally guided without requiring different model types
- **AND** the upper box MUST mate with the lower box's fused stepped top rail through the fixed bottom guide profile without stacking posts

#### Scenario: Printable integrated guide interface

- **WHEN** a stackable box guide interface is generated
- **THEN** the stepped top rail MUST remain continuously fused to the 1.2 mm side wall and rim, with its 1.75 / 1.2 / 0.8 / 1.8 / 2.0 mm reference sequence preserved and the outer stacking datum preserved
- **AND** each straight-side rail profile MUST meet its rounded corner without a visibly clipped or isolated sliding-block end
- **AND** the fixed bottom assembly MUST measure 5.0 mm from the bed-facing plane to the upper interior floor
- **AND** the bottom perimeter guide MUST use a 0.8 mm bed-facing 45° foot, a 1.8 mm vertical segment, and a 2.15 mm 45° transition into the outer floor envelope
- **AND** each internal seam relief MUST use the fixed 1.2 mm 45° transition, continue to the 4.6 mm central apex, and contain no horizontal closure plane at 3.8 mm
- **AND** the guide and internal-seam relief MUST stop at the lower surface of the supported floor without cutting into the box interior or leaving an unconnected overhanging lip
- **AND** the lower floor surface above each relief MUST remain supported and continuous through the fixed 1.2 mm interior floor
- **AND** the mating clearance MUST be independent of the 0.15 mm OpenGrid footprint clearance

#### Scenario: Smaller box slides on a longer box

- **WHEN** a single 1×1 box is placed on a 1×4 box
- **THEN** the 1×1 box MUST be able to slide continuously along the 1×4 long axis while remaining captured by the guide geometry
- **AND** the interface MUST NOT force the 1×1 box to stop only at isolated 28 mm holes

#### Scenario: Larger box bridges adjacent boxes

- **WHEN** two 1×2 boxes are placed side by side to form a 2×2 footprint and a 2×2 box is placed above them
- **THEN** the upper 2×2 box MUST be supported by the combined outer guide geometry
- **AND** the seam between the two lower boxes MUST NOT prevent the upper box from seating
- **AND** the upper box MUST remain a valid member of the same stackable-box model

### Requirement: Stackable-box geometry quality and exports

The stackable-box builder MUST produce a valid CAD result for every accepted parameter snapshot, including its open top, fixed 5 mm bottom assembly with a nominal 1.2 mm interior floor, nominal 1.2 mm side wall, fused reference-style stepped top rail with the fixed 1.75 / 1.2 / 0.8 / 1.8 / 2.0 mm upper sequence, fixed printable bottom perimeter guide with a 0.8 mm foot chamfer, 1.8 mm vertical support segment, and 2.15 mm 45° transition, plus fixed pointed 45° internal-seam relief closures, retaining sockets, and supported half-cell layout. The resulting top rail MUST be one continuous wall-connected interface around the usable perimeter, with no clipped upper-block fragments caused by profile trimming. Profile construction MUST remain practical for interactive regeneration across the accepted footprint range and MUST NOT require a separate boolean operation for every straight rail segment. A successful result MUST be previewable and exportable through the existing STEP and STL workflows, while an invalid or failed mating/geometry validation MUST keep the result stale or invalid and MUST NOT enable export for that snapshot.

#### Scenario: Successful stackable-box generation

- **WHEN** a valid stackable-box snapshot completes generation and validation
- **THEN** the workspace MUST commit a non-empty preview shape with bounds matching the requested footprint and the derived external height within tolerance
- **AND** the fixed bottom assembly MUST measure 5.0 mm from the bed-facing plane to the upper interior floor
- **AND** the nominal interior floor and main side-wall regions MUST measure 1.2 mm outside the intentional guide and upper-rim transitions
- **AND** every internal 28 mm grid seam MUST use the reference-style pointed relief, MUST have no horizontal closure plane at the 3.8 mm datum, and MUST retain solid floor material above the 4.6 mm apex instead of cutting into the box interior
- **AND** the stepped top rail MUST be fused to the side wall and remain inside the requested external bounds
- **AND** the straight rail faces MUST continue through the rounded corners without isolated clipped blocks
- **AND** STEP and STL export MUST be available for the committed revision

#### Scenario: Failed geometry validation

- **WHEN** a generated shape has self-intersections, overlapping retaining sockets, invalid half-cell placement, or a failed interface quality check
- **THEN** the candidate MUST be rejected with a diagnosable model error
- **AND** the failed candidate MUST NOT replace the last valid committed revision
- **AND** export MUST remain disabled for the failed revision
