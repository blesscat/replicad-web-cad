## Purpose

集中管理所有 OpenGrid CAD 元件共用的官方間距，避免 full／half grid 在不同 component contract 中漂移或被 Divider 重新解讀。

## Requirements

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

The OpenGrid contract MUST keep the 28 mm grid pitch and 14 mm half-pitch independent from the component feature dimensions. The shared nominal locating diameter MUST be 5 mm. The ordinary grid assembly opening MUST remain 5.05 mm, while the lower connection opening used by the special box/cylinder sockets MUST be exactly 5 mm. The retaining opening MUST remain 7.05 mm, and the quality-test shaft MUST be exactly 5 mm with the existing Ø7 mm × 0.8 mm flange. Changing the locating diameter or lower connection opening MUST NOT silently change the official grid pitch or ordinary assembly opening.

#### Scenario: Shared contract exposes confirmed dimensions

- **WHEN** a component reads the shared OpenGrid locating contract
- **THEN** nominalDiameter MUST equal 5 mm
- **AND** shaftOpeningDiameter MUST equal 5 mm
- **AND** testShaftDiameter MUST equal 5 mm
- **AND** retainingOpeningDiameter MUST equal 7.05 mm
- **AND** testFlangeDiameter MUST equal 7 mm
- **AND** testFlangeHeight MUST equal 0.8 mm

#### Scenario: Ordinary grid opening keeps its clearance

- **WHEN** a component requests an ordinary grid assembly opening
- **THEN** assemblyOpeningDiameter MUST equal 5.05 mm
- **AND** it MUST remain distinct from the exact 5 mm lower connection opening

#### Scenario: Official grid pitch remains stable

- **WHEN** the locating dimensions are consumed by a box or cylinder generator
- **THEN** the 28 mm grid pitch and 14 mm half-pitch MUST remain unchanged
- **AND** the lower special opening MUST be 5 mm without changing the ordinary grid-hole layout

#### Scenario: Fixture contract matches generated sockets

- **WHEN** a quality fixture is generated for a box or cylinder
- **THEN** its shaft MUST be Ø5 mm
- **AND** its flange MUST remain Ø7 mm × 0.8 mm
- **AND** the fixture MUST be suitable for the corresponding 5 mm lower connection opening

### Requirement: 官方元件的穩定識別必須保留

The system MUST preserve the existing stable `modelId`, build key, route slug, catalog path, and export contract for every affected OpenGrid component. No new component is introduced by the shared grid contract.

#### Scenario: 既有元件識別不變

- **WHEN** a user generates or exports an affected OpenGrid component after the grid contract migration
- **THEN** its existing stable identifiers and export route MUST remain available
- **AND** only the explicitly migrated Divider geometry scale and derived validation limits may change
