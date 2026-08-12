## Why

OpenGrid Divider currently requires two active directions even though its CAD builder can produce a single arm, and its directional range is wider than the intended divider use case. Its arm ends also reach the box wall when aligned to the nominal grid edge, so the divider needs a consistent one-millimetre inner-wall clearance on every active end.

## What Changes

- **BREAKING** Allow a Divider snapshot with exactly one non-zero direction and classify it as a single-arm shape.
- **BREAKING** Limit every directional arm control to a maximum of 10 grids while retaining 0.5-grid steps and the independent 500 mm planar footprint guard.
- **BREAKING** Shorten every non-zero arm end by 2.275 mm along its arm direction, applying the same endpoint to the 5 mm base support, transition profile, and upper wall so the normal OpenGrid box inner wall retains 1 mm clearance.
- Remove the Divider panel and catalog description paragraph that repeats the official grid, height, slider, and footprint limits; keep the underlying 28/14 mm and 2–500/2–200 mm contracts unchanged.
- Update bounds, geometry metadata, validation diagnostics, previews, exports, persistence round-trips, and behavior-focused tests for the new arm limit, single-arm shape, and endpoint clearance while preserving the existing model id, route, build key, and export identity format.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `opengrid-divider-generator`: change the minimum supported active-direction count, arm-count maximum, shape classification, and arm-end clearance geometry.
- `cad-workspace`: update the Divider directional controls and visible copy to match the revised contract.

## Impact

- Affected contracts: `opengrid-divider` directional validation, shape metadata, planar bounds, and geometry construction.
- Affected UI: Divider catalog schema and component panel; no new parameter or checkbox is introduced.
- Affected verification: Divider unit, Worker integration, lifecycle, catalog, workspace-validation, persistence, and E2E coverage.
- Existing OpenGrid component identifiers and unrelated OpenGrid geometry remain unchanged.
