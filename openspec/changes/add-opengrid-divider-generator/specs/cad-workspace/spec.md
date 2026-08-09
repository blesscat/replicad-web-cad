## ADDED Requirements

### Requirement: OpenGrid 分隔器 CAD workspace

The system MUST register `opengrid-divider` as an independent model definition and MUST route `/cad/opengrid-divider` to that definition. The route MUST expose only the divider's `left`, `right`, `up`, `down`, and `height` controls, plus the derived shape label and dimensions. It MUST NOT show the official OpenGrid Full/Lite/Heavy, connector, or screw controls.

#### Scenario: 直接開啟分隔器 route

- **WHEN** a user opens `/cad/opengrid-divider`
- **THEN** the page MUST resolve the route to `modelId=opengrid-divider`
- **AND** the first generation MUST use valid saved divider parameters or the divider definition defaults
- **AND** the Worker MUST dispatch the request to the divider builder

#### Scenario: 分隔器控制面板

- **WHEN** the divider workspace is rendered
- **THEN** it MUST display four directional grid-count controls and a configurable height in millimetres
- **AND** it MUST display the derived line/L/T/cross shape
- **AND** it MUST display the derived 14 mm full-grid/7 mm half-grid footprint and total Z bounds including the 1 mm peg length
- **AND** it MUST NOT display controls belonging to another model

### Requirement: 分隔器輸入生命週期

The divider workspace MUST use the existing typed generation, debounce, latest-wins, invalidation, candidate, commit, stale-preview, and export gates for its component-specific parameters.

#### Scenario: 合法輸入建模

- **WHEN** a complete divider snapshot passes validation and input debounce settles
- **THEN** the workspace MUST send a `model.generate` request with `modelId=opengrid-divider`
- **AND** only the latest valid candidate MUST be eligible for commit
- **AND** exports MUST become available only after a matching committed revision exists

#### Scenario: 非法輸入失效化

- **WHEN** any directional count or height is empty, fractional, non-finite, negative, or outside its supported range
- **THEN** the workspace MUST show a field-specific validation error
- **AND** it MUST send `model.invalidate` instead of `model.generate`
- **AND** export MUST remain disabled for the invalid or stale generation
