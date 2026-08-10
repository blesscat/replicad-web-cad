## MODIFIED Requirements

### Requirement: OpenGrid stackable-cylinder identity and parameters

The system MUST expose an independently validated OpenGrid component with `modelId=opengrid-stackable-cylinder`, `buildKey=opengrid-stackable-cylinder`, and route `/cad/opengrid-stackable-cylinder`. Its user-facing display name MUST begin with `OpenGrid `. The normalized parameter snapshot MUST contain exactly the existing diameter, height, bottom-mode, and bottom-hole fields plus three typed opening fields for each of `+X`, `-X`, `+Y`, and `-Y`: `openingPlusXDepth`, `openingPlusXBottomLength`, `openingPlusXAngle`, `openingMinusXDepth`, `openingMinusXBottomLength`, `openingMinusXAngle`, `openingPlusYDepth`, `openingPlusYBottomLength`, `openingPlusYAngle`, `openingMinusYDepth`, `openingMinusYBottomLength`, and `openingMinusYAngle`. `diameter` MUST represent the outer diameter and MUST be within 20–300 mm; `height` MUST be within 10–500 mm. Both fields MUST use a 1 mm step and decimal, empty, non-finite, zero, negative, and out-of-range values MUST be rejected without rounding. Opening depth and flat-bottom length MUST be finite non-negative integer millimetres with a 1 mm step; every bottom-length control MUST default to and start at 1 mm. Its live maximum MUST be the largest integer that keeps its derived upper width strictly below the outer diameter and keeps each enabled neighboring opening pair strictly below a combined 90° angular footprint, capped by the configured global maximum. A zero-depth opening remains geometrically disabled, so its default 1 mm length MUST NOT create an opening. The depth control's live maximum MUST be the selected cylinder height minus the active floor thickness (5 mm in default mode and 3 mm in thin or bottom-plate mode), capped by the configured global maximum; the exact floor boundary MUST be accepted and deeper values MUST be rejected. An enabled opening angle MUST be an integer degree between 1 and 90, measured from the flat bottom; 90° MUST produce vertical side walls and 45° MUST produce outward-sloping V-like side walls. A zero opening depth MUST mean that direction has no side opening, allowing legacy geometry to remain unchanged. The existing model identity MUST remain unchanged.

#### Scenario: Valid cylinder defaults

- **WHEN** the cylinder route initializes without valid persisted parameters
- **THEN** the catalog defaults MUST provide a valid diameter, height, bottom-mode, bottom-hole, and four-direction opening snapshot
- **AND** the opening defaults MUST preserve the existing cylinder geometry unless a user enables a positive opening depth
- **AND** the model MUST be centered on X/Y with its base at Z=0
- **AND** the Worker MUST generate a non-empty previewable B-Rep

#### Scenario: Valid diameter, height, and opening changes

- **WHEN** a user enters integer diameter and height values within the declared ranges and valid opening values for any directions
- **THEN** the snapshot MUST pass component validation
- **AND** the generated bounds MUST use the requested outer diameter and overall height within the project tolerance
- **AND** each positive opening depth, flat-bottom length, and angle MUST be retained independently in the normalized snapshot

#### Scenario: Invalid cylinder or opening parameters

- **WHEN** diameter or height is fractional, empty, non-finite, non-positive, or outside its declared range
- **THEN** validation MUST return a field-specific error
- **AND** the invalid snapshot MUST NOT be sent to the Worker for generation or export
- **WHEN** an opening depth or bottom length is fractional, negative, non-finite, or geometrically unsupported, an enabled opening has no positive straight side remaining between its fixed-radius transitions, or an enabled opening angle is outside 1–90 degrees or fractional
- **THEN** validation MUST return an error for that direction's field
- **AND** the invalid snapshot MUST NOT replace the last valid model revision

### Requirement: Cylinder geometry quality and exports

