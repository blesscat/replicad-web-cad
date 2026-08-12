## Purpose

本文件定義 OpenGrid 前方開口、整體向前上仰的 Open Shelf component contract、幾何與匯出行為。
## Requirements
### Requirement: Open Shelf has a stable OpenGrid identity

The system MUST register the new component with modelId, buildKey, catalog component directory, CAD-kernel component directory, and model-specific route slug `opengrid-open-shelf`. Its user-facing catalog display name MUST begin with `OpenGrid `, and its CAD route MUST be `/cad/opengrid-open-shelf`. Existing model ids, build keys, route slugs, catalog entries, and exports MUST remain unchanged.

#### Scenario: Resolve the new model identity

- **WHEN** the catalog, route resolver, or Worker receives `opengrid-open-shelf`
- **THEN** each layer MUST resolve the same new component definition
- **AND** no existing OpenGrid definition MUST be substituted

#### Scenario: Preserve existing identities

- **WHEN** the new component is registered
- **THEN** existing OpenGrid model ids, build keys, route slugs, and export file names MUST remain available without migration

### Requirement: Open Shelf parameters are typed and independently validated

The component MUST expose exactly the typed parameter snapshot `{ x, y, height, cellX, cellZ, angle }`. `x` and `y` MUST use the existing OpenGrid half-grid step and the footprint formula `count * 28 - 0.15`, with a valid range of 0.5–10 grid units and a maximum resulting footprint of 500 mm. `height` MUST be an integer from 10–500 mm. `cellX` and `cellZ` MUST be safe integers from 1–10. `angle` MUST be an integer from 0–75 degrees. The defaults MUST be `x=4`, `y=3`, `height=50`, `cellX=1`, `cellZ=2`, and `angle=15`.

The validator MUST reject non-finite, fractional, unknown, missing, or out-of-range fields, and MUST reject a combination whose derived regular rear clear cell height is not positive after accounting for the bottom board, top panel, and `depth * tan(angle)` elevation difference. Valid results MUST contain only typed values and MUST not include derived fields.

#### Scenario: Validate the default snapshot

- **WHEN** the component validates `{ x: 4, y: 3, height: 50, cellX: 1, cellZ: 2, angle: 15 }`
- **THEN** validation MUST succeed with the same typed values
- **AND** the derived footprint MUST be approximately `111.85 mm × 83.85 mm`

#### Scenario: Reject invalid scalar input

- **WHEN** any field is missing, fractional where an integer is required, non-finite, outside its declared range, or an unknown field is supplied
- **THEN** validation MUST fail with a field-specific diagnostic
- **AND** the invalid snapshot MUST not be sent to the CAD kernel

#### Scenario: Reject a geometrically impossible angle

- **WHEN** a valid height and footprint are combined with an angle that leaves no positive clear height at the rear of a cell
- **THEN** validation MUST fail with an angle/height geometry diagnostic
- **AND** the UI MUST retain the last committed valid model while the new input is invalid

### Requirement: Open Shelf geometry has a front opening and a shared upward inclination

The generated component MUST be centered on X/Y with front at `-Y` and rear at `+Y`. The outer frame MUST use continuous R3.75 mm rounded plan corners matching the existing OpenGrid outer-corner convention. The top rear outer edge and both upper sloped side edges MUST use continuous nominal R0.6 mm rounded transitions. The highest front outer edge of the top panel MUST remain the height datum. The bottom board MUST be horizontal with 2 mm thickness and its upper datum MUST be Z=2 mm. The backboard MUST remain vertical and use 1.2 mm thickness. The two outer side walls MUST use 1.6 mm thickness. Horizontal internal shelves, vertical internal X dividers, and the top panel MUST use the common angle, rising toward the front, and MUST span the complete Y depth to the rear backboard. The top panel's highest outer front surface MUST be Z=`height`; its rear end MUST be lower by the derived depth elevation. When `angle > 0`, the bottom horizontal board and the first common-angle shelf MUST form a separate bottom wedge that is not counted in `cellZ`; `cellZ` MUST count only the regular parallel cells above that wedge. When `angle = 0`, no bottom wedge shelf MUST be added. The model MUST represent a front opening, not an opening on the top face.

#### Scenario: Default side profile is front-open

- **WHEN** the default component is generated
- **THEN** the front at negative Y MUST be open
- **AND** the bottom board MUST remain horizontal
- **AND** the backboard MUST be vertical
- **AND** the shelves and top panel MUST rise toward negative Y

