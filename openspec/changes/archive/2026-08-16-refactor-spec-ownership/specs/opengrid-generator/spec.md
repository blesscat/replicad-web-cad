## ADDED Requirements

### Requirement: OpenGrid board workspace integration

The runtime-validated catalog MUST keep the existing opengrid model id and
route /cad/opengrid bound to the official OpenGrid board definition. The route
MUST use the board's normalized parameter validator and component-local
builder, and MUST preserve the existing candidate, commit, preview, STEP, and
binary STL lifecycle.

#### Scenario: OpenGrid route initial generation

- **GIVEN** a user opens /cad/opengrid with browser CAD prerequisites
- **WHEN** the Worker reports engine.ready
- **THEN** the workspace MUST send generation 1 with modelId=opengrid and a
  valid saved snapshot, or the current OpenGrid defaults when no valid entry
  exists
- **AND** the Worker MUST route the request to the OpenGrid board builder
- **AND** the committed revision, bounds, preview, and exports MUST belong to
  opengrid

#### Scenario: OpenGrid model contract

- **GIVEN** the Worker receives model.generate with modelId=opengrid
- **WHEN** the parameters contain a valid normalized OpenGrid snapshot
- **THEN** the Worker MUST validate the variant, grid, half-cell, chamfer,
  connector, screw, and custom-position fields together
- **AND** a mismatched or invalid snapshot MUST be rejected with a diagnostic
  validation error

### Requirement: OpenGrid board controls

The /cad/opengrid workspace MUST expose Full/Lite/Heavy/Hybrid variant,
rows, columns, X/Y half-cell directions, chamfer mode and corner flags,
connector enable and side flags, generic screw dimensions, screw mode,
center/interval modifiers, and an internal-intersection custom screw matrix.
It MUST display derived width, depth, and maximum board thickness in
millimetres. The Hybrid description MUST identify its Heavy outer perimeter
and standard Full interior rather than presenting it as a uniform 13.8 mm
plate. The accessible screw-mode control MUST be rendered before the
screw-size-source control, and any conditional row/column interval controls
MUST remain associated with the screw-mode control.

#### Scenario: Configure current OpenGrid controls

- **WHEN** a user changes variant, grid, half-cell, chamfer, connector, screw,
  or custom-intersection values
- **THEN** the pending typed snapshot MUST contain those normalized fields
- **AND** selecting Hybrid MUST preserve the existing rows, columns,
  half-cell, feature, and persistence fields
- **AND** derived dimensions MUST use the final half-cell envelope
- **AND** the derived dimensions MUST show Hybrid's 13.8 mm maximum thickness
- **AND** the settled input MUST use the existing debounce and Worker lifecycle

#### Scenario: Screw mode appears before screw size source

- **WHEN** a user views the `/cad/opengrid` parameter panel
- **THEN** the accessible `OpenGrid 螺絲孔模式` select MUST appear before the accessible `OpenGrid 螺絲尺寸來源` select
- **AND** selecting `by-row-column` MUST show its row and column interval controls as part of the screw-mode section

#### Scenario: Hybrid control remains compatible with existing accessories

- **WHEN** a user selects Hybrid and generates a board with an interior cell
- **THEN** the panel MUST explain that interior cells use standard Full
  OpenGrid interfaces
- **AND** the route MUST continue using modelId=opengrid and the existing
  preview, STEP, and STL export controls

### Requirement: OpenGrid board persistence and stale preview

The OpenGrid workspace MUST use the existing per-component persistence and
latest-wins behavior. Invalid input MUST invalidate a newer generation rather
than generating native geometry, and a stale or invalid generation MUST NOT
replace the last committed OpenGrid revision or enable exports.

#### Scenario: OpenGrid invalidation

- **WHEN** a newer OpenGrid draft is invalid or supersedes a running
  generation
- **THEN** the workspace MUST send parameter-free model.invalidate with the
  newer generation
- **AND** the older candidate MUST not commit
- **AND** the last committed preview MAY remain visible but MUST be stale
