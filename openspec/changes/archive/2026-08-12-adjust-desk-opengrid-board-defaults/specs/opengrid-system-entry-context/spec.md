## MODIFIED Requirements

### Requirement: Stable OpenGrid system contexts and effective presets

The system MUST recognize exactly two OpenGrid system contexts, `desk` and `wall`, from the model-entry link query. The context MUST NOT change the existing model id, build key, route slug, Worker request model id, or export contract. For `opengrid`, the Wall preset MUST be a validated clone of the model definition defaults and the Desk preset MUST override `rows=4`, `columns=4`, `chamfers=none`, and `screwMode=none` on that clone. The Desk preset MUST retain the model definition defaults for all other OpenGrid parameters, including connector controls, screw dimensions, modifiers, and an empty custom position list. For `opengrid-snap`, the Desk preset MUST be `variant=Lite`, `profile=Standard`, `footprint=full`, `offset=0.25` for the X/Y increment, `fourCornerLocatingHoles=true`, and `centerRemoverHole=true`; the Wall preset MUST be `variant=Full`, `profile=Standard`, `footprint=full`, `offset=0`, `fourCornerLocatingHoles=false`, and `centerRemoverHole=false`. For `opengrid-pillar`, the Desk preset MUST be `{ mode: 'thin-shell' }`. For `opengrid-stackable-box`, the Desk preset MUST be `x=4`, `y=2`, `height=30`, `thinShellMode=true`, and `basePlateMode=false`. For `opengrid-stackable-cylinder`, the Desk preset MUST be `diameter=60`, `height=30`, `thinBottomMode=true`, and `bottomPlateMode=false`. Any other visible OpenGrid entry MUST use its validated model definition defaults in the Desk context and MUST NOT appear in the Wall context.

#### Scenario: Desk Snap entry resolves its preset

- **WHEN** a user opens `/cad/opengrid-snap?system=desk` without a valid Desk/Snap saved snapshot
- **THEN** the workspace MUST initialize `opengrid-snap` with the Desk preset
- **AND** the Worker request MUST continue to use `modelId=opengrid-snap`

#### Scenario: Wall Snap entry resolves its preset

- **WHEN** a user opens `/cad/opengrid-snap?system=wall` without a valid Wall/Snap saved snapshot
- **THEN** the workspace MUST initialize `opengrid-snap` with the Wall preset
- **AND** the Worker request MUST continue to use `modelId=opengrid-snap`

#### Scenario: Desk pillar entry resolves the thin-shell preset

- **WHEN** a user opens `/cad/opengrid-pillar?system=desk` without a valid Desk/Pillar saved snapshot
- **THEN** the workspace MUST initialize `opengrid-pillar` with `{ mode: 'thin-shell' }`
- **AND** the Worker request MUST continue to use `modelId=opengrid-pillar`

#### Scenario: Desk board entry resolves the no-feature preset

- **WHEN** a user opens `/cad/opengrid?system=desk` without a valid Desk/OpenGrid saved snapshot
- **THEN** the workspace MUST initialize `opengrid` with `rows=4`, `columns=4`, `chamfers=none`, and `screwMode=none`
- **AND** the remaining OpenGrid parameters MUST retain the validated model definition defaults
- **AND** the Worker request MUST continue to use `modelId=opengrid`

#### Scenario: Wall and context-free board routes retain official defaults

- **WHEN** a user opens `/cad/opengrid?system=wall` or `/cad/opengrid` without a valid saved snapshot
- **THEN** the workspace MUST retain `chamfers=corners` and `screwMode=corners`
- **AND** the Wall route MUST retain the existing Wall preset behavior
- **AND** the context-free route MUST use legacy model-id-scoped persistence and model definition defaults

#### Scenario: Saved Desk board parameters take precedence

- **GIVEN** browser persistence contains a valid saved Desk/OpenGrid snapshot
- **WHEN** a user opens `/cad/opengrid?system=desk`
- **THEN** the workspace MUST use the saved Desk snapshot instead of replacing it with the no-feature Desk preset

#### Scenario: Unknown context falls back to legacy route behavior

- **WHEN** a direct CAD route has no `system` query or has an unsupported `system` value
- **THEN** the route MUST use legacy model-id-scoped persistence and model definition defaults
- **AND** it MUST NOT silently select the Desk or Wall preset

### Requirement: Context-aware OpenGrid board restore behavior

The OpenGrid board panel MUST use the active context's effective preset as the baseline for individual changed indicators and field-level restore controls. A context-free panel MUST use the validated model definition defaults. The whole-panel restore action MUST continue to restore the same effective preset.

#### Scenario: Desk board field restore returns to Desk defaults

- **GIVEN** a user is on `/cad/opengrid?system=desk` and changes the chamfer or screw-hole mode
- **WHEN** the user activates the corresponding field-level restore control
- **THEN** that field MUST return to `chamfers=none` or `screwMode=none`
- **AND** the field MUST no longer be marked as changed from the Desk effective preset

#### Scenario: Desk board whole restore returns to Desk defaults

- **GIVEN** a user is on `/cad/opengrid?system=desk` with modified board parameters
- **WHEN** the user activates `全部恢復預設`
- **THEN** the board MUST return to the Desk effective preset, including `rows=4`, `columns=4`, `chamfers=none`, and `screwMode=none`

#### Scenario: Context-free board field restore returns to official defaults

- **GIVEN** a user is on `/cad/opengrid` and changes the chamfer or screw-hole mode
- **WHEN** the user activates the corresponding field-level restore control
- **THEN** that field MUST return to the official defaults `chamfers=corners` or `screwMode=corners`
