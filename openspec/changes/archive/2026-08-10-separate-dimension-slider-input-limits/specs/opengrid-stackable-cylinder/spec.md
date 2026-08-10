## MODIFIED Requirements

### Requirement: OpenGrid stackable-cylinder identity and parameters

The system MUST expose an independently validated OpenGrid component with `modelId=opengrid-stackable-cylinder`, `buildKey=opengrid-stackable-cylinder`, and route `/cad/opengrid-stackable-cylinder`. Its user-facing display name MUST begin with `OpenGrid `. The normalized parameter snapshot MUST contain exactly integer `diameter` and `height` values. `diameter` MUST represent the outer diameter and MUST be within 20–300 mm; `height` MUST be within 10–500 mm. Both fields MUST use a 1 mm step and decimal, empty, non-finite, zero, negative, and out-of-range values MUST be rejected without rounding. The height slider MUST expose 10–200 mm while the height text input MUST expose 10–500 mm; the existing diameter range and control limits MUST remain unchanged.

#### Scenario: Valid cylinder defaults

- **WHEN** the cylinder route initializes without valid persisted parameters
- **THEN** the catalog defaults MUST provide a valid diameter and height snapshot
- **AND** the model MUST be centered on X/Y with its base at Z=0
- **AND** the Worker MUST generate a non-empty previewable B-Rep

#### Scenario: Valid diameter and height changes

- **WHEN** a user enters integer diameter and height values within the declared ranges
- **THEN** the snapshot MUST pass component validation
- **AND** the generated bounds MUST use the requested outer diameter and overall height within the project tolerance

#### Scenario: Maximum manual height is valid

- **WHEN** a user enters `height=500` while the diameter remains within 20–300 mm
- **THEN** the snapshot MUST pass component validation
- **AND** the generated cylinder MUST have the requested 500 mm overall height
- **AND** the height slider MUST retain a maximum of 200 mm

#### Scenario: Invalid cylinder parameters

- **WHEN** diameter or height is fractional, empty, non-finite, non-positive, or outside its declared range
- **THEN** validation MUST return a field-specific error
- **AND** the invalid snapshot MUST NOT be sent to the Worker for generation or export
