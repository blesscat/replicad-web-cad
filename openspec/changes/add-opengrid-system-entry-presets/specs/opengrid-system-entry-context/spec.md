## Purpose

This capability gives OpenGrid model entries a stable Desk or Wall context so that entry links, initial presets, saved parameters, and generated preview assets remain aligned without creating duplicate CAD models.

## ADDED Requirements

### Requirement: Stable OpenGrid system contexts and effective presets

The system MUST recognize exactly two OpenGrid system contexts, `desk` and `wall`, from the model-entry link query. The context MUST NOT change the existing model id, build key, route slug, Worker request model id, or export contract. For `opengrid` both contexts MUST use a validated clone of the model definition defaults as their system preset. For `opengrid-snap`, the Desk preset MUST be `variant=Lite`, `profile=Standard`, `footprint=full`, `offset=0.3` for the X/Y increment, `fourCornerLocatingHoles=true`, and `centerRemoverHole=true`; the Wall preset MUST be `variant=Full`, `profile=Standard`, `footprint=full`, `offset=0`, `fourCornerLocatingHoles=false`, and `centerRemoverHole=false`. Other visible OpenGrid entries MUST use their validated model definition defaults in the Desk context and MUST NOT appear in the Wall context.

#### Scenario: Desk Snap entry resolves its preset

- **WHEN** a user opens `/cad/opengrid-snap?system=desk` without a valid Desk/Snap saved snapshot
- **THEN** the workspace MUST initialize `opengrid-snap` with the Desk preset
- **AND** the Worker request MUST continue to use `modelId=opengrid-snap`

#### Scenario: Wall Snap entry resolves its preset

- **WHEN** a user opens `/cad/opengrid-snap?system=wall` without a valid Wall/Snap saved snapshot
- **THEN** the workspace MUST initialize `opengrid-snap` with the Wall preset
- **AND** the Worker request MUST continue to use `modelId=opengrid-snap`

#### Scenario: Unknown context falls back to legacy route behavior

- **WHEN** a direct CAD route has no `system` query or has an unsupported `system` value
- **THEN** the route MUST use legacy model-id-scoped persistence and model definition defaults
- **AND** it MUST NOT silently select the Desk or Wall preset

### Requirement: Context-specific model-selection entries

The `/models` chooser MUST render the OpenGrid entries under `Desk System` and `Wall Related` subgroups before the HSW series. `opengrid` and `opengrid-snap` MUST appear in both subgroups with links carrying the corresponding context; every other visible OpenGrid model MUST appear only in Desk; HSW MUST remain a single context-free entry. The duplicated entries MUST retain the same stable model id and model-specific CAD route.

#### Scenario: OpenGrid entries carry context links

- **WHEN** a user opens `/models`
- **THEN** the Desk bottom-plate and Snap links MUST be `/cad/opengrid?system=desk` and `/cad/opengrid-snap?system=desk`
- **AND** the Wall bottom-plate and Snap links MUST be `/cad/opengrid?system=wall` and `/cad/opengrid-snap?system=wall`
- **AND** the Wall subgroup MUST NOT contain the other OpenGrid components

### Requirement: Context-specific preview identity

Every visible catalog entry MUST expose one static preview image metadata record. A context-specific entry MUST use a deterministic asset identity containing its model id and context, while a context-free entry MUST retain the `<modelId>.png` identity. A preview asset MUST be generated from the entry's effective system preset and a stable thumbnail camera; the asset MUST remain presentation-only and MUST NOT alter Worker or export contracts.

#### Scenario: Desk and Wall Snap previews are distinct assets

- **WHEN** the preview capture workflow processes the Desk and Wall Snap entries
- **THEN** it MUST visit the corresponding context routes
- **AND** it MUST write and verify separate assets for `opengrid-snap-desk.png` and `opengrid-snap-wall.png`
- **AND** each asset MUST be generated from that context's preset rather than the other context's preset or a persisted browser value
