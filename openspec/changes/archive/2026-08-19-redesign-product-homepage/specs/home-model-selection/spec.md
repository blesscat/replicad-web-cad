## ADDED Requirements

### Requirement: Use-case-led promotional homepage

The localized product homepage MUST present the current OpenGrid Desk System as
the primary use case. It MUST explain the observable journey from configurable
CAD components to an inspected 3D preview and downloadable STEP or STL output,
and it MUST provide a clear primary entry into the Desk System context plus a
secondary entry to the canonical model chooser.

#### Scenario: New visitor understands the primary product outcome

- **WHEN** a visitor opens a localized homepage
- **THEN** the page MUST identify browser-based CAD model creation as the
  product purpose
- **AND** the primary promotional message MUST mention the OpenGrid Desk System
  or its Board/Snap/container workflow
- **AND** the page MUST visibly communicate live 3D preview and STEP/STL export

#### Scenario: Homepage provides prioritized entry paths

- **WHEN** a visitor chooses to continue from the localized homepage
- **THEN** the primary call to action MUST enter the existing OpenGrid Board
  route with the Desk System context preserved
- **AND** a secondary call to action MUST link to the localized `/models` page
- **AND** the page MUST provide a discoverable link to the existing localized
  Desk System quick-start documentation

#### Scenario: Homepage remains a static promotional surface

- **WHEN** a visitor loads the localized homepage
- **THEN** the page MUST render its promotional copy, visuals, and navigation
  without starting the CAD Worker, loading the CAD WASM runtime, initializing a
  WebGL viewport, or mounting the Svelte CAD workspace
- **AND** the page MUST NOT render the full model-selection card grid
- **AND** the canonical `/models` page MUST remain responsible for complete
  model browsing

#### Scenario: Promotional content is localized and accessible

- **WHEN** a visitor opens either supported homepage locale
- **THEN** the hero, capability labels, calls to action, workflow summary, image
  alternative text, page title, and description MUST use that locale
- **AND** all homepage promotional visuals MUST have meaningful alternative text
  or equivalent visible text
- **AND** homepage links MUST preserve the existing locale route, model ID,
  `system=desk` context, and query-string behavior
