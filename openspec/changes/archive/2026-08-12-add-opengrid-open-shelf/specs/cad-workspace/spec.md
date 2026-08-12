## ADDED Requirements

### Requirement: Open Shelf workspace integration

The CAD workspace MUST register `opengrid-open-shelf` as an independent model definition, expose only its `x`, `y`, `height`, `cellX`, `cellZ`, and `angle` controls, route `/cad/opengrid-open-shelf` to that definition, and dispatch Worker generation to the `opengrid-open-shelf` kernel builder. The component MUST use the existing debounce, latest-wins candidate, commit, mesh, STEP, and STL gates.

#### Scenario: Open Shelf route initializes independently

- **WHEN** a user opens `/cad/opengrid-open-shelf` with browser CAD prerequisites
- **THEN** the workspace MUST initialize `modelId=opengrid-open-shelf`
- **AND** generation 1 MUST use a valid saved snapshot or the Open Shelf defaults
- **AND** the Worker MUST not fall through to `box-normal`, `opengrid`, or `opengrid-stackable-box`

#### Scenario: Open Shelf controls expose only its parameters

- **WHEN** the Open Shelf parameter panel is rendered
- **THEN** it MUST expose outer X/Y grid counts, total height, internal X/Z cell counts, and angle controls
- **AND** it MUST show the 0–75° angle limit and the total-height meaning
- **AND** it MUST not expose stackable-box modes, ordinary OpenGrid board fields, or another component's controls

#### Scenario: Open Shelf uses the existing export lifecycle

- **WHEN** a valid Open Shelf generation is committed
- **THEN** the workspace MUST display its mesh and enable the existing STEP/STL export actions
- **AND** a stale, invalid, or failed generation MUST not replace the last committed revision or enable a new export

### Requirement: Open Shelf raw input validation follows the workspace lifecycle

The workspace MUST parse the six Open Shelf fields into the typed snapshot required by the component contract. Empty, fractional, non-finite, unknown, or out-of-range raw input MUST produce field-specific validation feedback and `model.invalidate`; valid input MUST use the existing debounce and Worker generation lifecycle.

#### Scenario: Invalid Open Shelf input is invalidated

- **WHEN** a user enters an invalid X/Y/height/cell-count/angle value
- **THEN** the workspace MUST show a diagnosable field error
- **AND** it MUST invalidate the pending generation rather than build native geometry
- **AND** export MUST remain disabled while the input is invalid or stale

#### Scenario: Valid Open Shelf input generates typed parameters

- **WHEN** all six fields form a valid snapshot and the debounce settles
- **THEN** the Worker request MUST contain typed `x`, `y`, `height`, `cellX`, `cellZ`, and `angle`
- **AND** only the latest valid candidate MUST be eligible for commit
