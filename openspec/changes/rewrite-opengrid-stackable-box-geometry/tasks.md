## 1. Profile and construction helpers

- [x] 1.1 Add reusable rounded-rectangle section helpers that create matching wires at fixed Z datums and clean up temporary sketches safely.
- [x] 1.2 Add fixed outer-envelope section definitions for the 0 / 0.8 / 2.6 / 4.75 / 5.0 mm lower profile and the derived external top, while keeping 3.8 mm as the internal seam-relief transition datum and 4.6 mm as its pointed apex.
- [x] 1.3 Add inner-cavity section definitions for the fixed bottom datum and the 1.75 / 1.2 / 0.8 / 1.8 / 2.0 mm upper rail sequence, including matching inner corner radii.

## 2. Rewrite the solid build path

- [x] 2.1 Replace the full-prism plus four lower cutters with one ruled outer loft that contains the continuous printable lower guide profile and rounded-corner transitions.
- [x] 2.2 Replace the rounded rail ring and four upper profile cuts with one ruled cavity loft cut from the outer envelope, leaving a continuous wall-connected rail.
- [x] 2.3 Preserve the 5.0 mm bottom assembly, clear interior height, external bounds, open top, and 1.2 mm central floor/wall contracts; keep the pointed internal relief below the cavity opening and outer floor envelope.
- [x] 2.4 Batch seam-relief tools in a compound cut, with an axis-separated fallback if intersecting seam tools are rejected by the kernel.
- [x] 2.5 Batch special Snap and ordinary bottom-hole tools without changing their two-stage and straight-bore profiles.
- [x] 2.6 Preserve generation-cancellation checks and shape ownership across loft and compound operations.

## 3. Quality and regression coverage

- [x] 3.1 Update quality probes to verify continuous straight-side rail faces and rounded-corner continuation without clipped block remnants.
- [x] 3.2 Keep floor, wall, bottom guide, seam relief, hole, Snap retention, and external-bound quality gates passing for whole-cell and half-cell footprints.
- [x] 3.3 Add or update integration coverage for 1×1-on-1×4 sliding, 2×2 bridging, crossed seams, and STEP/STL export from the rewritten solid.
- [x] 3.4 Add a rebuild-time regression check or benchmark evidence for representative 1×1, 2×2, and multi-cell cases.
- [x] 3.5 Replace the horizontal internal-seam closure with the reference-style continuous 45° plane to a measured 4.6 mm central apex and assert that no closure plane remains at the 3.8 mm datum.

## 4. Validation and handoff

- [x] 4.1 Run targeted unit and Worker B-Rep tests, including full-hole and mounting-error paths.
- [x] 4.2 Run formatting, typecheck/build, and relevant end-to-end preview/export checks.
- [x] 4.3 Run strict OpenSpec validation and record the final change/task status.
