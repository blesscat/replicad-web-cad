## Why

OpenGrid Snap needs to support the OpenConnect head shown by the supplied STEP
reference and placed as illustrated by the supplied STL reference. The current
Snap workspace has no OpenConnect option and its system presets cannot preserve
separate desktop and wall selections while composing the wall-mounted head.

## What Changes

- Add an OpenConnect option to the existing `opengrid-snap` model while
  preserving its model ID, route, and existing export contract.
- Support OpenConnect with both `Standard` and `Directional` profiles and both
  `Lite` and `Full` variants.
- Add a top-level Desktop System / Wall System radio to the Snap panel. Use the
  selected system only as the persistence/default-value scope, keeping separate
  parameter snapshots for each radio choice.
- Keep footprint, locating-hole, and center-remover controls in the Desktop
  System view; keep the Wall System footprint fixed to `full` and expose the
  OpenConnect option there.
- Keep wall-system XY offset adjustable and default it to zero. Apply the offset
  to the Snap geometry only; preserve the OpenConnect head's source dimensions.
- Compose and position the OpenConnect interface after the Snap XY adjustment,
  using the final adjusted interface location before composing the unchanged
  OpenConnect geometry.
- Preserve invalid-input display and generation/export safety for malformed
  OpenConnect or system-scoped snapshots.

## Capabilities

### New Capabilities

None. OpenConnect is an extension of the existing OpenGrid Snap component.

### Modified Capabilities

- `opengrid-snap`: add the OpenConnect parameter, reference geometry, placement,
  profile/variant matrix, offset ordering, quality checks, and export behavior.
- `opengrid-system-entry-context`: add the in-panel system radio as a separate
  persistence/default scope while preserving the existing model IDs and route
  query compatibility.

## Impact

- Snap contract, validation, normalization, default/persistence handling, panel
  controls, translations, filenames, and E2E/unit coverage.
- Snap CAD asset loading, Worker build context/cache disposal, assembly ordering,
  B-Rep quality checks, meshing, and STEP/STL export.
- The supplied `openConnect_head.step` becomes repository-owned source geometry;
  the supplied STL remains placement/reference evidence rather than a second
  production asset.
- Existing `opengrid-snap` and system-context model IDs remain unchanged; no new
  OpenGrid component or route is introduced.
