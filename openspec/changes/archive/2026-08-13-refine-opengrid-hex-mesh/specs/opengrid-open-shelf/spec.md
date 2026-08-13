## MODIFIED Requirements

### Requirement: Open Shelf parameters are typed and independently validated

The component MUST expose the typed parameter snapshot `{ x, y, height, cellX, cellZ, angle, honeycombMode }`. The six geometric fields MUST retain their existing ranges, steps, formulas, and defaults. `honeycombMode` MUST be boolean and default to `false`. A legacy snapshot containing exactly the six geometric fields MUST normalize to `honeycombMode=false`.

The validator MUST reject non-finite, fractional, unknown, missing geometric, out-of-range, or non-boolean mode fields, and MUST reject a combination whose derived regular rear clear cell height is not positive after accounting for the bottom board, top panel, and `depth * tan(angle)` elevation difference. Valid results MUST contain only typed values and MUST not include derived fields.

#### Scenario: Validate and normalize the default snapshot

- **WHEN** the component validates the legacy default `{ x: 4, y: 3, height: 50, cellX: 1, cellZ: 2, angle: 15 }`
- **THEN** validation MUST succeed with the same geometric values and `honeycombMode=false`
- **AND** the derived footprint MUST remain approximately `111.85 mm × 83.85 mm`

#### Scenario: Enable the typed material-saving mode

- **WHEN** a valid Open Shelf snapshot contains `honeycombMode=true`
- **THEN** validation and Worker dispatch MUST preserve the typed boolean value
- **AND** the six geometric controls and their derived cell-space display MUST remain unchanged

#### Scenario: Reject invalid scalar or mode input

- **WHEN** any geometric field is missing, fractional where an integer is required, non-finite, outside its declared range, or an unknown field is supplied, or `honeycombMode` is not boolean
- **THEN** validation MUST fail with a field-specific diagnostic
- **AND** the invalid snapshot MUST not be sent to the CAD kernel

#### Scenario: Reject a geometrically impossible angle

- **WHEN** a valid height and footprint are combined with an angle that leaves no positive clear height at the rear of a cell
- **THEN** validation MUST fail with an angle/height geometry diagnostic
- **AND** the UI MUST retain the last committed valid model while the new input is invalid

## ADDED Requirements

### Requirement: Open Shelf has a protected Hex Mesh material-saving mode

When `honeycombMode=true`, Open Shelf MUST use the same point-up Hex Mesh derivation and protected-boundary clipping behavior as the stackable containers. Eligible outer side walls, internal X dividers, and backboard MUST use the side-cell lattice. Eligible bottom, inclined shelf, and top panels MUST use the smaller floor-cell lattice. Complete and clipped openings MUST retain continuous printable ribs, and the mode MUST NOT implement the separate vertical-groove Ribbed style.

#### Scenario: Disabled mode preserves the merged Open Shelf geometry

- **WHEN** `honeycombMode=false` or a legacy snapshot omits the field
- **THEN** geometry, bounds, panel count, front opening, locating pegs, quality behavior, and the existing export filename MUST remain unchanged

#### Scenario: Vertical panels use protected side Hex Mesh

- **WHEN** a valid Open Shelf has `honeycombMode=true`
- **THEN** eligible outer side walls, internal X dividers, and backboard MUST contain complete and safely clipped staggered side-lattice openings
- **AND** the rounded outer perimeter, front and rear rails, top and bottom rails, shelf-contact bridges, divider-contact bridges, and backboard contacts MUST remain solid
- **AND** cells intersecting those protected boundaries MUST be clipped to the safe region instead of discarded wholesale
- **AND** usable vertical-panel areas MUST NOT contain avoidable broad solid bands caused only by complete-cell rejection

#### Scenario: Inclined shelves open the usable bottom-wedge sides

- **WHEN** a valid Open Shelf has `honeycombMode=true`, `angle>0`, and safe opening area between the bottom rail and first inclined shelf bridge
- **THEN** each eligible outer side wall and internal X divider MUST contain side-lattice openings in that bottom-wedge area
- **AND** cells crossing the horizontal bottom boundary or inclined first-shelf boundary MUST be clipped while both structural bridges remain solid
- **AND** the wedge MUST remain solid only where no valid protected opening area fits

#### Scenario: Bottom and shelf panels use finer Hex Mesh

- **WHEN** a valid Open Shelf has `honeycombMode=true`
- **THEN** eligible bottom, inclined shelf, and top panels MUST contain complete and safely clipped staggered openings smaller than the side-wall openings
- **AND** eligible plate openings MUST pass through their panel so the Hex Mesh remains visible from either exposed face
- **AND** side, front, rear, divider, and panel-intersection bridges MUST remain solid
- **AND** no bottom opening may intersect a locating peg or its structural keep-out
- **AND** cells intersecting a protected perimeter, bridge, or locating-peg keep-out MUST be clipped to that boundary instead of discarded wholesale
- **AND** usable plate areas MUST NOT contain avoidable broad solid bands caused only by complete-cell rejection

#### Scenario: Material-saving Open Shelf preserves its contract

- **WHEN** solid and honeycomb Open Shelves use the same six geometric values
- **THEN** the honeycomb result MUST have lower volume with identical declared bounds
- **AND** the front opening, shared inclination, four plain 5 mm locating pegs, rounded outer frame, and one-solid topology MUST remain valid
- **AND** preview, STEP, and STL export MUST remain available
- **AND** honeycomb export names MUST include a deterministic `-honeycomb` suffix

#### Scenario: Small protected panels use a valid no-cell fallback

- **WHEN** a panel or bottom-wedge side cannot contain a valid opening after all frames and structural keep-outs are applied
- **THEN** that panel MUST remain solid
- **AND** other eligible Open Shelf panels MUST still use Hex Mesh where valid protected opening area remains
