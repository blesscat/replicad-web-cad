## MODIFIED Requirements

### Requirement: OpenGrid board controls

The /cad/opengrid workspace MUST expose Full/Lite/Heavy variant, rows and
columns from 1 through 10, X/Y half-cell directions, chamfer mode and corner flags, connector
enable and side flags, generic screw dimensions, screw mode, center/interval
modifiers, and an internal-intersection custom screw matrix. It MUST display
derived width, depth, and variant thickness in millimetres. The accessible screw-mode
control MUST be rendered before the screw-size-source control, and any conditional
row/column interval controls MUST remain associated with the screw-mode control.

#### Scenario: Configure current OpenGrid controls

- **WHEN** a user changes variant, grid, half-cell, chamfer, connector, screw,
  or custom-intersection values
- **THEN** the pending typed snapshot MUST contain those normalized fields
- **AND** derived dimensions MUST use the final half-cell envelope
- **AND** the settled input MUST use the existing debounce and Worker lifecycle

#### Scenario: Screw mode appears before screw size source

- **WHEN** a user views the `/cad/opengrid` parameter panel
- **THEN** the accessible `OpenGrid 螺絲孔模式` select MUST appear before the accessible `OpenGrid 螺絲尺寸來源` select
- **AND** selecting `by-row-column` MUST show its row and column interval controls as part of the screw-mode section
