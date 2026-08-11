## Purpose

This capability defines the independently validated OpenGrid stackable-cylinder component, including its typed parameters, printable circular stacking geometry, safe hole layout, lifecycle quality gates, and deterministic exports.

## Requirements

### Requirement: OpenGrid stackable-cylinder identity and parameters

The system MUST expose the independently validated `opengrid-stackable-cylinder` component with `modelId=opengrid-stackable-cylinder`, `buildKey=opengrid-stackable-cylinder`, and route `/cad/opengrid-stackable-cylinder`. Its user-facing display name MUST begin with `OpenGrid `. The normalized parameter snapshot MUST contain exactly integer `diameter` and `height` values, boolean `thinBottomMode`, boolean `bottomPlateMode`, boolean `bottomHolesEnabled`, and three typed opening fields for each of `+X`, `-X`, `+Y`, and `-Y`: `openingPlusXDepth`, `openingPlusXBottomLength`, `openingPlusXAngle`, `openingMinusXDepth`, `openingMinusXBottomLength`, `openingMinusXAngle`, `openingPlusYDepth`, `openingPlusYBottomLength`, `openingPlusYAngle`, `openingMinusYDepth`, `openingMinusYBottomLength`, and `openingMinusYAngle`. `diameter` MUST represent the outer diameter and MUST be within 20–300 mm; `height` MUST be within 10–500 mm; the default profile is selected when both mode flags are false, the thin-bottom profile when `thinBottomMode=true`, and the bottom-plate profile when `bottomPlateMode=true`. The two mode flags MUST NOT both be true. `bottomHolesEnabled=true` MUST generate the complete center-plus-safe-outer-hole group and `bottomHolesEnabled=false` MUST generate no bottom holes. Both numeric fields MUST use a 1 mm step and decimal, empty, non-finite, zero, negative, and out-of-range values MUST be rejected without rounding. The height slider MUST expose 10–200 mm while the height text input MUST expose 10–500 mm; the existing diameter range and control limits MUST remain unchanged. Opening depth and flat-bottom length MUST be finite non-negative integer millimetres with a 1 mm step; every bottom-length control MUST default to and start at 1 mm. Its live maximum MUST be the largest integer that keeps its derived upper width strictly below the outer diameter and keeps each enabled neighboring opening pair strictly below a combined 90° angular footprint, capped by the configured global maximum. A zero-depth opening remains geometrically disabled, so its default 1 mm length MUST NOT create an opening. The depth control's live maximum MUST be the selected cylinder height minus the active floor thickness (5 mm in default mode and 3 mm in thin or bottom-plate mode), capped by the configured global maximum; the exact floor boundary MUST be accepted and deeper values MUST be rejected. An enabled opening angle MUST be an integer degree between 1 and 90, measured from the flat bottom; 90° MUST produce vertical side walls and 45° MUST produce outward-sloping V-like side walls. A zero opening depth MUST mean that direction has no side opening, allowing legacy geometry to remain unchanged. A legacy snapshot that contains only `diameter` and `height` MUST normalize both mode flags to `false`, the hole flag to `true`, and all opening depths to `0`, bottom lengths to `1`, and angles to `90`. The existing model identity MUST remain unchanged.

#### Scenario: Valid cylinder defaults

- **WHEN** the cylinder route initializes without valid persisted parameters
- **THEN** the catalog defaults MUST provide a valid diameter, height, `thinBottomMode=false`, `bottomPlateMode=false`, and `bottomHolesEnabled=true` snapshot
- **AND** the opening defaults MUST preserve the existing cylinder geometry unless a user enables a positive opening depth
- **AND** the model MUST be centered on X/Y with its base at Z=0
- **AND** the Worker MUST generate a non-empty previewable B-Rep using the default original-style profile

#### Scenario: Valid mode changes

