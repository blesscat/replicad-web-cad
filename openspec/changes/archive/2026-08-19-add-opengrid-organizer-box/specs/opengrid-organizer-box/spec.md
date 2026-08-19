## Purpose

Provide an OpenGrid-compatible solid organizer box for storing batteries, tool
bits, and similar items in a configurable matrix of shaped, blind top cavities.

## ADDED Requirements

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

The canonical organizer-box snapshot MUST contain typed
`holeCountX`, `holeCountY`, `holeSpacingMode`, `holeSpacingX`, `holeSpacingY`,
`holeShape`, `holeDiameter`, `holeDepth`, `bottomThickness`, and
`bottomInterfaceMode` fields. `holeSpacingMode` MUST be either `linked` or
`independent`; `holeShape` MUST be one of `circle`, `triangle`, `square`,
`pentagon`, or `hexagon`; and `bottomInterfaceMode` MUST be either
`corner-seat` or `stackable`.

Hole counts MUST be positive integers. All dimensional values MUST be finite
positive millimetres, and the bottom thickness MUST default to 2 mm. The
component MUST reject any snapshot whose derived footprint exceeds the existing
OpenGrid 500 mm workspace limit, whose cavities cannot fit with the required
material boundaries, or whose selected shape/depth combination is geometrically
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
  material, or a footprint above 500 mm
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
requested depth, and leave the requested bottom thickness as continuous
material. The body between cavities and all side walls MUST remain solid; the
component MUST NOT expose side-opening controls or generate side openings.

#### Scenario: Circular cavity matrix

- **WHEN** a valid snapshot selects `circle` with X/Y counts, diameter, depth,
  and spacing
- **THEN** the result MUST contain exactly the requested number of circular
  blind cavities
- **AND** adjacent cavity boundaries MUST be separated by the requested X/Y
  edge-to-edge spacing within geometry tolerance
- **AND** every cavity MUST stop above the bottom surface by the requested
  bottom thickness

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
- **AND** the remaining solid bottom MUST remain at least the requested
  thickness
- **AND** the overall Z extent MUST be derived from the cavity depth, bottom
  thickness, and selected fixed bottom interface rather than an unrelated
  manually entered height

### Requirement: Derived OpenGrid footprint and fixed cavity orientation

The organizer-box X/Y footprint MUST be derived from the cavity count, selected
shape envelope, and edge-to-edge spacing. The derivation MUST choose the
smallest legal OpenGrid footprint that contains the centered cavity matrix while
preserving the fixed boundary clearance required by the selected bottom
interface. The resulting footprint MUST use the existing 28 mm OpenGrid pitch
and existing per-axis exterior clearance, and the derived grid counts MUST be
available to the UI as read-only calculated values.

All cavities MUST share one deterministic orientation relative to the world X/Y
axes. Orientation MUST NOT be independently configurable per cavity or per axis.

#### Scenario: Cavity layout determines grid occupancy

- **WHEN** the user changes either cavity count, cavity diameter, or linked/
  independent spacing
- **THEN** the derived X/Y grid occupancy and outer footprint MUST recalculate
- **AND** the cavity matrix MUST remain centered
- **AND** the selected bottom interface positions MUST remain on the derived
  footprint's fixed OpenGrid locations

#### Scenario: Layout does not fit

- **WHEN** the requested cavity matrix cannot fit inside the largest safe
  OpenGrid footprint or would collide with a fixed interface boundary
- **THEN** validation MUST reject the snapshot with a layout error
- **AND** no new Worker generation or export request MUST be sent

### Requirement: Mutually exclusive bottom interfaces

The organizer-box panel MUST expose exactly one radio group with exactly two
options: `四角固定座` and `堆疊結構`. The normalized
`bottomInterfaceMode` MUST contain exactly one corresponding value.

In `corner-seat` mode, the result MUST preserve the existing Grid Box fixed
four-corner locating-seat positions and geometry, including the existing
de-duplication behavior for small footprints, and MUST NOT generate the full
box-to-box stacking guide. In `stackable` mode, the result MUST preserve the
existing normal box-to-box bottom stacking geometry and MUST NOT generate the
four-corner locating seats. The two interface modes MUST NOT be combined.

#### Scenario: Four-corner interface selection

- **WHEN** the user selects `四角固定座`
- **THEN** exactly that radio option MUST be selected
- **AND** the generated result MUST contain the four-corner locating interface
- **AND** the full stacking guide MUST be absent

#### Scenario: Stacking interface selection

- **WHEN** the user selects `堆疊結構`
- **THEN** exactly that radio option MUST be selected
- **AND** the generated result MUST contain the normal box-to-box stacking
  interface
- **AND** the four-corner locating interface MUST be absent

#### Scenario: Interface modes remain exclusive

- **WHEN** a user switches from one bottom interface radio option to the other
- **THEN** the canonical snapshot MUST contain only the newly selected mode
- **AND** the preview bounds and generated underside MUST update to that mode
- **AND** no third combined mode or legacy boolean MUST be emitted

### Requirement: Preview, persistence, and exports

Every valid organizer-box snapshot MUST generate a non-empty watertight single
solid centered on X/Y with a valid bottom reference, remain previewable through
the existing Worker revision lifecycle, and support STEP and binary STL export.
The export filenames MUST identify the organizer-box model and include every
parameter that changes cavity geometry or bottom-interface geometry, including
shape, diameter, counts, spacing, depth, bottom thickness, and interface mode.

Valid organizer-box parameters MUST persist under the independent
`opengrid-organizer-box` model ID. Invalid or incomplete raw input MUST NOT
overwrite the last accepted persisted snapshot, and a malformed persisted entry
MUST fall back to organizer-box defaults without affecting other components.

#### Scenario: Valid result is previewable and exportable

- **WHEN** a valid organizer-box snapshot completes generation
- **THEN** the Worker MUST commit a non-empty single solid revision
- **AND** the viewport MUST display the selected cavity matrix and underside
  interface
- **AND** STEP and STL export MUST be enabled for that revision

#### Scenario: Parameter persistence is isolated

- **WHEN** a valid organizer-box parameter update is accepted
- **THEN** only the `opengrid-organizer-box` persistence entry MUST change
- **AND** navigating to another model MUST NOT inherit organizer-box values
