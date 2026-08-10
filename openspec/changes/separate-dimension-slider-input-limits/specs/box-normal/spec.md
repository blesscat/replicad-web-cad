## MODIFIED Requirements

### Requirement: box-normal parameters and defaults

The system MUST provide an independent `box-normal` component with exactly four typed parameters: integer `x`, integer `y`, integer `height`, and boolean `cornerPosts`. `x` MUST be in the inclusive range 2–40, `y` MUST be in the inclusive range 2–35, and `height` MUST be a safe integer in the inclusive range 10–500 mm. `cornerPosts` MUST default to true. The default parameter snapshot MUST be `x=2`, `y=2`, `height=10`, and `cornerPosts=true`.

#### Scenario: Default box-normal parameters

- **WHEN** a user opens `/cad/box-normal` without a valid saved `box-normal` entry
- **THEN** the component MUST initialize with `x=2`, `y=2`, `height=10`, and `cornerPosts=true`
- **AND** the first valid generation MUST use those typed values

#### Scenario: Valid parameter limits

- **WHEN** `x`, `y`, and `height` are supplied as integer values within their configured ranges and `cornerPosts` is boolean
- **THEN** component validation MUST accept the complete parameter snapshot
- **AND** the accepted value MUST preserve the typed boolean and integer values without rounding

#### Scenario: Maximum manual height is valid

- **WHEN** a user supplies `height=500` with valid `x`, `y`, and `cornerPosts` values
- **THEN** component validation MUST accept the snapshot
- **AND** generation MUST preserve the requested 500 mm body height

#### Scenario: Invalid box-normal parameters

- **WHEN** any parameter is missing, fractional, non-finite, outside its range, or has an unsupported type
- **THEN** validation MUST reject the snapshot with a field-specific or parameter-level diagnostic issue
- **AND** the Worker MUST NOT receive a `model.generate` request for that invalid snapshot

### Requirement: box-normal catalog, controls, bounds, and filenames

The system MUST expose `box-normal` through the model catalog and `/cad/box-normal` route with X/Y integer sliders, a height integer slider/text input, and a `cornerPosts` checkbox defaulting to checked. The height text input MUST accept 10–500 mm while the height slider MUST expose 10–200 mm. The model definition MUST report centered X/Y bounds and a Z minimum of 0. With posts enabled, the maximum Z bound MUST be `height + 7`; with posts disabled, it MUST be `height`. STEP and STL filenames MUST be deterministic using the pattern `box-normal-{x}x{y}-h{height}-{posts|plain}` with the corresponding extension.

#### Scenario: Controls expose the confirmed ranges

- **WHEN** a user views the `box-normal` parameter panel
- **THEN** X MUST expose a 2–40 integer slider
- **AND** Y MUST expose a 2–35 integer slider
- **AND** height MUST expose a 10–200 mm integer slider and a 10–500 mm integer text input
- **AND** the corner-post checkbox MUST be checked by default

#### Scenario: Manual value above slider maximum generates

- **WHEN** a user enters `height=500` in the text input
- **THEN** the text input MUST retain `500`
- **AND** the workspace MUST accept and generate the 500 mm height
- **AND** the slider MUST retain a maximum of 200 mm

#### Scenario: Deterministic export metadata

- **WHEN** `x=2`, `y=2`, `height=10`, and `cornerPosts=true` are exported
- **THEN** the STEP filename MUST be `box-normal-2x2-h10-posts.step`
- **AND** the STL filename MUST be `box-normal-2x2-h10-posts.stl`
