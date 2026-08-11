## MODIFIED Requirements

### Requirement: Stepped center mounting hole

When `bottomHolesEnabled=true`, every valid cylinder MUST contain one centered floor hole at `(0, 0)`. From the outside bottom surface toward the interior, the hole profile MUST depend on the selected profile: in the default mode it MUST have a straight `Ø4.55 mm` section from nominal Z=0 through Z=4, followed by a straight `Ø7.05 mm` section from nominal Z=4 through Z=5; in thin-bottom and bottom-plate modes it MUST have a straight `Ø4.55 mm` section from nominal Z=0 through Z=2, followed by a straight `Ø7.05 mm` section from nominal Z=2 through Z=3. Each transition MUST be a planar shoulder at the selected first-section depth and MUST NOT be a taper or a chamfer. When `bottomHolesEnabled=false`, no center or outer bottom hole may be generated.

#### Scenario: Default center hole profile

- **WHEN** a valid cylinder completes generation with `thinBottomMode=false` and `bottomPlateMode=false`
- **THEN** its center floor hole MUST expose a `Ø4.55 mm` outside opening through 4 mm of floor depth
- **AND** the hole MUST change to `Ø7.05 mm` after 4 mm of axial depth
- **AND** the larger section MUST terminate at the 5 mm interior floor surface

#### Scenario: Thin center hole profile

- **WHEN** a valid cylinder completes generation with `thinBottomMode=true` and `bottomPlateMode=false`
- **THEN** its center floor hole MUST expose a `Ø4.55 mm` outside opening through 2 mm of floor depth
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
