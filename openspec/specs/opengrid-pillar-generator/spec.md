## Purpose

提供一個可調整總長度、具固定直徑與兩種底端介面的圓柱支柱 component，讓使用者能產生可預覽、可驗證並可匯出的單一 CAD solid。

## Requirements

### Requirement: Pillar parameter contract

The system MUST expose an independent OpenGrid component with stable `modelId=opengrid-pillar` and `buildKey=opengrid-pillar`. Its normalized parameter snapshot MUST contain exactly `length` and `baseConnection`: `length` MUST be a safe integer from 3 through 500 mm, and `baseConnection` MUST be a boolean. The default snapshot MUST be `{ length: 5, baseConnection: false }`. Diameter and chamfer dimensions are fixed geometry constants and MUST NOT be exposed as additional user parameters.

#### Scenario: Default pillar parameters

- **WHEN** a user opens the pillar component without a valid saved snapshot
- **THEN** the component MUST use `length=5` and `baseConnection=false`
- **AND** the generated model MUST use the plain two-chamfer end mode

#### Scenario: Integer length validation

- **WHEN** a pillar snapshot contains a fractional, non-finite, non-numeric, or out-of-range `length`
- **THEN** validation MUST reject the snapshot with a field-specific diagnostic
- **AND** the snapshot MUST NOT be sent as a valid model-generation request

#### Scenario: Boolean base connection validation

- **WHEN** a pillar snapshot contains a value other than a typed boolean for `baseConnection`
- **THEN** validation MUST reject the snapshot with a field-specific diagnostic
- **AND** the invalid value MUST NOT be silently coerced

### Requirement: Plain pillar geometry

For a valid snapshot with `baseConnection=false`, the generator MUST create one centered Ø5 mm cylindrical body on the Z axis with total height `length` and base at `Z=0`. The upper end MUST have a 1 mm, 45° equal-distance chamfer. The lower end MUST have the same Ø5 mm, 1 mm, 45° equal-distance chamfer. The chamfers MUST be included within the requested total length.

#### Scenario: Default plain geometry

- **WHEN** the generator builds `{ length: 5, baseConnection: false }`
- **THEN** the model MUST span `Z=0` through `Z=5`
- **AND** both ends MUST expose the 1 mm, 45° chamfer on the Ø5 mm body
- **AND** the straight Ø5 mm section between the chamfers MUST be 3 mm long

#### Scenario: Adjustable plain geometry

- **WHEN** the generator builds a valid plain pillar with another integer length
- **THEN** the total Z span MUST equal that length
- **AND** the upper and lower chamfer dimensions MUST remain 1 mm
- **AND** the straight section MUST be the remaining length after both chamfers

### Requirement: Base-connection pillar geometry

For a valid snapshot with `baseConnection=true`, the lower end MUST be a flat, sharp-edged Ø7 mm flange with axial height 0.8 mm, followed directly by the Ø5 mm body. The Ø7-to-Ø5 transition MUST be a sharp 90° step with no transition chamfer or fillet. The upper end MUST retain the 1 mm, 45° chamfer. The flange, body, and upper chamfer MUST fit within the requested total length, so enabling the option MUST NOT increase the total height.

#### Scenario: Default base-connection geometry

- **WHEN** the generator builds `{ length: 5, baseConnection: true }`
- **THEN** the model MUST span `Z=0` through `Z=5`
- **AND** the lower `Z=0` to `Z=0.8` segment MUST be Ø7 mm with a flat bottom
- **AND** the Ø7-to-Ø5 transition at `Z=0.8` MUST be sharp
- **AND** the upper 1 mm chamfer MUST remain present
- **AND** the Ø5 mm straight section MUST be 3.2 mm long

#### Scenario: Base connection preserves requested length

- **WHEN** a user changes `length` while `baseConnection=true`
- **THEN** the flange height MUST remain 0.8 mm
- **AND** the upper chamfer MUST remain 1 mm
- **AND** the complete model height MUST equal the new `length`

### Requirement: Pillar geometry quality and export identity

Every valid pillar generation MUST produce one connected solid with finite, non-empty mesh data and bounds centered on X/Y. Plain mode MUST have X/Y bounds of ±2.5 mm; base-connection mode MUST have X/Y bounds of ±3.5 mm. Both modes MUST have Z bounds `[0, length]`. The deterministic export stem MUST be `pillar-{length}-{plain|base}` for the corresponding mode, with `.step` and `.stl` extensions supplied by the existing export contracts.

#### Scenario: Plain quality gate

- **WHEN** a valid plain pillar candidate is prepared for commit
- **THEN** it MUST contain exactly one valid connected solid
- **AND** its mesh MUST be finite and non-empty
- **AND** its bounds MUST be `[-2.5, -2.5, 0]` through `[2.5, 2.5, length]` within the workspace tolerance

#### Scenario: Base-connection quality gate

- **WHEN** a valid base-connection pillar candidate is prepared for commit
- **THEN** it MUST contain exactly one valid connected solid
- **AND** its mesh MUST be finite and non-empty
- **AND** its bounds MUST be `[-3.5, -3.5, 0]` through `[3.5, 3.5, length]` within the workspace tolerance

#### Scenario: Mode-specific export identity

- **WHEN** a committed pillar is exported
- **THEN** plain mode with `length=5` MUST use the stem `pillar-5-plain`
- **AND** base-connection mode with `length=5` MUST use the stem `pillar-5-base`
- **AND** the export MUST use the committed pillar B-Rep rather than a viewport mesh reconstruction
