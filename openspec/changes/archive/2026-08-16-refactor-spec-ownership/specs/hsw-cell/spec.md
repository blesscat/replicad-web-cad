## ADDED Requirements

### Requirement: HSW component catalog and route

The runtime-validated component catalog MUST expose an independent `hsw-cell` definition with stable model id, display metadata, rows/columns parameter schema, default parameters `{ rows: 1, columns: 1 }`, bounds metadata, and export filename metadata. The model-specific route `/cad/hsw-cell` MUST bind only to this definition, and the CAD workspace MUST remain route-locked without an in-place model selector.

#### Scenario: HSW route starts the correct component

- **WHEN** a user opens `/cad/hsw-cell` and the CAD runtime is available
- **THEN** the workspace MUST initialize with `modelId=hsw-cell`
- **AND** generation 1 MUST use valid saved HSW rows and columns when available, otherwise the HSW definition's default rows and columns
- **AND** the Worker MUST route the request to the HSW component-local builder

#### Scenario: HSW workspace shows only HSW controls

- **WHEN** a user views the `/cad/hsw-cell` workspace
- **THEN** the UI MUST identify the HSW component
- **AND** it MUST show rows and columns controls for the HSW grid
- **AND** it MUST NOT show box dimensions or a model selector

### Requirement: HSW slider controls and contract validation

The HSW workspace MUST expose `rows` and `columns` as range controls with minimum 1, maximum 20, and step 1. Normal UI interaction MUST use these sliders rather than free-form text input, so the workspace does not need a separate decimal or empty-string input path. Before sending `model.generate`, the main thread MUST still validate the resulting snapshot against the HSW contract; non-finite, out-of-range, mismatched, or programmatically malformed snapshots MUST be rejected without rounding, must advance generation/invalidation semantics, and must not start HSW CAD geometry. A valid HSW snapshot MUST use the existing settled-input debounce behavior.

#### Scenario: Valid HSW parameter change

- **WHEN** a user changes HSW rows or columns to a legal integer and the input settles
- **THEN** the workspace MUST send a newer `model.generate` with `modelId=hsw-cell`
- **AND** the resulting committed bounds MUST match the HSW layout contract within tolerance

#### Scenario: Invalid HSW snapshot is rejected at the contract boundary

- **WHEN** the workspace receives a zero, negative, non-finite, out-of-range, or mismatched HSW snapshot from any source
- **THEN** the workspace MUST show a component-specific validation error
- **AND** it MUST send `model.invalidate` rather than `model.generate`
- **AND** export MUST remain disabled while the input is invalid or stale

### Requirement: HSW Worker preview and revision contract

The Worker MUST return HSW candidate and committed model events with `modelId=hsw-cell`, the validated rows/columns parameters, non-empty mesh, and bounds matching the HSW component contract. The main thread MUST keep the existing candidate commit, stale preview, model revision, and Worker ownership lifecycle for HSW exactly as for other catalog components.

#### Scenario: HSW candidate becomes ready

- **WHEN** a valid HSW generation completes in the Worker
- **THEN** the Worker MUST emit a candidate containing HSW parameters, mesh, and bounds
- **AND** the main thread MUST validate and commit only the latest candidate
- **AND** the viewport MUST display the committed HSW geometry and dimension annotations

### Requirement: HSW STEP metadata

The HSW catalog definition MUST provide the deterministic STEP filename `hsw-cell-{columns}x{rows}.step`. STEP generation MUST use the selected committed HSW B-Rep revision in the Worker and MUST NOT reconstruct the file from the viewport mesh.

#### Scenario: HSW STEP export

- **WHEN** a ready `hsw-cell` revision with `rows=2` and `columns=2` is exported
- **THEN** the request MUST be correlated to that HSW model revision and Worker epoch
- **AND** the suggested filename MUST be `hsw-cell-2x2.step`
- **AND** the downloaded bytes MUST be non-empty exact STEP output from the committed HSW B-Rep
