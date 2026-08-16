## ADDED Requirements

### Requirement: OpenGrid stackable-cylinder workspace integration

The CAD workspace MUST bind `/cad/opengrid-stackable-cylinder` exclusively to
`modelId=opengrid-stackable-cylinder`. The catalog entry MUST expose the
existing typed diameter, height, profile, and opening controls plus exactly one
visible locating-seat radio group with `無角座`, `角座孔`, and `內建角座`.
The visible panel MUST NOT expose `bottomPlateMode` as a selectable profile,
and MUST NOT expose individual center or outer-hole toggles. The Worker MUST
validate the canonical enum and route this model ID to the independent cylinder
builder without falling through to another model.

#### Scenario: Cylinder route initializes

- **WHEN** a user opens `/cad/opengrid-stackable-cylinder`
- **THEN** the workspace MUST initialize with
  `modelId=opengrid-stackable-cylinder`
- **AND** the first valid generation MUST use valid saved parameters or the
  defaults, including `bottomSeatMode='hole'` when no seat value exists

#### Scenario: Cylinder seat controls

- **WHEN** a user views the cylinder parameter panel
- **THEN** it MUST show exactly `無角座`, `角座孔`, and `內建角座` as mutually
  exclusive radio choices
- **AND** the existing selected profile descriptions MUST remain unchanged
- **AND** it MUST not show rectangular X/Y, box full-grid, or individual-hole
  controls

#### Scenario: Cylinder Worker dispatch is component-specific

- **WHEN** the Worker receives a cylinder generation request with a seat mode
- **THEN** it MUST validate the cylinder parameter shape and invoke the cylinder
  builder
- **AND** a mismatched or unsupported seat value MUST be rejected with a
  diagnosable validation error

### Requirement: Cylinder workspace lifecycle and export gates

The new cylinder route MUST use the existing debounce, latest-wins, candidate-ready, commit/discard, invalid-input, stale-preview, Worker recovery, preview mesh, STEP export, and STL export lifecycle. A failed or stale cylinder generation MUST NOT replace the latest committed revision or enable export.

#### Scenario: Valid cylinder update commits

- **WHEN** a valid diameter or height update settles after the existing input debounce
- **THEN** the workspace MUST request a newer cylinder generation
- **AND** only the latest valid candidate MUST be eligible for commit
- **AND** the committed bounds MUST match the typed parameters within tolerance

#### Scenario: Invalid or stale cylinder update

- **WHEN** a cylinder input is invalid or its candidate becomes stale because a newer generation exists
- **THEN** the workspace MUST invalidate or discard that snapshot according to the existing lifecycle
- **AND** the previous committed preview MAY remain visible as stale
- **AND** STEP/STL export MUST remain disabled for the invalid or stale snapshot