The builder MUST reject any generated cylinder that is empty, non-finite, not a single valid solid, has invalid B-Rep topology, violates its bounds, violates the stepped hole profile, violates outer-hole clearance, violates any enabled four-direction opening profile or separation constraint, or fails the same-diameter interface probes. A valid committed result MUST remain eligible for preview, STEP export, and binary STL export through the existing Worker lifecycle.

#### Scenario: Valid cylinder is exportable

- **WHEN** a valid parameter snapshot, including zero or more enabled side openings, completes geometry and quality validation
- **THEN** the workspace MUST commit a non-empty preview revision
- **AND** STEP and STL export MUST be enabled for that committed revision

#### Scenario: Valid independent openings preserve the existing interfaces

- **WHEN** one or more directions use different valid depth, flat-bottom length, or angle values
- **THEN** each enabled opening MUST be present only at its requested cardinal direction
- **AND** all bottom holes, the active floor, the printable lower profile, and the same-diameter stacking interface MUST remain valid
- **AND** the result MUST remain a single valid solid

#### Scenario: Invalid geometry does not replace the current model

- **WHEN** geometry, opening separation, floor preservation, or interface validation fails
- **THEN** the candidate MUST be rejected with a diagnosable error
- **AND** the last valid committed revision MUST remain visible
- **AND** export MUST remain disabled for the failed snapshot

### Requirement: Deterministic cylinder export metadata

The catalog MUST provide deterministic filenames that include the model slug, outer diameter, and height, using `.step` for STEP and `.stl` for STL. The filenames MUST be generated from typed normalized parameters and MUST NOT depend on raw input formatting. When any side opening differs from its no-opening default, the filename identity MUST include a deterministic opening-settings fingerprint that changes whenever any of the twelve opening values changes. When all four opening depths are zero, the existing filename identity MUST remain unchanged.

#### Scenario: Cylinder export filenames

- **WHEN** a cylinder with diameter 56 mm and height 30 mm and no enabled side openings is exported
- **THEN** the suggested STEP filename MUST identify `opengrid-stackable-cylinder`, `d56`, and `h30`
- **AND** the suggested STL filename MUST use the same typed parameter identity with the `.stl` extension

#### Scenario: Opening settings are represented deterministically

- **WHEN** two valid cylinders have identical dimensions and bottom settings but different opening values
- **THEN** their suggested STEP and STL filenames MUST have different deterministic opening identities
- **AND** equivalent typed values entered with different raw formatting MUST produce the same filename

## ADDED Requirements

### Requirement: Four independently configurable top-open side openings

The `opengrid-stackable-cylinder` MUST support one top-open access opening at each cardinal direction `+X`, `-X`, `+Y`, and `-Y`. Each direction MUST use its own depth, flat-bottom length, and transition-angle values; changing one direction MUST NOT copy, rotate, or otherwise change the values of another direction. An opening with depth zero MUST be omitted while the other directions remain independently generatable. The side-wall angle sliders MUST render in reverse visual direction while preserving their numeric values and geometry semantics.

#### Scenario: Four directions retain separate settings

- **WHEN** the user assigns distinct valid triples to `+X`, `-X`, `+Y`, and `-Y`
- **THEN** the generated shape MUST contain four openings with the corresponding distinct profiles at those directions
- **AND** changing only the `+X` triple MUST leave the other three normalized triples and generated opening profiles unchanged

#### Scenario: One direction can remain closed

- **WHEN** exactly one direction has zero opening depth and the other directions have valid positive depths
- **THEN** the zero-depth direction MUST retain an uncut cylindrical wall
- **AND** the other directions MUST still contain their requested openings

#### Scenario: Side-opening controls remain collapsed until requested

