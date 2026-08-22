## ADDED Requirements

### Requirement: Shared detachable corner-seat geometry

The shared OpenGrid locating-assembly contract MUST publish one fixed male
detachable corner-seat geometry and one matching female socket-material
geometry. The male MUST have a 5 mm maximum locating diameter, a 3.8 mm locating
height, a 0.2 mm-high lead-in from Ø4.6 mm to Ø5 mm, a 1.8 mm-wide keyed
retaining head whose 45-degree taper ends at Z=5.15 mm, a 0.15 mm-high flat wear
surface, and a total height of 5.3 mm. The female socket material MUST have a
Ø7 mm by 1.75 mm outer envelope, formed by extending the canonical holder
0.25 mm inward while preserving its bottom entrance, 2 mm-wide keyed passage,
and retaining tabs. The straight key-width clearance MUST be 0.1 mm per side.

The geometry MUST remain fixed during the Organizer Box prototype phase. No
consumer MUST redefine a conflicting copy, apply the Pillar XY offset, or expose
the male/female fit as a user parameter.

#### Scenario: Shared detachable dimensions are published once

- **WHEN** the Organizer Box socket builder or Pillar detachable-seat builder
  reads the shared locating-assembly contract
- **THEN** it MUST receive male body diameter 5 mm, body height 3.8 mm, lead-in
  height 0.2 mm, lead-in tip diameter 4.6 mm, key width 1.8 mm, taper top Z
  5.15 mm, wear height 0.15 mm, and total height 5.3 mm
- **AND** it MUST receive female outer diameter 7 mm, depth 1.75 mm, passage
  width 2 mm, and key side clearance 0.1 mm
- **AND** neither consumer MUST define a conflicting local copy

#### Scenario: Male lead-in remains printable and insertable

- **WHEN** the fixed male seat is generated
- **THEN** its bottom face MUST be Ø4.6 mm
- **AND** its diameter MUST reach Ø5 mm at Z=0.2 mm
- **AND** it MUST remain Ø5 mm through the locating section ending at Z=3.8 mm

#### Scenario: Raised wear surface preserves the seating datum

- **WHEN** the fixed male seat is seated in the matching female socket
- **THEN** its locating section MUST still extend exactly 3.8 mm below the box
  bottom datum
- **AND** the raised wear surface MUST occupy Z=5.15 mm through Z=5.3 mm in the
  shared assembly coordinate system
- **AND** the added wear height MUST NOT increase the box-to-support spacing

### Requirement: Detachable corner-seat reference compatibility

The derived canonical male reference MUST be a valid non-empty single solid
with bounds `[-2.5, -2.5, 0]` through `[2.5, 2.5, 5.3]` and nominal volume
82.4112179657 mm³. The supplied female source reference MUST remain a valid
non-empty single solid with bounds `[-3.5, -3.5, 3]` through
`[3.5, 3.5, 4.5]` and nominal volume 38.4253392 mm³. Its effective holder
material MUST extend to Z=4.75 with nominal volume 43.6604635736 mm³. Bounds
and volume comparisons MAY use the project's configured B-Rep tolerance.

In the canonical unrotated seated pose, the male and female solids MUST have
zero positive-volume intersection. The fixed fit MUST be treated as a
hand-press, retained, hand-removable interface for physical prototype
validation. Other OpenGrid models MUST NOT adopt this socket until the
Organizer Box prototype has been confirmed to insert fully, remain attached
when lifted, and remain intentionally removable by hand.

#### Scenario: Canonical references remain valid

- **WHEN** the shared male and female reference geometries are imported or
  constructed for quality validation
- **THEN** each reference MUST be one valid non-empty solid
- **AND** each reference MUST match its specified bounds and nominal volume
  within B-Rep tolerance

#### Scenario: Seated references do not collide

- **WHEN** the canonical male and female shapes are evaluated in their shared
  unrotated seated coordinates
- **THEN** their positive-volume intersection MUST be zero within B-Rep
  tolerance
- **AND** the male wear surface MUST finish at the female socket's top datum

#### Scenario: Physical prototype gates wider rollout

- **WHEN** the Organizer Box is considered for physical acceptance
- **THEN** all four seats MUST be insertable fully by hand
- **AND** the seats MUST remain attached when the box is lifted
- **AND** each seat MUST remain removable by an intentional hand pull
- **AND** failure of any criterion MUST keep other OpenGrid model integrations
  outside the accepted scope
