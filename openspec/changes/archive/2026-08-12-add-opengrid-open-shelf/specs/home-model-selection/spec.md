## ADDED Requirements

### Requirement: Open Shelf is a Desk-only model-selection entry

The static `/models` chooser MUST include `opengrid-open-shelf` exactly once under the OpenGrid `Desk System` subgroup. Its selection label MUST be `Open Shelf (斜開格櫃)`, its user-facing display name MUST begin with `OpenGrid `, and its link MUST be `/cad/opengrid-open-shelf?system=desk`. It MUST not appear in `Wall Related`.

#### Scenario: Desk chooser lists Open Shelf

- **WHEN** a user opens `/models`
- **THEN** the Desk System subgroup MUST show `Open Shelf (斜開格櫃)` with a static preview and an edit link
- **AND** the chooser MUST remain static without initializing the CAD Worker

#### Scenario: Selecting Open Shelf opens its route

- **WHEN** a user selects the Open Shelf card
- **THEN** navigation MUST go to `/cad/opengrid-open-shelf?system=desk`
- **AND** the CAD workspace MUST initialize with `modelId=opengrid-open-shelf`

#### Scenario: Open Shelf is absent from Wall Related

- **WHEN** the model chooser renders the Wall Related subgroup
- **THEN** `opengrid-open-shelf` MUST not be rendered there
