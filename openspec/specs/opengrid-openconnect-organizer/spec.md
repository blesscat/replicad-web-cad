# OpenGrid OpenConnect Organizer Specification

## Purpose

Provide a directly wall-mounted OpenGrid organizer with configurable shaped
cavities, an integrated locked OpenConnect female interface, and a forward
tilt that moves the cavity openings toward the user for easier access.

## Requirements

### Requirement: Stable wall-organizer component identity

The system MUST expose an independent OpenGrid component whose model ID, build
key, route slug, catalog component directory, and CAD-kernel component
directory are all `opengrid-openconnect-organizer`. Its user-facing display
name MUST begin with `OpenGrid `, its CAD route MUST be
`/cad/opengrid-openconnect-organizer`, and it MUST be discoverable in the
OpenGrid Wall subgroup but not the OpenGrid Desk subgroup. Existing model IDs,
routes, persisted entries, generators, and export names MUST remain unchanged.

#### Scenario: Resolve the organizer consistently

- **WHEN** the catalog, route resolver, persistence layer, or CAD Worker receives
  `opengrid-openconnect-organizer`
- **THEN** every layer MUST resolve the same independent component
- **AND** no existing OpenGrid model MUST be substituted or migrated

#### Scenario: Show the organizer only in the wall system

- **WHEN** the OpenGrid catalog is grouped by system context
- **THEN** `opengrid-openconnect-organizer` MUST appear in the Wall subgroup
- **AND** it MUST NOT appear in the Desk subgroup

### Requirement: Organizer parameters are typed and independently persisted

The normalized parameter snapshot MUST contain exactly `holeCountX`,
`holeCountY`, `holeSpacingMode`, `holeSpacingX`, `holeSpacingY`, `holeShape`,
`holeDiameter`, `holeDepth`, `bottomThickness`, `edgeThickness`, and
`tiltAngle`.
`holeSpacingMode` MUST be either `linked` or `independent`, and `holeShape`
MUST be one of `circle`, `triangle`, `square`, `pentagon`, or `hexagon`.

Hole counts MUST be safe integers from 1 through 20. X/Y spacing MUST be finite
from 0.5 through 300 mm, hole diameter MUST be finite from 1 through 300 mm,
hole depth MUST be finite from 1 through 500 mm, and bottom thickness MUST be
finite from 0 through 100 mm. `edgeThickness` MUST be finite from 0.4 through
100 mm. `tiltAngle` MUST be a finite value from 0 through 45 degrees on
whole-degree steps. The defaults MUST be `{ holeCountX: 2,
holeCountY: 2, holeSpacingMode: 'linked', holeSpacingX: 1, holeSpacingY: 1,
holeShape: 'circle', holeDiameter: 20, holeDepth: 20, bottomThickness: 1,
edgeThickness: 1, tiltAngle: 15 }`. In linked spacing mode the two canonical
spacing values MUST be equal; in independent mode they MAY differ.

The component MUST reject missing or unknown fields, unsupported enum values,
non-finite or out-of-range dimensions, fractional counts, off-step angles,
unsafe cavity-to-interface collisions, and any derived installed or
print-oriented extent above the existing 500 mm workspace limit. Invalid input
MUST produce a field-specific diagnostic and MUST NOT replace the last valid
revision, persist, generate, or become exportable.

#### Scenario: Initialize the default organizer

- **WHEN** the organizer route starts without a valid saved snapshot
- **THEN** it MUST initialize the exact default snapshot
- **AND** its first Worker request MUST use
  `modelId=opengrid-openconnect-organizer`

#### Scenario: Link the X and Y spacing controls

- **WHEN** the user selects linked spacing and changes its visible spacing value
- **THEN** both canonical spacing fields MUST receive that value
- **AND** validation MUST reject a linked snapshot whose X/Y values differ

#### Scenario: Configure the axes independently

- **WHEN** the user selects independent spacing
- **THEN** the panel MUST expose separate X and Y edge-to-edge spacing controls
- **AND** generation MUST preserve both accepted values

#### Scenario: Configure the outer edge and open bottom

- **WHEN** the user sets `edgeThickness` and `bottomThickness=0`
- **THEN** the cavity matrix MUST retain at least the selected edge distance on
  both local X and Y sides
- **AND** every cavity MUST open through the body underside

#### Scenario: Use whole-degree forward tilt

- **WHEN** the user changes the forward-tilt control
- **THEN** the accepted value MUST change in one-degree steps
- **AND** a fractional-degree value MUST be rejected

