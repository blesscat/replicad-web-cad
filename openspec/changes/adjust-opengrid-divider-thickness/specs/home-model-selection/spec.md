## MODIFIED Requirements

### Requirement: OpenGrid 分隔器模型選擇入口

The static `/models` chooser MUST include `opengrid-divider` as an independent OpenGrid-series model with an understandable display name, a concise description of its custom 14 mm full-grid/7 mm half-grid base, four directional grid-count controls, configurable height, adjustable 1–5 mm wall thickness with a 2 mm default, a 5 mm base support with a 45-degree chamfer transition, Ø5 × 3 mm locating pegs, stable side rounding, and 1 mm rounded top. Its entry MUST link to `/cad/opengrid-divider` without initializing the CAD Worker on the chooser page.

#### Scenario: 選擇 OpenGrid 分隔器

- **WHEN** a user opens `/models` and selects the OpenGrid divider entry
- **THEN** the entry MUST navigate to `/cad/opengrid-divider`
- **AND** the CAD workspace MUST initialize with `modelId=opengrid-divider`

#### Scenario: 分隔器文案反映可調厚度

- **WHEN** a user views the OpenGrid divider entry
- **THEN** its description MUST identify the adjustable 1–5 mm wall thickness and the 5 mm base's 45-degree chamfer transition
- **AND** the description MUST NOT claim that the entire wall is fixed at 5 mm

#### Scenario: 官方 OpenGrid 與分隔器文案分離

- **WHEN** a user views the OpenGrid-series model descriptions
- **THEN** the official `opengrid` description MUST remain about the 28 mm official board
- **AND** the `opengrid-divider` description MUST identify the separate custom 14 mm full-grid/7 mm half-grid accessory
