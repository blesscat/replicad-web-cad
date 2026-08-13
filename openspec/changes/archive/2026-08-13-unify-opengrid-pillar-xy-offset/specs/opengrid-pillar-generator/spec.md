## MODIFIED Requirements

### Requirement: Pillar parameter contract

The system MUST expose an independent OpenGrid component with stable `modelId=opengrid-pillar` and `buildKey=opengrid-pillar`. Its normalized parameter snapshot MUST be either exactly `{ mode: 'standard', offset }`, exactly `{ mode: 'thin-shell', offset }`, or exactly `{ mode: 'positioning', length, offset }`. `length` MUST be a safe integer from 3 through 500 mm and MUST be accepted only by `positioning`. `offset` MUST be a finite numeric millimetre value from -0.5 through 0.5 inclusive and MUST use a 0.05 mm step without automatic rounding; the same value MUST be applied to both world X and world Y. The default snapshot MUST be `{ mode: 'standard', offset: 0 }`. The standard and thin-shell total lengths, body diameter, flange dimensions, and chamfer dimensions MUST be fixed geometry and MUST NOT be exposed as user parameters. The positioning mode MUST retain the Ø5 mm two-end-chamfer profile and expose only its total length plus the shared XY offset as user parameters.

#### Scenario: Default pillar parameters

- **WHEN** a user opens the pillar component without a valid saved snapshot
- **THEN** the component MUST use `mode=standard` and `offset=0`
- **AND** the generated model MUST use the standard 9 mm fixed-length assembly profile at the world XY origin

#### Scenario: Valid pillar modes

- **WHEN** a pillar snapshot contains `mode=standard`, `mode=thin-shell`, or `mode=positioning` with an integer length from 3 through 500 mm and a valid shared offset
- **THEN** validation MUST accept the snapshot
- **AND** the generated model MUST use only the corresponding mode profile translated by `(offset, offset, 0)`

#### Scenario: XY offset validation

- **WHEN** a pillar snapshot contains a fractional-step, non-finite, non-numeric, or out-of-range `offset`
- **THEN** validation MUST reject the snapshot with an `offset`-specific diagnostic
- **AND** the invalid snapshot MUST NOT be sent as a valid model-generation request

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
- **THEN** hydration MUST normalize it to `{ mode: 'positioning', length, offset: 0 }`
- **WHEN** persistence contains the old `{ mode, offsetX, offsetY }` shape with equal valid X/Y offsets
- **THEN** hydration MUST normalize it to the corresponding `{ mode, offset }` shape
- **WHEN** persistence contains the old X/Y shape with unequal offsets
- **THEN** hydration MUST preserve the valid mode and positioning length when available and normalize the shared offset to `0`
- **WHEN** persistence contains an old mode-only snapshot or another malformed pillar record
- **THEN** hydration MUST normalize it to `{ mode: 'standard', offset: 0 }` or another corresponding valid mode with zero offset
- **AND** an old checkbox state MUST NOT remain as an active user parameter

### Requirement: Pillar geometry quality and export identity

Every valid pillar generation MUST produce one connected solid with finite, non-empty mesh data and bounds translated by the requested shared `offset` on both X and Y. The `standard` and `thin-shell` modes MUST have local X/Y envelope extents of ±3.5 mm; the `positioning` mode MUST have local X/Y envelope extents of ±2.5 mm. The standard mode MUST have Z bounds `[0, 9]`, the thin-shell mode MUST have Z bounds `[0, 6]`, and positioning mode MUST have Z bounds `[0, length]`. The deterministic zero-offset export stems MUST be `pillar-9-standard`, `pillar-6-thin-shell`, and `pillar-{length}-positioning`; a non-zero shared offset export MUST append a deterministic `-xy{offset}` value so distinct typed positions cannot share export metadata. `.step` and `.stl` extensions MUST remain supplied by the existing export contracts.

#### Scenario: Standard quality gate

- **WHEN** a valid standard pillar candidate with `offset=0` is prepared for commit
- **THEN** it MUST contain exactly one valid connected solid
- **AND** its mesh MUST be finite and non-empty
- **AND** its bounds MUST be `[-3.5, -3.5, 0]` through `[3.5, 3.5, 9]` within the workspace tolerance

