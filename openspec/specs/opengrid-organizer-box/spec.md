## Purpose

Provide an OpenGrid-compatible solid organizer box for storing batteries, tool
bits, and similar items in a configurable matrix of shaped, blind top cavities.

## Requirements

### Requirement: Stable organizer-box component contract

The system MUST expose a new OpenGrid component with stable
`modelId=opengrid-organizer-box`, build key `opengrid-organizer-box`, and route
slug `opengrid-organizer-box`. Its user-facing display name MUST begin with
`OpenGrid `, and its parameter state, preview, generation, and export identity
MUST remain independent from existing OpenGrid component IDs. Existing model
IDs and their behavior MUST remain unchanged.

#### Scenario: Organizer box is discoverable

- **WHEN** the model chooser or OpenGrid catalog is rendered
- **THEN** it MUST list the organizer box under the OpenGrid family
- **AND** its selection entry MUST navigate to the
  `/cad/opengrid-organizer-box` route
- **AND** the route MUST show only organizer-box controls

#### Scenario: Organizer box initializes independently

- **WHEN** the organizer-box route starts without a valid saved snapshot
- **THEN** it MUST use the organizer-box defaults
- **AND** the first Worker generation MUST use
  `modelId=opengrid-organizer-box`
- **AND** no existing component's parameters MUST be copied into the snapshot

### Requirement: Organizer-box parameters and linked spacing

The canonical organizer-box snapshot MUST contain typed `holeCountX`,
`holeCountY`, `holeSpacingMode`, `holeSpacingX`, `holeSpacingY`, `holeShape`,
`holeDiameter`, `holeDepth`, `bottomThickness`, `cornerSeatMode`, `boxMode`, and
`stackingClearanceHeight` fields. `holeSpacingMode` MUST be either `linked` or
`independent`; `holeShape` MUST be one of `circle`, `triangle`, `square`,
`pentagon`, or `hexagon`; `cornerSeatMode` MUST be one of `none`,
`detachable-corner-seat`, or `integrated`; and `boxMode` MUST be either
`normal` or `stackable`.

Hole counts MUST be positive integers. All dimensional values MUST be finite
positive millimetres, and the bottom thickness MUST default to 1 mm.
`stackingClearanceHeight` MUST default to 3.5 mm, MUST be at least 3.5 mm, and
MUST use the Organizer Box's existing 0.5 mm input increment. The component
MUST reject any snapshot whose derived footprint exceeds the existing OpenGrid
500 mm workspace limit, whose cavities cannot fit with the required material
boundaries, whose selected seat and body features would collide with a cavity,
whose detachable sockets would leave less than 0.5 mm of roof material, or
whose selected shape/depth combination is geometrically invalid. In linked
spacing mode, the canonical X and Y spacing values MUST be equal; in
independent mode they MAY differ.

The parameter hydrator MUST accept the exact legacy Organizer Box snapshot
shape containing `bottomInterfaceMode` and migrate it before validation.
Legacy `corner-seat` MUST become `cornerSeatMode=integrated` and
`boxMode=normal`; legacy `detachable-corner-seat` MUST become
`cornerSeatMode=detachable-corner-seat` and `boxMode=normal`; and legacy
`stackable` MUST become `cornerSeatMode=none` and `boxMode=stackable`. Every
legacy migration MUST set `stackingClearanceHeight=3.5`. Accepted persistence,
Worker requests, and exports MUST emit only the canonical fields and MUST NOT
emit `bottomInterfaceMode`.

#### Scenario: Default organizer-box snapshot

- **WHEN** the organizer-box route has no valid persisted parameters
- **THEN** it MUST select a circle cavity shape
- **AND** it MUST select linked X/Y spacing
- **AND** it MUST use a 1 mm bottom thickness
- **AND** it MUST select `鎖定角座`, normalized as
  `cornerSeatMode=detachable-corner-seat`
