## MODIFIED Requirements

### Requirement: OpenGrid 分隔器模型選擇入口

The static `/models` chooser MUST include `opengrid-divider` as an independent OpenGrid-series model with an understandable display name and concise identity description. Its entry MUST link to `/cad/opengrid-divider` without initializing the CAD Worker on the chooser page.

#### Scenario: 選擇 OpenGrid 分隔器

- **WHEN** a user opens `/models` and selects the OpenGrid divider entry
- **THEN** the entry MUST navigate to `/cad/opengrid-divider`
- **AND** the CAD workspace MUST initialize with `modelId=opengrid-divider`

#### Scenario: 分隔器入口保持簡潔

- **WHEN** a user views the OpenGrid divider entry
- **THEN** its description MUST remain concise and identify the custom divider model
- **AND** the description MUST NOT expose the detailed grid, dimensions, transition, locating-peg, or total-height explanation

#### Scenario: 官方 OpenGrid 與分隔器文案分離

- **WHEN** a user views the OpenGrid-series model descriptions
- **THEN** the official `opengrid` description MUST remain about the 28 mm official board
- **AND** the `opengrid-divider` description MUST remain separate from the official model description