- **WHEN** a user changes the bottom mode while keeping valid diameter and height values
- **THEN** the snapshot MUST pass component validation with the selected boolean mode
- **AND** the Worker MUST generate the corresponding default, thin-bottom, or bottom-plate profile
- **AND** the stable model ID, route, diameter range, height range, and 1 mm numeric controls MUST remain unchanged

#### Scenario: All bottom holes toggle together

- **WHEN** a user changes `bottomHolesEnabled` while keeping the diameter and bottom mode unchanged
- **THEN** the snapshot MUST pass component validation with the selected boolean value
- **AND** `true` MUST generate the center hole and every safe outer cardinal hole for the selected mode
- **AND** `false` MUST generate no bottom holes
- **AND** the UI MUST NOT provide individual center-hole or outer-hole toggles

#### Scenario: Legacy persisted parameters

- **WHEN** browser persistence contains a valid `{ diameter, height }` snapshot without either new boolean field
- **THEN** hydration MUST interpret it as `thinBottomMode=false`, `bottomPlateMode=false`, and `bottomHolesEnabled=true`
- **AND** hydration MUST add depth `0`, bottom length `1`, and angle `90` for every direction
- **AND** persistence MUST rewrite only the normalized snapshot with the explicit default mode after a successful update

#### Scenario: Valid diameter, height, and opening changes

- **WHEN** a user enters integer diameter and height values within the declared ranges and valid opening values for any directions
- **THEN** the snapshot MUST pass component validation
- **AND** the generated bounds MUST use the requested outer diameter and overall height within the project tolerance
- **AND** each positive opening depth, flat-bottom length, and angle MUST be retained independently in the normalized snapshot

#### Scenario: Valid diameter and height changes

- **WHEN** a user enters integer diameter and height values within the declared ranges
- **THEN** the snapshot MUST pass component validation
- **AND** the generated bounds MUST use the requested outer diameter and overall height within the project tolerance

#### Scenario: Maximum manual height is valid

- **WHEN** a user enters `height=500` while the diameter remains within 20–300 mm
- **THEN** the snapshot MUST pass component validation
- **AND** the generated cylinder MUST have the requested 500 mm overall height
- **AND** the height slider MUST retain a maximum of 200 mm

#### Scenario: Invalid cylinder or opening parameters

- **WHEN** diameter, height, `thinBottomMode`, `bottomPlateMode`, or `bottomHolesEnabled` is fractional, empty, non-finite, non-boolean, non-positive, or outside its declared range, or both mode flags are true
- **THEN** validation MUST return a field-specific error
- **AND** the invalid snapshot MUST NOT be sent to the Worker for generation or export
- **WHEN** an opening depth or bottom length is fractional, negative, non-finite, or geometrically unsupported, an enabled opening has no positive straight side remaining between its fixed-radius transitions, or an enabled opening angle is outside 1–90 degrees or fractional
- **THEN** validation MUST return an error for that direction's field
- **AND** the invalid snapshot MUST NOT replace the last valid model revision

#### Scenario: Invalid cylinder parameters

- **WHEN** diameter, height, `thinBottomMode`, `bottomPlateMode`, or `bottomHolesEnabled` is fractional, empty, non-finite, non-boolean, non-positive, or outside its declared range, or both mode flags are true
- **THEN** validation MUST return a field-specific error
- **AND** the invalid snapshot MUST NOT be sent to the Worker for generation or export

### Requirement: Cylindrical shell and floor

The generated `opengrid-stackable-cylinder` MUST remain an open-top circular container with the requested outer diameter, fixed 2 mm straight-wall thickness, and overall requested height. When both mode flags are false, its original-style central floor MUST be 5 mm above the outside bottom surface and the inner floor-to-wall transition MUST use the original 0.6 mm fillet. When `thinBottomMode=true`, its central flat floor MUST be 3 mm above the outside bottom surface and MUST connect to the original sharp internal 45-degree conical ramp. When `bottomPlateMode=true`, it MUST retain a 3 mm central floor and the default-style vertical inner wall with the original 0.6 mm floor fillet, without an internal 45-degree ramp; it MUST retain the 2+1 mm hole-bearing floor while replacing the lower foot with a flat bottom at the clearance-reduced protrusion radius. Its outer profile MUST run directly from that flat bottom into a 45-degree transition to the nominal outer radius. The inner cavity MUST remain open at the top and the straight inner wall MUST remain at radius `R - 2`, where `R` is the requested outer radius. No mode may add a lower filler layer or a thickened stacking ring.

