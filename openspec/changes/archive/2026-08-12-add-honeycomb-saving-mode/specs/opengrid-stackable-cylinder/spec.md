## ADDED Requirements

### Requirement: Honeycomb material-saving cylinder mode

The existing `opengrid-stackable-cylinder` model MUST expose a `honeycombMode` boolean profile flag. `honeycombMode` MUST default to `false`, MUST be accepted in legacy hydration as `false` when absent, and MUST preserve the existing model ID `opengrid-stackable-cylinder`, route, diameter and height semantics, thin-bottom/bottom-plate profile semantics, bottom-hole switch, four-direction opening fields, preview lifecycle, and STEP/STL export workflow. The parameter panel MUST expose the flag as `省料模式（六角鏤空）` without replacing the existing mutually exclusive bottom-profile choices.

#### Scenario: Legacy and default cylinder snapshots keep the solid profile

- **WHEN** a persisted or imported stackable-cylinder snapshot does not contain `honeycombMode`
- **THEN** hydration and validation MUST normalize `honeycombMode=false`
- **AND** the generated geometry and existing export identity MUST remain the same as the corresponding default, thin-bottom, or bottom-plate profile

#### Scenario: The user enables cylinder honeycomb mode

- **WHEN** a valid stackable-cylinder snapshot has `honeycombMode=true`
- **THEN** the panel MUST retain the existing diameter, height, bottom-hole, bottom-profile, and four-direction opening controls
- **AND** the normalized Worker snapshot MUST contain the typed boolean `honeycombMode=true`
- **AND** the model MUST retain its existing `opengrid-stackable-cylinder` identity and route

#### Scenario: Cylinder side faces use a printable curved hexagonal lattice

- **WHEN** a valid cylinder has `honeycombMode=true` and an eligible circumferential wall band is large enough for a complete cell
- **THEN** the curved side-wall material MUST be replaced by connected hexagonal openings and ribs using the cylinder's existing outer envelope
- **AND** the top rim, inner guide chamfer, lower foot or bottom-plate transition, outer edge frame, and all active side-opening boundary bridges MUST remain solid
- **AND** the lattice MUST not change the requested diameter, height, circular bounds, or active floor datum

#### Scenario: Cylinder bottom faces use protected hexagonal openings

- **WHEN** a valid cylinder has `honeycombMode=true` and an eligible circular-floor region is large enough for a complete cell
- **THEN** the eligible bottom-floor material MUST contain connected hexagonal openings and ribs
- **AND** the outer circular frame, central mating feature, floor/ramp or fillet transition, and all lower stacking geometry MUST remain solid
- **AND** bottom-floor cells MUST begin above the preserved lower mating skin/profile; if a selected floor profile has no safe vertical span above that interface, the bottom panel MUST use the valid no-cell fallback
- **AND** the center hole and every permitted cardinal outer hole MUST retain its existing center, diameter, stepped section depths, and enabled/disabled state
- **AND** no hexagonal opening may intersect an existing hole or its required radial and floor keep-out region

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

#### Scenario: Honeycomb cylinder output is distinguishable and materially lighter

- **WHEN** a valid honeycomb cylinder with at least one eligible lattice panel is exported
- **THEN** its STEP and STL filenames MUST identify the honeycomb profile with a deterministic `honeycomb` suffix
- **AND** its B-Rep volume MUST be lower than the otherwise identical non-honeycomb profile within geometry tolerance
- **AND** the existing filename identity MUST remain unchanged when `honeycombMode=false`

### Requirement: Honeycomb cylinder quality protection

The stackable-cylinder quality gate MUST inspect honeycomb-mode candidates separately from solid profiles. It MUST reject a candidate that changes any protected center or outer hole profile, cuts a protected interface or opening boundary, creates an invalid or multi-solid result, exceeds the existing bounds, or fails preview/export eligibility. The quality report MUST identify whether honeycomb mode was enabled and MUST distinguish a valid no-cell fallback from a failed lattice construction.

#### Scenario: Honeycomb quality rejects protected-feature damage

- **WHEN** a honeycomb candidate changes a bottom-hole center, stepped diameter, stepped depth, floor-support probe, same-diameter mating probe, or enabled side-opening boundary
- **THEN** the candidate MUST be rejected with a diagnosable honeycomb or protected-feature error
- **AND** the last valid committed model MUST remain available

#### Scenario: Honeycomb quality accepts a protected valid result

- **WHEN** a honeycomb candidate contains only safe complete cells and passes all existing cylinder geometry, hole, opening, interface, and export checks
- **THEN** the candidate MUST be eligible for commit, preview, STEP export, and STL export
