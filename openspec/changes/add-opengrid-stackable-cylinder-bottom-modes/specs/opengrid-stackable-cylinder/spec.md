## MODIFIED Requirements

### Requirement: OpenGrid stackable-cylinder identity and parameters

The system MUST expose the independently validated `opengrid-stackable-cylinder` component with `modelId=opengrid-stackable-cylinder`, `buildKey=opengrid-stackable-cylinder`, and route `/cad/opengrid-stackable-cylinder`. Its user-facing display name MUST begin with `OpenGrid `. The normalized parameter snapshot MUST contain exactly integer `diameter` and `height` values plus boolean `thinBottomMode`, boolean `bottomPlateMode`, and boolean `bottomHolesEnabled`. `diameter` MUST represent the outer diameter and MUST be within 20–300 mm; `height` MUST be within 10–500 mm; the default profile is selected when both mode flags are false, the thin-bottom profile when `thinBottomMode=true`, and the bottom-plate profile when `bottomPlateMode=true`. The two mode flags MUST NOT both be true. `bottomHolesEnabled=true` MUST generate the complete center-plus-safe-outer-hole group and `bottomHolesEnabled=false` MUST generate no bottom holes. Both numeric fields MUST use a 1 mm step and decimal, empty, non-finite, zero, negative, and out-of-range values MUST be rejected without rounding. A legacy snapshot that contains only `diameter` and `height` MUST normalize both mode flags to `false` and the hole flag to `true`.

#### Scenario: Valid cylinder defaults

- **WHEN** the cylinder route initializes without valid persisted parameters
- **THEN** the catalog defaults MUST provide a valid diameter, height, `thinBottomMode=false`, `bottomPlateMode=false`, and `bottomHolesEnabled=true` snapshot
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
- **AND** persistence MUST rewrite only the normalized snapshot with the explicit default mode after a successful update

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

When `bottomHolesEnabled=true`, every valid cylinder MUST contain one centered floor hole at `(0, 0)`. From the outside bottom surface toward the interior, the hole profile MUST depend on the selected profile: in the default mode it MUST have a straight `Ø5.05 mm` section from nominal Z=0 through Z=4, followed by a straight `Ø7.05 mm` section from nominal Z=4 through Z=5; in thin-bottom and bottom-plate modes it MUST have a straight `Ø5.05 mm` section from nominal Z=0 through Z=2, followed by a straight `Ø7.05 mm` section from nominal Z=2 through Z=3. Each transition MUST be a planar shoulder at the selected first-section depth and MUST NOT be a taper or a chamfer. When `bottomHolesEnabled=false`, no center or outer bottom hole may be generated.

#### Scenario: Default center hole profile

- **WHEN** a valid cylinder completes generation with `thinBottomMode=false` and `bottomPlateMode=false`
- **THEN** its center floor hole MUST expose a `Ø5.05 mm` outside opening through 4 mm of floor depth
- **AND** the hole MUST change to `Ø7.05 mm` after 4 mm of axial depth
- **AND** the larger section MUST terminate at the 5 mm interior floor surface

#### Scenario: Thin center hole profile

- **WHEN** a valid cylinder completes generation with `thinBottomMode=true` and `bottomPlateMode=false`
- **THEN** its center floor hole MUST expose a `Ø5.05 mm` outside opening through 2 mm of floor depth
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

- **WHEN** `thinBottomMode=true`, `bottomPlateMode=false`, `bottomHolesEnabled=true`, and diameter is 47 mm
- **THEN** the result MUST remain center-only because the outer holes cannot retain the required flat-floor/ramp margin
- **WHEN** `thinBottomMode=true`, `bottomPlateMode=false`, `bottomHolesEnabled=true`, and diameter is 48 mm
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

The builder MUST reject any generated cylinder that is empty, non-finite, not a single valid solid, has invalid B-Rep topology, violates its bounds, violates the selected mode's floor or wall contract, violates the selected mode's ramp/fillet contract, violates the selected mode's stepped hole profile when `bottomHolesEnabled=true`, violates applicable outer-hole clearance when holes are enabled, or fails the common same-diameter interface probes. When `bottomHolesEnabled=false`, the builder MUST require zero bottom-hole records and MUST skip hole-profile and hole-clearance requirements. A valid committed result MUST remain eligible for preview, STEP export, and binary STL export through the existing Worker lifecycle. The quality report MUST identify the selected mode and all-holes state so diagnostics cannot confuse the profiles or hole-disabled branch.

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

#### Scenario: Invalid geometry or mode does not replace the current model

- **WHEN** floor, ramp, fillet, hole, clearance, interface, or mode validation fails
- **THEN** the candidate MUST be rejected with a diagnosable error
- **AND** the last valid committed revision MUST remain visible
- **AND** export MUST remain disabled for the failed snapshot

### Requirement: Deterministic cylinder export metadata

The catalog MUST provide deterministic filenames generated from typed normalized parameters. Default-mode STEP/STL filenames with bottom holes enabled MUST retain the established `opengrid-stackable-cylinder-d{diameter}-h{height}` identity with `.step` or `.stl`; thin-bottom filenames MUST append `-thin`; bottom-plate filenames MUST append `-bottom-plate`; any no-hole export MUST append `-no-holes` after the mode suffix when present. Filenames MUST NOT depend on raw input formatting and MUST distinguish all three bottom geometries and the all-holes state.

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
