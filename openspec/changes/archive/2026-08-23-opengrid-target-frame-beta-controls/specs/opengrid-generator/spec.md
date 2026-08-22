## MODIFIED Requirements

### Requirement: Half-cell board extension

The board MUST preserve the official full-cell profile and add a 14 mm
boundary host on each selected half-cell axis. left/right MUST map to the
negative/positive X outer side, and top/bottom MUST map to the
positive/negative Y outer side. Feature coordinates, connector placement, screw
placement, centering, and variant thickness MUST use the final nominal grid
envelope.

When `fitToTarget=true`, the generator MUST add a physical outer frame only on
the selected `targetFrameSides` around the nominal grid envelope. The frame
MUST use the selected variant's board height, MUST fill only the requested
remainder on each enabled axis, and MUST be fused to the completed nominal grid
geometry after board feature cutters run on that nominal geometry. When both
opposite frame sides on an axis are selected, the remainder MUST be split
equally; when only one side is selected, that side MUST receive the complete
remainder; when neither side is selected, that axis MUST remain nominal even if
its target dimension is larger. A target remainder MUST NOT exceed 28 mm on an
axis. The frame MUST NOT receive or create a new grid host, connector seam,
screw center, or Snap interface. `targetFrameShape=none` MUST leave the frame
corners square, `chamfer` MUST apply the selected outer-frame chamfer shape,
and `fillet` MUST apply the selected outer-frame rounded shape. The final
physical bounds MUST equal the requested target dimensions on axes with at
least one selected frame side and MUST remain nominal on axes with no selected
frame side.

The detailed shared half-cell direction, interface, and persistence contract
is defined by the opengrid-half-cell capability.

#### Scenario: Select a half-cell direction

- **WHEN** a user selects one or both half-cell directions
- **THEN** the derived board envelope MUST add 14 mm on each selected axis
- **AND** the board MUST remain centered with feature and connector placement
  on the final envelope

#### Scenario: Extend one physical frame side

- **WHEN** a valid 3 by 3 board has a 100 mm target on an axis whose nominal
  size is 84 mm and only the positive side is selected in `targetFrameSides`
- **THEN** the final envelope MUST extend 16 mm on that positive side
- **AND** the opposite side MUST remain at the nominal grid boundary
- **AND** the nominal grid hosts MUST remain in their existing coordinates

#### Scenario: Split an extension across two opposite sides

- **WHEN** a valid 3 by 3 board has a 100 mm target on an axis whose nominal
  size is 84 mm and both opposite sides are selected in `targetFrameSides`
- **THEN** the final envelope MUST add 8 mm on each selected side
- **AND** the nominal grid hosts MUST remain in their existing coordinates

#### Scenario: Leave an axis without a physical frame

- **WHEN** a valid target-fitted board has a target larger than nominal on an
  axis and neither opposite side is selected in `targetFrameSides`
- **THEN** the final envelope on that axis MUST remain nominal
- **AND** no physical frame material MUST be added on that axis

#### Scenario: Keep connectors on an exposed nominal side

- **WHEN** connector holes are enabled, a connector side is selected, and the
  corresponding physical frame side is not selected
- **THEN** the connector holes MUST remain on the nominal grid boundary
- **AND** the connector holes MUST remain present on that exposed side
- **AND** the physical frame MUST NOT add connector holes at a new outer edge

### Requirement: Target frame quality evidence

The OpenGrid quality gate MUST verify target-frame geometry when
`fitToTarget=true`. It MUST verify the final directional bounds, positive frame
material on every selected remainder side, preservation of all nominal cell
openings, the selected outer-frame corner shape, and the absence of a second
grid-host seam or feature location in the frame. A disabled target frame or an
axis with no selected frame side MUST use the existing nominal quality
evidence.

#### Scenario: Target frame reaches the requested space

- **WHEN** a target-fitted board is quality-checked with at least one selected
  frame side on an axis
- **THEN** its bounds on that axis MUST match the requested target dimension
  within the existing bounds tolerance
- **AND** probes in each selected outer frame strip MUST intersect positive
  material
- **AND** all nominal cell openings MUST remain through-open

#### Scenario: Target frame keeps an unextended axis nominal

- **WHEN** a target-fitted board has a larger target dimension but neither
  opposite frame side is selected on that axis
- **THEN** its bounds on that axis MUST match the nominal grid dimension
- **AND** no missing-frame failure MUST be reported for that axis

#### Scenario: Target frame keeps the OpenGrid interface stable

- **WHEN** a target-fitted board has connector holes or generated screws
- **THEN** those feature centers MUST equal the corresponding non-fitted
  nominal board centers
- **AND** probes in every added frame side MUST NOT be reported as additional
  OpenGrid hosts
