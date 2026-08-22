## MODIFIED Requirements

### Requirement: OpenGrid half-cell workspace controls

The `/cad/opengrid` workspace MUST expose the existing OpenGrid board controls
together with an X half-cell direction control containing `none`／`left`／`right`
and a Y half-cell direction control containing `none`／`top`／`bottom`. The
grid-count controls MUST be ordered X before Y. With no half-cell on an axis,
its slider MUST use whole-cell values; when that axis has a selected half-cell
direction, its displayed total count MUST use `0.5` increments (`1.5`, `2.5`,
...), retain at least one complete cell, and extend the maximum by `0.5`. The
normalized snapshot MAY continue to store the complete-cell count as an
integer plus the typed direction field. The panel MUST display nominal derived
width, depth, and thickness using the selected directions.

The persisted OpenGrid snapshot MUST include `targetFrameShape` with values
`none`, `chamfer`, or `fillet`, and `targetFrameSides` with independent boolean
`top`, `right`, `bottom`, and `left` fields. Existing snapshots missing these
fields MUST receive the square-frame default and all four enabled directions.
The checkbox controlling `fitToTarget` MUST be the first control in the
OpenGrid panel and MUST include a visible Beta label. When the checkbox is
disabled, the target-frame calculator and target-frame-only controls MUST be
hidden, while print planning and nominal board chamfer controls remain
available. When the checkbox is enabled, the target-size grid calculator,
`targetFrameShape` control labelled `外框角型`, and four independent frame-side
controls MUST be visible; print planning and nominal board chamfer controls
MUST be hidden, while connector and screw controls MUST remain available.
The target-frame calculator MUST retain target X/Y dimensions and the panel
MUST display the actual physical envelope: target dimensions on axes with a
selected frame side and nominal dimensions on axes with no selected frame
side. If the checkbox is enabled before a positive target is calculated, the
panel MUST allow the pending mode to remain at nominal dimensions until the
calculator is applied. When the checkbox is disabled, target values MUST NOT
change the generated envelope. The panel MUST NOT expose an `allowHalfCell`
checkbox, a separate single/dual mode, or independent diagonal controls.

#### Scenario: Select an X half-cell

- **WHEN** a user chooses `halfCellX=right` and leaves `halfCellY=none`
- **THEN** the pending OpenGrid snapshot MUST include the right X direction
- **AND** the displayed width MUST increase by exactly 14 mm over the same
  rows/columns without half-cell
- **AND** the displayed depth MUST remain unchanged

#### Scenario: Half-cell grid count display

- **WHEN** a user chooses `halfCellX=left` while the normalized OpenGrid
  snapshot has `columns=2`
- **THEN** the X grid control MUST appear before the Y grid control
- **AND** the X control MUST display `2.5` total cells and accept the next
  `0.5` value
- **AND** the normalized snapshot MUST retain `columns=2` with
  `halfCellX=left`

#### Scenario: Half-cell corner screw placement

- **WHEN** a user selects `rows=5`, `columns=3`, `halfCellX=left`,
  `halfCellY=none`, and `screwMode=corners`
- **THEN** the generated screw centers MUST include the half-cell/full-cell
  seam at `x=-35 mm`
- **AND** the generated screw centers MUST include the far full-cell corner
  row at `x=21 mm`
- **AND** the generated screw centers MUST be `[-35,-42]`, `[-35,42]`,
  `[21,-42]`, and `[21,42]`
- **AND** the middle full-cell seam at `x=-7 mm` MUST NOT receive screws

#### Scenario: Target frame checkbox

- **WHEN** a user views the `/cad/opengrid` parameter panel
- **THEN** the physical target-frame checkbox MUST be the first OpenGrid
  control and MUST include the Beta label
- **AND** the target-size calculator, outer-frame corner shape, and frame-side
  controls MUST be hidden until the checkbox is enabled
- **AND** print planning and nominal board chamfer controls MUST be visible
  only while the checkbox is disabled

#### Scenario: Enable target frame controls

- **WHEN** a user enables `fitToTarget`
- **THEN** the panel MUST show the target-size grid calculator
- **AND** the panel MUST show `外框角型` with `無`, `倒角`, and `圓角`
- **AND** the panel MUST show independent top, right, bottom, and left frame
  direction controls
- **AND** the panel MUST hide print planning and nominal board chamfer
  controls
- **AND** connector and screw controls MUST remain available

#### Scenario: Target frame checkbox with no calculated target

- **WHEN** a user enables `fitToTarget` before a positive target dimension has
  been calculated
- **THEN** the target calculator MUST be shown without blocking the checkbox
- **AND** the generated envelope MUST remain nominal until target dimensions
  are applied
- **AND** applying valid target dimensions MUST persist them with
  `fitToTarget=true`

#### Scenario: Directional target-frame remainder

- **WHEN** a target-fitted board has a target larger than nominal on an axis
- **THEN** selecting both opposite frame directions MUST split the remainder
  equally
- **AND** selecting only one direction MUST place the full remainder on that
  side
- **AND** selecting neither direction MUST leave that axis at its nominal
  dimension

#### Scenario: Connector remains on a side without a frame

- **WHEN** connector holes are enabled and a connector side is selected while
  its corresponding target-frame direction is disabled
- **THEN** the connector holes MUST remain visible on that nominal board side
- **AND** no connector holes MUST be added to the physical frame

#### Scenario: Select a Y half-cell

- **WHEN** a user chooses `halfCellY=top` and leaves `halfCellX=none`
- **THEN** the pending OpenGrid snapshot MUST include the top Y direction
- **AND** the displayed depth MUST increase by exactly 14 mm
- **AND** the displayed width MUST remain unchanged

#### Scenario: Select both axes

- **WHEN** a user chooses one X direction and one Y direction
- **THEN** the UI MUST describe the pending state as a dual-axis half-cell
  through the two selected fields
- **AND** both displayed dimensions MUST include their respective 14 mm
  extension
- **AND** left/right and top/bottom choices MUST remain mutually exclusive

#### Scenario: OpenGrid invalid direction

- **WHEN** a programmatic or persisted OpenGrid value contains an invalid
  direction or `allowHalfCell`
- **THEN** the panel MUST show a field-specific validation error
- **AND** it MUST send `model.invalidate` rather than `model.generate`
- **AND** the previous accepted preview MAY remain visible but MUST be marked
  stale

#### Scenario: OpenGrid invalid target

- **WHEN** a programmatic or persisted OpenGrid value contains an invalid target
  dimension or a target smaller than its nominal envelope
- **THEN** the panel MUST show a field-specific validation error
- **AND** it MUST send `model.invalidate` rather than `model.generate`
- **AND** the previous accepted preview MAY remain visible but MUST be marked
  stale
