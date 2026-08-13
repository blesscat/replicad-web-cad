## MODIFIED Requirements

### Requirement: Honeycomb material-saving cylinder mode

The existing `opengrid-stackable-cylinder` model MUST expose a `honeycombMode` boolean profile flag. `honeycombMode` MUST default to `false`, MUST be accepted in legacy hydration as `false` when absent, and MUST preserve the existing model ID `opengrid-stackable-cylinder`, route, diameter and height semantics, thin-bottom/bottom-plate profile semantics, bottom-hole switch, four-direction opening fields, preview lifecycle, and STEP/STL export workflow. The parameter panel MUST expose the flag as `省料模式（六角鏤空）` without replacing the existing mutually exclusive bottom-profile choices. When enabled, the profile MUST be the Hex Mesh style: complete staggered hexagonal openings MUST be separated by a continuous printable rib network; the profile MUST NOT claim to implement the separate vertical-groove Ribbed style.

#### Scenario: Legacy and default cylinder snapshots keep the solid profile

- **WHEN** a persisted or imported stackable-cylinder snapshot does not contain `honeycombMode`
- **THEN** hydration and validation MUST normalize `honeycombMode=false`
- **AND** the generated geometry and existing export identity MUST remain the same as the corresponding default, thin-bottom, or bottom-plate profile

#### Scenario: The user enables cylinder Hex Mesh mode

- **WHEN** a valid stackable-cylinder snapshot has `honeycombMode=true`
- **THEN** the panel MUST retain the existing diameter, height, bottom-hole, bottom-profile, and four-direction opening controls
- **AND** the normalized Worker snapshot MUST contain the typed boolean `honeycombMode=true`
- **AND** the model MUST retain its existing `opengrid-stackable-cylinder` identity and route
- **AND** the generated eligible panels MUST use a staggered, point-up Hex Mesh rather than isolated, widely separated hex cutouts

#### Scenario: Cylinder side faces use a continuous curved Hex Mesh

- **WHEN** a valid cylinder has `honeycombMode=true` and an eligible circumferential wall band is large enough for a complete cell
- **THEN** the curved side-wall material MUST be replaced by connected hexagonal openings separated by continuous ribs using the cylinder's existing outer envelope
- **AND** neighboring openings MUST use the configured printable rib thickness rather than the legacy 14 mm cell-center spacing
- **AND** the default 20 mm-height profile MUST show at least two staggered rows around the eligible wall band
- **AND** an unobstructed wall row MUST wrap continuously around the circumference without an artificial solid seam at the tangent-layout boundary
- **AND** the top rim, inner guide chamfer, lower foot or bottom-plate transition, outer edge frame, and all active side-opening boundary bridges MUST remain solid
- **AND** the wall lattice MUST extend to each protected vertical-band and side-opening boundary, with intersecting cells clipped at those boundaries instead of discarded wholesale
- **AND** the usable curved wall outside those protected regions MUST NOT contain avoidable broad solid bands caused only by whole-cell rejection
- **AND** every complete or clipped side opening MUST cut cleanly through the curved inner and outer wall faces across its full tangent width without leaving an uncut crescent
- **AND** the lattice MUST not change the requested diameter, height, circular bounds, or active floor datum

#### Scenario: Cylinder bottom faces use protected Hex Mesh openings

- **WHEN** a valid cylinder has `honeycombMode=true` and an eligible circular-floor region is large enough for a complete cell
- **THEN** the eligible bottom-floor material MUST contain connected hexagonal openings and ribs
- **AND** bottom-floor hexagonal openings MUST use a smaller cell size than the side-wall openings
- **AND** eligible default, bottom-plate, and thin-bottom floor openings MUST pass through the floor so the Hex Mesh is visible from both floor faces
- **AND** the floor lattice MUST extend to the protected circular frame, with intersecting boundary cells clipped at the frame instead of discarded wholesale
- **AND** the outer circular frame, central mating feature, floor/ramp or fillet transition, and peripheral lower stacking boundary MUST remain solid
- **AND** the center hole and every permitted cardinal outer hole MUST retain its existing center, diameter, stepped section depths, and enabled/disabled state
- **AND** every existing bottom hole MUST retain a continuous circular safety ring extending 2 mm beyond its maximum opening radius
- **AND** hexagonal cells intersecting a hole safety ring MUST be clipped to the ring instead of being discarded wholesale, and no opening may cut the ring
- **AND** the usable circular floor outside protected frames, transitions, and hole rings MUST NOT contain avoidable broad solid bands caused only by whole-cell rejection

#### Scenario: Existing cylinder interfaces remain unchanged in honeycomb mode

- **WHEN** a valid honeycomb cylinder is generated with bottom holes enabled or disabled and zero or more valid side openings
- **THEN** same-diameter cylinders MUST retain the existing protrusion/cavity mating clearance and lateral guide behavior
- **AND** the selected default, thin-bottom, or bottom-plate floor and lower printable profile MUST remain valid
- **AND** every enabled side opening MUST retain its requested direction, bottom, depth, angle, and neighboring structural separation
- **AND** the result MUST remain one valid non-empty solid suitable for preview, STEP export, and STL export

#### Scenario: Small cylinder panels fall back without destructive cuts

- **WHEN** `honeycombMode=true` but a curved wall or circular-floor region cannot contain a complete hexagonal cell after its edge and protected-region clearances are applied
- **THEN** that region MUST remain solid or use only complete safe cells
- **AND** generation MUST remain valid
- **AND** the builder MUST NOT enlarge, move, merge, or remove any existing hole, opening, or stacking feature merely to fit a lattice cell
- **AND** thin-bottom mode alone MUST NOT force a no-cell fallback when complete protected floor cells fit
- **AND** a circular-floor boundary or hole safety ring MAY use a clipped partial cell when every retained frame, transition, hole, and stacking-interface constraint remains satisfied
- **AND** a curved side-wall or side-opening boundary MAY use a clipped partial cell when every retained rim, transition, and structural-bridge constraint remains satisfied

#### Scenario: Honeycomb cylinder output is distinguishable and materially lighter

- **WHEN** a valid honeycomb cylinder with at least one eligible lattice panel is exported
- **THEN** its STEP and STL filenames MUST identify the honeycomb profile with a deterministic `honeycomb` suffix
- **AND** its B-Rep volume MUST be lower than the otherwise identical non-honeycomb profile within geometry tolerance
- **AND** the existing filename identity MUST remain unchanged when `honeycombMode=false`
