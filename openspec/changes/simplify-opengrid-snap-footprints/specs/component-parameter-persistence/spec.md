## MODIFIED Requirements

### Requirement: OpenGrid Snap parameters are persisted independently

The versioned browser persistence MUST store valid Snap parameters under the stable `opengrid-snap` model id. The entry MUST contain only typed `variant`, `profile`, `offset`, `footprint`, `fourCornerLocatingHoles`, and `centerRemoverHole` values accepted by the current Snap validator, and it MUST remain independent from the existing `opengrid` board entry.

#### Scenario: Restore saved Snap parameters

- **GIVEN** browser persistence contains a valid `opengrid-snap` entry with a profile, footprint, offset, and optional-hole selections
- **WHEN** the user opens `/cad/opengrid-snap`
- **THEN** the controls MUST display the saved typed profile, variant, shared total offset, Full/1/2/1/4 footprint, and both feature selections
- **AND** the first generation MUST use those typed values

#### Scenario: Persist a valid Snap update

- **GIVEN** a Snap parameter snapshot with valid variant, profile, offset, footprint, and optional-hole booleans passes validation
- **WHEN** the workspace accepts the update
- **THEN** persistence MUST update only the `opengrid-snap` entry
- **AND** the stored values MUST be typed values rather than raw UI strings
- **AND** no `halfCellX` or `halfCellY` field MAY be written for the Snap entry

#### Scenario: Invalid Snap input does not overwrite persistence

- **GIVEN** a previously accepted `opengrid-snap` entry exists in persistence
- **WHEN** the user enters an invalid or incomplete variant, profile, offset, footprint, or optional-hole value
- **THEN** the previous accepted entry MUST remain unchanged
- **AND** the invalid value MUST NOT be sent to the Worker as `model.generate`

### Requirement: Invalid or legacy Snap persistence falls back safely

The persistence reader MUST reject malformed Snap entries, entries with board OpenGrid fields, entries with unsupported variants, profiles, offsets, footprints, directions, or non-boolean optional-hole fields. A legacy exact Snap entry containing the prior `variant`, `offset`, `halfCellX`, and `halfCellY` fields MAY be normalized by adding the current default profile and optional-hole fields and mapping axis cardinality to `footprint=full`, `half`, or `quarter`. A legacy entry without half-cell fields MAY normalize to `footprint=full`. Any entry that cannot be normalized safely MUST fall back to the Snap definition defaults without affecting the existing `opengrid` board entry or other model entries.

#### Scenario: Legacy full Snap entry normalizes to full footprint

- **GIVEN** persistence contains a legacy valid `opengrid-snap` entry without profile or optional-hole fields and with `halfCellX=none`, `halfCellY=none`
- **WHEN** the user opens `/cad/opengrid-snap`
- **THEN** the reader MUST use `profile=Standard`, `fourCornerLocatingHoles=false`, `centerRemoverHole=false`, and `footprint=full`
- **AND** it MUST NOT copy any fields from the `opengrid` board entry

#### Scenario: Legacy single-axis entry normalizes to half footprint

- **GIVEN** persistence contains a legacy valid Snap entry with exactly one non-`none` half-cell axis
- **WHEN** the Snap workspace initializes
- **THEN** the reader MUST use `footprint=half`
- **AND** the generated Snap MUST use the canonical left orientation rather than preserving a right/top/bottom UI direction

#### Scenario: Legacy dual-axis entry normalizes to quarter footprint

- **GIVEN** persistence contains a legacy valid Snap entry with both half-cell axes non-`none`
- **WHEN** the Snap workspace initializes
- **THEN** the reader MUST use `footprint=quarter`
- **AND** the generated Snap MUST use the canonical left-top orientation

#### Scenario: Legacy entry without half-cell fields uses full footprint

- **GIVEN** persistence contains a legacy valid Snap entry with variant and offset but no half-cell fields
- **WHEN** the user opens `/cad/opengrid-snap`
- **THEN** the reader MUST use `footprint=full`
- **AND** it MUST not infer a footprint or merge fields from the `opengrid` board entry

#### Scenario: Malformed new or legacy Snap entry falls back

- **GIVEN** the stored `opengrid-snap` entry contains an invalid profile, unsupported footprint, invalid direction, non-boolean optional-hole field, board field, or unsupported extra field
- **WHEN** the Snap workspace initializes
- **THEN** it MUST use the Snap definition defaults
- **AND** initialization MUST continue without a CAD failure