#### Scenario: Reject invalid organizer input

- **WHEN** any canonical field is missing, unknown, malformed, out of range, or
  produces an unsafe or oversized layout
- **THEN** validation MUST identify the affected field or parameter object
- **AND** no generation, persistence, or export MUST be accepted for that input

### Requirement: Shaped cavities form a centered local matrix

The organizer MUST contain exactly one cavity for every requested X/Y
index pair. Every cavity in one result MUST share the selected shape, diameter,
depth, orientation, and axis. A circular cavity MUST use `holeDiameter` as its
diameter. A triangular, square, pentagonal, or hexagonal cavity MUST be a
regular polygon and use `holeDiameter` as its inscribed-circle diameter, equal
to the distance between opposite sides where such opposite sides exist.

For the selected shape's fixed local orientation, let `envelopeX` and
`envelopeY` be its outer X/Y envelope. The local center pitches MUST be
`envelopeX + holeSpacingX` and `envelopeY + holeSpacingY`; therefore the
spacing values represent clear outer-envelope-to-outer-envelope material, not
center distance. The cavity matrix MUST be centered in the organizer opening
plane. Each cavity MUST stop at the requested axial depth and leave exactly the
requested positive bottom thickness, within geometry tolerance, between its
floor and the parallel body underside. When `bottomThickness=0`, every cavity
MUST pass fully through the parallel body underside and MUST NOT retain a cavity
floor. Side walls and material between adjacent cavities MUST remain solid.

The local body width MUST be
`max(28 mm, requiredSpanX + 2 * edgeThickness)`, and the local body depth MUST
be `requiredSpanY + 2 * edgeThickness`; neither dimension MAY be rounded up to
a 28 mm Desk-style grid envelope. The cavity matrix MUST remain centered, so
the clear X/Y distance from its outer envelope to each corresponding body edge
MUST be at least `edgeThickness`. Any extra width required by the 28 mm minimum
MUST be divided equally between the two X edges.

The two front-facing vertical outer corners, farthest from the wall interface,
MUST use a target radius of 2.5 mm. The actual radius MUST be the smallest of
2.5 mm, `edgeThickness * (2 + sqrt(2))`, and `bodyDepth - 0.05 mm`. These
limits MUST keep the worst-case square cavity envelope inside the rounded body
and preserve at least 0.05 mm of straight side before the rear corner. This
rounding MUST NOT be applied to the two rear vertical body corners.

#### Scenario: Generate circular cavities

- **WHEN** a valid snapshot selects `circle`
- **THEN** the result MUST contain exactly `holeCountX * holeCountY` circular
  cavities
- **AND** their diameter, depth, X/Y edge spacing, and bottom thickness MUST
  match the accepted snapshot within geometry tolerance

#### Scenario: Generate through-open cavities

- **WHEN** `bottomThickness=0`
- **THEN** every requested cavity MUST open through both the organizer opening
  plane and the parallel body underside
- **AND** the surrounding perimeter and inter-cavity walls MUST remain solid

#### Scenario: Size the outer body without grid rounding

- **WHEN** the selected cavity matrix plus its two X edge thicknesses is less
  than 28 mm wide
- **THEN** the body width MUST be exactly 28 mm
- **AND** for every larger matrix the body width MUST follow its continuous
  cavity-envelope calculation without rounding to a 28 mm multiple

#### Scenario: Round the two front vertical corners

- **WHEN** the organizer is generated with the default `edgeThickness=1 mm`
- **THEN** its two front-facing vertical outer corners MUST each have a 2.5 mm
  radius
- **AND** the rear vertical body corners MUST remain unrounded

#### Scenario: Preserve a thinner selected edge

- **WHEN** the requested R2.5 corner would violate the selected edge allowance
- **THEN** each front-corner radius MUST be limited to
  `edgeThickness * (2 + sqrt(2))`
- **AND** the accepted thin-edge layout MUST remain a valid connected solid

#### Scenario: Preserve a shallow-body rear edge

- **WHEN** the target radius would leave less than 0.05 mm of straight body
  side before a rear corner
- **THEN** each front-corner radius MUST be limited to `bodyDepth - 0.05 mm`
- **AND** the accepted shallow body MUST remain a valid connected solid

#### Scenario: Generate regular polygon cavities

- **WHEN** a valid snapshot selects `triangle`, `square`, `pentagon`, or
  `hexagon`
