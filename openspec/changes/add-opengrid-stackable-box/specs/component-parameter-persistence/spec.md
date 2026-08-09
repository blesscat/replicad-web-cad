## ADDED Requirements

### Requirement: Stackable-box parameters are persisted independently

The versioned browser persistence MUST store valid `opengrid-stackable-box` parameters under that stable model id. The entry MUST contain typed `x`, `y`, and `height` values accepted by the stackable-box validator, and MUST remain independent from both `opengrid` board parameters and `box-normal` parameters. Invalid or incomplete stackable-box input MUST NOT overwrite the last accepted entry.

#### Scenario: Restore saved stackable-box parameters

- **GIVEN** browser persistence contains a valid `opengrid-stackable-box` entry
- **WHEN** the user opens `/cad/opengrid-stackable-box`
- **THEN** the controls MUST display the saved typed X/Y/height values
- **AND** the first generation MUST use those values

#### Scenario: Persist a valid stackable-box update

- **GIVEN** a stackable-box snapshot passes its component validation
- **WHEN** the workspace accepts the update
- **THEN** persistence MUST update only the `opengrid-stackable-box` entry
- **AND** half-cell values MUST remain typed numeric values without rounding

#### Scenario: Invalid stackable-box input does not overwrite persistence

- **GIVEN** a previously accepted stackable-box snapshot exists
- **WHEN** the user enters an invalid, incomplete, or out-of-range X/Y/height value
- **THEN** the previous accepted stackable-box entry MUST remain unchanged
- **AND** the invalid snapshot MUST NOT be used for initialization or sent to the Worker