The default and thin modes MUST retain the common printable lower profile: a 0.8 mm, 45-degree foot bevel, a vertical landing through Z=2.6, and a direct 2 mm, 45-degree external transition to the nominal outer radius at Z=4.6. The bottom-plate mode MUST remove the geometry below the former Z=2.6 cut line and begin at Z=0 with a flat clearance-reduced mating face, followed directly by its 45-degree external transition. The preview MUST remain centered on X/Y and based at Z=0.

#### Scenario: Default original-style shell

- **WHEN** a valid cylinder is generated with `thinBottomMode=false` and `bottomPlateMode=false`
- **THEN** the result MUST retain the 2 mm straight wall and 5 mm central floor contract
- **AND** the inner floor corner MUST expose the original 0.6 mm fillet
- **AND** the open cavity MUST begin above the 5 mm floor without penetrating the floor outside the requested mounting holes

#### Scenario: Thin-bottom shell

- **WHEN** a valid cylinder is generated with `thinBottomMode=true` and `bottomPlateMode=false`
- **THEN** the result MUST retain the 2 mm straight wall and 3 mm central flat floor contract
- **AND** the sharp 45-degree inner ramp MUST connect the flat floor to the straight inner wall
- **AND** the inner ramp MUST remain a 2 mm normal offset from the external 45-degree transition
- **AND** no internal fillet or bottom filler may be present

#### Scenario: Minimum valid shell in all three profiles

- **WHEN** a cylinder with diameter 20 mm and a valid height is generated in any of the three profiles
- **THEN** the selected floor, wall, and lower-profile contract MUST remain valid
- **AND** the open cavity MUST be present without unintended penetration outside the requested mounting holes

#### Scenario: Maximum valid shell in all three profiles

- **WHEN** a cylinder with diameter 300 mm and a valid height is generated in any of the three profiles
- **THEN** the result MUST retain the requested outer envelope and height
- **AND** the builder MUST NOT silently scale, clamp, or change the diameter

### Requirement: Stepped center mounting hole

When `bottomHolesEnabled=true`, every valid cylinder MUST contain one centered floor hole at `(0, 0)`. From the outside bottom surface toward the interior, the hole profile MUST depend on the selected profile: in the default mode it MUST have a straight `Ø4.05 mm` section from nominal Z=0 through Z=4, followed by a straight `Ø7.05 mm` section from nominal Z=4 through Z=5; in thin-bottom and bottom-plate modes it MUST have a straight `Ø4.05 mm` section from nominal Z=0 through Z=2, followed by a straight `Ø7.05 mm` section from nominal Z=2 through Z=3. Each transition MUST be a planar shoulder at the selected first-section depth and MUST NOT be a taper or a chamfer. When `bottomHolesEnabled=false`, no center or outer bottom hole may be generated.

#### Scenario: Default center hole profile

- **WHEN** a valid cylinder completes generation with `thinBottomMode=false` and `bottomPlateMode=false`
- **THEN** its center floor hole MUST expose a `Ø4.05 mm` outside opening through 4 mm of floor depth
- **AND** the hole MUST change to `Ø7.05 mm` after 4 mm of axial depth
- **AND** the larger section MUST terminate at the 5 mm interior floor surface

#### Scenario: Thin center hole profile

- **WHEN** a valid cylinder completes generation with `thinBottomMode=true` and `bottomPlateMode=false`
- **THEN** its center floor hole MUST expose a `Ø4.05 mm` outside opening through 2 mm of floor depth
- **AND** the hole MUST change to `Ø7.05 mm` after 2 mm of axial depth
- **AND** the larger section MUST terminate at the 3 mm central flat floor surface

