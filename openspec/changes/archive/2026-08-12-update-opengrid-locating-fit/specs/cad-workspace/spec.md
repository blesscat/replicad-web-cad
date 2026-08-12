## MODIFIED Requirements

### Requirement: OpenGrid pillar workspace integration

The runtime-validated component catalog MUST register `opengrid-pillar` as an independent OpenGrid model definition and MUST route `/cad/opengrid-pillar` to it. The definition MUST expose exactly one required radio group with `standard`, `thin-shell`, and `positioning` choices, defaulting to `standard`, plus numeric X/Y offset controls shared by all three modes. Standard and thin-shell MUST NOT expose a manual length, diameter, flange-height, or chamfer field; positioning MUST expose only its custom total-length field in addition to the X/Y offset controls. The Worker MUST dispatch `modelId=opengrid-pillar` to the pillar builder, and the CAD workspace MUST not fall through to another component or expose another component's parameters.

#### Scenario: Pillar initial generation

- **GIVEN** a user opens `/cad/opengrid-pillar` in a supported browser
- **WHEN** the Worker emits `engine.ready`
- **THEN** the main thread MUST send generation 1 using a valid saved pillar snapshot or `{ mode: 'standard', offsetX: 0, offsetY: 0 }`
- **AND** the Worker MUST route the request to the independent pillar builder
- **AND** the committed model MUST expose pillar bounds, mesh, and model metadata

#### Scenario: Pillar parameter controls

- **GIVEN** a user views the `/cad/opengrid-pillar` workspace
- **WHEN** the parameter panel is rendered
- **THEN** it MUST expose a radio group with clearly labeled `堆疊版`, `薄殼版`, and `物件定位用` choices
- **AND** the standard choice MUST be selected by default
- **AND** selecting standard MUST represent a fixed 9 mm model
- **AND** selecting thin-shell MUST represent a fixed 6 mm model
- **AND** selecting positioning MUST expose a custom total-length field
- **AND** every mode MUST expose X and Y offset controls with range -0.5～0.5 mm and step 0.05 mm
- **AND** standard and thin-shell MUST NOT expose adjustable length, diameter, flange-height, or chamfer fields

#### Scenario: Mode selection updates the existing model

- **GIVEN** a user views the `/cad/opengrid-pillar` workspace
- **WHEN** the user selects any radio choice or changes a valid XY offset
- **THEN** the workspace MUST validate and generate the corresponding pillar mode model at the requested XY position
- **AND** the accepted typed mode, length when applicable, and offsets MUST be persisted under `opengrid-pillar`
- **AND** switching to positioning MUST retain or initialize its custom length
- **AND** switching to a fixed mode MUST remove the manual length override from the accepted snapshot

#### Scenario: Pillar route isolation

- **GIVEN** a `model.generate` request carries `modelId=opengrid-pillar`
- **WHEN** the Worker validates and builds the request
- **THEN** it MUST accept only the pillar mode parameter shape, with `length` allowed only for positioning and offsets required for every normalized snapshot
- **AND** it MUST reject mismatched or unknown parameter shapes
- **AND** it MUST NOT resolve the request through another component's builder or template cache

#### Scenario: Invalid pillar input lifecycle

- **WHEN** a user or external caller supplies a missing, malformed, unsupported pillar mode, invalid positioning length, or invalid XY offset
- **THEN** the workspace MUST show a diagnosable field error
- **AND** it MUST send `model.invalidate` rather than `model.generate` for that invalid snapshot
- **AND** export MUST remain disabled while the input is invalid or stale

## ADDED Requirements

### Requirement: OpenGrid locating model descriptions

The runtime model-card descriptions for the affected OpenGrid components MUST state the confirmed locating dimensions. The pillar description MUST identify standard as 9 mm and thin-shell as 6 mm, both with a Ø5 mm body, and MUST mention the positioning mode's configurable XY offset range of -0.5～0.5 mm in 0.05 mm steps. The box description MUST state that its four corner connection holes are Ø5 mm. The cylinder description MUST state that its center hole and four outer cardinal connection holes are Ø5 mm. These descriptions MUST remain consistent with the generated geometry and parameter controls.

#### Scenario: Pillar description exposes current contract

- **WHEN** the `opengrid-pillar` model card is rendered
- **THEN** its description MUST state `堆疊版 9 mm`, `薄殼版 6 mm`, and Ø5 mm body dimensions
- **AND** it MUST state that XY offsets range from -0.5～0.5 mm with 0.05 mm increments

#### Scenario: Box and cylinder descriptions expose current holes

- **WHEN** the box and cylinder model cards are rendered
- **THEN** the box description MUST identify its four corner connection holes as Ø5 mm
- **AND** the cylinder description MUST identify its center plus four outer cardinal connection holes as Ø5 mm