- **AND** it MUST select `普通模式`, normalized as `boxMode=normal`
- **AND** it MUST use `stackingClearanceHeight=3.5`

#### Scenario: Linked spacing control

- **WHEN** the user selects linked spacing
- **THEN** the panel MUST expose one spacing value that represents both axes
- **AND** changing that value MUST update both canonical spacing values
- **AND** validation MUST reject a linked snapshot with unequal X/Y spacing

#### Scenario: Independent spacing control

- **WHEN** the user selects independent spacing
- **THEN** the panel MUST expose separate X and Y edge-to-edge spacing values
- **AND** the generated layout MUST use the X value horizontally and the Y value
  vertically

#### Scenario: Legacy bottom-interface snapshot is hydrated

- **WHEN** persistence contains an otherwise valid legacy snapshot with
  `bottomInterfaceMode=stackable`
- **THEN** hydration MUST produce `cornerSeatMode=none`,
  `boxMode=stackable`, and `stackingClearanceHeight=3.5`
- **AND** the next accepted canonical snapshot MUST omit `bottomInterfaceMode`

#### Scenario: Invalid organizer-box input

- **WHEN** a snapshot contains a non-positive count, non-finite or invalid
  dimension, unsupported enum value, overlapping layout, insufficient boundary
  or detachable-socket roof material, a stacking clearance below 3.5 mm or off
  the 0.5 mm input grid, or a footprint above 500 mm
- **THEN** validation MUST return a diagnosable field-specific error
- **AND** the invalid snapshot MUST NOT send `model.generate`
- **AND** it MUST NOT replace the last valid revision or enable export

### Requirement: Shaped blind cavity matrix

The generated organizer box MUST contain one cavity for every combination of
the requested X and Y hole indices. All cavities in one box MUST use the same
selected shape, diameter, depth, and fixed orientation. A circular cavity MUST
use `holeDiameter` as its circular diameter. A regular polygon cavity MUST use
`holeDiameter` as the diameter of its inscribed circle (the distance between
opposite sides), including the 3-, 4-, 5-, and 6-sided choices.

`holeSpacingX` and `holeSpacingY` MUST represent the clear distance from the
outer envelope of one cavity to the outer envelope of its adjacent cavity, not
the distance between cavity centers. The cavity array MUST be centered in the
derived outer footprint. Cavities MUST be blind from the top, stop at the
requested depth, and leave the requested bottom thickness above the active
body-interface datum. That datum MUST remain 5 mm in normal mode with no or
integrated seats, 1.75 mm in normal mode with detachable sockets, and 5 mm in
stackable mode for every seat choice. The body between cavities and all side
walls MUST remain solid. The selected body and seat modes MAY shape the
underside only within their specified interface envelopes, and the top
stacking structure MAY extend above the cavity-opening plane, but none of these
features MUST reach a storage cavity. The component MUST NOT expose
side-opening controls or generate side openings.

#### Scenario: Circular cavity matrix

- **WHEN** a valid snapshot selects `circle` with X/Y counts, diameter, depth,
  and spacing
- **THEN** the result MUST contain exactly the requested number of circular
  blind cavities
- **AND** adjacent cavity boundaries MUST be separated by the requested X/Y
  edge-to-edge spacing within geometry tolerance
- **AND** every cavity floor MUST remain the requested bottom thickness above
  the active body-interface datum

#### Scenario: Polygon cavity matrix

- **WHEN** a valid snapshot selects `triangle`, `square`, `pentagon`, or
  `hexagon`
- **THEN** every cavity MUST be a regular polygon with the selected side count
- **AND** the selected diameter MUST be measured by its inscribed circle
- **AND** every polygon cavity MUST use the same fixed orientation
- **AND** adjacent polygon outer envelopes MUST respect the requested X/Y
  edge-to-edge spacing

#### Scenario: Deep cavities preserve the bottom

