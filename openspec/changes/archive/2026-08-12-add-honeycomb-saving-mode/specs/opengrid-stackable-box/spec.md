## ADDED Requirements

### Requirement: Honeycomb material-saving box mode

The existing `opengrid-stackable-box` model MUST expose a `honeycombMode` boolean profile flag. `honeycombMode` MUST default to `false`, MUST be accepted in legacy hydration as `false` when absent, and MUST preserve the existing model ID `opengrid-stackable-box`, route, footprint, height semantics, normal/base-plate/thin-shell mode semantics, opening fields, bottom-hole fields, preview lifecycle, and STEP/STL export workflow. The parameter panel MUST expose the flag as `省料模式（六角鏤空）` without replacing the existing mutually exclusive box-mode choices.

#### Scenario: Legacy and default snapshots keep the solid profile

- **WHEN** a persisted or imported stackable-box snapshot does not contain `honeycombMode`
- **THEN** hydration and validation MUST normalize `honeycombMode=false`
- **AND** the generated geometry and existing export identity MUST remain the same as the corresponding normal, base-plate, or thin-shell profile

#### Scenario: The user enables honeycomb mode

- **WHEN** a valid stackable-box snapshot has `honeycombMode=true`
- **THEN** the panel MUST retain the existing X/Y, height, bottom-hole, mode, and four-direction opening controls
- **AND** the normalized Worker snapshot MUST contain the typed boolean `honeycombMode=true`
- **AND** the model MUST retain its existing `opengrid-stackable-box` identity and route

#### Scenario: Box side faces use a printable hexagonal lattice

- **WHEN** a valid box has `honeycombMode=true` and an eligible side panel is large enough for a complete cell
- **THEN** the continuous side-wall material in that panel MUST be replaced by connected hexagonal openings and ribs
- **AND** the outer perimeter frame, rounded corners, top rim or rail, lower structural transition, and all active side-opening boundary bridges MUST remain solid
- **AND** the lattice MUST remain within the existing X/Y/Z envelope and MUST NOT change the requested clear internal height

#### Scenario: Box bottom faces use protected hexagonal openings

- **WHEN** a valid box has `honeycombMode=true` and an eligible bottom-floor region is large enough for a complete cell
- **THEN** the eligible bottom-floor material MUST contain connected hexagonal openings and ribs
- **AND** the outer bottom frame, corner structural regions, bottom guide or base-plate support, grid-seam reliefs, and active floor transitions MUST remain solid
- **AND** every existing corner socket and ordinary bottom-grid hole MUST retain its normalized center, diameter, section depth, and through/open state
- **AND** no hexagonal opening may intersect an existing hole or its required structural keep-out region

#### Scenario: Existing box interfaces remain unchanged in honeycomb mode

- **WHEN** a valid honeycomb box is generated with any supported bottom-hole selection, floor mode, and zero or more valid side openings
- **THEN** all selected OpenGrid Snap mounting sockets and ordinary bottom holes MUST remain at their existing positions and profiles
- **AND** the normal-mode box-to-box sliding guide, base-plate printable base, or thin-shell non-stackable profile MUST retain its existing contract
- **AND** every enabled side opening MUST retain its requested direction, bottom, depth, angle, and neighboring structural separation
- **AND** the result MUST remain one valid non-empty solid suitable for preview, STEP export, and STL export

#### Scenario: Small box panels fall back without destructive cuts

- **WHEN** `honeycombMode=true` but a side or bottom region cannot contain a complete hexagonal cell after its edge and protected-region clearances are applied
- **THEN** that region MUST remain solid or use only complete safe cells
- **AND** generation MUST remain valid
- **AND** the builder MUST NOT enlarge, move, merge, or remove any existing hole, opening, or interface feature merely to fit a lattice cell

#### Scenario: Honeycomb box output is distinguishable and materially lighter

- **WHEN** a valid honeycomb box with at least one eligible lattice panel is exported
- **THEN** its STEP and STL filenames MUST identify the honeycomb profile with a deterministic `honeycomb` suffix
- **AND** its B-Rep volume MUST be lower than the otherwise identical non-honeycomb profile within geometry tolerance
- **AND** the existing filename identity MUST remain unchanged when `honeycombMode=false`

### Requirement: Honeycomb box quality protection

The stackable-box quality gate MUST inspect honeycomb-mode candidates separately from solid profiles. It MUST reject a candidate that changes any protected hole profile, cuts a protected interface or opening boundary, creates an invalid or multi-solid result, exceeds the existing bounds, or fails preview/export eligibility. The quality report MUST identify whether honeycomb mode was enabled and MUST distinguish a valid no-cell fallback from a failed lattice construction.

#### Scenario: Honeycomb quality rejects protected-feature damage

- **WHEN** a honeycomb candidate changes a socket center, ordinary bottom-hole center, hole diameter, stepped section, floor-support probe, stacking probe, or enabled side-opening boundary
- **THEN** the candidate MUST be rejected with a diagnosable honeycomb or protected-feature error
- **AND** the last valid committed model MUST remain available

#### Scenario: Honeycomb quality accepts a protected valid result

- **WHEN** a honeycomb candidate contains only safe complete cells and passes all existing box geometry, hole, opening, interface, and export checks
- **THEN** the candidate MUST be eligible for commit, preview, STEP export, and STL export
