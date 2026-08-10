## 1. Contract and vertical datum

- [x] 1.1 Replace the previous stackable-box structural constants with the reference values: 1.2 mm main wall, 1.2 mm interior floor, fixed 5.0 mm bottom assembly, 1.75/1.2/0.8/1.8/2.0 mm upper profile, and 0.8/1.8/1.2 mm lower guide profile.
- [x] 1.2 Change `height` to clear internal height and derive the external Z bound as `height + 5.0 + 7.55` within the top-rounding tolerance, while preserving the public parameter keys, 28 mm footprint, half-cell validation, and centered base datum.
- [x] 1.3 Update contract and bounds tests for internal-height semantics, fixed bottom/upper heights, unchanged XY footprints, and unchanged nominal hole centers.

## 2. Reference-aligned geometry

- [x] 2.1 Rebuild the shell and cavity so the fixed lower assembly reaches the interior floor at Z=5.0 and the main cavity height equals the requested internal `height`.
- [x] 2.2 Implement the fused reference upper rail with the canonical 1.75 mm inner 45° lead-in, 1.2 mm vertical sliding block, 0.8 mm 45° transition, 1.8 mm vertical segment, and 2.0 mm outer 45° return inside the derived envelope.
- [x] 2.3 Implement the reference cell-boundary and internal-seam bottom guide pattern with a 0.8 mm bed-facing foot, 1.8 mm vertical support, and 1.2 mm 45° transition, keeping both slopes at 45°.
- [x] 2.4 Fuse the lower guide and 1.2 mm floor into continuous support so every relief stops at the floor underside without cutting into the box interior, while preserving bed contact and the supported interior floor.
- [x] 2.5 Reapply the fixed corner socket and ordinary bottom-hole cutters through the 5.0 mm bottom assembly without moving or resizing their existing XY positions or Ø5.05/Ø7.05 stages.
- [x] 2.6 Preserve one-solid topology, watertight B-Rep validity, native-shape cleanup, and latest-generation cancellation across the new profile booleans.

## 3. Quality gates and diagnostics

- [x] 3.1 Extend the quality report with measured internal-height datum, derived external height, 1.2 mm wall/floor probes, all upper/lower profile segments, bearing land, and fixed 5.0 mm bottom-assembly evidence.
- [x] 3.2 Add positive geometry probes for the bed-facing relief and the retained floor material above every bottom relief, while rejecting a relief that reaches the box interior.
- [x] 3.3 Update the geometry gate and diagnosable errors for reference-profile mismatch, incorrect height datum, unsupported bottom relief, mating clearance, sockets, ordinary holes, B-Rep, mesh, and export failures.

## 4. Behavior and export verification

- [x] 4.1 Update Worker B-Rep tests for 1×1, multi-cell, and half-cell boxes, including derived external height, fixed bottom height, profile dimensions, printable relief, one-solid validity, and unchanged hole layout.
- [x] 4.2 Retain and adapt self-mating fixtures for 1×1 over 1×4 continuous sliding, seated capture, lateral clearance, and the 2×2 bridge over two adjacent 1×2 boxes.
- [x] 4.3 Update Snap, full-hole, reference compatibility, STEP, STL, and mesh tests for the fixed 5.0 mm bottom assembly and revised interior-height semantics.
- [x] 4.4 Update unit, e2e, and Worker lifecycle tests so failures leave the previous valid revision committed and exports disabled for invalid candidates.

## 5. User-facing documentation

- [x] 5.1 Update panel, model catalog, README, and error text to describe `height` as internal height and document the fixed 5.0 mm bottom plus reference upper interface.
- [x] 5.2 Update the canonical and change OpenSpec artifacts with measured reference dimensions, printability constraints, preserved 28 mm/14 mm layout, and the new acceptance evidence.

## 6. Validation and handoff

- [x] 6.1 Run targeted unit and Worker stackable-box tests, inspect measured profile failures, and adjust tolerances only with recorded geometry evidence.
- [x] 6.2 Run source typecheck, Prettier, `git diff --check`, build, and the relevant end-to-end flow; record any pre-existing repository-wide check blockers.
- [x] 6.3 Run strict OpenSpec validation and perform an independent read-only compliance review against the proposal, delta spec, design, tasks, and acceptance criteria.
