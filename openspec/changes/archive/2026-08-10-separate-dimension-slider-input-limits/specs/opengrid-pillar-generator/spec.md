## MODIFIED Requirements

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

#### Scenario: Maximum manual length is valid

- **WHEN** a pillar snapshot contains `length=500` and a boolean `baseConnection`
- **THEN** validation MUST accept the snapshot
- **AND** the generated Z span MUST equal 500 mm

#### Scenario: Boolean base connection validation

- **WHEN** a pillar snapshot contains a value other than a typed boolean for `baseConnection`
- **THEN** validation MUST reject the snapshot with a field-specific diagnostic
- **AND** the invalid value MUST NOT be silently coerced