- **WHEN** the user increases `holeDepth` or `bottomThickness`
- **THEN** the cavity floor MUST move according to the requested depth
- **AND** outside every active seat or stacking envelope the remaining solid
  bottom MUST remain at least the requested thickness
- **AND** a detachable socket MUST retain at least 0.5 mm of solid roof before
  the cavity floor
- **AND** in normal mode with detachable seats the socket roof thickness MUST
  equal the requested `bottomThickness` within geometry tolerance
- **AND** the overall Z extent MUST be derived from cavity depth, bottom
  thickness, body mode, seat mode, and stackable clearance rather than an
  unrelated manually entered height

#### Scenario: Stacking clearance does not alter storage cavities

- **WHEN** only `stackingClearanceHeight` changes on a stackable Organizer Box
- **THEN** every cavity opening, floor, depth, diameter, center, and spacing MUST
  remain unchanged
- **AND** only the connected structure above the cavity-opening plane and the
  resulting upper Z bound MUST change

### Requirement: Derived OpenGrid footprint and fixed cavity orientation

The organizer-box X/Y footprint MUST be derived from the cavity count, selected
shape envelope, and edge-to-edge spacing. The derivation MUST choose the
smallest legal OpenGrid footprint that contains the centered cavity matrix while
preserving the fixed boundary clearance required by the union of the selected
body-mode and corner-seat features. The resulting footprint MUST use the
existing 28 mm OpenGrid pitch and existing per-axis exterior clearance, and the
derived grid counts MUST be available to the UI as read-only calculated values.

All cavities MUST share one deterministic orientation relative to the world X/Y
axes. Orientation MUST NOT be independently configurable per cavity or per axis.

#### Scenario: Cavity layout determines grid occupancy

- **WHEN** the user changes either cavity count, cavity diameter, linked/
  independent spacing, body mode, or corner-seat mode
- **THEN** the derived X/Y grid occupancy and outer footprint MUST recalculate
- **AND** the cavity matrix MUST remain centered
- **AND** every active bottom interface position MUST remain on the derived
  footprint's fixed OpenGrid locations

#### Scenario: Layout does not fit

- **WHEN** the requested cavity matrix cannot fit inside the largest safe
  OpenGrid footprint or would collide with any active body or seat feature
- **THEN** validation MUST reject the snapshot with a layout error
- **AND** no new Worker generation or export request MUST be sent

### Requirement: Integrated detachable corner-seat sockets

When `cornerSeatMode=detachable-corner-seat`, the Organizer Box MUST form four
keyed female corner-seat sockets directly in the box body at the existing
four-corner locating positions, regardless of body mode. Each socket MUST use
the shared detachable-seat female geometry with a nominal Ø7 mm by 1.75 mm
material envelope and its two retaining tabs. The socket holder MUST remain
part of the one exported box solid and MUST NOT be emitted as a separate
printable part.

Viewed from the box bottom, the sockets MUST use the deterministic corner
rotations upper-left 0°, upper-right 90°, lower-right 180°, and lower-left 270°.
The mode MUST preserve at least 0.5 mm of solid roof between each 1.75 mm-deep
socket and the nearest storage cavity and MUST NOT generate built-in downward
feet. A stackable body MUST retain its box-to-box bottom and top stacking
interfaces in addition to these sockets.

#### Scenario: Detachable sockets are part of the box

- **WHEN** a valid Organizer Box snapshot selects
  `cornerSeatMode=detachable-corner-seat`
- **THEN** the generated result MUST remain one connected watertight solid
- **AND** it MUST contain the four shared female socket profiles at the fixed
  corner positions
- **AND** no socket holder or male seat MUST be fused below the box or emitted
  as another solid

#### Scenario: Socket rotations follow the four corners

- **WHEN** the detachable socket layout is inspected from the box bottom
- **THEN** the upper-left, upper-right, lower-right, and lower-left socket
  profiles MUST use rotations 0°, 90°, 180°, and 270° respectively
