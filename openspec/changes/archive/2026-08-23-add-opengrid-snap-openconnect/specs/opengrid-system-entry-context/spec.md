## ADDED Requirements

### Requirement: Snap system radio uses separate persistence scopes

The `/cad/opengrid-snap` panel MUST expose a top-level radio group with exactly
`desk` and `wall` choices. The selected choice MUST select the corresponding
system-scoped Snap parameter snapshot and default values without adding a
system field to the normalized CAD parameter contract or changing the
`opengrid-snap` model ID, route, Worker request model ID, or export contract.
The Desk and Wall scopes MUST persist independently; changing the radio MUST
not overwrite the inactive scope. A supported `?system=desk` or `?system=wall`
route MUST initialize the radio to that choice. A context-free Snap route MUST
retain its existing model-default behavior until the user explicitly chooses a
system scope. Switching scopes MUST use the existing invalid-input and
generation lifecycle, with no additional system-mismatch blocking rule.

#### Scenario: Desk and Wall Snap values persist independently

- **GIVEN** the user has different valid Snap values in the Desk and Wall radio
  scopes
- **WHEN** the user switches between the two radio choices
- **THEN** each choice MUST restore its own saved values
- **AND** changing one scope MUST NOT overwrite the other scope

#### Scenario: Route context initializes the matching radio

- **WHEN** the user opens `/cad/opengrid-snap?system=desk` or
  `/cad/opengrid-snap?system=wall`
- **THEN** the top radio MUST select the corresponding system before the first
  generation
- **AND** the existing scoped preset and persistence precedence MUST remain
  applicable

#### Scenario: Radio switching preserves the existing model lifecycle

- **WHEN** the user changes the Snap system radio to another valid scope
- **THEN** the workspace MUST validate and generate the selected scope's
  parameters through the existing debounce and latest-wins lifecycle
- **AND** the Worker request MUST continue to use `modelId=opengrid-snap`
- **AND** no separate system-mismatch rejection MUST be added

### Requirement: Snap system radio controls system-specific options

In the Desk radio scope, the Snap panel MUST expose the footprint, four-corner
locating-hole, and center-remover controls. In the Wall radio scope, the
footprint MUST be fixed to `full` and the locating-hole and center-remover
controls MUST not be user-selectable. The OpenConnect option MUST be exposed
in the Wall scope and MUST not be exposed as a user-selectable option in the
Desk scope. Variant, profile, XY offset, and existing magnet controls MUST
remain available according to their existing Snap contracts unless a separate
footprint rule disables them. The Wall scope MUST default `offset=0` and
`openConnect=false`; the Desk scope MUST default `openConnect=false`.

#### Scenario: Desk scope exposes desktop-only Snap controls

- **WHEN** the Desk radio is selected
- **THEN** the panel MUST show the footprint, locating-hole, and center-remover
  controls
- **AND** the OpenConnect option MUST not be user-selectable
- **AND** the saved Desk values MUST remain available to the generation request

#### Scenario: Wall scope fixes the footprint and exposes OpenConnect

- **WHEN** the Wall radio is selected
- **THEN** the panel MUST retain `footprint=full`
- **AND** the locating-hole and center-remover controls MUST be hidden or
  otherwise unavailable for editing
- **AND** the OpenConnect option MUST be visible
- **AND** the XY offset control MUST remain adjustable with a default value of
  `0`

#### Scenario: Wall scope normalizes hidden fixed-footprint options

- **GIVEN** a persisted Wall Snap snapshot contains a valid partial footprint
  or enables a locating/remover flag
- **WHEN** the Wall radio scope is loaded
- **THEN** the active snapshot MUST use `footprint=full`
- **AND** `fourCornerLocatingHoles` and `centerRemoverHole` MUST be `false`
- **AND** the scope switch MUST remain a valid state transition rather than a
  system-mismatch validation error

#### Scenario: Wall OpenConnect offset keeps the head at source size

- **WHEN** the Wall scope enables OpenConnect and changes the XY offset
- **THEN** the Snap assembly MUST use the requested adjusted XY envelope
- **AND** the OpenConnect head MUST remain at its source dimensions
- **AND** the final interface placement MUST use the adjusted Snap before the
  head is composed

#### Scenario: Existing magnet controls remain scope-independent

- **WHEN** the user switches between Desk and Wall radio scopes
- **THEN** the existing magnet controls MUST remain available according to the
  current magnet contract
- **AND** the selected scope MUST persist its own magnet values independently
