## MODIFIED Requirements

### Requirement: OpenGrid pillar workspace integration

The runtime-validated component catalog MUST register `opengrid-pillar` as an independent OpenGrid model definition and MUST route `/cad/opengrid-pillar` to it. The definition MUST expose exactly one required radio group with `standard` and `thin-shell` choices, defaulting to `standard`; it MUST NOT expose a manual length, diameter, flange-height, or chamfer field. The Worker MUST dispatch `modelId=opengrid-pillar` to the pillar builder, and the CAD workspace MUST not fall through to another component or expose another component's parameters.

#### Scenario: Pillar initial generation

- **GIVEN** a user opens `/cad/opengrid-pillar` in a supported browser
- **WHEN** the Worker emits `engine.ready`
- **THEN** the main thread MUST send generation 1 using a valid saved pillar snapshot or `{ mode: 'standard' }`
- **AND** the Worker MUST route the request to the independent pillar builder
- **AND** the committed model MUST expose pillar bounds, mesh, and model metadata

#### Scenario: Pillar parameter controls

- **GIVEN** a user views the `/cad/opengrid-pillar` workspace
- **WHEN** the parameter panel is rendered
- **THEN** it MUST expose a radio group with clearly labeled `標準版` and `薄殼版` choices
- **AND** the standard choice MUST be selected by default
- **AND** selecting standard MUST represent a fixed 9 mm model
- **AND** selecting thin-shell MUST represent a fixed 5 mm model
- **AND** it MUST NOT expose adjustable length, diameter, flange-height, or chamfer fields

#### Scenario: Mode selection updates the existing model

- **GIVEN** a user views the `/cad/opengrid-pillar` workspace
- **WHEN** the user selects either radio choice
- **THEN** the workspace MUST validate and generate the corresponding fixed mode model
- **AND** the accepted typed mode snapshot MUST be persisted under `opengrid-pillar`
- **AND** switching modes MUST NOT add a manual length override

#### Scenario: Pillar route isolation

- **GIVEN** a `model.generate` request carries `modelId=opengrid-pillar`
- **WHEN** the Worker validates and builds the request
- **THEN** it MUST accept only the pillar mode parameter shape
- **AND** it MUST reject mismatched or unknown parameter shapes
- **AND** it MUST NOT resolve the request through another component's builder or template cache

#### Scenario: Invalid pillar input lifecycle

- **WHEN** a user or external caller supplies a missing, malformed, or unsupported pillar mode
- **THEN** the workspace MUST show a diagnosable validation error
- **AND** it MUST send `model.invalidate` rather than `model.generate` for that invalid snapshot
- **AND** export MUST remain disabled while the input is invalid or stale