- **AND** all four sockets MUST accept the same unmirrored male corner-seat
  geometry after the male part is rotated to the corresponding orientation

#### Scenario: Detachable socket roof is too thin

- **WHEN** the selected body mode, requested bottom thickness, and cavity layout
  would leave less than 0.5 mm of material above a 1.75 mm-deep detachable
  socket
- **THEN** Organizer Box validation MUST return a diagnosable corner-seat or
  bottom-thickness error
- **AND** the invalid snapshot MUST NOT replace the last valid revision or
  enable export

#### Scenario: Detachable seats compose with stacking

- **WHEN** the user selects `cornerSeatMode=detachable-corner-seat` and
  `boxMode=stackable`
- **THEN** the generated underside MUST contain both the four detachable
  sockets and the standard box-to-box stacking profile
- **AND** the generated top MUST contain the standard stacking rail
- **AND** built-in downward feet MUST be absent

#### Scenario: Detachable mode excludes existing interfaces

- **WHEN** the user selects `cornerSeatMode=detachable-corner-seat` and
  `boxMode=normal`
- **THEN** the generated underside MUST contain neither the four existing
  downward built-in feet nor the box-to-box stacking profile
- **AND** the box lower Z bound MUST remain at its body bottom datum

### Requirement: Preview, persistence, and exports

Every valid organizer-box snapshot MUST generate a non-empty watertight single
solid centered on X/Y with a valid bottom reference, remain previewable through
the existing Worker revision lifecycle, and support STEP and binary STL export.
The export filenames MUST identify the organizer-box model and include every
parameter that changes cavity, body-mode, corner-seat, or stacking-clearance
geometry, including shape, diameter, counts, spacing, depth, bottom thickness,
corner-seat mode, body mode, and stackable clearance when active.

Valid organizer-box parameters MUST persist under the independent
`opengrid-organizer-box` model ID. Invalid or incomplete raw input MUST NOT
overwrite the last accepted persisted snapshot, and a malformed persisted entry
MUST fall back to organizer-box defaults without affecting other components.

#### Scenario: Valid result is previewable and exportable

- **WHEN** a valid organizer-box snapshot completes generation in any of the six
  body/seat combinations
- **THEN** the Worker MUST commit a non-empty single solid revision
- **AND** the viewport MUST display the selected cavity matrix, body interface,
  seat interface, and top rail when applicable
- **AND** STEP and STL export MUST be enabled for that revision

#### Scenario: Parameter persistence is isolated

- **WHEN** a valid organizer-box parameter update is accepted
- **THEN** only the `opengrid-organizer-box` persistence entry MUST change
- **AND** navigating to another model MUST NOT inherit organizer-box values

### Requirement: Detachable socket bottom lock indicators

When `cornerSeatMode=detachable-corner-seat`, the Organizer Box MUST add one
shared 0.4 mm by 2 mm straight-slot recess beside each of its four female
socket openings regardless of body mode. Each recess MUST be 0.2 mm deep,
remain on the exposed box-bottom surface outside the nominal Ø7 mm socket
envelope, and remain clear of the keyed passage, retaining tabs, storage
cavities, active stacking features, and outer boundary.

The four socket poses MUST retain the existing bottom-view orientations:
upper-left 0°, upper-right 90°, lower-right 180°, and lower-left 270°. For each
pose, the indicator center MUST remain on the deterministic locked centerline
outside the socket envelope. The upper-left and lower-right canonical
indicators MUST remain on the opposite side of their sockets specified by the
reference arrows, while retaining the same 0.15 mm boundary clearance. The
upper-right and lower-left indicators MUST remain on their existing sides. All
four female slot centerlines MUST point toward their socket openings. With the
shared slot's local centerline aligned to +X, these placements MUST remain
deterministic in the same corner order.

#### Scenario: Locking corner-seat mode shows four indicators