- **THEN** every cavity MUST use the corresponding regular polygon
- **AND** its inscribed-circle diameter, fixed orientation, depth, X/Y outer
  envelope spacing, and bottom thickness MUST match the accepted snapshot

#### Scenario: Change shape without changing the requested counts

- **WHEN** the selected shape changes while both hole counts remain fixed
- **THEN** the cavity count MUST remain unchanged
- **AND** the body and connector occupancy MUST recalculate from the new fixed
  polygon envelope without overlapping adjacent cavities

### Requirement: Positive tilt moves cavity openings toward the user

In installed coordinates the wall and the integrated OpenConnect female
opening plane MUST be parallel to the X/Z plane, the negative Y direction MUST
point away from the wall toward the user, and positive Z MUST point upward.
This preserves the installed orientation already used by the OpenConnect
Shelf. For `tiltAngle = a`, the normalized axis from every cavity floor toward
its opening MUST be `[0, -sin(a), cos(a)]`. At zero degrees the cavity axes MUST
be vertical. At every positive angle each cavity opening MUST therefore be
farther from the wall than its floor; the lower body MUST NOT be tilted toward
the user instead.

Hole diameter, depth, bottom thickness, edge thickness, polygon orientation,
cavity-center spacing, and matrix centering MUST be measured in the organizer's
local tilted frame. Changing only `tiltAngle` MUST rigidly change that local
frame relative to the wall interface without changing any of those local
cavity measurements or rotating the OpenConnect female interface.

#### Scenario: Keep zero tilt vertical

- **WHEN** `tiltAngle=0`
- **THEN** every cavity floor-to-opening axis MUST be parallel to positive Z
- **AND** an opening center MUST have the same wall distance as its floor center

#### Scenario: Tilt the top toward the user

- **WHEN** `tiltAngle` is greater than zero
- **THEN** every cavity opening center MUST be farther from the wall than its
  corresponding floor center by `holeDepth * sin(tiltAngle)` within geometry
  tolerance
- **AND** every floor center MUST remain below its opening by
  `holeDepth * cos(tiltAngle)` within geometry tolerance

#### Scenario: Preserve local cavity geometry across angle changes

- **WHEN** two accepted snapshots differ only by `tiltAngle`
- **THEN** their local cavity shape, count, diameter, depth, spacing, bottom
  thickness, and edge thickness MUST be identical
- **AND** their OpenConnect female opening planes MUST both remain parallel to
  the wall

### Requirement: Locked OpenConnect females are integrated directly in the body

The organizer MUST be one connected body with a flat rear interface whose
OpenConnect female opening plane is parallel to the wall and whose insertion
axis is perpendicular to the wall. The female receptacles MUST be subtracted
directly from this integrated rear surface. The result MUST NOT require or emit
a separate mounting base, rear plate part, adapter, OpenGrid desk interface,
corner seat, foot, or second printable solid.

The rear interface MUST use the 28 mm OpenGrid pitch without forcing the body
width or height to a pitch multiple. Its width MUST equal the continuously
derived body width. Its height MUST equal
`max(28 mm, holeDepth + bottomThickness)`. The derived column count MUST be
`max(1, floor(bodyWidth / 28 mm))`, and the derived row count MUST be
`max(1, floor(rearInterfaceHeight / 28 mm))`. Consequently every width or
height from 28 mm through values below 56 mm MUST retain one receptacle on that
axis, and the second receptacle MUST first appear at exactly 56 mm.

The interface MUST contain one locked female receptacle in every derived X/Z
cell. The complete 28 mm-pitch column group MUST be centered horizontally in
the continuous interface width. The complete row group MUST be aligned to the
top of the interface: the top row center MUST be 14 mm below its top edge, and
additional row centers MUST proceed downward at 28 mm pitch. Unused vertical
height MUST remain below the row group.

Every receptacle MUST preserve the supplied locked OpenConnect negative at its
authored millimetre scale and asymmetric origin. Only rigid placement MAY be
applied. Each opening plane MUST remain parallel to the wall for every angle,
and the placed negative MUST accept the existing assembled OpenGrid Snap
OpenConnect head. Receptacles, cavities, and the transition joining the tilted
body to the rear interface MUST retain at least 0.5 mm of separating material
and MUST form one watertight solid.

At every positive `tiltAngle`, the upper transition surface MUST meet the front
top edge of the rear interface. The rear-interface plate MUST NOT stand above
that transition as a separate projecting lip between the tilted body and the
wall-facing plate.

#### Scenario: Mount directly with the default interface

