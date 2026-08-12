## MODIFIED Requirements

### Requirement: OpenGrid 分隔器 CAD workspace

The system MUST register `opengrid-divider` as an independent model definition and MUST route `/cad/opengrid-divider` to that definition. The route MUST expose only the divider's `left`, `right`, `up`, `down`, `height`, and `wallThickness` controls without a detailed derived geometry summary. Each directional control MUST accept values from 0 through 10 grids in 0.5-grid steps. The height text input MUST accept 2–500 mm and its slider MUST range from 2–200 mm. It MUST NOT show the repeated technical paragraph describing the official grid, height, slider, or footprint limits. It MUST NOT show the official OpenGrid Full/Lite/Heavy, connector, or screw controls.

#### Scenario: 直接開啟分隔器 route

- **WHEN** a user opens `/cad/opengrid-divider`
- **THEN** the page MUST resolve the route to `modelId=opengrid-divider`
- **AND** the first generation MUST use valid saved divider parameters or the divider definition defaults, including default `wallThickness=2`
- **AND** the Worker MUST dispatch the request to the divider builder

#### Scenario: 分隔器控制面板

- **WHEN** the divider workspace is rendered
- **THEN** it MUST display four directional grid-count controls with minimum 0, maximum 10, and step 0.5, a height text input with maximum 500 mm and a height slider with maximum 200 mm, and a wall-thickness control with values from 1 through 5 mm
- **AND** the thickness control MUST identify 2 mm as the default
- **AND** it MUST NOT display a separate technical summary for the official 28 mm/14 mm footprint, shape, plane dimensions, chamfer, locating pegs, or total Z bounds
- **AND** it MUST NOT display the repeated official-grid/height-limit paragraph
- **AND** it MUST NOT display controls belonging to another model
