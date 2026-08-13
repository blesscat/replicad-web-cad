## MODIFIED Requirements

### Requirement: Rounded box-native opening profile

Each enabled opening MUST be generated as a box-native prismatic notch through the selected rectangular side wall, with a horizontal flat bottom of the requested length, fixed 2.5 mm tangent/Z transition arcs at the two sill corners and the two top transitions, and two planar straight side faces derived from the requested angle. In normal and base-plate modes, the opening MUST be open through the selected wall and stepped rail at the external top-edge datum. In thin-shell mode, the opening MUST be open through the selected wall and the continuous outer-high/inner-low 1.6 mm top chamfer at the external top-edge datum without leaving a horizontal rim plane. The profile MUST NOT use radial sectors, revolved profiles, circular-coordinate construction, or a cylinder cutter; its fixed local transition arcs are the only curved profile elements. The requested depth MUST be the vertical distance from the selected side's upper inner-rim datum to the lowest flat-bottom plane. The side-wall angle MUST be measured from the flat bottom; 90 degrees MUST produce vertical straight side segments and 45 degrees MUST produce outward-sloping straight side segments. The cutter MUST be oriented by the box's Cartesian side normal and tangent direction, not by a circular or radial coordinate system. For `+X` and `-X`, the flat-bottom length MUST run along Y; for `+Y` and `-Y`, the flat-bottom length MUST run along X. Every enabled opening MUST cut completely through the selected wall thickness from the interior face to beyond the exterior face, independently of whether the selected direction is positive or negative, without leaving a thin continuous skin. The opening MUST stop at or above the active interior-floor boundary and MUST leave solid material at both adjacent corners.

#### Scenario: Flat bottom and side faces match the controls

- **WHEN** an enabled opening is generated with a valid depth, bottom length, and side-wall angle
- **THEN** its lowest boundary MUST be a straight flat segment with the requested length
- **AND** its lowest boundary MUST be at the requested depth below the selected upper-rim datum within project tolerance
- **AND** its two straight side boundaries MUST be planar faces with the requested angle relative to the flat bottom
- **AND** the profile MUST contain the fixed rounded transitions at the sill and external top edge
- **AND** the opening MUST be open through the selected mode's wall and top-rim profile at the external top-edge datum
- **AND** the profile MUST contain no radial or revolved transition geometry

#### Scenario: Side angle changes the derived slope

- **WHEN** two otherwise identical openings use different valid side-wall angles
- **THEN** their flat-bottom depth and length MUST remain unchanged
- **AND** their straight-side slopes and derived upper widths MUST differ according to the angle
- **AND** neither profile may use a user-visible radius control

#### Scenario: Direction maps to a rectangular wall

- **WHEN** an opening is enabled for one of `+X`, `-X`, `+Y`, or `-Y`
- **THEN** the cut MUST occur only on the corresponding box wall
- **AND** its flat-bottom span MUST follow that wall's tangent axis
- **AND** the opposite wall MUST remain uncut unless its own depth is positive

#### Scenario: Enabled openings fully penetrate every wall direction

- **WHEN** a valid opening with positive depth is generated in normal, base-plate, or thin-shell mode for any of `+X`, `-X`, `+Y`, or `-Y`
- **THEN** the opening MUST be clear from the selected wall's interior face through its exterior face and the associated top-rim profile
- **AND** no continuous membrane or thin layer of selected-wall material MAY remain inside the requested opening span
- **AND** the opposite wall, floor, corner bridges, and unselected rim spans MUST retain their existing material