- **WHEN** a valid Organizer Box snapshot selects `鎖定角座`, normalized as
  `cornerSeatMode=detachable-corner-seat`
- **THEN** the generated single box solid MUST contain four readable straight-slot
  recesses on its bottom surface
- **AND** every recess MUST be nominally 0.4 mm by 2 mm and 0.2 mm deep within
  geometry tolerance
- **AND** all four recesses MUST remain outside their socket openings and
  preserve the existing socket passage and retaining tabs

#### Scenario: Corner indicators follow deterministic locked directions

- **WHEN** the detachable socket layout is inspected from the box bottom
- **THEN** the indicator rotations MUST be 90°, 0°, 270°, and 180° in
  upper-left, upper-right, lower-right, and lower-left order
- **AND** each indicator center MUST lie on the corresponding locked centerline
  outside the socket envelope, with the upper-left and lower-right centers on
  the opposite side specified by the reference arrows
- **AND** each socket MUST accept the same unmirrored male seat in its existing
  insertion orientation
- **AND** turning that male clockwise 90° MUST make the two visible slots
  point to one another

#### Scenario: Indicators do not change Organizer Box interfaces

- **WHEN** a marked detachable Organizer Box is validated, meshed, or exported
- **THEN** it MUST remain one valid connected watertight solid
- **AND** its socket roof thickness, cavity floors, bounds, active stacking
  interfaces, and export identity MUST remain valid and deterministic
- **AND** built-in downward feet MUST remain absent

#### Scenario: Other bottom-interface modes remain unmarked

- **WHEN** the Organizer Box uses `cornerSeatMode=none` or
  `cornerSeatMode=integrated`
- **THEN** no detachable socket indicator recess MUST be generated
- **AND** the selected body-mode geometry MUST remain unchanged

### Requirement: Independent corner-seat and body modes

The Organizer Box parameter panel MUST place two independent radio groups at
the top of its adjustable controls, before cavity count, spacing, shape, or
dimension fields. The first group MUST match the OpenGrid Box corner-seat UI,
use the label `角座模式`, and expose `無角座`, `鎖定角座`, and `內建角座`,
normalized as `none`, `detachable-corner-seat`, and `integrated`. The second
group MUST use the label `盒體模式` and expose `普通模式` and `堆疊模式`,
normalized as `normal` and `stackable`.

The groups MUST be independently selectable and MUST represent all six
combinations. In normal mode, the box MUST retain the current flat exterior top
and MUST generate neither the box-to-box bottom stacking profile nor its top
rail; only the selected corner-seat geometry applies. In stackable mode, the
box MUST generate both the standard box-to-box bottom stacking profile and its
matching top rail, and MUST additionally apply the selected corner-seat mode.
`none` MUST add no seat geometry; `detachable-corner-seat` MUST add the shared
female sockets; and `integrated` MUST fuse the shared built-in feet spanning
Z=-3.8 mm to Z=0 with a 0.2 mm bottom perimeter chamfer. Seat geometry MUST NOT
replace or suppress stacking geometry.

#### Scenario: Controls appear first and match OpenGrid Box

- **WHEN** the Organizer Box parameter panel is rendered
- **THEN** `角座模式` MUST be the first adjustable control group
- **AND** `盒體模式` MUST immediately follow it
- **AND** their corner-seat labels and selection behavior MUST match the
  OpenGrid Box UI
- **AND** cavity count and all remaining controls MUST follow both groups

#### Scenario: Normal mode preserves the current non-stacking body

- **WHEN** `boxMode=normal` is selected with any corner-seat mode
- **THEN** the exterior top MUST remain flat around the cavity openings
- **AND** no bottom stacking profile or top stacking rail MUST be generated
- **AND** the selected corner-seat geometry alone MUST determine the locating
  interface

#### Scenario: Body and seat selections compose

- **WHEN** the user changes either radio group
- **THEN** the other group's selection MUST remain unchanged
- **AND** the canonical snapshot MUST contain exactly one `boxMode` and one
  `cornerSeatMode`
