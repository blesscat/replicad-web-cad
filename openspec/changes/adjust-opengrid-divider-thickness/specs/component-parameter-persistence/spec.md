## MODIFIED Requirements

### Requirement: OpenGrid 分隔器參數獨立保存

The versioned browser-local parameter record MUST store valid `opengrid-divider` snapshots under the stable `opengrid-divider` model id. The entry MUST contain typed `left`, `right`, `up`, `down`, `height`, and `wallThickness` values and MUST remain isolated from both `opengrid` and `opengrid-stackable-box` entries. A legacy divider entry that lacks `wallThickness` MUST be interpreted with the divider default of 2 mm rather than making the existing entry unusable.

#### Scenario: 恢復分隔器參數

- **GIVEN** browser persistence contains a valid `opengrid-divider` entry with directional counts, height, and `wallThickness`
- **WHEN** the user opens `/cad/opengrid-divider`
- **THEN** the controls MUST display the saved directional counts, height, and wall thickness
- **AND** the first generation MUST use those validated typed values

#### Scenario: 舊分隔器快照套用預設厚度

- **GIVEN** browser persistence contains a divider entry with valid legacy `left`, `right`, `up`, `down`, and `height` values but no `wallThickness`
- **WHEN** the divider workspace initializes
- **THEN** it MUST restore the entry with typed `wallThickness=2`
- **AND** it MUST be allowed to persist the upgraded snapshot after validation

#### Scenario: 保存合法更新

- **WHEN** a divider snapshot passes component validation
- **THEN** only the `opengrid-divider` persistence entry MUST be updated
- **AND** raw input strings, derived labels, and invalid partial values MUST NOT be persisted
- **AND** the stored wall thickness MUST remain a typed integer from 1 through 5

#### Scenario: 無效保存值安全回退

- **GIVEN** the stored divider entry is malformed, has an unknown shape, has an invalid `wallThickness`, or fails current validation
- **WHEN** the divider workspace initializes
- **THEN** it MUST use the divider definition defaults
- **AND** it MUST NOT send the invalid snapshot to the Worker
- **AND** existing entries for other components MUST remain unchanged
