## MODIFIED Requirements

### Requirement: Stepped center mounting hole

When `bottomHolesEnabled=true`, every valid cylinder MUST contain one centered floor hole at `(0, 0)`. From the outside bottom surface toward the interior, the hole profile MUST depend on the selected profile: in the default mode it MUST have a straight `Ø5 mm` section from nominal Z=0 through Z=4, followed by a straight `Ø7.05 mm` section from nominal Z=4 through Z=5; in thin-bottom mode it MUST have a straight `Ø5 mm` section from nominal Z=0 through Z=1, followed by a straight `Ø7.05 mm` section from nominal Z=1 through Z=2; in bottom-plate mode it MUST have a straight `Ø5 mm` section from nominal Z=0 through Z=2, followed by a straight `Ø7.05 mm` section from nominal Z=2 through Z=3. Each transition MUST be a planar shoulder at the selected first-section depth and MUST NOT be a taper or a chamfer. When `bottomHolesEnabled=false`, no center or outer bottom hole may be generated.

#### Scenario: Default center hole profile

- **WHEN** a valid cylinder completes generation with `thinBottomMode=false` and `bottomPlateMode=false`
- **THEN** its center floor hole MUST expose a `Ø5 mm` outside opening through 4 mm of floor depth
- **AND** the hole MUST change to `Ø7.05 mm` after 4 mm of axial depth
- **AND** the larger section MUST terminate at the 5 mm interior floor surface

#### Scenario: Thin center hole profile

- **WHEN** a valid cylinder completes generation with `thinBottomMode=true` and `bottomPlateMode=false`
- **THEN** its center floor hole MUST expose a `Ø5 mm` outside opening through 1 mm of floor depth
- **AND** the hole MUST change to `Ø7.05 mm` after 1 mm of axial depth
- **AND** the larger section MUST terminate at the 2 mm central flat floor surface

#### Scenario: Bottom holes disabled

- **WHEN** a valid cylinder completes generation with `bottomHolesEnabled=false`
- **THEN** the bottom surface MUST remain solid across the center and all outer-hole candidate locations
- **AND** the result MUST contain no stepped-hole cylindrical faces

#### Scenario: Center hole remains at the origin

- **WHEN** the diameter or bottom mode changes through the supported values while `bottomHolesEnabled=true`
- **THEN** the center hole MUST remain at X=0 and Y=0
- **AND** the selected mode MUST NOT move or resize either fixed hole diameter

### Requirement: Four outer cardinal holes from the 14 mm grid

When `bottomHolesEnabled=true`, in addition to the center hole the builder MUST calculate the outer-hole index from the 14 mm grid and emit only the outermost four cardinal holes. Let `R=diameter/2`, `rH=7.05/2`, `P=14`, and `E=2`. In default and bottom-plate modes, the index MUST be `n=max(0, floor((R-E-rH)/P))`. In thin-bottom mode, the index MUST use both the outer boundary and the derived central flat-floor/ramp boundary: `n=max(0, floor(min((R-E-rH)/P, (rFlat-2-rH)/P)))`. When `n>=1`, the builder MUST add exactly `(±14n,0)` and `(0,±14n)`; when `n=0`, it MUST add no outer holes. No diagonal holes, intermediate grid holes, or additional X/Y holes are permitted. Every outer hole MUST use the mode-specific stepped profile with a Ø5 mm lower/outside section and a Ø7.05 mm upper/interior retaining section. When `bottomHolesEnabled=false`, the builder MUST emit no outer holes regardless of the calculated index.

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
