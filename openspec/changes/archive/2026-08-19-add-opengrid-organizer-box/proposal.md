## Why

OpenGrid currently provides stackable containers, but it does not provide a
compact organizer for batteries, tool bits, and similar items. A solid box with
an adjustable matrix of shaped top cavities would make those storage parts
printable while preserving the existing OpenGrid mounting and stacking
interfaces.

## What Changes

- Add a new OpenGrid organizer-box component with a stable
  `opengrid-organizer-box` model ID, build key, route, catalog entry, and
  component-local CAD builder.
- Let users configure X/Y cavity counts, edge-to-edge cavity spacing, cavity
  shape (circle or regular 3-, 4-, 5-, or 6-sided polygon), inscribed-circle
  diameter, cavity depth, and bottom thickness (default 2 mm).
- Provide linked or independent X/Y spacing controls and derive the OpenGrid
  footprint/grid counts from the cavity layout and fixed boundary clearances.
- Provide a mutually exclusive bottom-interface radio choice between the
  existing four-corner built-in-foot geometry and the existing box-to-box
  stacking geometry.
- Keep the organizer body solid between cavities and omit side openings.
- Preserve existing component IDs and behavior; no existing component is
  migrated or renamed.

## Capabilities

### New Capabilities

- `opengrid-organizer-box`: Configurable OpenGrid-compatible organizer box with
  shaped top cavities and selectable bottom interface.

### Modified Capabilities

- None. Existing OpenGrid board, locating assembly, Grid Box, and other model
  contracts remain unchanged.

## Impact

- Adds a typed CAD contract, validation, bounds calculation, export filenames,
  Worker-only builder, geometry quality checks, model catalog definition, route,
  parameter panel, localization, persistence, and focused unit/worker/e2e tests.
- Uses the existing OpenGrid 28 mm footprint and locating/stacking geometry as
  references, while keeping the new builder and any assets under matching
  `opengrid-organizer-box` directories.
- Adds no new third-party dependency and does not change the Worker protocol
  version or existing model IDs.
