## ADDED Requirements

### Requirement: OpenGrid pillar workspace integration

The runtime-validated component catalog MUST register `opengrid-pillar` as an
independent OpenGrid model definition and MUST route
`/cad/opengrid-pillar` to it. The definition MUST expose exactly one required
radio group with `standard`, `thin-shell`, and `positioning` choices,
defaulting to `standard`, plus one shared numeric `offset` control. The
positioning mode MUST expose only its custom integer `length` field in addition
to `offset`. The Worker MUST dispatch `modelId=opengrid-pillar` to the pillar
builder, and the CAD workspace MUST not fall through to another component or
expose another component's parameters.

#### Scenario: Pillar initial generation

- **GIVEN** a user opens `/cad/opengrid-pillar` in a supported browser
- **WHEN** the Worker emits `engine.ready`
- **THEN** the main thread MUST send generation 1 using a valid saved pillar snapshot or `{ mode: 'standard', offset: 0 }`
- **AND** the Worker MUST route the request to the independent pillar builder
- **AND** the committed model MUST expose pillar bounds, mesh, and model metadata centered on the world XY origin

#### Scenario: Pillar parameter controls

- **GIVEN** a user views the `/cad/opengrid-pillar` workspace
- **WHEN** the parameter panel is rendered
- **THEN** it MUST expose a radio group with clearly labeled `堆疊版`, `薄殼版`, and `物件定位用` choices
- **AND** the standard choice MUST be selected by default
- **AND** every mode MUST expose one shared `offset` control with range -0.5–0.5 mm and step 0.05 mm
- **AND** selecting positioning MUST expose a custom integer total-length field from 3–500 mm
- **AND** standard and thin-shell MUST NOT expose adjustable nominal length, diameter, flange-height, or chamfer fields

#### Scenario: Mode selection updates the existing model

- **GIVEN** a user views the `/cad/opengrid-pillar` workspace
- **WHEN** the user selects a radio choice or changes a valid shared `offset`
- **THEN** the workspace MUST validate and generate the corresponding pillar mode with the selected additive XY diameter increment
- **AND** the accepted typed mode, length when applicable, and shared offset MUST be persisted under `opengrid-pillar`
- **AND** the generated model MUST remain centered on the world XY origin rather than translating in X or Y

#### Scenario: Pillar route isolation

- **GIVEN** a `model.generate` request carries `modelId=opengrid-pillar`
- **WHEN** the Worker validates and builds the request
- **THEN** it MUST accept only the pillar mode parameter shape, with `length` allowed only for positioning and the shared `offset` required for every normalized snapshot
- **AND** it MUST reject mismatched or unknown parameter shapes
- **AND** it MUST NOT resolve the request through another component's builder or template cache

#### Scenario: Invalid pillar input lifecycle

- **WHEN** a user or external caller supplies a missing, malformed, unsupported pillar mode, invalid positioning length, or invalid shared `offset`
- **THEN** the workspace MUST show a diagnosable field error
- **AND** it MUST send `model.invalidate` rather than `model.generate` for that invalid snapshot
- **AND** export MUST remain disabled while the input is invalid or stale