- **WHEN** the default two-by-two circular organizer is generated
- **THEN** its integrated rear surface MUST derive one OpenConnect column and
  one OpenConnect row
- **AND** it MUST contain exactly one locked female receptacle without any
  separate mounting part

#### Scenario: Keep female openings parallel to the wall

- **WHEN** any valid `tiltAngle` is generated in installed coordinates
- **THEN** every OpenConnect female opening plane MUST remain parallel to the
  wall plane
- **AND** every OpenConnect insertion axis MUST remain perpendicular to the wall

#### Scenario: Keep the tilted transition flush with the rear interface

- **WHEN** the organizer is generated with a positive `tiltAngle`
- **THEN** the transition MUST extend continuously from the tilted body to the
  front top edge of the rear interface
- **AND** the rear-interface plate MUST NOT form a separate projecting upper lip

#### Scenario: Grow connector occupancy with the organizer

- **WHEN** the continuous body width or interface height crosses from below
  56 mm to exactly 56 mm
- **THEN** the corresponding OpenConnect count MUST grow from one to two
- **AND** each additional completed 28 mm span MUST add one centered or
  top-aligned receptacle on that axis

#### Scenario: Center columns and top-align rows

- **WHEN** the body dimensions leave width or height that is not occupied by
  the derived 28 mm connector group
- **THEN** the column group MUST have equal unused width on its left and right
- **AND** all unused interface height MUST remain below the row group

#### Scenario: Accept the existing OpenConnect head

- **WHEN** an assembled OpenGrid Snap OpenConnect head is placed at a locked
  position of the organizer
- **THEN** the complete head MUST fit the authored female negative within CAD
  tolerance
- **AND** no scaling, mirroring, or shape substitution MAY be required

### Requirement: Preview, generation, and exports are deterministic

Every valid snapshot MUST generate a non-empty valid watertight single solid.
The tilted cavity body, integrated rear interface, and connecting transition
MUST remain connected for every valid parameter combination. The committed
result MUST use a deterministic print orientation that places the parallel body
underside on `Z=0` and leaves the cavities open upward; this whole-result rigid
orientation MUST preserve the installed relationship between the cavity axes
and the OpenConnect interface.

Valid snapshots MUST use the existing latest-wins Worker candidate, commit,
mesh, STEP, and binary STL lifecycle and persist independently under
`opengrid-openconnect-organizer`. STEP and STL filenames MUST begin with
`opengrid-openconnect-organizer-` and include every parameter that can change
geometry. Equivalent normalized snapshots MUST produce identical bounds and
filenames, and failed or invalid generations MUST never become exportable.

#### Scenario: Generate and export a valid organizer

- **WHEN** a valid organizer candidate completes generation and mesh validation
- **THEN** the viewport MUST commit one non-empty single-solid revision
- **AND** STEP and binary STL export MUST be enabled for that same revision

#### Scenario: Rest on the body underside for printing

- **WHEN** a valid tilted organizer is prepared for preview or export
- **THEN** its parallel body underside MUST lie on `Z=0` within geometry
  tolerance
- **AND** every cavity MUST open upward in print coordinates

#### Scenario: Persist parameters independently

- **WHEN** a valid organizer snapshot is accepted
- **THEN** only the `opengrid-openconnect-organizer` persistence entry MUST
  change
- **AND** no other OpenGrid component snapshot MUST inherit its values

#### Scenario: Keep failed candidates out of exports

- **WHEN** asset loading, Boolean construction, topology validation, or meshing
  fails
- **THEN** the candidate MUST report a diagnosable failure without replacing the
  last committed revision
- **AND** the failed candidate MUST NOT enable STEP or STL export

### Requirement: OpenGrid and OpenConnect sources are attributed

The component workspace MUST expose the existing OpenGrid attribution and the
OpenConnect attribution for the locked female source, including its applicable
source license and upstream project link. Repository-local provenance MUST
identify the authored asset dimensions and integrity data used by both this
component and the existing OpenConnect Shelf.

#### Scenario: Show attribution on the organizer route

- **WHEN** the organizer workspace is displayed
- **THEN** the user MUST be able to view both OpenGrid and OpenConnect credits
- **AND** the OpenConnect credit MUST identify its source license and project

#### Scenario: Preserve asset provenance

- **WHEN** production assets for the organizer are enumerated
- **THEN** the locked female asset MUST have repository-local provenance
- **AND** no unrelated reference mesh MAY become runtime or golden geometry
