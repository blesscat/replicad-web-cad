## MODIFIED Requirements

### Requirement: OpenGrid Snap parameters are persisted independently

The versioned browser persistence MUST store valid Snap parameters under the stable `opengrid-snap` model id. The entry MUST contain only typed `variant`, `offset`, `halfCellX`, and `halfCellY` values accepted by the Snap validator, and it MUST remain independent from the existing `opengrid` board entry.

#### Scenario: Restore saved Snap parameters

- **GIVEN** browser persistence contains a valid `opengrid-snap` entry with half-cell directions
- **WHEN** the user opens `/cad/opengrid-snap`
- **THEN** the controls MUST display the saved variant, shared total X/Y offset, and both axis directions
- **AND** the first generation MUST use those typed values

#### Scenario: Persist a valid Snap update

- **GIVEN** a Snap parameter snapshot with valid variant, offset, and half-cell directions passes validation
- **WHEN** the workspace accepts the update
- **THEN** persistence MUST update only the `opengrid-snap` entry
- **AND** the stored values MUST be typed values rather than raw input strings

#### Scenario: Invalid Snap input does not overwrite persistence

- **GIVEN** a previously accepted `opengrid-snap` entry exists in persistence
- **WHEN** the user enters an invalid or incomplete variant, offset, or half-cell direction
- **THEN** the previous accepted entry MUST remain unchanged
- **AND** the invalid value MUST NOT be sent to the Worker as `model.generate`

### Requirement: Invalid or legacy Snap persistence falls back safely

The persistence reader MUST reject malformed Snap entries, entries with board OpenGrid fields, entries containing `allowHalfCell` or diagonal-only fields, and entries with unsupported variants, offsets, or directions. A legacy exact Snap entry containing only the prior `variant` and `offset` fields MAY be normalized to `halfCellX=none` and `halfCellY=none` before validation. Any entry that cannot be normalized safely MUST fall back to the Snap definition defaults without affecting the existing `opengrid` board entry or other model entries.

#### Scenario: Legacy full Snap entry normalizes to no-half

- **GIVEN** persistence contains a legacy `opengrid-snap` entry with valid `variant` and `offset` but no half-cell fields
- **WHEN** the user opens `/cad/opengrid-snap`
- **THEN** the reader MUST use `halfCellX=none` and `halfCellY=none`
- **AND** it MUST not infer a direction or merge fields from the `opengrid` board entry

#### Scenario: Legacy board entry is not reused for Snap

- **GIVEN** persistence contains an `opengrid` board snapshot but no valid `opengrid-snap` snapshot
- **WHEN** the user opens `/cad/opengrid-snap`
- **THEN** the workspace MUST use the Snap defaults
- **AND** it MUST NOT merge board rows, screws, connectors, half-cell directions, or variant values into the Snap snapshot

#### Scenario: Malformed half-cell Snap entry falls back

- **GIVEN** the stored `opengrid-snap` entry contains `allowHalfCell`, an invalid direction, or incompatible extra fields
- **WHEN** the Snap workspace initializes
- **THEN** it MUST use the Snap definition defaults
- **AND** initialization MUST continue without a CAD failure

## ADDED Requirements

### Requirement: OpenGrid half-cell parameters are persisted with the board

The versioned browser persistence MUST store valid OpenGrid board half-cell directions as typed `halfCellX` and `halfCellY` fields under the stable `opengrid` model id. The entry MUST remain independent from `opengrid-snap`, and it MUST NOT persist a redundant `allowHalfCell` or a derived single/dual mode.

#### Scenario: Restore saved OpenGrid directions

- **GIVEN** browser persistence contains a valid `opengrid` snapshot with `halfCellX=left` and `halfCellY=bottom`
- **WHEN** the user opens `/cad/opengrid`
- **THEN** the board controls MUST display those two directions
- **AND** the first generation MUST use the typed directions with the saved board parameters

#### Scenario: Persist a valid OpenGrid direction update

- **GIVEN** an OpenGrid snapshot passes the current board and half-cell validators
- **WHEN** the workspace accepts the update
- **THEN** persistence MUST update only the `opengrid` entry
- **AND** the persisted half-cell values MUST be enum values rather than raw UI labels or a boolean

#### Scenario: Legacy OpenGrid snapshot uses no-half defaults

- **GIVEN** a legacy valid OpenGrid entry has no half-cell fields and has no unknown half-cell fields
- **WHEN** the OpenGrid workspace initializes
- **THEN** the reader MUST normalize it to `halfCellX=none` and `halfCellY=none` before validation
- **AND** it MUST preserve the other valid OpenGrid parameters

#### Scenario: Invalid OpenGrid half-cell persistence is isolated

- **GIVEN** an OpenGrid entry contains an invalid direction, `allowHalfCell`, or an unsupported half-cell field
- **WHEN** persistence is read
- **THEN** that OpenGrid entry MUST fall back to the OpenGrid definition defaults
- **AND** the `opengrid-snap` entry and all other model entries MUST remain unchanged

