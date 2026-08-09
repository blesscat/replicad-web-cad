## MODIFIED Requirements

### Requirement: OpenGrid Snap workspace controls

The `/cad/opengrid-snap` workspace MUST expose Full/Lite variant control, one shared `offset` range slider, an X half-cell direction control with `none`／`left`／`right`, and a Y half-cell direction control with `none`／`top`／`bottom`. The offset slider MUST cover `0` through `1 mm` in `0.05 mm` steps, and its label MUST explain that the value is the shared total outer width/depth increment. Each axis direction control MUST allow exactly one value, and the panel MUST NOT expose `allowHalfCell`, a separate half-cell checkbox, or diagonal-only options. The panel MUST display derived outer width, depth, and variant height.

#### Scenario: Configure Full Snap dimensions

- **WHEN** a user selects Full, sets `offset=0.2`, leaves both half-cell directions at `none`, and settles the input
- **THEN** the pending typed snapshot MUST contain exactly `variant=Full`, `offset=0.2`, `halfCellX=none`, and `halfCellY=none`
- **AND** the panel MUST display the resulting equal total outer width/depth increments
- **AND** the panel MUST not display board rows, columns, screws, connectors, or chamfers

#### Scenario: Configure single-axis Snap half-cell

- **WHEN** a user selects Lite, chooses `halfCellX=left`, and leaves `halfCellY=none`
- **THEN** the pending typed snapshot MUST contain the selected X direction and no Y half-cell
- **AND** the derived X envelope MUST be shown as a half-cell host dimension
- **AND** the panel MUST not require an additional half-cell-enabled boolean

#### Scenario: Configure dual-axis Snap half-cell

- **WHEN** a user chooses `halfCellX=right` and `halfCellY=top`
- **THEN** the pending typed snapshot MUST represent a dual-axis half-cell
- **AND** the panel MUST derive that state from the two axis controls
- **AND** it MUST not show a separate right-top or other diagonal Snap option

#### Scenario: Invalid Snap control

- **WHEN** a Snap snapshot contains a non-finite, non-step, or out-of-range offset or an invalid half-cell direction
- **THEN** the corresponding field MUST show a diagnosable validation error
- **AND** the workspace MUST send `model.invalidate` rather than `model.generate`
- **AND** STEP/STL export MUST remain disabled for the invalid or stale generation

### Requirement: OpenGrid half-cell workspace controls

The `/cad/opengrid` workspace MUST expose the existing OpenGrid board controls together with an X half-cell direction control containing `none`／`left`／`right` and a Y half-cell direction control containing `none`／`top`／`bottom`. The grid-count controls MUST be ordered X before Y. With no half-cell on an axis, its slider MUST use whole-cell values; when that axis has a selected half-cell direction, its displayed total count MUST use `0.5` increments (`1.5`, `2.5`, ...), retain at least one complete cell, and extend the maximum by `0.5`. The normalized snapshot MAY continue to store the complete-cell count as an integer plus the typed direction field. The panel MUST display derived width, depth, and thickness using the selected directions. It MUST NOT expose an `allowHalfCell` checkbox, a separate single/dual mode, or independent diagonal controls.

#### Scenario: Select an X half-cell

- **WHEN** a user chooses `halfCellX=right` and leaves `halfCellY=none`
- **THEN** the pending OpenGrid snapshot MUST include the right X direction
- **AND** the displayed width MUST increase by exactly 14 mm over the same rows/columns without half-cell
- **AND** the displayed depth MUST remain unchanged

#### Scenario: Half-cell grid count display

- **WHEN** a user chooses `halfCellX=left` while the normalized OpenGrid snapshot has `columns=2`
- **THEN** the X grid control MUST appear before the Y grid control
- **AND** the X control MUST display `2.5` total cells and accept the next `0.5` value
- **AND** the normalized snapshot MUST retain `columns=2` with `halfCellX=left`

#### Scenario: Half-cell corner screw placement

- **WHEN** a user selects `rows=5`, `columns=3`, `halfCellX=left`, `halfCellY=none`, and `screwMode=corners`
- **THEN** the generated screw centers MUST include the half-cell/full-cell seam at `x=-35 mm`
- **AND** the generated screw centers MUST include the far full-cell corner row at `x=21 mm`
- **AND** the generated screw centers MUST be `[-35,-42]`, `[-35,42]`, `[21,-42]`, and `[21,42]`
- **AND** the middle full-cell seam at `x=-7 mm` MUST NOT receive screws

#### Scenario: Select a Y half-cell

- **WHEN** a user chooses `halfCellY=top` and leaves `halfCellX=none`
- **THEN** the pending OpenGrid snapshot MUST include the top Y direction
- **AND** the displayed depth MUST increase by exactly 14 mm
- **AND** the displayed width MUST remain unchanged

#### Scenario: Select both axes

- **WHEN** a user chooses one X direction and one Y direction
- **THEN** the UI MUST describe the pending state as a dual-axis half-cell through the two selected fields
- **AND** both displayed dimensions MUST include their respective 14 mm extension
- **AND** left/right and top/bottom choices MUST remain mutually exclusive

#### Scenario: OpenGrid invalid direction

- **WHEN** a programmatic or persisted OpenGrid value contains an invalid direction or `allowHalfCell`
- **THEN** the panel MUST show a field-specific validation error
- **AND** it MUST send `model.invalidate` rather than `model.generate`
- **AND** the previous accepted preview MAY remain visible but MUST be marked stale
