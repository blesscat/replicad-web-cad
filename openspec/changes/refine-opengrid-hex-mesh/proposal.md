## Why

The first honeycomb implementation preserves the existing container shell and cuts widely separated hexagons from it. That produces isolated openings instead of the continuous, printable Hex Mesh structure intended for the material-saving mode.

## What Changes

- Make the existing `honeycombMode` represent the Hex Mesh style only; do not add the separate vertical-groove Ribbed style in this change.
- Derive the staggered lattice pitch from the hex profile and printable rib thickness so neighboring openings form a continuous thin rib network rather than isolated holes.
- Apply the same connected mesh behavior to the supported planar box walls, cylindrical wall, and eligible floor regions while retaining conservative frames and protected functional interfaces.
- Keep the finer floor Hex Mesh visible in eligible normal, base/bottom-plate, and thin-floor profiles; thin floors may fall back to solid only when no complete protected cell fits.
- Extend the box-floor pattern to its protected frame and to a 2 mm circular safety ring around each existing hole by clipping boundary cells instead of dropping every intersecting hexagon.
- Add the same optional `honeycombMode` to the newly merged Open Shelf, including its side/divider walls, backboard, bottom, shelves, and top panel, with the locating pegs and panel intersections protected.
- Preserve existing model IDs, routes, legacy parameter hydration, normal-mode geometry, bottom holes, mounting/stacking interfaces, side openings, preview lifecycle, and STEP/STL export behavior.
- Add behavior-focused geometry tests for rib spacing, connected mesh coverage, interface keep-outs, valid solids, and material reduction.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `opengrid-stackable-box`: require `honeycombMode` to generate a continuous Hex Mesh profile on eligible walls/floor regions while preserving existing interfaces and openings.
- `opengrid-stackable-cylinder`: require `honeycombMode` to generate a continuous Hex Mesh profile on eligible cylindrical wall/floor regions while preserving existing interfaces and openings.
- `opengrid-open-shelf`: add an optional protected Hex Mesh profile while preserving its front opening, shared inclination, panel intersections, rounded frame, and locating pegs.
- `cad-workspace`: expose and type the Open Shelf material-saving toggle without changing its six geometric controls.
- `component-parameter-persistence`: persist the Open Shelf toggle and hydrate six-field legacy snapshots with the mode disabled.

## Impact

- Updates the shared honeycomb geometry contract and Worker-only lattice construction in `src/cad-kernel/lattice/opengrid-honeycomb.ts`.
- Adjusts the box, cylinder, and Open Shelf honeycomb application stages and their native-shape cleanup paths.
- Extends contract, workspace, unit, and Worker geometry coverage without adding dependencies or changing public model identifiers.
