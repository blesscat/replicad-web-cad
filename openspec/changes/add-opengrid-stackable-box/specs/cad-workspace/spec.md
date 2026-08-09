## ADDED Requirements

### Requirement: OpenGrid stackable-box workspace integration

The runtime-validated catalog MUST register `opengrid-stackable-box` as an independent model definition in the OpenGrid series, and the model-specific CAD route MUST bind `/cad/opengrid-stackable-box` to that definition. The Worker MUST dispatch this model to its own parameter validation and geometry boundary without falling through to `opengrid`, `box-normal`, or another component. The workspace MUST preserve the existing latest-wins generation, preview, commit, STEP, and STL lifecycle.

#### Scenario: Direct stackable-box navigation

- **WHEN** a user opens `/cad/opengrid-stackable-box` with browser CAD prerequisites available
- **THEN** the page MUST load the stackable-box workspace
- **AND** the initial generation MUST use valid saved stackable-box parameters when available, otherwise the model definition defaults
- **AND** the committed revision MUST be identified as `opengrid-stackable-box`

#### Scenario: Stackable-box route isolation

- **WHEN** a `model.generate` request carries `modelId=opengrid-stackable-box`
- **THEN** the Worker MUST validate the stackable-box parameter shape
- **AND** it MUST use the stackable-box builder boundary
- **AND** it MUST reject mismatched parameters rather than resolving the request through the official OpenGrid board or another model

#### Scenario: Stackable-box controls

- **WHEN** a user views `/cad/opengrid-stackable-box`
- **THEN** the panel MUST expose the stackable box's X, Y, and height controls with OpenGrid 28 mm and half-cell semantics
- **AND** it MUST describe the fixed top guide, bottom receiving groove, and four-corner Snap mounting interface
- **AND** it MUST NOT expose an upper-box/lower-box variant selector or a permanently protruding stacking-post toggle

#### Scenario: Stackable-box export

- **WHEN** a valid stackable-box candidate is committed
- **THEN** the workspace MUST make its STEP and STL exports available using stackable-box metadata
- **AND** exports MUST remain disabled while the current snapshot is invalid, stale, or failed geometry validation
