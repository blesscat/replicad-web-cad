## ADDED Requirements

### Requirement: System context controls initial CAD generation

The CAD workspace MUST resolve the supported `desktop` or `wall` context before its first generation. It MUST initialize from the valid scoped snapshot, system preset, or model definition default according to the persistence precedence, while keeping the existing model id, generation lifecycle, viewport behavior, and export gates unchanged.

#### Scenario: Context route initializes the matching Snap geometry

- **WHEN** a user opens `/cad/opengrid-snap?system=desktop` or `/cad/opengrid-snap?system=wall` without scoped saved values
- **THEN** generation 1 MUST use the corresponding context preset
- **AND** the committed model MUST retain `modelId=opengrid-snap`
- **AND** the model MUST remain previewable and exportable through the existing Worker lifecycle

### Requirement: System-aware restore defaults

When a supported system context is active, the CAD workspace's restore-defaults action MUST apply the active system preset and persist the validated result in that system scope. The context-free route MUST continue to restore the model definition defaults.

#### Scenario: Wall reset restores Wall Snap defaults

- **WHEN** a user changes Wall Snap parameters and activates `全部恢復預設`
- **THEN** the controls MUST return to Full/Standard/full/0 with both optional hole flags disabled
- **AND** the next valid generation MUST use those values
