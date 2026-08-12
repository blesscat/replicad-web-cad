## ADDED Requirements

### Requirement: Hybrid inward perimeter transition

For a Hybrid board, each perimeter-to-interior boundary with an adjacent Full
cell MUST contain a sloped transition on the Full side of that boundary. The
transition span MUST be one full 28 mm grid pitch, with the lower end
matching the Full profile toward the interior and the higher end matching the
Heavy perimeter at the boundary. The transition MUST NOT create the sloped
portion in the outward Heavy-side cell.

#### Scenario: Hybrid side transition occupies one full inner cell

- **WHEN** a Hybrid board has at least one Full interior cell and no optional
  feature cuts
- **THEN** a probe moving from the interior cell center toward a selected
  perimeter boundary MUST encounter the Full height first
- **AND** the height MUST rise across a 28 mm transition span toward the Heavy
  boundary
- **AND** the corresponding outward half of the perimeter cell MUST remain at
  the Heavy profile rather than containing the transition ramp
- **AND** the through-opening MUST remain open along the probe line

#### Scenario: Hybrid transition retains the official side profiles

- **WHEN** a Hybrid board is generated with its supported profile and bridge
  settings
- **THEN** the interior end of each transition MUST meet the 6.8 mm Full
  profile within quality-gate tolerance
- **AND** the perimeter end MUST meet the 13.8 mm Heavy profile within
  quality-gate tolerance
- **AND** the generated result MUST remain a valid single solid with positive
  volume

### Requirement: Hybrid inner-corner diagonal transition

At a Hybrid perimeter corner, the two adjacent inward transitions MUST join in
the adjacent inner corner region and form a continuous diagonal ridge toward
the Full interior. The corner join MUST remain within the board envelope and
MUST NOT add an outward diagonal extension or close the through-opening.

#### Scenario: Hybrid corner transitions converge inward

- **WHEN** a 3 by 3 or larger Hybrid board is generated with all four perimeter
  transitions enabled
- **THEN** each corner's two side transitions MUST be joined by a continuous
  diagonal transition surface in the inner corner region
- **AND** the diagonal join MUST extend from the Heavy corner boundary toward
  the Full interior without entering the through-opening
- **AND** the outer corner cell MUST retain the Heavy perimeter profile without
  an outward-facing ramp
- **AND** the corner through-opening MUST remain measurable
