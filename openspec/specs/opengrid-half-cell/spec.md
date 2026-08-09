## Purpose

定義 OpenGrid 底板與 Snap 半格幾何共用的方向、尺寸、連接介面、外框支撐與最終特徵配置契約。

## Requirements

### Requirement: Shared half-cell axis contract

OpenGrid board and OpenGrid Snap normalized snapshots MUST use the same typed axis fields: `halfCellX` MUST be `none`, `left`, or `right`, and `halfCellY` MUST be `none`, `top`, or `bottom`. `none` MUST mean that the axis has no half-cell. The snapshot MUST NOT use `allowHalfCell`, `halfCellMode`, or an independent diagonal value. Left/right and top/bottom MUST be mutually exclusive by construction of their respective enum fields.

#### Scenario: Full-cell snapshot

- **WHEN** a valid OpenGrid or Snap snapshot has `halfCellX=none` and `halfCellY=none`
- **THEN** the snapshot MUST represent the existing full-cell behavior
- **AND** no half-cell geometry or half-cell offset MAY be generated

#### Scenario: Single-axis snapshot

- **WHEN** a valid snapshot has `halfCellX=left` or `right` and `halfCellY=none`
- **THEN** it MUST represent one X-axis half-cell
- **AND** it MUST NOT require a separate half-cell-enabled boolean

#### Scenario: Dual-axis snapshot

- **WHEN** a valid snapshot has a non-`none` `halfCellX` and a non-`none` `halfCellY`
- **THEN** it MUST represent one X-axis and one Y-axis half-cell
- **AND** the combined state MUST be derived from those two fields rather than a diagonal enum

#### Scenario: Invalid half-cell fields

- **WHEN** a snapshot contains an unknown X/Y direction, both opposing directions in one axis, `allowHalfCell`, or a diagonal-only field
- **THEN** runtime validation MUST reject the snapshot before native CAD work
- **AND** the validation issue MUST identify the half-cell contract mismatch

### Requirement: OpenGrid half-cell dimensions and orientation

The OpenGrid board MUST retain a 28 mm full-cell pitch and add exactly 14 mm on each axis whose half-cell field is not `none`. Its derived dimensions MUST be `columns × 28 + 14` for a selected X half-cell and `rows × 28 + 14` for a selected Y half-cell. The final board MUST remain centered on X/Y with minimum Z=0. `left` MUST occupy the negative-X outer side, `right` the positive-X outer side, `top` the positive-Y outer side, and `bottom` the negative-Y outer side.

#### Scenario: X-axis half-cell size

- **WHEN** a board has `columns=3`, `rows=2`, `halfCellX=right`, and `halfCellY=none`
- **THEN** its derived width MUST be 98 mm
- **AND** its derived depth MUST remain 56 mm
- **AND** the half-cell boundary MUST be on the positive-X side

#### Scenario: Y-axis half-cell size

- **WHEN** a board has `columns=2`, `rows=3`, `halfCellX=none`, and `halfCellY=top`
- **THEN** its derived width MUST remain 56 mm
- **AND** its derived depth MUST be 98 mm
- **AND** the half-cell boundary MUST be on the positive-Y side

#### Scenario: Dual-axis centered bounds

- **WHEN** a board has both half-cell fields selected
- **THEN** both axis dimensions MUST include one 14 mm extension
- **AND** the final X/Y bounds MUST be symmetric around the world origin within the existing bounds tolerance
- **AND** the board base MUST remain at Z=0

### Requirement: Full-cell profile remains the base for half-cell geometry

A half-cell OpenGrid board MUST use the existing official OpenGrid profile for every full-cell region and MUST preserve the full-cell pitch, capture/interface profile, optional feature coordinate system, and selected variant thickness. The half-cell extension MUST be produced as an explicit boundary/interface geometry operation; the implementation MUST NOT scale the complete board to achieve a target dimension.

#### Scenario: Half-cell profile compatibility

- **WHEN** a valid Full, Lite, or Heavy board is generated with one or two half-cell axes
- **THEN** its complete-cell probes MUST match the corresponding no-half board profile
- **AND** its half-cell edge MUST expose the selected side and a valid OpenGrid-compatible interface
- **AND** its envelope MUST include only the requested 14 mm axis extensions

#### Scenario: Profile failure is rejected

- **WHEN** a half-cell candidate has the requested envelope but loses the full-cell capture/rail profile or has an invalid half boundary
- **THEN** the quality gate MUST reject the candidate
- **AND** the candidate MUST NOT become the committed model

### Requirement: Half-cell boundary feature placement

OpenGrid generated feature coordinates MUST be derived from the final centered
board envelope after its selected half-cell extensions are included. Connector
locations MUST use the final outer edge for a selected outer side and MUST
include newly eligible half-cell boundary seams on the other selected sides.
Generated screw modes MUST include the screw centers introduced by the selected
half-cell boundaries. Explicit `custom` screw positions MUST remain unchanged
and MUST NOT receive implicit boundary positions. Existing explicit
`screwCenter` and `screwEvery` modifiers remain effective when selected; they
are not implicit half-cell positions.

All connector and screw cutters MUST be applied at the final board level after
the complete-cell and half-cell geometry has been fused. Screw cutters MUST be
the final OpenGrid feature operation so a hole that crosses a complete-cell /
half-cell interface is calculated against the complete resulting solid.

#### Scenario: Half-cell outer connectors

- **WHEN** a board selects one or two half-cell axes and connector holes are enabled
- **THEN** connector holes on the selected outer sides MUST be located on the final board boundary
- **AND** connector seams created by the half-cell boundary MUST be included in the generated locations

#### Scenario: Half-cell generated screw centers

- **WHEN** a non-custom screw mode is enabled on a board with a selected half-cell axis
- **THEN** screw centers on the new half-cell boundary MUST be included in the effective generated centers
- **AND** the cutters MUST remove those holes from the final half-cell geometry

#### Scenario: Custom screw positions remain explicit

- **WHEN** `screwMode=custom` is selected with a half-cell axis
- **THEN** the user-provided custom screw positions and any explicitly selected screw modifiers MAY be generated
- **AND** no implicit half-cell boundary screw centers MAY be added

### Requirement: Snap host pitch compatibility

The shared half-cell contract MUST define the Snap host pitch as 28 mm on an axis whose direction is `none` and 14 mm on an axis whose direction is selected. A generated Snap MUST fit inside the corresponding host pitch with the existing clearance policy. Its local bounds MUST remain centered on X/Y, and its direction fields MUST use the same world-axis mapping as the OpenGrid board.

#### Scenario: Single-axis Snap host fit

- **WHEN** a Snap selects `halfCellX=left` and `halfCellY=none`
- **THEN** its final X envelope MUST fit within the 14 mm X host pitch
- **AND** its final Y envelope MUST fit within the 28 mm Y host pitch
- **AND** its left-side interface orientation MUST match the OpenGrid left half-cell contract

#### Scenario: Dual-axis Snap host fit

- **WHEN** a Snap selects non-`none` directions on both axes
- **THEN** its final X and Y envelopes MUST each fit within a 14 mm host pitch
- **AND** it MUST remain a valid non-empty B-Rep with a usable central embedding interface
