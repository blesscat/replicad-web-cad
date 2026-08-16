## ADDED Requirements

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
