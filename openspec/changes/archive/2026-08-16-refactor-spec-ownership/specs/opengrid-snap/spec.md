## ADDED Requirements

### Requirement: OpenGrid Snap workspace controls

The `/cad/opengrid-snap` workspace MUST expose the existing `Full`,
`Half`, and `Quarter` footprint choices together with the existing Full/Lite
variant and Standard/Directional profile controls. The normalized snapshot MUST
use `footprint=full|half|quarter` and MUST NOT expose `halfCellX`,
`halfCellY`, `allowHalfCell`, or direction-specific/diagonal controls. Full
MUST retain the shared X/Y offset and optional-hole controls. Half and Quarter
MUST disable those controls, reset them to inactive values, and use their
repository-owned fixed STEP assets.

#### Scenario: Configure a full Snap footprint

- **WHEN** a user selects Full, chooses a supported variant/profile, sets a valid offset, and settles the input
- **THEN** the pending typed snapshot MUST contain `footprint=full`
- **AND** the panel MUST keep the existing offset and optional-hole controls
- **AND** the workspace MUST use the normal generated Snap lifecycle

#### Scenario: Configure a fixed half or quarter footprint

- **WHEN** a user selects Half or Quarter
- **THEN** the pending typed snapshot MUST contain `footprint=half` or `footprint=quarter`
- **AND** the panel MUST disable the shared offset and optional-hole controls and show their inactive values
- **AND** the panel MUST explain that the fixed footprint asset is used

#### Scenario: Invalid Snap control

- **WHEN** a Snap snapshot contains an invalid footprint, forbidden half-cell direction field, non-finite offset, or unsupported optional-hole shape
- **THEN** the corresponding field MUST show a diagnosable validation error
- **AND** the workspace MUST send `model.invalidate` rather than `model.generate`
- **AND** STEP/STL export MUST remain disabled for the invalid or stale generation


### Requirement: OpenGrid Snap workspace lifecycle and preview

The Snap workspace MUST use the existing debounce, latest-wins, candidate
commit/discard, stale-preview, Worker recovery, fixed-asset, and route-locking
behavior. A committed Full preview MUST display the complete generated Snap
assembly and derived dimensions from the committed bounds. A committed Half or
Quarter preview MUST display the corresponding repository-owned fixed STEP asset
and MUST remain subject to the existing footprint warning and export rules.

#### Scenario: Initial Snap generation

- **WHEN** `/cad/opengrid-snap` receives `engine.ready`
- **THEN** the main thread MUST send generation 1 with the valid saved Snap snapshot or defaults
- **AND** a Full snapshot MUST return the generated `modelId=opengrid-snap` candidate
- **AND** a Half or Quarter snapshot MUST load its fixed repository-owned asset

#### Scenario: Latest Snap input wins

- **WHEN** a newer valid or invalid Snap snapshot supersedes a running generation
- **THEN** the older candidate MUST not commit or replace the newer revision
- **AND** the existing stale, invalid, and fixed-asset export rules MUST remain in effect

#### Scenario: Snap export uses the committed or fixed revision

- **WHEN** a Full Snap model is committed or a Half/Quarter fixed asset is selected and the user requests STEP or STL
- **THEN** the export request MUST use the committed generated revision or the selected fixed asset according to the existing footprint contract
- **AND** the downloaded model MUST not be reconstructed from an unrelated viewport mesh
