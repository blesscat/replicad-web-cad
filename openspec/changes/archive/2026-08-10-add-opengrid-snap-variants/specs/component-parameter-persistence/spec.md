## MODIFIED Requirements

### Requirement: OpenGrid Snap parameters are persisted independently

The versioned browser persistence MUST store valid Snap parameters under the stable `opengrid-snap` model id. The entry MUST contain only typed `variant`, `profile`, `offset`, `halfCellX`, `halfCellY`, `fourCornerLocatingHoles`, and `centerRemoverHole` values accepted by the Snap validator, and it MUST remain independent from the existing `opengrid` board entry.

#### Scenario: Restore saved Snap parameters

- **GIVEN** browser persistence contains a valid `opengrid-snap` entry with a profile, half-cell directions, and optional-hole selections
- **WHEN** the user opens `/cad/opengrid-snap`
- **THEN** the controls MUST display the saved typed profile, variant, shared total offset, both axis directions, and both feature selections
- **AND** the first generation MUST use those typed values

#### Scenario: Persist a valid Snap update

- **GIVEN** a Snap parameter snapshot with valid variant, profile, offset, half-cell directions, and optional-hole booleans passes validation
- **WHEN** the workspace accepts the update
- **THEN** persistence MUST update only the `opengrid-snap` entry
- **AND** the stored values MUST be typed values rather than raw UI strings

#### Scenario: Invalid Snap input does not overwrite persistence

- **GIVEN** a previously accepted `opengrid-snap` entry exists in persistence
- **WHEN** the user enters an invalid or incomplete variant, profile, offset, half-cell direction, or optional-hole value
- **THEN** the previous accepted entry MUST remain unchanged
- **AND** the invalid value MUST NOT be sent to the Worker as `model.generate`

### Requirement: Invalid or legacy Snap persistence falls back safely

The persistence reader MUST reject malformed Snap entries, entries with board OpenGrid fields, entries containing `allowHalfCell`, `footprint`, or diagonal-only fields, and entries with unsupported variants, profiles, offsets, directions, or non-boolean optional-hole fields. A legacy exact Snap entry containing only the prior `variant`, `offset`, `halfCellX`, and `halfCellY` fields MAY be normalized by adding `profile=Standard`, `fourCornerLocatingHoles=false`, and `centerRemoverHole=false` before validation. A legacy entry missing the half-cell fields MAY also normalize both directions to `none`. Any entry that cannot be normalized safely MUST fall back to the Snap definition defaults without affecting the existing `opengrid` board entry or other model entries.

#### Scenario: Legacy full Snap entry normalizes to the new solid baseline

- **GIVEN** persistence contains a legacy valid `opengrid-snap` entry without profile or optional-hole fields
- **WHEN** the user opens `/cad/opengrid-snap`
- **THEN** the reader MUST use `profile=Standard`, `fourCornerLocatingHoles=false`, and `centerRemoverHole=false`
- **AND** it MUST preserve the legacy variant, offset, and valid half-cell directions

#### Scenario: Legacy entry without half-cell fields uses no-half defaults

- **GIVEN** persistence contains a legacy valid Snap entry with variant and offset but no half-cell fields
- **WHEN** the user opens `/cad/opengrid-snap`
- **THEN** the reader MUST use `halfCellX=none` and `halfCellY=none`
- **AND** it MUST not infer a direction or merge fields from the `opengrid` board entry

#### Scenario: Legacy board entry is not reused for Snap

- **GIVEN** persistence contains an `opengrid` board snapshot but no valid `opengrid-snap` snapshot
- **WHEN** the user opens `/cad/opengrid-snap`
- **THEN** the workspace MUST use the Snap defaults
- **AND** it MUST NOT merge board rows, screws, connectors, half-cell directions, or variant values into the Snap snapshot

#### Scenario: Malformed new Snap entry falls back

- **GIVEN** the stored `opengrid-snap` entry contains an invalid profile, non-boolean optional-hole field, `allowHalfCell`, or an unsupported extra field
- **WHEN** the Snap workspace initializes
- **THEN** it MUST use the Snap definition defaults
- **AND** initialization MUST continue without a CAD failure
