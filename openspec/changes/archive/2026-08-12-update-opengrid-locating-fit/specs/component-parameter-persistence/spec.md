## MODIFIED Requirements

### Requirement: Pillar parameters are persisted independently

The versioned browser persistence MUST store valid pillar parameters under the stable `opengrid-pillar` model id. Each entry MUST contain either the typed fixed mode `standard` or `thin-shell` with typed `offsetX` and `offsetY`, or the typed `positioning` mode with its integer `length` and typed `offsetX` and `offsetY`. The offsets MUST remain within -0.5 through 0.5 mm at 0.05 mm increments. The OpenGrid pillar entry MUST remain independent from every other component's parameter entry.

#### Scenario: Restore saved pillar parameters

- **GIVEN** browser persistence contains `{ mode: 'thin-shell', offsetX: 0.15, offsetY: -0.1 }` under `opengrid-pillar`
- **WHEN** the user opens `/cad/opengrid-pillar`
- **THEN** the thin-shell radio MUST be selected
- **AND** the X/Y offset controls MUST display the saved typed values
- **AND** the first generation MUST use the fixed 6 mm thin-shell profile translated by those offsets

#### Scenario: Persist a valid pillar update

- **GIVEN** a pillar snapshot with `mode=standard`, `mode=thin-shell`, or `mode=positioning` with a valid length and valid XY offsets passes validation
- **WHEN** the workspace accepts the update
- **THEN** persistence MUST update only the `opengrid-pillar` entry
- **AND** the stored value MUST remain the typed mode, length when applicable, and numeric offsets rather than raw input strings

#### Scenario: Invalid pillar input does not overwrite persistence

- **GIVEN** a previously accepted pillar mode and offset snapshot exists in persistence
- **WHEN** the user selects an unsupported mode or supplies a malformed, fractional-step, or out-of-range length or offset
- **THEN** the previous accepted `opengrid-pillar` entry MUST remain unchanged
- **AND** the invalid value MUST NOT be sent to the Worker as `model.generate`

#### Scenario: Missing or malformed pillar entry falls back safely

- **GIVEN** the persisted `opengrid-pillar` entry is missing or malformed
- **WHEN** the OpenGrid pillar workspace initializes
- **THEN** it MUST use `{ mode: 'standard', offsetX: 0, offsetY: 0 }`
- **AND** the invalid entry MUST NOT be sent to the Worker
- **AND** initialization MUST continue without treating persistence failure as a CAD failure

#### Scenario: Migrate old pillar snapshots

- **GIVEN** the persisted entry uses the old `{ length, baseConnection: false }` shape with a valid length
- **WHEN** the OpenGrid pillar workspace initializes
- **THEN** it MUST use `{ mode: 'positioning', length, offsetX: 0, offsetY: 0 }`
- **GIVEN** the persisted entry uses an old valid `{ mode: 'standard' }` or `{ mode: 'thin-shell' }` shape without offsets
- **WHEN** the OpenGrid pillar workspace initializes
- **THEN** it MUST retain the mode and add `offsetX=0` and `offsetY=0`
- **AND** the old checkbox field MUST NOT remain in the normalized entry
