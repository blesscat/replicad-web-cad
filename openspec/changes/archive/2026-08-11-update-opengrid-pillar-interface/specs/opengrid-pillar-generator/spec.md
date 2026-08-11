## MODIFIED Requirements

### Requirement: Pillar parameter contract

The system MUST expose an independent OpenGrid component with stable `modelId=opengrid-pillar` and `buildKey=opengrid-pillar`. Its normalized parameter snapshot MUST contain exactly one typed `mode` value, where `mode` MUST be either `standard` or `thin-shell`. The default snapshot MUST be `{ mode: 'standard' }`. Total length, body diameter, flange dimensions, and chamfer dimensions MUST be fixed geometry derived from the selected mode and MUST NOT be exposed as user parameters.

#### Scenario: Default pillar parameters

- **WHEN** a user opens the pillar component without a valid saved snapshot
- **THEN** the component MUST use `mode=standard`
- **AND** the generated model MUST use the standard fixed-length assembly profile

#### Scenario: Valid pillar modes

- **WHEN** a pillar snapshot contains `mode=standard` or `mode=thin-shell`
- **THEN** validation MUST accept the snapshot
- **AND** the generated model MUST use only the corresponding fixed mode profile

#### Scenario: Invalid pillar mode

- **WHEN** a pillar snapshot contains a missing, non-string, or unsupported `mode`
- **THEN** validation MUST reject the snapshot with a field-specific diagnostic
- **AND** the invalid snapshot MUST NOT be sent as a valid model-generation request

#### Scenario: Legacy pillar snapshot migration

- **WHEN** persistence contains the old `{ length, baseConnection }` pillar shape or another malformed pillar record
- **THEN** hydration MUST normalize it to `{ mode: 'standard' }`
- **AND** the old arbitrary length and checkbox state MUST NOT remain as active user parameters

### Requirement: Pillar geometry quality and export identity

Every valid pillar generation MUST produce one connected solid with finite, non-empty mesh data and bounds centered on X/Y. Both `standard` and `thin-shell` modes MUST have X/Y bounds of ±3.5 mm and a Z bound beginning at 0. The standard mode MUST have Z bounds `[0, 9]` and the thin-shell mode MUST have Z bounds `[0, 5]`. The deterministic export stems MUST be `pillar-9-standard` and `pillar-5-thin-shell` for the corresponding modes, with `.step` and `.stl` extensions supplied by the existing export contracts.

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

#### Scenario: Mode-specific export identity

- **WHEN** a committed standard pillar is exported
- **THEN** its export stem MUST be `pillar-9-standard`
- **WHEN** a committed thin-shell pillar is exported
- **THEN** its export stem MUST be `pillar-5-thin-shell`
- **AND** every export MUST use the committed pillar B-Rep rather than a viewport mesh reconstruction

## ADDED Requirements

### Requirement: Fixed mode-specific pillar geometry

For either valid mode, the generator MUST create one centered Ø4.5 mm cylindrical body on the Z axis, a flat sharp-edged Ø7 mm lower flange with axial height 0.8 mm, and a sharp 90-degree shoulder between the flange and body. The upper end MUST retain the existing 0.5 mm, 45-degree equal-distance chamfer. The flange and upper chamfer MUST be included within the fixed total length: 9 mm for `standard` and 5 mm for `thin-shell`.

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

#### Scenario: Fixed dimensions are not user parameters

- **WHEN** a user views or edits the pillar panel
- **THEN** no manual length, diameter, flange-height, or chamfer control MUST be exposed
- **AND** selecting a mode MUST be sufficient to select the complete geometry profile

## REMOVED Requirements

### Requirement: Plain pillar geometry

For a valid snapshot with `baseConnection=false`, the generator MUST create one centered Ø5 mm cylindrical body on the Z axis with total height `length` and base at `Z=0`. The upper end MUST have a 0.5 mm, 45° equal-distance chamfer. The lower end MUST have the same Ø5 mm, 1 mm, 45° equal-distance chamfer. The chamfers MUST be included within the requested total length.

**Reason**: The plain Ø5 mm arbitrary-length profile is replaced by the two fixed assembly modes.

**Migration**: Normalize legacy snapshots to `{ mode: 'standard' }`.

### Requirement: Base-connection pillar geometry

For a valid snapshot with `baseConnection=true`, the lower end MUST be a flat, sharp-edged Ø7 mm flange with axial height 0.8 mm, followed directly by the Ø5 mm body. The Ø7-to-Ø5 transition MUST be a sharp 90° step with no transition chamfer or fillet. The upper end MUST retain a 0.5 mm, 45° equal-distance chamfer. The flange, body, and upper chamfer MUST fit within the requested total length, so enabling the option MUST NOT increase the total height.

**Reason**: The checkbox-controlled arbitrary-length profile is replaced by fixed standard and thin-shell modes.

**Migration**: Use `mode=standard` or `mode=thin-shell`; retain the Ø7 mm flange diameter, 0.8 mm flange height, and 0.5 mm upper chamfer.
