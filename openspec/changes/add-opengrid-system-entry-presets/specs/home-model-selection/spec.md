## ADDED Requirements

### Requirement: OpenGrid system entry subgroups

The static `/models` chooser MUST split the visible OpenGrid catalog entries into `Desktop System` and `Wall Related` subgroups. The Desktop subgroup MUST contain `opengrid`, `opengrid-snap`, `opengrid-pillar`, `opengrid-divider`, `opengrid-stackable-box`, `opengrid-stackable-cylinder`, and `opengrid-snap-remover`; the Wall subgroup MUST contain only `opengrid` and `opengrid-snap`. Each entry MUST retain its understandable selection label and model-specific route, and the HSW series MUST remain after the OpenGrid subgroups.

#### Scenario: Desktop and Wall groups are visible

- **WHEN** a user opens `/models`
- **THEN** the page MUST show `Desktop System` and `Wall Related` under the OpenGrid series
- **AND** the Desktop subgroup MUST show every visible OpenGrid model
- **AND** the Wall subgroup MUST show only the bottom plate and Snap
- **AND** the HSW series MUST remain available as a separate context-free group

### Requirement: System-aware chooser links

The OpenGrid entries rendered from a system subgroup MUST link to the same `/cad/<modelId>` route with `system=desktop` or `system=wall` as appropriate. The chooser MUST remain static and MUST NOT initialize CAD generation to render either subgroup or its preview images.

#### Scenario: Selecting a Wall Snap entry

- **WHEN** a user activates the Snap card under `Wall Related`
- **THEN** navigation MUST go to `/cad/opengrid-snap?system=wall`
- **AND** the target page MUST initialize the existing `opengrid-snap` model with the Wall context