- **WHEN** the cylinder parameter panel is first displayed
- **THEN** the four side-opening groups MUST be contained in one collapsed disclosure labelled `四個方向開口設定`
- **AND** the groups MUST be labelled `前方`, `後方`, `左方`, and `右方`, mapped to internal `-Y`, `+Y`, `-X`, and `+X` respectively
- **AND** the `前方` group MUST be expanded by default while the other three groups MUST be collapsed by default
- **AND** the four groups' controls MUST become visible after the user expands the outer disclosure
- **AND** expanding or collapsing the disclosure MUST NOT change any normalized opening values

### Requirement: Flat-bottom U/V-shaped opening profile

Each enabled opening MUST be generated from a symmetric local U/V-shaped notch profile with a horizontal flat bottom of the requested length, fixed 2.5 mm rounded transitions at both lower corners and both upper entrances, and straight side walls between them. It MUST be an open-top U/V-shaped notch, not a circular hole. The requested depth MUST be the vertical distance from the top edge to the lowest flat-bottom plane. The side-wall angle MUST be measured from the flat bottom; 90° MUST produce vertical ㄩ-like sides and 45° MUST produce outward-sloping V-like sides. The builder MUST derive both transition endpoints and the upper opening width from the requested depth, bottom length, fixed radius, and side angle without accepting a separate radius field. The upper profile turn, when measured along the closed cutter path, MUST be `180° - θ` rather than a reflex `360° - θ`; its physical side slope MUST remain `θ`. The profile MUST be mirrored about its direction centerline and MUST open through the top wall without removing material below the active floor.

#### Scenario: Flat bottom and side arcs match the controls

- **WHEN** an enabled opening is generated with a valid depth, bottom length, and side-wall angle
- **THEN** its lowest boundary MUST be a flat segment with the requested length
- **AND** its lowest boundary MUST be at the requested depth below the top edge within the project tolerance
- **AND** its two lower and two upper side transitions MUST be matching circular arcs with a 2.5 mm radius
- **AND** its straight side boundaries MUST have the requested angle relative to the flat bottom
- **AND** the upper transitions MUST meet the horizontal top entrance without a sharp corner
- **AND** the opening MUST be open at the top edge

#### Scenario: Side angle changes the derived slope

- **WHEN** two otherwise identical openings use different valid side-wall angles
- **THEN** their flat-bottom depth and length MUST remain unchanged
- **AND** their fixed 2.5 mm transition radii MUST remain unchanged
- **AND** their upper opening widths and straight-side slopes MUST differ according to the angle
- **AND** neither profile may use a user-visible radius control

### Requirement: Side-opening safety and existing cylinder preservation

Every enabled opening MUST remain compatible with the active default, thin, or bottom-plate floor profile. Its lowest boundary MUST NOT remove the center floor, stepped-hole bearing floor, bottom protrusion, or lower printable transition. The derived opening width MUST leave valid material between neighboring cardinal openings and MUST preserve the nominal 2 mm wall outside the cut boundaries. The opening feature MUST NOT change the existing 14 mm hole calculation, hole enable switch, or same-diameter-only stacking promise.

#### Scenario: Opening depth respects the active floor mode

- **WHEN** a valid opening is generated in default, thin, or bottom-plate mode
- **THEN** the opening bottom MUST remain at or above the active floor boundary required by that mode
- **AND** the active floor thickness and internal floor fillet or bottom-plate corner MUST remain valid
- **AND** the opening MUST NOT cut into the bottom protrusion or lower external bevel

#### Scenario: Neighboring openings do not merge

- **WHEN** four independent opening profiles are generated around the same cylinder
- **THEN** the builder MUST reject any parameter set whose derived openings overlap or leave an invalid zero-width structural bridge
- **AND** a valid parameter set MUST preserve a continuous solid between adjacent opening directions

#### Scenario: Existing holes and stacking remain unchanged

- **WHEN** valid side openings are added to a cylinder with bottom holes enabled or disabled
- **THEN** the center and permitted outer hole locations and stepped profiles MUST remain unchanged
- **AND** same-diameter cylinders MUST retain the existing protrusion/cavity mating behavior
- **AND** different diameters MUST remain outside the compatibility promise
