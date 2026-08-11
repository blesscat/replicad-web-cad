## MODIFIED Requirements

### Requirement: OpenGrid board controls

The /cad/opengrid workspace MUST expose Full/Lite/Heavy/Hybrid variant,
rows, columns, X/Y half-cell directions, chamfer mode and corner flags,
connector enable and side flags, generic screw dimensions, screw mode,
center/interval modifiers, and an internal-intersection custom screw matrix.
It MUST display derived width, depth, and maximum board thickness in
millimetres. The Hybrid description MUST identify its Heavy outer perimeter
and standard Full interior rather than presenting it as a uniform 13.8 mm
plate.

#### Scenario: Configure current OpenGrid controls

- **WHEN** a user changes variant, grid, half-cell, chamfer, connector, screw,
  or custom-intersection values
- **THEN** the pending typed snapshot MUST contain those normalized fields
- **AND** selecting Hybrid MUST preserve the existing rows, columns,
  half-cell, feature, and persistence fields
- **AND** derived dimensions MUST use the final half-cell envelope and show
  Hybrid's 13.8 mm maximum thickness
- **AND** the settled input MUST use the existing debounce and Worker lifecycle

#### Scenario: Hybrid control remains compatible with existing accessories

- **WHEN** a user selects Hybrid and generates a board with an interior cell
- **THEN** the panel MUST explain that interior cells use standard Full
  OpenGrid interfaces
- **AND** the route MUST continue using modelId=opengrid and the existing
  preview, STEP, and STL export controls