#### Scenario: Bottom holes disabled

- **WHEN** a valid cylinder completes generation with `bottomHolesEnabled=false`
- **THEN** the bottom surface MUST remain solid across the center and all outer-hole candidate locations
- **AND** the result MUST contain no stepped-hole cylindrical faces

#### Scenario: Center hole remains at the origin

- **WHEN** the diameter or bottom mode changes through the supported values while `bottomHolesEnabled=true`
- **THEN** the center hole MUST remain at X=0 and Y=0
- **AND** the selected mode MUST NOT move or resize either fixed hole diameter

### Requirement: Four outer cardinal holes from the 14 mm grid

When `bottomHolesEnabled=true`, in addition to the center hole the builder MUST calculate the outer-hole index from the 14 mm grid and emit only the outermost four cardinal holes. Let `R=diameter/2`, `rH=7.05/2`, `P=14`, and `E=2`. In default and bottom-plate modes, the index MUST be `n=max(0, floor((R-E-rH)/P))`. In thin-bottom mode, the index MUST use both the outer boundary and the derived central flat-floor/ramp boundary: `n=max(0, floor(min((R-E-rH)/P, (rFlat-2-rH)/P)))`. When `n>=1`, the builder MUST add exactly `(±14n,0)` and `(0,±14n)`; when `n=0`, it MUST add no outer holes. No diagonal holes, intermediate grid holes, or additional X/Y holes are permitted. Every outer hole MUST use the mode-specific stepped profile from the center-hole requirement. When `bottomHolesEnabled=false`, the builder MUST emit no outer holes regardless of the calculated index.

#### Scenario: Small diameter is center-only

- **WHEN** `bottomHolesEnabled=true` and a valid diameter cannot fit a complete `Ø7.05 mm` outer-hole profile with the selected mode's required clearances
- **THEN** the generated result MUST contain the center hole only
- **AND** the builder MUST NOT emit an unsafe, off-grid, or ramp-intersecting outer hole

#### Scenario: Default first safe outer layer

- **WHEN** `thinBottomMode=false`, `bottomPlateMode=false`, `bottomHolesEnabled=true`, and diameter is 40 mm or greater at the first safe grid layer
- **THEN** the result MUST contain exactly four outer holes at `(+14,0)`, `(-14,0)`, `(0,+14)`, and `(0,-14)`
- **AND** no other non-center hole may be present

#### Scenario: Thin first safe outer layer

- **WHEN** `thinBottomMode=true`, `bottomPlateMode=false`, `bottomHolesEnabled=true`, and diameter is 48 mm or less at the first candidate layer
- **THEN** the result MUST remain center-only because the outer holes cannot retain the required flat-floor/ramp margin
- **WHEN** `thinBottomMode=true`, `bottomPlateMode=false`, `bottomHolesEnabled=true`, and diameter is 49 mm or greater at the first safe grid layer
- **THEN** the result MUST contain exactly the four first-layer cardinal holes

#### Scenario: Maximum diameter uses the outermost safe layer

- **WHEN** a valid cylinder with diameter 300 mm is generated in any of the three profiles with `bottomHolesEnabled=true`
- **THEN** the result MUST place the four outer holes at `(+140,0)`, `(-140,0)`, `(0,+140)`, and `(0,-140)`
- **AND** the hole set MUST contain no additional grid points

### Requirement: Outer-edge hole clearance

When `bottomHolesEnabled=true`, the outer circular edge of every generated outer `Ø7.05 mm` hole opening MUST remain at least 2 mm from the outer cylindrical boundary in its radial direction. In thin-bottom mode, the complete outer-hole profile MUST also remain at least 2 mm inside the radial start of the central flat floor so no generated hole may intersect the 45-degree internal ramp. In default and bottom-plate modes, the hole-bearing floor MUST remain continuous around each selected outer hole. All three profiles MUST use the largest hole section for their clearance checks. When `bottomHolesEnabled=false`, no hole-clearance calculation is required because no bottom holes exist.

