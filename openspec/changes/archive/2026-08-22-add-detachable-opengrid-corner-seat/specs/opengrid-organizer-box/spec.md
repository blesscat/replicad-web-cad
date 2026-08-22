## ADDED Requirements

### Requirement: Integrated detachable corner-seat sockets

When `bottomInterfaceMode=detachable-corner-seat`, the Organizer Box MUST form
four keyed female corner-seat sockets directly in the box body at the existing
four-corner locating positions. Each socket MUST use the shared detachable-seat
female geometry with a nominal Ø7 mm by 1.75 mm material envelope and its two
retaining tabs. The socket holder MUST remain part of the one exported box
solid and MUST NOT be emitted as a separate printable part.

Viewed from the box bottom, the sockets MUST use the deterministic corner
rotations upper-left 0°, upper-right 90°, lower-right 180°, and lower-left 270°.
The mode MUST preserve at least 0.5 mm of solid roof between each 1.75 mm-deep
socket and the nearest storage cavity, MUST NOT generate built-in downward
feet, and MUST NOT generate the box-to-box stacking guide.

#### Scenario: Detachable sockets are part of the box

- **WHEN** a valid Organizer Box snapshot selects `detachable-corner-seat`
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

- **WHEN** the requested bottom thickness would leave less than 0.5 mm of
  material above a 1.75 mm-deep detachable socket
- **THEN** Organizer Box validation MUST return a diagnosable bottom-interface
  or bottom-thickness error
- **AND** the invalid snapshot MUST NOT replace the last valid revision or
  enable export

#### Scenario: Detachable mode excludes existing interfaces

- **WHEN** the user selects `detachable-corner-seat`
- **THEN** the generated underside MUST contain neither the four existing
  downward built-in feet nor the box-to-box stacking guide
- **AND** the box lower Z bound MUST remain at its body bottom datum

## MODIFIED Requirements

### Requirement: Organizer-box parameters and linked spacing

The canonical organizer-box snapshot MUST contain typed
`holeCountX`, `holeCountY`, `holeSpacingMode`, `holeSpacingX`, `holeSpacingY`,
`holeShape`, `holeDiameter`, `holeDepth`, `bottomThickness`, and
`bottomInterfaceMode` fields. `holeSpacingMode` MUST be either `linked` or
`independent`; `holeShape` MUST be one of `circle`, `triangle`, `square`,
`pentagon`, or `hexagon`; and `bottomInterfaceMode` MUST be exactly one of
`corner-seat`, `detachable-corner-seat`, or `stackable`.

Hole counts MUST be positive integers. All dimensional values MUST be finite
positive millimetres, and the bottom thickness MUST default to 2 mm. The
component MUST reject any snapshot whose derived footprint exceeds the existing
OpenGrid 500 mm workspace limit, whose cavities cannot fit with the required
material boundaries, whose detachable sockets would leave less than 0.5 mm of
roof material, or whose selected shape/depth combination is geometrically
invalid. In linked spacing mode, the canonical X and Y spacing values MUST be
equal; in independent mode they MAY differ.

#### Scenario: Default organizer-box snapshot

- **WHEN** the organizer-box route has no valid persisted parameters
- **THEN** it MUST select a circle cavity shape
- **AND** it MUST select linked X/Y spacing
- **AND** it MUST use a 2 mm bottom thickness
- **AND** it MUST select exactly one bottom interface mode

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

#### Scenario: Invalid organizer-box input

- **WHEN** a snapshot contains a non-positive count, non-finite or invalid
  dimension, unsupported enum value, overlapping layout, insufficient boundary
  or detachable-socket roof material, or a footprint above 500 mm
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
requested depth, and leave the requested bottom thickness below each cavity
floor. The body between cavities and all side walls MUST remain solid. A
selected fixed bottom interface MAY shape the underside within its specified
interface envelope, but it MUST NOT reach a storage cavity; the component MUST
NOT expose side-opening controls or generate side openings.

#### Scenario: Circular cavity matrix

- **WHEN** a valid snapshot selects `circle` with X/Y counts, diameter, depth,
  and spacing
- **THEN** the result MUST contain exactly the requested number of circular
  blind cavities
- **AND** adjacent cavity boundaries MUST be separated by the requested X/Y
  edge-to-edge spacing within geometry tolerance
- **AND** every cavity floor MUST remain the requested bottom thickness above
  the body bottom datum

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
- **AND** outside a selected interface envelope the remaining solid bottom MUST
  remain at least the requested thickness
- **AND** a detachable socket MUST retain at least 0.5 mm of solid roof before
  the cavity floor
- **AND** the overall Z extent MUST be derived from the cavity depth, bottom
  thickness, and selected fixed bottom interface rather than an unrelated
  manually entered height

### Requirement: Mutually exclusive bottom interfaces

The organizer-box panel MUST expose exactly one radio group with exactly three
options: `四角固定座`, `可拆式角座`, and `堆疊結構`. The normalized
`bottomInterfaceMode` MUST contain exactly one corresponding value.

In `corner-seat` mode, the result MUST preserve the existing Grid Box fixed
four-corner locating-seat positions and use the existing `integrated` built-in
foot geometry, including the existing de-duplication behavior for small
footprints. It MUST fuse four downward solid feet from Z=-3 mm to Z=0 mm, MUST
NOT generate insertable socket holes, and MUST NOT generate the full box-to-box
stacking guide. In `detachable-corner-seat` mode, the result MUST form the
shared keyed female socket geometry directly in the box body, MUST NOT fuse a
male seat or separate holder, and MUST NOT generate the full stacking guide. In
`stackable` mode, the result MUST preserve the existing normal box-to-box
bottom stacking geometry and MUST NOT generate either kind of four-corner
seat. The three interface modes MUST NOT be combined.

#### Scenario: Four-corner interface selection

- **WHEN** the user selects `四角固定座`
- **THEN** exactly that radio option MUST be selected
- **AND** the generated result MUST contain four downward built-in locating feet
- **AND** the generated result MUST NOT require a separate foot inserted from below
- **AND** both the detachable sockets and full stacking guide MUST be absent

#### Scenario: Detachable corner-seat selection

- **WHEN** the user selects `可拆式角座`
- **THEN** exactly that radio option MUST be selected
- **AND** the generated result MUST contain the four integrated female sockets
- **AND** the downward built-in feet and full stacking guide MUST be absent

#### Scenario: Stacking interface selection

- **WHEN** the user selects `堆疊結構`
- **THEN** exactly that radio option MUST be selected
- **AND** the generated result MUST contain the normal box-to-box stacking
  interface
- **AND** both four-corner fixed and detachable interfaces MUST be absent

#### Scenario: Interface modes remain exclusive

- **WHEN** a user switches between bottom-interface radio options
- **THEN** the canonical snapshot MUST contain only the newly selected mode
- **AND** the preview bounds and generated underside MUST update to that mode
- **AND** no combined mode or legacy boolean MUST be emitted
