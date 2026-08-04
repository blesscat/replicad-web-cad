# modular-grid-base Specification

## Purpose
TBD - created by archiving change add-modular-grid-base-component. Update Purpose after archive.
## Requirements
### Requirement: 模組化網格底板參數

The system MUST provide a `modular-grid-base` component with `rows` and `columns` as positive integer parameters. Each cell MUST be 20 mm wide, 20 mm deep and 5 mm high; the generated plate width MUST equal `columns × 20 mm`, the depth MUST equal `rows × 20 mm`, and the height MUST remain 5 mm. The initial shared workspace limit MUST reject a generated width or depth greater than 500 mm.

#### Scenario: 1x1 底板尺寸

- **WHEN** the component is generated with `rows=1` and `columns=1`
- **THEN** the resulting B-Rep bounds MUST be 20 × 20 × 5 mm within the workspace tolerance
- **AND** the component MUST contain exactly one cell
- **AND** the plate MUST be centered on X/Y with its lowest Z at 0 mm

#### Scenario: 2x2 底板尺寸

- **WHEN** the component is generated with `rows=2` and `columns=2`
- **THEN** the resulting B-Rep bounds MUST be 40 × 40 × 5 mm within the workspace tolerance
- **AND** the component MUST contain four cells
- **AND** the plate MUST remain centered on X/Y with its lowest Z at 0 mm

#### Scenario: 不合法網格數量

- **WHEN** `rows` or `columns` is zero, negative, fractional, non-finite, non-integer, or causes width/depth to exceed 500 mm
- **THEN** generation MUST be rejected before CAD geometry is created
- **AND** the caller MUST receive a stable validation error

### Requirement: 預切除單格 STEP template

The component MUST use the colocated `cell-template.step` as its canonical runtime geometry asset. The asset MUST represent one sharp-corner 20 × 20 × 5 mm cell containing the centered 17 × 17 mm through-cut shape from the supplied profile, leaving 1.5 mm side margin on each side. Runtime generation MUST NOT boolean-cut the original source STEP for every request.

#### Scenario: 載入單格 template

- **WHEN** the Worker initializes the `modular-grid-base` component builder
- **THEN** it MUST load the component-local `cell-template.step` as a B-Rep asset
- **AND** it MUST validate that the imported asset is non-empty and has the expected 20 × 20 × 5 mm bounds within tolerance
- **AND** a failed or malformed asset load MUST produce a diagnosable component asset error

#### Scenario: 重用預切除 template

- **WHEN** a valid grid is generated
- **THEN** each cell MUST be created by cloning and translating the pre-cut template
- **AND** the generation path MUST NOT boolean-cut any source cutter for each cell
- **AND** the source and runtime STEP files MUST remain colocated with the component builder

### Requirement: 網格排列與單一 B-Rep

The system MUST place one translated template at every row/column cell position, fuse adjacent cells into the generated plate, and return a valid single-solid B-Rep. Cell placement MUST preserve the same orientation and centered cutout in every cell.

#### Scenario: 每格切除形狀保持置中

- **WHEN** a grid contains more than one cell
- **THEN** every cell MUST have the same 17 × 17 mm cutout geometry and orientation
- **AND** each cutout center MUST coincide with its 20 × 20 mm cell center
- **AND** no cell may be shifted, mirrored, or rotated implicitly by replication

#### Scenario: 相鄰單格融合

- **WHEN** all requested cell templates have been placed
- **THEN** adjacent cells MUST be fused without gaps or overlaps in the 5 mm plate body
- **AND** the final result MUST be a valid single solid suitable for mesh generation and STEP export

### Requirement: 外側四角圓角

The system MUST apply a 2.5 mm planar corner radius only to the four outside vertical corner edges of the completed grid. Internal cell junctions and cutout edges MUST remain sharp unless the source template already contains their own geometry.

#### Scenario: 1x1 外側圓角

- **WHEN** a 1x1 grid is finalized
- **THEN** its four outside XY corners MUST have a 2.5 mm radius
- **AND** its external bounds MUST remain 20 × 20 × 5 mm within tolerance
- **AND** the top and bottom perimeter edges MUST NOT receive an additional edge fillet

#### Scenario: 多格外側圓角

- **WHEN** a grid larger than 1x1 is finalized
- **THEN** only the four corners of the overall plate envelope MUST be rounded to 2.5 mm
- **AND** internal grid corners MUST NOT be rounded as if each cell were finalized independently
- **AND** the overall width, depth and height MUST remain the dimensions derived from rows and columns

### Requirement: Component-local builder boundary

The component MUST expose an independent builder function and component definition so that adding another component does not require embedding its geometry or STEP asset in the generic box builder. The definition MUST expose its parameter validation, generated bounds metadata and display/export naming information through the component catalog contract.

#### Scenario: 以 catalog 選取底板

- **WHEN** the CAD workspace asks the catalog to generate `modular-grid-base`
- **THEN** the request MUST resolve to the component-local builder
- **AND** the builder MUST receive only the component's validated parameters and runtime CAD context
- **AND** the generic box builder MUST NOT be responsible for loading or cutting the grid template

#### Scenario: 未來新增 component

- **WHEN** a second component is added to the catalog
- **THEN** its builder and STEP assets MUST be able to live in its own component directory
- **AND** the existing `modular-grid-base` geometry and parameters MUST remain unchanged