#### Scenario: Safe outer-hole placement

- **WHEN** `bottomHolesEnabled=true` and an outer-hole grid point is selected in any of the three profiles
- **THEN** the radial distance from the hole's `Ø7.05 mm` outer edge to the cylinder boundary MUST be at least 2 mm
- **AND** in thin-bottom mode the radial distance from that edge to the internal ramp start MUST be at least 2 mm
- **AND** the complete stepped hole MUST remain inside the selected mode's hole-bearing floor

#### Scenario: Hole clearance checks are inactive when disabled

- **WHEN** `bottomHolesEnabled=false`
- **THEN** no outer-hole clearance failure may be raised because no bottom hole is generated

#### Scenario: Unsafe grid layer is skipped

- **WHEN** the next 14 mm grid layer would violate either applicable 2 mm clearance
- **THEN** that layer MUST NOT be generated
- **AND** the preceding safe outermost layer, or center-only layout, MUST remain unchanged

### Requirement: Same-diameter stacking interface

Every valid `opengrid-stackable-cylinder` MUST include a central bottom mating feature that enters the matching open cavity of a same-diameter cylinder in all three modes. The top cavity radius MUST remain `R - 2`; the bottom protrusion or bottom-plate mating face radius MUST remain `R - 2.2`, providing a fixed 0.2 mm radial printing clearance while preserving the 2 mm nominal wall. Two cylinders with the same outer diameter and compatible height placement MUST seat through this interface and remain laterally guided without permanent posts or a thickened stacking ring. Compatibility between different diameters is explicitly outside this requirement.

The top outer rim MUST remain a normal square 2 mm wall with no added stacking ring, while the top inner rim MUST expose a 2 mm, 45-degree chamfer that guides the mating feature. Default and thin modes MUST retain the 0.8 mm, 45-degree lower foot bevel, the vertical landing through Z=2.6, and the direct lower 45-degree transition. Bottom-plate mode MUST retain the same 0.2 mm radial mating clearance while omitting the lower foot bevel and vertical landing. The selected floor profile MUST NOT reduce the common protrusion/cavity fit.

#### Scenario: Same-diameter cylinders stack in all three profiles

- **WHEN** one generated cylinder is placed above another cylinder with the same outer diameter and both use the same bottom mode
- **THEN** the upper bottom protrusion MUST enter the lower matching cavity with a nominal 0.2 mm radial clearance
- **AND** the pair MUST remain guided by the circular protrusion/cavity interface
- **AND** the validated solids MUST not have permanent interference at the mating position

#### Scenario: Top remains a normal wall in all three profiles

- **WHEN** a valid cylinder completes generation in any of the three profiles
- **THEN** the top outer rim MUST remain square at 90 degrees
- **AND** the top inner rim MUST expose a 2 mm, 45-degree guide chamfer
- **AND** no thickened stacking ring may be added

#### Scenario: Different diameters are not promised

- **WHEN** two cylinders have different outer diameters
- **THEN** the system MUST NOT claim that their stacking interface is compatible
- **AND** generation of either individual cylinder in any of the three profiles MUST remain valid

### Requirement: Cylinder geometry quality and exports

The builder MUST reject any generated cylinder that is empty, non-finite, not a single valid solid, has invalid B-Rep topology, violates its bounds, violates the selected mode's floor or wall contract, violates the selected mode's ramp/fillet contract, violates the selected mode's stepped hole profile when `bottomHolesEnabled=true`, violates applicable outer-hole clearance when holes are enabled, violates any enabled four-direction opening profile or separation constraint, or fails the common same-diameter interface probes. When `bottomHolesEnabled=false`, the builder MUST require zero bottom-hole records and MUST skip hole-profile and hole-clearance requirements. A valid committed result MUST remain eligible for preview, STEP export, and binary STL export through the existing Worker lifecycle. The quality report MUST identify the selected mode, all-holes state, and opening validation state so diagnostics cannot confuse the profiles, hole-disabled branch, or opening-disabled branch.

