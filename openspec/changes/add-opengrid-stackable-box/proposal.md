## Why

OpenGrid currently provides the official 28 mm board generator but no dedicated container that can be positioned on an OpenGrid Snap base and stacked with another identical container. The new box needs a repeatable, printer-friendly interface that supports both continuous sliding placement and stable multi-box stacking without requiring separate upper- and lower-box variants.

## What Changes

- Add an OpenGrid-specific stackable box model based on the existing standard open-box parameters.
- Calculate the box footprint from OpenGrid's 28 mm pitch and allow half-cell dimensions on both axes.
- Add the same upper convex guide rail and lower recessed guide groove to every box, with a 45° lead-in on the receiving side.
- Give the continuous upper guide rail a 45° chamfer on its top lead-in and extend the lower transition until it is aligned with the box rim, so the protruding sliding surface is printable without a residual vertical step or sharp downward overhang.
- Keep the box bottom generally flush: do not use four permanently protruding stacking posts.
- Add four bottom-corner Ø5 mm base-mounting holes aligned to the OpenGrid Snap interface, using the 7 mm corner offset.
- Shape each mounting-hole entry as a Ø5.05 mm base-facing opening with a fixed 0.5 mm 45° transition to a Ø6.05 mm inner opening; do not use a long graduated lead-in.
- Make the base-mounting holes captive: use the Ø6.05 mm inner opening as the retaining seat for a Ø5 mm cylinder with a Ø5.8 mm flange, so the installed flange is flush with the box interior floor and cannot fall through the bottom.
- Preserve continuous guide paths so a smaller box can slide along the long axis of a larger box; avoid isolated stacking holes as the only positioning mechanism.
- Support stacking a larger box across multiple smaller boxes, including a 2×2 box across two adjacent 1×2 boxes.
- Add a stackable-box dimension calculator that rounds requested X/Y dimensions up to the nearest 0.5-cell footprint that is not smaller than the target.
- Use the supplied `public/openGrid Bare Lite Snap hold.step` as the local base-interface reference and validate the mating geometry before release.
- Register the model in the OpenGrid model family with its own route, parameter panel, persistence snapshot, preview, and exports.

## Capabilities

### New Capabilities

- `opengrid-stackable-box`: Defines the OpenGrid stackable-box parameters, 28 mm and half-cell sizing, common upper/lower stacking interface, captive Ø5 mm base-mounting holes, geometry validation, and supported stacking layouts.

### Modified Capabilities

- `cad-workspace`: Add the stackable-box model to the catalog and model-specific CAD route while preserving the existing worker, preview, and export lifecycle.
- `home-model-selection`: Show the stackable box under the OpenGrid series with its 28 mm sizing and stacking/base-mounting behavior.
- `component-parameter-persistence`: Persist and validate the new model's normalized dimensions and box parameters independently from the official OpenGrid board snapshot.

## Impact

- Affected areas include the model catalog, model-specific route wiring, CAD workspace panel, typed parameter contracts, persistence, CAD Worker dispatch, and a new OpenGrid stackable-box kernel builder.
- The supplied STEP asset is read as a local mating reference; it is not used as the generated box body.
- New geometry and integration tests will be required for full-cell, half-cell, multi-cell, stacking, captive-cylinder, and export cases.
- The existing `opengrid` official board model and its compatibility contract remain unchanged.
