## MODIFIED Requirements

### Requirement: OpenGrid pillar model selection entry and route

The static `/models` chooser MUST include `opengrid-pillar` as an independent entry in `OpenGrid 系列`, with an `OpenGrid `-prefixed display name. The entry MUST link to `/cad/opengrid-pillar` without initializing the CAD Worker. The model catalog MUST resolve `/cad/opengrid-pillar` to `modelId=opengrid-pillar`, and direct navigation MUST use a valid saved mode snapshot or the pillar's standard-mode default.

#### Scenario: Model page lists pillar

- **WHEN** a user opens `/models`
- **THEN** the chooser MUST display the OpenGrid pillar entry in `OpenGrid 系列`
- **AND** the entry MUST provide a link to `/cad/opengrid-pillar`
- **AND** the chooser MUST remain static without initializing the CAD Worker

#### Scenario: Select pillar

- **WHEN** a user selects the pillar entry
- **THEN** navigation MUST go to `/cad/opengrid-pillar`
- **AND** the CAD workspace MUST initialize with `modelId=opengrid-pillar`

#### Scenario: Direct pillar navigation

- **WHEN** a user opens `/cad/opengrid-pillar` directly
- **THEN** the page MUST load the OpenGrid pillar-specific CAD workspace
- **AND** initial generation MUST use the valid saved pillar snapshot when available, otherwise `{ mode: 'standard' }`
- **AND** the route MUST NOT silently substitute another component
