## MODIFIED Requirements

### Requirement: Pillar parameters are persisted independently

The versioned browser persistence MUST store valid pillar parameters under the stable `opengrid-pillar` model id. Each entry MUST contain only the typed mode value `standard` or `thin-shell` accepted by the pillar validator. The OpenGrid pillar entry MUST remain independent from every other component's parameter entry.

#### Scenario: Restore saved pillar parameters

- **GIVEN** browser persistence contains `{ mode: 'thin-shell' }` under `opengrid-pillar`
- **WHEN** the user opens `/cad/opengrid-pillar`
- **THEN** the thin-shell radio MUST be selected
- **AND** the first generation MUST use the fixed 5 mm thin-shell profile

#### Scenario: Persist a valid pillar update

- **GIVEN** a pillar snapshot with `mode=standard` or `mode=thin-shell` passes validation
- **WHEN** the workspace accepts the update
- **THEN** persistence MUST update only the `opengrid-pillar` entry
- **AND** the stored value MUST remain the typed mode rather than a raw input string

#### Scenario: Invalid pillar input does not overwrite persistence

- **GIVEN** a previously accepted pillar mode exists in persistence
- **WHEN** the user selects an unsupported mode or a malformed raw value is supplied
- **THEN** the previous accepted `opengrid-pillar` entry MUST remain unchanged
- **AND** the invalid value MUST NOT be sent to the Worker as `model.generate`

#### Scenario: Missing or legacy pillar entry falls back safely

- **GIVEN** the persisted `opengrid-pillar` entry is missing, malformed, or uses the old `{ length, baseConnection }` shape
- **WHEN** the OpenGrid pillar workspace initializes
- **THEN** it MUST use `{ mode: 'standard' }`
- **AND** the invalid or legacy entry MUST NOT be sent to the Worker
- **AND** initialization MUST continue without treating persistence failure as a CAD failure
