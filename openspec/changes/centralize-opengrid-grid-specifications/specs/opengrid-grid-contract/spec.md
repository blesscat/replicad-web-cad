## ADDED Requirements

### Requirement: 官方 OpenGrid 間距必須有單一來源

The system MUST expose a shared OpenGrid grid contract whose official full pitch is exactly 28 mm and whose official half pitch is exactly 14 mm. Every runtime CAD contract that represents an OpenGrid full-grid or half-grid distance MUST resolve those values from the shared contract rather than defining a conflicting pitch.

#### Scenario: 讀取官方整格與半格

- **WHEN** an OpenGrid CAD contract reads the shared grid definition
- **THEN** its full pitch MUST be 28 mm
- **AND** its half pitch MUST be 14 mm
- **AND** the full pitch MUST equal exactly two half pitches

#### Scenario: 官方元件使用共用尺度

- **WHEN** the system generates an official `opengrid` footprint, an OpenGrid stackable footprint or bottom-hole grid, a half-cell host footprint, or an `opengrid-divider` arm
- **THEN** each full-grid unit MUST contribute 28 mm where that feature is defined in full grids
- **AND** each half-grid unit MUST contribute 14 mm where that feature is defined in half grids
- **AND** the generated component MUST not use the old Divider-only 14 mm full-grid／7 mm half-grid interpretation

### Requirement: Grid pitch 與元件特徵尺寸必須分開

The system MUST keep feature-specific dimensions separate from the official OpenGrid grid contract. Hole diameters, locating-hole centers, geometry clearances, and edge offsets MUST retain their existing component-specific semantics and MUST NOT be reinterpreted as the shared full or half pitch merely because they are numeric multiples or fractions of 28 mm.

#### Scenario: 孔徑不因 grid contract 改變

- **WHEN** an OpenGrid component generates its existing bottom or locating holes after the shared grid contract is applied
- **THEN** the component-specific `7.05 mm` and `5.05 mm` hole diameters MUST remain unchanged
- **AND** hole placement grids or offsets MUST continue to follow their owning component contract

#### Scenario: 元件專用偏移不被升格為半格

- **WHEN** a box, Snap, or other OpenGrid component uses a 7 mm locating center, edge offset, or clearance
- **THEN** that value MUST remain a named feature-specific dimension
- **AND** changing or consuming the official half pitch MUST NOT silently rescale that feature

### Requirement: 官方元件的穩定識別必須保留

The system MUST preserve the existing stable `modelId`, build key, route slug, catalog path, and export contract for every affected OpenGrid component. No new component is introduced by the shared grid contract.

#### Scenario: 既有元件識別不變

- **WHEN** a user generates or exports an affected OpenGrid component after the grid contract migration
- **THEN** its existing stable identifiers and export route MUST remain available
- **AND** only the explicitly migrated Divider geometry scale and derived validation limits may change