- **AND** each of the six combinations MUST validate and generate as one
  connected watertight solid for otherwise valid parameters

### Requirement: Stackable top rail and Z clearance

When `boxMode=stackable`, the Organizer Box MUST preserve the existing OpenGrid
Box bottom stacking profile and add the exact matching stepped top stacking
rail around the outer perimeter. The fixed rail profile MUST retain the
OpenGrid Box's 0.1 mm outer inset, 2 mm nominal rail width, 7.55 mm total
height, and its 1.75 mm inner chamfer, 1.2 mm inner vertical, 0.8 mm middle
chamfer, 1.8 mm outer vertical, and 2 mm outer chamfer sequence. The rail MUST
remain a connected part of the one Organizer Box solid and MUST mate with a
standard OpenGrid Box bottom interface of the same footprint.

`stackingClearanceHeight` MUST directly equal the vertical distance from the
Organizer Box cavity-opening plane to the nominal Z=0 bottom datum of the box
stacked above. The fixed rail's mating datum is 3.20 mm above its base
(1.75 mm inner chamfer + 1.2 mm inner vertical + 0.25 mm stacking clearance),
so the system MUST place a straight perimeter riser of
`stackingClearanceHeight - 3.20 mm` below the unchanged rail. The user-facing
control MUST be labeled `堆疊淨空（Z）`, MUST appear only in stackable mode,
and MUST have a 3.5 mm minimum/default on the 0.5 mm input grid. Its value MUST
remain canonical when normal mode is selected so toggling modes preserves the
last accepted setting, but it MUST NOT affect normal-mode geometry or export
identity while inactive.

The cavity-opening perimeter MUST remain horizontally clear of the riser and
rail. The Organizer Box's existing 7 mm cavity boundary and the standard
rail's maximum 2.95 mm inward reach provide at least 4.05 mm nominal horizontal
separation; validation MUST reject any future parameter combination that fails
this separation. Integrated feet or detachable sockets occupy their protected
corner interface locations below the upper box datum and MUST NOT be counted as
part of the requested vertical clearance, while collision checks MUST still
prevent them from intersecting storage cavities or stacking features.

#### Scenario: Minimum Z preserves the standard stacking structure

- **WHEN** a user selects stackable mode with
  `stackingClearanceHeight=3.5`
- **THEN** the fixed rail MUST sit on a 0.3 mm straight perimeter riser
- **AND** the upper box's nominal bottom datum MUST be 3.5 mm above the cavity
  opening plane within geometry tolerance
- **AND** no rail segment MUST be truncated, lowered into a cavity, or changed
  from the standard OpenGrid Box profile

#### Scenario: Z below the input-safe minimum is rejected

- **WHEN** `stackingClearanceHeight` is less than 3.5 mm or not aligned to a
  0.5 mm increment
- **THEN** validation MUST report a field-specific
  `stackingClearanceHeight` error
- **AND** no generation, persistence replacement, or export MUST occur

#### Scenario: Increased Z raises only the top stacking structure

- **WHEN** the user increases `stackingClearanceHeight` by 0.5 mm in stackable
  mode
- **THEN** the rail and upper box seating datum MUST rise by exactly 0.5 mm
- **AND** the standard rail cross-section, bottom stacking interface, selected
  corner-seat geometry, cavity geometry, and cavity-opening plane MUST remain
  unchanged

#### Scenario: Stackable box mates above the Organizer Box

- **WHEN** a standard OpenGrid Box with a matching footprint is placed on a
  stackable Organizer Box
- **THEN** its bottom stacking profile MUST seat on the Organizer Box top rail
  with the existing 0.25 mm stacking clearance
- **AND** its nominal bottom datum MUST be exactly the requested
  `stackingClearanceHeight` above the Organizer Box cavity-opening plane within
  geometry tolerance