#### Scenario: Thin-shell quality gate

- **WHEN** a valid thin-shell pillar candidate with `offset=0` is prepared for commit
- **THEN** it MUST contain exactly one valid connected solid
- **AND** its mesh MUST be finite and non-empty
- **AND** its bounds MUST be `[-3.5, -3.5, 0]` through `[3.5, 3.5, 6]` within the workspace tolerance

#### Scenario: Positioning quality gate

- **WHEN** a valid positioning pillar with `length=25` and `offset=0.25` is prepared for commit
- **THEN** it MUST contain exactly one valid connected solid
- **AND** its mesh MUST be finite and non-empty
- **AND** its bounds MUST be `[-2.25, -2.25, 0]` through `[2.75, 2.75, 25]` within the workspace tolerance

#### Scenario: Mode-specific export identity

- **WHEN** a committed standard pillar with zero offset is exported
- **THEN** its export stem MUST be `pillar-9-standard`
- **WHEN** a committed thin-shell pillar with zero offset is exported
- **THEN** its export stem MUST be `pillar-6-thin-shell`
- **WHEN** a committed positioning pillar with `length=25` and `offset=0.25` is exported
- **THEN** its export stem MUST identify the shared offset as `pillar-25-positioning-xy0.25`
- **AND** the export MUST use the committed pillar B-Rep rather than a viewport mesh reconstruction

### Requirement: Fixed mode-specific pillar geometry

For the `standard` and `thin-shell` modes, the generator MUST create one centered Ø5 mm cylindrical body on the local Z axis, a flat sharp-edged Ø7 mm lower flange with axial height 0.8 mm, and a sharp 90-degree shoulder between the flange and body. The upper end MUST retain the existing 0.5 mm, 45-degree equal-distance chamfer. The flange and upper chamfer MUST be included within the fixed total length: 9 mm for `standard` and 6 mm for `thin-shell`. The complete local geometry MUST then be translated by `(offset, offset, 0)` as one solid without changing its Z=0 base; the Ø7 mm flange MUST receive the same translation as the Ø5 mm body.

#### Scenario: Standard pillar geometry

- **WHEN** the generator builds `{ mode: 'standard', offset: 0 }`
- **THEN** the model MUST span `Z=0` through `Z=9`
- **AND** the lower `Z=0` to `Z=0.8` segment MUST be Ø7 mm with a flat bottom
- **AND** the Ø7-to-Ø5 transition at `Z=0.8` MUST be sharp
- **AND** the upper 0.5 mm chamfer MUST remain present

#### Scenario: Thin-shell pillar geometry

- **WHEN** the generator builds `{ mode: 'thin-shell', offset: 0 }`
- **THEN** the model MUST span `Z=0` through `Z=6`
- **AND** the lower `Z=0` to `Z=0.8` segment MUST be Ø7 mm with a flat bottom
- **AND** the Ø7-to-Ø5 transition at `Z=0.8` MUST be sharp
- **AND** the upper 0.5 mm chamfer MUST remain present

#### Scenario: Positioning pillar geometry

- **WHEN** the generator builds `{ mode: 'positioning', length: 25, offset: 0.1 }`
- **THEN** the model MUST span `Z=0` through `Z=25`
- **AND** the body MUST be Ø5 mm
- **AND** the lower end MUST retain the original 1 mm, 45-degree chamfer
- **AND** the upper end MUST retain the original 0.5 mm, 45-degree chamfer
- **AND** both chamfers MUST be included within the requested total length
- **AND** the complete model MUST be translated to `(0.1, 0.1, 0)`

#### Scenario: Fixed dimensions are not user parameters

- **WHEN** a user views or edits the pillar panel
- **THEN** selecting standard or thin-shell MUST be sufficient to select the complete fixed geometry profile
- **AND** those fixed modes MUST expose only one shared XY offset control in addition to the mode selector
- **AND** those fixed modes MUST NOT expose a manual length, diameter, flange-height, or chamfer control
- **AND** selecting positioning MUST expose only the custom total-length and one shared XY offset control