#### Scenario: Every cell reaches the rear

- **WHEN** the component has any valid `y` and `angle`
- **THEN** each horizontal shelf and each internal X divider MUST extend across the full declared Y depth
- **AND** the cell boundary MUST meet or overlap the rear backboard
- **AND** the opening MUST not be implemented by shortening the cell depth

#### Scenario: Inclined cells start above the bottom wedge

- **WHEN** a valid component has `angle > 0` and `cellZ=Z`
- **THEN** the component MUST contain `Z` regular cells above the bottom wedge
- **AND** every regular shelf plane MUST be parallel to the top panel at the full requested angle
- **AND** the bottom wedge MUST contain the complete front-to-rear elevation difference instead of distributing it across the regular cells

#### Scenario: Panel displays the derived cell space

- **WHEN** the six Open Shelf parameters are valid
- **THEN** the parameter panel MUST display the per-cell clear width and depth to the rear backboard
- **AND** it MUST display the regular cell clear height separately from the bottom wedge height

#### Scenario: Outer frame uses rounded corners and upper transitions

- **WHEN** the component is generated at any valid size
- **THEN** the four outer plan corners MUST be continuous circular arcs with nominal R3.75 mm
- **AND** the top rear outer edge and both upper sloped side edges MUST have nominal R0.6 mm rounded transitions
- **AND** the rounded outer profile MUST preserve the declared rectangular X/Y bounds, the four locating peg positions, and the highest front Z=`height` datum

#### Scenario: Overall height uses the world-Z envelope

- **WHEN** a valid component is generated with `height=H`
- **THEN** the highest outer front surface of the top panel MUST be Z=`H` within the CAD tolerance
- **AND** increasing the angle MUST lower the rear top and reduce rear clear cell height
- **AND** the requested H MUST include board thicknesses but MUST exclude the 3 mm peg extension below the base

### Requirement: Open Shelf has the specified integrated locating pegs

The component MUST include exactly four nominal corner locating pegs integrated with the bottom board. Each peg MUST be a plain cylinder with nominal diameter 4.5 mm and 3 mm exposed height below the bottom board. Peg centers MUST use the existing OpenGrid stackable-box corner placement semantics: nominal X/Y extent is `count * 28 mm` and each corner center is inset 7 mm from that nominal extent. The generated pegs MUST use the existing 4.5 mm interface dimension and MUST NOT include a 7.05 mm retaining shoulder, flange, or separate 7.05 mm positioning feature.

#### Scenario: Default peg placement matches the OpenGrid interface

- **WHEN** the default component is generated
- **THEN** four downward cylindrical pegs MUST be present
- **AND** their nominal centers MUST be at the four combinations of `±(4*28/2-7)` and `±(3*28/2-7)` mm
- **AND** the exposed peg length MUST be 3 mm

#### Scenario: Pegs are plain 4.5 mm cylinders

- **WHEN** the generated shape is inspected at any valid size
- **THEN** the peg shaft diameter MUST be 4.5 mm nominal
- **AND** no 7.05 mm retaining shoulder or flange MUST be present
- **AND** the peg geometry MUST be fused to the bottom board as one printable solid

### Requirement: Open Shelf bounds and exports are deterministic

The component MUST report centered X/Y bounds from the OpenGrid footprint formula, a minimum Z bound of -3 mm for the exposed pegs, and a maximum Z bound equal to the requested total height. Its STEP and binary STL file names MUST include the stable component id and all six typed parameter values in deterministic order. The generated result MUST be a non-empty single solid suitable for the existing preview, STEP, and STL lifecycle.

#### Scenario: Default bounds include only the peg extension below the base

- **WHEN** the default component is generated
- **THEN** its X/Y bounds MUST be approximately `[-55.925, 55.925]` and `[-41.925, 41.925]`
- **AND** its Z bounds MUST be approximately `[-3, 50]`

#### Scenario: Equivalent parameters produce stable export names

- **WHEN** two generations use the same typed parameter snapshot
- **THEN** their STEP and STL file names MUST be identical
- **AND** each name MUST begin with `opengrid-open-shelf-`

#### Scenario: Invalid geometry never becomes an exportable revision

- **WHEN** validation fails or the Worker reports a build failure
- **THEN** the last committed valid revision MAY remain visible as stale
- **AND** STEP/STL export MUST remain disabled for the invalid or failed generation
