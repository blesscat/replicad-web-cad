## MODIFIED Requirements

### Requirement: OpenGrid pillar workspace integration

The runtime-validated component catalog MUST register `opengrid-pillar` as an independent OpenGrid model definition and MUST route `/cad/opengrid-pillar` to it. The definition MUST expose the integer `length` field from 3–500 mm and a default-off checkbox labeled `連接底版用`, with defaults of 5 mm and unchecked. The length controls MUST additionally expose clearly labeled common quick options for 6 mm and 8 mm. The Worker MUST dispatch `modelId=opengrid-pillar` to the pillar builder, and the CAD workspace MUST not fall through to another component or expose another component's parameters.

#### Scenario: Pillar initial generation

- **GIVEN** a user opens `/cad/opengrid-pillar` in a supported browser
- **WHEN** the Worker emits `engine.ready`
- **THEN** the main thread MUST send generation 1 using a valid saved pillar snapshot or `{ length: 5, baseConnection: false }`
- **AND** the Worker MUST route the request to the independent pillar builder
- **AND** the committed model MUST expose pillar bounds, mesh, and model metadata

#### Scenario: Pillar parameter controls

- **GIVEN** a user views the `/cad/opengrid-pillar` workspace
- **WHEN** the parameter panel is rendered
- **THEN** it MUST expose an integer length control labeled in mm with range 3–500
- **AND** it MUST expose clearly labeled 6 mm and 8 mm common length quick options
- **AND** it MUST expose a checkbox labeled `連接底版用`
- **AND** the checkbox MUST be unchecked by default
- **AND** it MUST NOT expose adjustable diameter or chamfer fields

#### Scenario: Common length quick option updates the existing input

- **GIVEN** a user views the `/cad/opengrid-pillar` workspace with either base mode
- **WHEN** the user activates the 6 mm or 8 mm quick option
- **THEN** the existing length input MUST display the selected integer value in mm
- **AND** the workspace MUST validate and generate the same pillar model as entering that value manually
- **AND** the accepted typed `length` snapshot MUST be persisted under `opengrid-pillar`
- **AND** the quick option MUST NOT remove support for other valid integer lengths from 3 through 500 mm

#### Scenario: Pillar route isolation

- **GIVEN** a `model.generate` request carries `modelId=opengrid-pillar`
- **WHEN** the Worker validates and builds the request
- **THEN** it MUST accept only the pillar parameter shape
- **AND** it MUST reject mismatched or unknown parameter shapes
- **AND** it MUST NOT resolve the request through another component's builder or template cache

#### Scenario: Invalid pillar input lifecycle

- **WHEN** a user enters an empty, fractional, non-finite, non-boolean, or out-of-range pillar value
- **THEN** the workspace MUST show a diagnosable field error
- **AND** it MUST send `model.invalidate` rather than `model.generate` for that invalid snapshot
- **AND** export MUST remain disabled while the input is invalid or stale
