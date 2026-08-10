## Why

The current stackable-box builder creates a rounded perimeter ring and then cuts four separate upper profiles into it. The result does not visually match the reference STEP at the upper sliding blocks, produces overly sharp corner remnants, and performs too many expensive booleans during every rebuild.

## What Changes

- **BREAKING** Rewrite the stackable-box solid construction around the reference upper side profile instead of trimming a prebuilt rounded ring.
- Build the upper sliding rail as a continuous, wall-connected profile with reference corner transitions and no isolated corner block artifacts.
- Build the printable bottom guide and pointed 28 mm seam relief from the same supported profile model, preserving the continuous interior floor without a horizontal relief closure.
- Reduce repeated fuse/cut operations by batching compatible profile geometry before applying the required mounting-hole cutters.
- Keep the existing `x`, `y`, `height`, and `fullBottomHoleGrid` parameters, 28 mm footprint rules, 14 mm hole layout, and fixed hole diameters unchanged.
- Retain stack, slide, bridge, watertightness, and STEP/STL export quality gates.

## Capabilities

### New Capabilities

### Modified Capabilities

- `opengrid-stackable-box`: change the construction contract so the upper rail and complementary bottom guide are generated as one reference-aligned, printable interface and remain valid after the geometry rewrite.

## Impact

- Affected geometry: `src/cad-kernel/components/opengrid-stackable-box/` and its fixed profile constants.
- Affected quality checks and integration fixtures that inspect upper rail faces, bottom relief, stacking, sliding, and generation time.
- No new user-facing parameters or external dependencies.
- Existing solids made by the previous profile may not geometrically mate with the rewritten profile.
