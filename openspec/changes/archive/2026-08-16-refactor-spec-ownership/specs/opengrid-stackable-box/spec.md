## ADDED Requirements

### Requirement: OpenGrid stackable-box workspace integration

The CAD workspace MUST bind `/cad/opengrid-stackable-box` exclusively to
`modelId=opengrid-stackable-box`. The catalog entry MUST expose the existing
OpenGrid X/Y, height, profile, opening, and full-grid controls plus exactly one
visible locating-seat radio group with `無角座`, `角座孔`, and `內建角座`. The
panel MUST keep the existing thin-shell/stackable profile choices, MUST NOT
expose `basePlateMode` as a selectable profile, and MUST preserve the existing
latest-wins, preview, commit, STEP, and STL lifecycle. The Worker MUST validate
the canonical enum parameter and route this model ID to the independent
stackable-box builder.

#### Scenario: Stackable-box route initializes

- **WHEN** a user opens `/cad/opengrid-stackable-box`
- **THEN** the workspace MUST initialize with the stable stackable-box model ID
- **AND** the first valid generation MUST use valid saved parameters or the
  model defaults, including `cornerSeatMode='hole'` when no seat value exists

#### Scenario: Stackable-box seat controls

- **WHEN** a user views the stackable-box parameter panel
- **THEN** it MUST show exactly the three mutually exclusive seat labels
  `無角座`, `角座孔`, and `內建角座`
- **AND** the selected value MUST be reflected in the typed snapshot
- **AND** the existing full-bottom-hole grid control MUST remain independent

#### Scenario: Stackable-box route isolation

- **WHEN** a `model.generate` request carries
  `modelId=opengrid-stackable-box`
- **THEN** the Worker MUST validate the stackable-box parameter shape
- **AND** it MUST use the stackable-box builder boundary
- **AND** mismatched parameters MUST be rejected rather than resolved through
  another model

#### Scenario: Stackable-box exports retain lifecycle gates

- **WHEN** a seat-mode candidate is valid and committed
- **THEN** STEP and STL export MUST use the selected seat-mode metadata
- **AND** exports MUST remain disabled while the current snapshot is invalid,
  stale, generating, or failed geometry validation
