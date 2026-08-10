## MODIFIED Requirements

### Requirement: 獨立的分隔牆參數契約

The system MUST expose a runtime-validated component with stable `modelId=opengrid-divider`. Its normalized parameters MUST include non-negative `left`, `right`, `up`, and `down` arm counts that are multiples of 0.5 grid, plus an integer `height` in millimetres. `height` MUST be in the inclusive range 2–500 mm. One full divider grid MUST be 14 mm, one half-grid MUST be 7 mm, and the divider grid definition MUST NOT be inherited from the official 28 mm `opengrid` component. The divider's planar footprint MUST continue to use its existing 500 mm safety limit independently of the height range.

#### Scenario: 合法分隔牆參數

- **WHEN** `left`、`right`、`up`、`down` are non-negative 0.5-grid multiples, at least two adjacent or opposite directions are non-zero, and `height` is an integer from 2 through 500 mm
- **THEN** the component MUST accept the normalized snapshot
- **AND** the generated arm lengths MUST use 14 mm per configured full grid unit and 7 mm per half-grid unit
- **AND** the snapshot MUST remain independent from `modelId=opengrid`

#### Scenario: Maximum manual height preserves the planar limit

- **WHEN** a valid divider shape has `height=500` and a planar footprint within 500 mm
- **THEN** validation MUST accept the snapshot
- **AND** the wall top MUST be at Z=500 mm
- **AND** a shape whose planar footprint exceeds 500 mm MUST remain invalid even when its height is within 2–500 mm

#### Scenario: 不支援的形狀被拒絕

- **WHEN** fewer than two directions are non-zero, or the values are not 0.5-grid multiples, negative, non-finite, or outside the supported height range
- **THEN** validation MUST fail with field-specific diagnostics
- **AND** the system MUST NOT send the snapshot for CAD generation or export