#### Scenario: Valid default cylinder is exportable

- **WHEN** a valid default-mode parameter snapshot completes geometry and quality validation with `bottomHolesEnabled=true`
- **THEN** the workspace MUST commit a non-empty preview revision
- **AND** STEP and STL export MUST be enabled for that committed revision
- **AND** exported geometry MUST contain the 5 mm floor and 4+1 mm stepped hole profile

#### Scenario: Valid thin cylinder is exportable

- **WHEN** a valid thin-bottom parameter snapshot completes geometry and quality validation with `bottomHolesEnabled=true`
- **THEN** the workspace MUST commit a non-empty preview revision
- **AND** STEP and STL export MUST be enabled for that committed revision
- **AND** exported geometry MUST contain the 3 mm floor and 2+1 mm stepped hole profile

#### Scenario: Valid cylinder with all bottom holes disabled is exportable

- **WHEN** a valid parameter snapshot completes geometry and quality validation with `bottomHolesEnabled=false`
- **THEN** the workspace MUST commit a non-empty preview revision
- **AND** STEP and STL export MUST be enabled for that committed revision
- **AND** exported geometry MUST contain no bottom holes while retaining the selected floor and stacking profile

#### Scenario: Valid cylinder is exportable

- **WHEN** a valid parameter snapshot, including zero or more enabled side openings, completes geometry and quality validation
- **THEN** the workspace MUST commit a non-empty preview revision
- **AND** STEP and STL export MUST be enabled for that committed revision

#### Scenario: Valid independent openings preserve the existing interfaces

- **WHEN** one or more directions use different valid depth, flat-bottom length, or angle values
- **THEN** each enabled opening MUST be present only at its requested cardinal direction
- **AND** all bottom holes, the active floor, the printable lower profile, and the same-diameter stacking interface MUST remain valid
- **AND** the result MUST remain a single valid solid

#### Scenario: Invalid geometry or mode does not replace the current model

- **WHEN** floor, ramp, fillet, hole, clearance, opening separation, interface, or mode validation fails
- **THEN** the candidate MUST be rejected with a diagnosable error
- **AND** the last valid committed revision MUST remain visible
- **AND** export MUST remain disabled for the failed snapshot

#### Scenario: Invalid geometry does not replace the current model

- **WHEN** geometry, opening separation, floor preservation, or interface validation fails
- **THEN** the candidate MUST be rejected with a diagnosable error
- **AND** the last valid committed revision MUST remain visible
- **AND** export MUST remain disabled for the failed snapshot

### Requirement: Deterministic cylinder export metadata

The catalog MUST provide deterministic filenames generated from typed normalized parameters. Default-mode STEP/STL filenames with bottom holes enabled MUST retain the established `opengrid-stackable-cylinder-d{diameter}-h{height}` identity with `.step` or `.stl`; thin-bottom filenames MUST append `-thin`; bottom-plate filenames MUST append `-bottom-plate`; any no-hole export MUST append `-no-holes` after the mode suffix when present. When any side opening differs from its no-opening default, the filename identity MUST include a deterministic opening-settings fingerprint that changes whenever any of the twelve opening values changes; when all four opening depths are zero, the existing filename identity MUST remain unchanged. Filenames MUST NOT depend on raw input formatting and MUST distinguish all three bottom geometries, the all-holes state, and opening settings.

#### Scenario: Default cylinder export filenames

- **WHEN** a default-mode cylinder with diameter 56 mm and height 30 mm is exported with `bottomHolesEnabled=true`
- **THEN** the suggested STEP filename MUST be `opengrid-stackable-cylinder-d56-h30.step`
- **AND** the suggested STL filename MUST be `opengrid-stackable-cylinder-d56-h30.stl`

