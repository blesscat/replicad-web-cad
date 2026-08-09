## 1. Domain contract and catalog

- [x] 1.1 Add the `opengrid-stackable-box` model id, typed `x`/`y`/`height` parameter contract, default snapshot, and derived 28 mm footprint helpers.
- [x] 1.2 Add validation for positive 0.5-step X/Y values, standard height limits, and the 500 mm derived footprint limit without rounding half-cell values.
- [x] 1.3 Register the model definition with OpenGrid family metadata, route metadata, parameter summary, filename metadata, and independent builder/Worker boundaries.
- [x] 1.4 Add an independent versioned persistence entry for `opengrid-stackable-box` and verify it cannot merge with `opengrid` or `box-normal` snapshots.

## 2. Stackable-box geometry

- [x] 2.1 Create the stackable-box kernel component module and document its fixed interface constants, centered coordinates, Z=0 base, and standard open-box wall/floor semantics.
- [x] 2.2 Build the open-top, closed-floor box shell using `x × 28 − 0.15 mm` and `y × 28 − 0.15 mm` footprint dimensions.
- [x] 2.3 Implement the low-profile continuous convex guide rail on the box top rim.
- [x] 2.4 Implement the matching underside recessed guide groove with a 45° lead-in and no permanently protruding stacking posts.
- [x] 2.5 Add underside relief or equivalent seam clearance so a larger box can bridge adjacent lower boxes without interference at their shared seam.
- [x] 2.6 Implement the four nominal Ø5 mm Snap mounting sockets at the external 7 mm corner offsets for full-cell footprints, including base-facing 45° lead-ins.
- [x] 2.7 Implement the internal retaining seat for the flanged mounting cylinder and make the installed flange flush with the interior floor.
- [x] 2.8 Calculate the mounting shaft length so approximately 3 mm remains exposed below the box exterior and de-duplicate overlapping socket locations for half-cell axes.
- [x] 2.9 Add geometry-quality validation for watertightness, non-overlapping socket cutters, bounds, rail/groove clearances, flush flange seating, and exterior shaft exposure.

## 3. Snap reference and Worker integration

- [x] 3.1 Add a developer/test-only loader for `public/openGrid Bare Lite Snap hold.step` that validates the reference without using it as the generated box body.
- [x] 3.2 Compare the generated nominal Ø5 mm socket layout and insertion envelope against the supplied STEP reference and return a diagnosable mating failure on mismatch.
- [x] 3.3 Add strict Worker dispatch for `opengrid-stackable-box`, including parameter mismatch rejection and latest-wins candidate lifecycle behavior.
- [x] 3.4 Add stackable-box model metadata, bounds, preview mesh, STEP export, and STL export handling without changing the official OpenGrid export path.

## 4. Routes, panel, and chooser

- [x] 4.1 Add `/cad/opengrid-stackable-box` route resolution and ensure it cannot fall through to the official `opengrid` or `box-normal` model.
- [x] 4.2 Build the stackable-box parameter panel with X/Y half-cell controls and height control using the shared slider/input behavior.
- [x] 4.3 Add concise UI copy for the 28 mm footprint, continuous top rail/bottom groove, four-corner Snap sockets, and flush internal cylinder flange.
- [x] 4.4 Ensure the panel has no upper/lower variant selector and no permanently protruding stacking-post toggle.
- [x] 4.5 Add the model to the OpenGrid series in the static `/models` chooser with a link to `/cad/opengrid-stackable-box`.
- [x] 4.6 Add or update documentation and export filename summaries for the new model without changing the official OpenGrid board description.

## 5. Geometry and integration tests

- [x] 5.1 Add contract tests for whole-cell and half-cell derived dimensions, centering, Z=0 placement, invalid steps, and workspace bounds.
- [x] 5.2 Add geometry fixtures for 1×1, 1×4, 1×2, 2×2, 0.5×1, 1×0.5, and 0.5×0.5 boxes.
- [x] 5.3 Add a stacking fixture proving a 1×1 box can continuously slide on a 1×4 box while remaining guided.
- [x] 5.4 Add a bridging fixture proving two adjacent 1×2 boxes support a 2×2 box without seam interference.
- [x] 5.5 Add a captive-cylinder fixture proving the flange is interior-floor flush, the shaft is retained, and approximately 3 mm remains below the exterior bottom.
- [x] 5.6 Add a Snap compatibility fixture using the supplied STEP and assert a clear failure when the nominal interface cannot meet the declared tolerance.
- [x] 5.7 Add Worker integration tests for route isolation, invalidation, candidate commit, preview, and STEP/STL export behavior.
- [x] 5.8 Add persistence tests proving valid half-cell values restore and invalid values do not overwrite the accepted snapshot.
- [x] 5.9 Add browser tests for the static chooser entry, direct route initialization, control labels, and model-specific export metadata.

## 6. Dimension calculator

- [x] 6.1 Add a stackable-box dimension calculator contract that evaluates `x × 28 − 0.15 mm` and `y × 28 − 0.15 mm` at 0.5-cell increments, selecting the closest footprint that is not smaller than the requested dimensions.
- [x] 6.2 Add the calculator to the stackable-box panel and cover upward half-cell rounding, exact boundaries, maximum dimensions, and applying the calculated X/Y values without changing height.

## 7. Mounting-hole fit profile

- [x] 7.1 Replace the previous long mounting-hole lead-in and overlaid Ø6.75 mm counterbore with a final Ø5.05 mm base-facing opening and a Ø6.05 mm retaining opening joined by a fixed 0.5 mm 45° chamfer.
- [x] 7.2 Add geometry-quality and integration assertions for the fixed chamfer profile and the Ø5.05 mm bottom opening boundary across the supported footprint fixtures.

## 8. Printable guide-rail profile

- [x] 8.1 Add a fixed 45° chamfer to both lower edges of the continuous top guide rail while preserving the existing top lead-in and matching bottom groove.
- [x] 8.2 Add geometry-quality and integration assertions proving the lower rail chamfers exist, remain connected to the rim, and preserve sliding/bridging fixtures.

## 9. Flush lower guide-rail transition

- [x] 9.1 Extend the lower guide-rail transition to the box-rim alignment so the approximately 0.15 mm residual vertical step below the sliding rail is removed, while preserving the top lead-in and bottom groove.
- [x] 9.2 Add behavior-focused geometry assertions proving the lower transition has no residual inner overhang and that sliding/bridging fixtures remain valid.
