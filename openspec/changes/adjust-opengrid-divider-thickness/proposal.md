## Why

The OpenGrid divider currently generates a continuous 5 mm-wide wall, which is too thick for thin partition use cases such as the requested 2 mm divider. The divider needs a thinner adjustable upper wall while retaining a 5 mm support footprint at its base and a print-friendly 45-degree transition between them.

## What Changes

- **BREAKING** Extend the normalized `opengrid-divider` parameter snapshot with an integer `wallThickness` from 1 through 5 mm, defaulting to 2 mm; preserve the existing `modelId`, route, and `buildKey`.
- Replace the current continuous 5 mm wall profile with a 5 mm base support and an upper wall whose plan thickness is the selected `wallThickness`.
- Add a nominal 45-degree planar chamfer transition from the 5 mm base to the adjustable upper wall. The geometry MUST cap the chamfer height at the stable value available for the selected thickness and MUST reject any profile that cannot be built as one valid solid.
- Keep the existing directional arm layout, 14 mm/7 mm grid semantics, locating pegs, top 1 mm rounding, and export lifecycle; adapt bounds, quality checks, and the thin-wall side-rounding behavior to the new profile.
- Add a divider-thickness control to the CAD panel, include the selected thickness and transition in the derived summary/copy, and update the model chooser description.
- Persist the new typed thickness value under the existing `opengrid-divider` entry. Stored snapshots missing the new field MUST fall back to the default thickness of 2 mm; invalid thickness values MUST use the normal validated-default path.
- Include wall thickness in deterministic STEP/STL filenames so exports with different thicknesses cannot collide.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `opengrid-divider-generator`: Add adjustable upper wall thickness, the 5 mm base support, 45-degree chamfer transition, thin-wall validation, and thickness-aware bounds/exports.
- `cad-workspace`: Expose and preview the new divider-thickness parameter and print-friendly chamfer while preserving the existing divider-only route and lifecycle.
- `component-parameter-persistence`: Persist and restore the new typed thickness field with a default migration for older divider snapshots.
- `home-model-selection`: Describe the divider's adjustable 1–5 mm wall thickness and 45-degree base chamfer accurately.

## Impact

- Affected areas include the divider contract and validators, model catalog and panel schema, workspace parameter parsing, persistence validation, CAD-kernel profile builder and quality gate, export filename helpers, and unit/worker/integration/e2e tests.
- The Worker protocol version and existing `opengrid` and `opengrid-stackable-box` model IDs and behavior remain unchanged.
- Existing divider persisted entries remain usable through the default-2 mm compatibility fallback, but generated export filenames gain a thickness component.