#### Scenario: Thin cylinder export filenames

- **WHEN** a thin-bottom cylinder with diameter 56 mm and height 30 mm is exported with `bottomHolesEnabled=true`
- **THEN** the suggested STEP filename MUST be `opengrid-stackable-cylinder-d56-h30-thin.step`
- **AND** the suggested STL filename MUST be `opengrid-stackable-cylinder-d56-h30-thin.stl`

#### Scenario: No-hole export filenames

- **WHEN** a default-mode cylinder with diameter 56 mm and height 30 mm is exported with `bottomHolesEnabled=false`
- **THEN** the suggested STEP filename MUST be `opengrid-stackable-cylinder-d56-h30-no-holes.step`
- **AND** the suggested STL filename MUST be `opengrid-stackable-cylinder-d56-h30-no-holes.stl`

#### Scenario: Bottom-plate export filename

- **WHEN** a bottom-plate cylinder with diameter 56 mm and height 30 mm is exported with `bottomHolesEnabled=true`
- **THEN** the suggested STEP filename MUST be `opengrid-stackable-cylinder-d56-h30-bottom-plate.step`
- **AND** the suggested STL filename MUST be `opengrid-stackable-cylinder-d56-h30-bottom-plate.stl`

#### Scenario: Cylinder export filenames

- **WHEN** a cylinder with diameter 56 mm and height 30 mm and no enabled side openings is exported
- **THEN** the suggested STEP filename MUST identify `opengrid-stackable-cylinder`, `d56`, and `h30`
- **AND** the suggested STL filename MUST use the same typed parameter identity with the `.stl` extension

#### Scenario: Opening settings are represented deterministically

- **WHEN** two valid cylinders have identical dimensions and bottom settings but different opening values
- **THEN** their suggested STEP and STL filenames MUST have different deterministic opening identities
- **AND** equivalent typed values entered with different raw formatting MUST produce the same filename

### Requirement: Bottom-plate profile

When `bottomPlateMode=true`, the builder MUST use a 3 mm floor with the default-style vertical inner wall and original 0.6 mm floor fillet, without an internal ramp; it MUST retain the 2+1 mm stepped hole sections, default-style outer-hole layout, top guide, and same-diameter mating clearance. The bottom-plate profile MUST remove the lower foot geometry below the former Z=2.6 cut line: its outside bottom MUST be a flat circular mating face at radius `R-2.2` on Z=0, and its outer boundary MUST transition directly at 45 degrees to radius `R` before continuing as the straight wall. The bottom-plate mode MUST NOT generate the thin-mode foot bevel or vertical landing, MUST remain one valid B-Rep solid, and MUST remain stackable with another bottom-plate cylinder of the same outer diameter. `thinBottomMode` and `bottomPlateMode` MUST remain mutually exclusive.

#### Scenario: Bottom-plate removes the lower foot

- **WHEN** a valid cylinder is generated with `bottomPlateMode=true`
- **THEN** its bottom bounds MUST begin at Z=0 on a flat face at the clearance-reduced mating radius
- **AND** the lower outer boundary MUST expose a direct 45-degree transition from that flat face to the nominal outer radius
- **AND** no 0.8 mm lower foot bevel or Z=2.6 vertical landing may be present
- **AND** the 3 mm floor, 2+1 mm hole profile, top guide, and same-diameter mating clearance MUST remain valid

#### Scenario: Bottom-plate retains the default-style internal floor

- **WHEN** a valid cylinder is generated with `bottomPlateMode=true`
- **THEN** its internal central floor MUST be exactly 3 mm above the outside bottom surface
- **AND** its internal wall MUST remain vertical with the original 0.6 mm floor fillet and no internal 45-degree ramp
- **AND** its stepped hole sections MUST remain 2+1 mm, while its outer-hole count MUST match default mode at the same diameter
- **AND** selecting bottom-plate mode MUST NOT change the existing thin-bottom profile when `thinBottomMode=true` is selected separately

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
