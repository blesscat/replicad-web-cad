## MODIFIED Requirements

### Requirement: OpenGrid 分隔器 CAD workspace

The system MUST register `opengrid-divider` as an independent model definition and MUST route `/cad/opengrid-divider` to that definition. The route MUST expose only the divider's `left`, `right`, `up`, `down`, `height`, and `wallThickness` controls without a detailed derived geometry summary. It MUST NOT show the official OpenGrid Full/Lite/Heavy, connector, or screw controls.

#### Scenario: 直接開啟分隔器 route

- **WHEN** a user opens `/cad/opengrid-divider`
- **THEN** the page MUST resolve the route to `modelId=opengrid-divider`
- **AND** the first generation MUST use valid saved divider parameters or the divider definition defaults, including default `wallThickness=2`
- **AND** the Worker MUST dispatch the request to the divider builder

#### Scenario: 分隔器控制面板

- **WHEN** the divider workspace is rendered
- **THEN** it MUST display four directional grid-count controls, a configurable height in millimetres, and a wall-thickness control with values from 1 through 5 mm
- **AND** the thickness control MUST identify 2 mm as the default
- **AND** it MUST NOT display a separate technical summary for the 14 mm/7 mm footprint, shape, plane dimensions, chamfer, locating pegs, or total Z bounds
- **AND** it MUST NOT display controls belonging to another model

### Requirement: 分隔器輸入生命週期

The divider workspace MUST use the existing typed generation, debounce, latest-wins, invalidation, candidate, commit, stale-preview, and export gates for its component-specific parameters, including `wallThickness`.

#### Scenario: 合法輸入建模

- **WHEN** a complete divider snapshot passes validation and input debounce settles
- **THEN** the workspace MUST send a `model.generate` request with `modelId=opengrid-divider`
- **AND** only the latest valid candidate MUST be eligible for commit
- **AND** exports MUST become available only after a matching committed revision exists

#### Scenario: 非法輸入失效化

- **WHEN** any directional count, height, or `wallThickness` is empty, fractional where integer input is required, non-finite, negative, or outside its supported range
- **THEN** the workspace MUST show a field-specific validation error
- **AND** it MUST send `model.invalidate` instead of `model.generate`
- **AND** export MUST remain disabled for the invalid or stale generation
