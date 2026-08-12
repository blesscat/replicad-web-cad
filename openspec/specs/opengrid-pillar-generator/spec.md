## Purpose

提供標準版、薄殼版與物件定位用自訂長度版的圓柱支柱 component，讓使用者能產生可預覽、可驗證並可匯出的單一 CAD solid。

## Requirements

### Requirement: Pillar parameter contract

The system MUST expose an independent OpenGrid component with stable `modelId=opengrid-pillar` and `buildKey=opengrid-pillar`. Its normalized parameter snapshot MUST be either exactly `{ mode: 'standard' }`, exactly `{ mode: 'thin-shell' }`, or exactly `{ mode: 'positioning', length }`. `length` MUST be a safe integer from 3 through 500 mm and MUST be accepted only by `positioning`. The default snapshot MUST be `{ mode: 'standard' }`. The standard and thin-shell total lengths, body diameter, flange dimensions, and chamfer dimensions MUST be fixed geometry and MUST NOT be exposed as user parameters. The positioning mode MUST retain the original Ø5 mm two-end-chamfer profile and expose only its total length as a user parameter.

#### Scenario: Default pillar parameters

- **WHEN** a user opens the pillar component without a valid saved snapshot
- **THEN** the component MUST use `mode=standard`
- **AND** the generated model MUST use the standard fixed-length assembly profile

#### Scenario: Valid pillar modes

- **WHEN** a pillar snapshot contains `mode=standard`, `mode=thin-shell`, or `mode=positioning` with an integer length from 3 through 500 mm
- **THEN** validation MUST accept the snapshot
- **AND** the generated model MUST use only the corresponding mode profile

#### Scenario: Positioning mode length validation

- **WHEN** a positioning snapshot contains a fractional, non-finite, non-numeric, or out-of-range `length`
- **THEN** validation MUST reject the snapshot with a field-specific diagnostic
- **AND** the invalid snapshot MUST NOT be sent as a valid model-generation request

#### Scenario: Invalid pillar mode

- **WHEN** a pillar snapshot contains a missing, non-string, or unsupported `mode`
- **THEN** validation MUST reject the snapshot with a field-specific diagnostic
- **AND** the invalid snapshot MUST NOT be sent as a valid model-generation request

#### Scenario: Legacy pillar snapshot migration

- **WHEN** persistence contains the old `{ length, baseConnection: false }` pillar shape with a valid length
- **THEN** hydration MUST normalize it to `{ mode: 'positioning', length }`
- **WHEN** persistence contains the old base-connection shape or another malformed pillar record
- **THEN** hydration MUST normalize it to `{ mode: 'standard' }`
- **AND** an old checkbox state MUST NOT remain as an active user parameter

### Requirement: Pillar geometry quality and export identity

Every valid pillar generation MUST produce one connected solid with finite, non-empty mesh data and bounds centered on X/Y. The `standard` and `thin-shell` modes MUST have X/Y bounds of ±3.5 mm; the `positioning` mode MUST have X/Y bounds of ±2.5 mm. The standard mode MUST have Z bounds `[0, 9]`, the thin-shell mode MUST have Z bounds `[0, 5]`, and positioning mode MUST have Z bounds `[0, length]`. The deterministic export stems MUST be `pillar-9-standard`, `pillar-5-thin-shell`, and `pillar-{length}-positioning` for the corresponding modes, with `.step` and `.stl` extensions supplied by the existing export contracts.

#### Scenario: Standard quality gate

- **WHEN** a valid standard pillar candidate is prepared for commit
- **THEN** it MUST contain exactly one valid connected solid
- **AND** its mesh MUST be finite and non-empty
- **AND** its bounds MUST be `[-3.5, -3.5, 0]` through `[3.5, 3.5, 9]` within the workspace tolerance

#### Scenario: Thin-shell quality gate

- **WHEN** a valid thin-shell pillar candidate is prepared for commit
- **THEN** it MUST contain exactly one valid connected solid
- **AND** its mesh MUST be finite and non-empty
- **AND** its bounds MUST be `[-3.5, -3.5, 0]` through `[3.5, 3.5, 5]` within the workspace tolerance

#### Scenario: Positioning quality gate

- **WHEN** a valid positioning pillar with `length=25` is prepared for commit
- **THEN** it MUST contain exactly one valid connected solid
- **AND** its mesh MUST be finite and non-empty
- **AND** its bounds MUST be `[-2.5, -2.5, 0]` through `[2.5, 2.5, 25]` within the workspace tolerance

#### Scenario: Mode-specific export identity

- **WHEN** a committed standard pillar is exported
- **THEN** its export stem MUST be `pillar-9-standard`
- **WHEN** a committed thin-shell pillar is exported
- **THEN** its export stem MUST be `pillar-5-thin-shell`
- **WHEN** a committed positioning pillar with `length=25` is exported
- **THEN** its export stem MUST be `pillar-25-positioning`
- **AND** the export MUST use the committed pillar B-Rep rather than a viewport mesh reconstruction

### Requirement: Fixed mode-specific pillar geometry

For the `standard` and `thin-shell` modes, the generator MUST create one centered Ø4.5 mm cylindrical body on the Z axis, a flat sharp-edged Ø7 mm lower flange with axial height 0.8 mm, and a sharp 90-degree shoulder between the flange and body. The upper end MUST retain the existing 0.5 mm, 45-degree equal-distance chamfer. The flange and upper chamfer MUST be included within the fixed total length: 9 mm for `standard` and 5 mm for `thin-shell`.

#### Scenario: Standard pillar geometry

- **WHEN** the generator builds `{ mode: 'standard' }`
- **THEN** the model MUST span `Z=0` through `Z=9`
- **AND** the lower `Z=0` to `Z=0.8` segment MUST be Ø7 mm with a flat bottom
- **AND** the Ø7-to-Ø4.5 transition at `Z=0.8` MUST be sharp
- **AND** the upper 0.5 mm chamfer MUST remain present

#### Scenario: Thin-shell pillar geometry

- **WHEN** the generator builds `{ mode: 'thin-shell' }`
- **THEN** the model MUST span `Z=0` through `Z=5`
- **AND** the lower `Z=0` to `Z=0.8` segment MUST be Ø7 mm with a flat bottom
- **AND** the Ø7-to-Ø4.5 transition at `Z=0.8` MUST be sharp
- **AND** the upper 0.5 mm chamfer MUST remain present

#### Scenario: Positioning pillar geometry

- **WHEN** the generator builds `{ mode: 'positioning', length: 25 }`
- **THEN** the model MUST span `Z=0` through `Z=25`
- **AND** the body MUST be Ø5 mm
- **AND** the lower end MUST retain the original 1 mm, 45-degree chamfer
- **AND** the upper end MUST retain the original 0.5 mm, 45-degree chamfer
- **AND** both chamfers MUST be included within the requested total length

#### Scenario: Fixed dimensions are not user parameters

- **WHEN** a user views or edits the pillar panel
- **THEN** selecting standard or thin-shell MUST be sufficient to select the complete fixed geometry profile
- **AND** those fixed modes MUST NOT expose a manual length, diameter, flange-height, or chamfer control
- **AND** selecting positioning MUST expose only the custom total-length control
