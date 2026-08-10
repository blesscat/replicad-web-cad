## MODIFIED Requirements

### Requirement: Plain pillar geometry

For a valid snapshot with `baseConnection=false`, the generator MUST create one centered Ø5 mm cylindrical body on the Z axis with total height `length` and base at `Z=0`. The upper end MUST have a 0.5 mm, 45° equal-distance chamfer. The lower end MUST have the same Ø5 mm, 1 mm, 45° equal-distance chamfer. The chamfers MUST be included within the requested total length.

#### Scenario: Default plain geometry

- **WHEN** the generator builds `{ length: 5, baseConnection: false }`
- **THEN** the model MUST span `Z=0` through `Z=5`
- **AND** the lower end MUST expose a 1 mm, 45° chamfer on the Ø5 mm body
- **AND** the upper end MUST expose a 0.5 mm, 45° chamfer on the Ø5 mm body
- **AND** the straight Ø5 mm section between the chamfers MUST be 3.5 mm long

#### Scenario: Adjustable plain geometry

- **WHEN** the generator builds a valid plain pillar with another integer length
- **THEN** the total Z span MUST equal that length
- **AND** the upper chamfer dimension MUST remain 0.5 mm
- **AND** the lower chamfer dimension MUST remain 1 mm
- **AND** the straight section MUST be the remaining length after both chamfers

### Requirement: Base-connection pillar geometry

For a valid snapshot with `baseConnection=true`, the lower end MUST be a flat, sharp-edged Ø7 mm flange with axial height 0.8 mm, followed directly by the Ø5 mm body. The Ø7-to-Ø5 transition MUST be a sharp 90° step with no transition chamfer or fillet. The upper end MUST retain a 0.5 mm, 45° chamfer. The flange, body, and upper chamfer MUST fit within the requested total length, so enabling the option MUST NOT increase the total height.

#### Scenario: Default base-connection geometry

- **WHEN** the generator builds `{ length: 5, baseConnection: true }`
- **THEN** the model MUST span `Z=0` through `Z=5`
- **AND** the lower `Z=0` to `Z=0.8` segment MUST be Ø7 mm with a flat bottom
- **AND** the Ø7-to-Ø5 transition at `Z=0.8` MUST be sharp
- **AND** the upper 0.5 mm chamfer MUST remain present
- **AND** the Ø5 mm straight section MUST be 3.7 mm long

#### Scenario: Base connection preserves requested length

- **WHEN** a user changes `length` while `baseConnection=true`
- **THEN** the flange height MUST remain 0.8 mm
- **AND** the upper chamfer MUST remain 0.5 mm
- **AND** the complete model height MUST equal the new `length`
