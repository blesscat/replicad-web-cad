## Purpose

讓使用者能以 X/Y 目標尺寸快速取得 HSW 六角蜂巢與模組化網格底板中最接近且不超過目標的合法格數，並保留原有格數控制供後續微調。

## Requirements

### Requirement: Dimension calculator controls for both grid components

The system MUST provide a dimension calculator in the parameter panels for both `hsw-cell` and `modular-grid-base`. Each calculator MUST expose keyboard-operable inputs labeled `目標 X 尺寸（mm）` and `目標 Y 尺寸（mm）`, plus an action labeled `計算格數`. The X input MUST represent the columns direction and the Y input MUST represent the rows direction.

#### Scenario: HSW panel exposes dimension inputs

- **WHEN** a user opens the HSW 六角蜂巢 parameter panel
- **THEN** the panel MUST show the target X and target Y millimeter inputs
- **AND** it MUST show a `計算格數` action
- **AND** the existing 行數／列數 slider controls MUST remain available

#### Scenario: Modular grid panel exposes dimension inputs

- **WHEN** a user opens the 模組化網格底板 parameter panel
- **THEN** the panel MUST show the target X and target Y millimeter inputs
- **AND** it MUST show a `計算格數` action
- **AND** the existing 行數／列數 slider controls MUST remain available

### Requirement: Calculate the largest grid that does not exceed the target

The system MUST accept finite positive millimeter targets and calculate integer `columns` for X and `rows` for Y within the component's existing 1–20 range. The generated component bounds MUST be no greater than the corresponding targets, and the selected counts MUST be the closest legal counts under that constraint.

For `modular-grid-base`, the calculation MUST use its existing 20 mm cell width and depth: `columns = min(20, floor(targetX / 20))` and `rows = min(20, floor(targetY / 20))`.

For `hsw-cell`, the calculation MUST use the existing HSW bounds and layout rules. It MUST choose the greatest legal column count whose width fits `targetX` and whose one-row HSW envelope also fits `targetY`; after that choice, it MUST choose the greatest legal row count whose envelope depth fits `targetY`. This MUST account for the additional half-row depth required when columns are greater than one.

#### Scenario: Modular grid rounds down independently

- **WHEN** the user enters target X `59` mm and target Y `41` mm in the modular grid calculator
- **THEN** the calculator MUST produce `columns=2` and `rows=2`
- **AND** the resulting 40 × 40 mm grid MUST not exceed either target

#### Scenario: HSW grid accounts for staggered depth

- **WHEN** the user enters HSW targets that can contain a 2 × 2 HSW envelope but not a third column or row
- **THEN** the calculator MUST produce `columns=2` and `rows=2`
- **AND** it MUST use the HSW envelope including the additional half-row depth for multiple columns

#### Scenario: Large targets stop at the component maximum

- **WHEN** either calculator receives targets larger than the maximum supported 20 × 20 grid
- **THEN** it MUST return `columns=20` and `rows=20`
- **AND** the generated bounds MUST remain within the existing component limits

### Requirement: Apply valid calculation without breaking manual adjustment

The system MUST apply a valid calculation to the current component by updating X-direction `columns` and Y-direction `rows` through the existing parameter flow. Applying a calculation MUST trigger the same validation and preview update behavior as manual parameter input, and MUST leave the existing slider controls usable for subsequent adjustments.

#### Scenario: Valid calculation updates the current HSW grid

- **WHEN** a user enters valid HSW target dimensions and activates `計算格數`
- **THEN** the panel MUST update the HSW columns and rows to the calculated counts
- **AND** the CAD workspace MUST receive the updated component parameters through the existing input flow

#### Scenario: Valid calculation updates the current modular grid

- **WHEN** a user enters valid modular-grid target dimensions and activates `計算格數`
- **THEN** the panel MUST update the modular-grid columns and rows to the calculated counts
- **AND** the user MUST still be able to change those counts with the existing sliders

### Requirement: Reject unusable target dimensions without changing counts

The system MUST show an accessible field-level error and MUST NOT change the current rows or columns when either target is blank, malformed, non-finite, non-positive, or too small to contain one legal cell/envelope in the requested direction. Invalid target input MUST NOT interrupt the CAD workspace or prevent manual grid-count adjustment.

#### Scenario: Target below one modular cell

- **WHEN** a modular-grid target is less than 20 mm on X or Y
- **THEN** the corresponding target field MUST show an error explaining that at least one 20 mm cell is required
- **AND** the current rows and columns MUST remain unchanged

#### Scenario: Target below one HSW envelope

- **WHEN** an HSW target cannot contain one legal HSW cell envelope
- **THEN** the corresponding target field MUST show an error
- **AND** the current rows and columns MUST remain unchanged

#### Scenario: Malformed target input

- **WHEN** either target contains blank text, non-numeric text, infinity, zero, or a negative value
- **THEN** the calculator MUST show an accessible error without throwing an uncaught exception
- **AND** the current grid parameters MUST remain unchanged

### Requirement: Accessible responsive calculator

The dimension calculator MUST have explicit accessible labels, keyboard-operable inputs and action, visible validation feedback, and a layout that remains usable without horizontal overflow on narrow viewports.

#### Scenario: Keyboard user calculates a grid

- **WHEN** a keyboard user focuses the target fields and activates `計算格數`
- **THEN** the calculation MUST run without requiring pointer input
- **AND** any validation error MUST be associated with its target field

#### Scenario: Narrow viewport displays calculator

- **WHEN** either component panel is rendered at a narrow mobile viewport
- **THEN** both target inputs and the `計算格數` action MUST remain reachable and understandable
- **AND** the panel MUST NOT introduce horizontal overflow
