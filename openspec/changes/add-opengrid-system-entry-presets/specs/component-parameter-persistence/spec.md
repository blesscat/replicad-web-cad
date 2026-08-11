## ADDED Requirements

### Requirement: System-scoped parameter persistence

The versioned browser-local parameter persistence MUST support an optional OpenGrid system context in addition to the stable `modelId`. A valid saved value for `(desk, modelId)` MUST be independent from `(wall, modelId)` and from the unscoped legacy `(modelId)` value. Only validated typed parameter snapshots MAY be persisted.

#### Scenario: Desk and Wall Snap values are isolated

- **GIVEN** a user saves one valid Snap snapshot from the Desk context and a different valid Snap snapshot from the Wall context
- **WHEN** the user navigates between `/cad/opengrid-snap?system=desk` and `/cad/opengrid-snap?system=wall`
- **THEN** each route MUST restore only its own scoped snapshot
- **AND** neither route MUST overwrite the other context's saved value

### Requirement: Scoped persistence precedence and legacy isolation

When a CAD route has a supported system context, initialization MUST prefer the valid saved value for that `(system, modelId)`, then that system's preset, then the model definition defaults. An unscoped legacy entry MUST NOT be used as a silent fallback for a system-scoped route. A route without a supported system context MUST preserve legacy model-id-scoped restore behavior.

#### Scenario: Legacy Snap data does not pollute Desk

- **GIVEN** only an unscoped `opengrid-snap` value exists and no Desk/Snap value exists
- **WHEN** the user opens `/cad/opengrid-snap?system=desk`
- **THEN** the workspace MUST use the Desk preset
- **AND** the unscoped value MUST remain available only to the context-free `/cad/opengrid-snap` route

#### Scenario: Restore defaults uses the active system preset

- **GIVEN** the user is in a supported system context and has changed its parameters
- **WHEN** the user activates `全部恢復預設`
- **THEN** the controls and next generation MUST use the active system preset
- **AND** the reset MUST NOT copy the unscoped model definition value when the system preset differs
