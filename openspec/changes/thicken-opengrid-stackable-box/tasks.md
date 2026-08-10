## 1. Contract and profile constants

- [x] 1.1 Update the stackable-box geometry constants to define a 5.0 mm main floor, 2.0 mm main wall, an upper 2 / 1.6 / 0.8 / 1 / 2 mm stepped rail sequence, a fixed 0.8 mm bottom foot chamfer, a 1.6 mm vertical support segment at a 2 mm inset, a 2.0 mm bottom outer lead-in, and a dedicated nominal sliding-clearance constant without changing the public parameter snapshot.
- [x] 1.2 Preserve the existing 28 mm/half-cell footprint, external height, base-Z, Snap, full-hole, filename, and Worker contract behavior while documenting the intentional reduction in interior clear height.
- [x] 1.3 Add or update contract tests for the new structural constants, unchanged external bounds, half-cell footprints, height semantics, and preserved bottom-hole center positions.

## 2. Integrated printable geometry

- [x] 2.1 Replace the 1 mm shell construction with a canonical shell whose main floor measures 5.0 mm and side wall measures 2.0 mm outside intentional chamfer transitions.
- [x] 2.2 Add the reference-style independent stepped top rail as a fused self-mating rim feature and retain one 1.6 mm × 0.8 mm open V groove along every internal 28 mm grid seam, with 45° side faces, a positive bearing land, and the dedicated sliding clearance.
- [x] 2.3 Remove the old continuous perimeter ring and rectangular seam-relief ceilings, rebuild the grid-seam V grooves against the supported 5 mm floor, and ensure approximately 4.2 mm remains above each 0.8 mm groove apex without a horizontal suspended surface.
- [x] 2.4 Reapply Snap sockets and optional ordinary bottom-hole cutters against the 5 mm floor, preserving the nominal shaft diameter, centers, retaining seats, flange flushness, and shaft exposure.
- [x] 2.5 Preserve native ownership, cleanup, one-solid topology, B-Rep validity, and latest-generation cancellation behavior across the new profile and hole operations.
- [x] 2.6 Change each corner Snap socket to a Ø5.05 mm × 3.0 mm outside/lower bore followed by a Ø7.05 mm × 2.0 mm inside/upper bore, with a measured retaining shoulder.

## 3. Geometry quality and mating validation

- [x] 3.1 Extend the interface-quality report with floor and side-wall thickness probes, fused top-rail and 45° lead-in/bearing-land probes, fixed bottom relief/support checks, grid-seam V-groove opening/support checks, no-perimeter-groove checks, and bottom-support/overhang checks.
- [x] 3.2 Update the geometry gate and diagnosable errors for the integrated interface, 5 mm floor/2 mm wall structure, grid-seam V grooves, mating clearance, unsupported bottom, Snap sockets, ordinary holes, one-solid B-Rep, mesh, and external bounds.
- [x] 3.3 Add canonical mating fixtures that verify seated non-intersection, positive support, lateral capture, and continuous sliding for a 1×1 box over a 1×4 box at representative offsets.
- [x] 3.4 Retain and adapt the 2×2 box bridging two adjacent 1×2 lower boxes to the integrated guide profile.

## 4. Regression tests and user-facing metadata

- [x] 4.1 Update unit and worker integration tests for 1×1, 1×4, multi-cell, and half-cell boxes, including 5 mm floor/2 mm wall thickness, the fused top rail, internal grid-seam V-groove/45° transition, fixed bottom relief/support, no continuous perimeter groove, and no horizontal suspended ceiling assertions.
- [x] 4.2 Update Snap reference, full bottom-hole, B-Rep, mesh, STEP, and STL export tests for the new floor and integrated guide geometry.
- [x] 4.3 Update model catalog, panel, README/docs, and error text so the user-facing description matches the fused reference-style top rail and fixed bottom relief/V-groove interface.

## 5. Verification and OpenSpec completion

- [x] 5.1 Run targeted stackable-box unit and B-Rep integration tests, inspect failures, and adjust geometry tolerances only with measured evidence.
- [x] 5.2 Run targeted source typecheck, formatting, build, relevant Worker tests, and the stackable-box B-Rep flow; the repository-wide `pnpm check` remains blocked by the pre-existing syntax error in `tests/unit/model-generation.test.ts:379`.
- [x] 5.3 Run strict OpenSpec validation for `thicken-opengrid-stackable-box` and verify the proposal, delta spec, design, and task checklist are complete.
- [x] 5.4 Perform an independent read-only compliance review against the delta spec and fix any valid implementation or verification gaps.

## 6. Grid-seam V-groove correction iteration

- [x] 6.1 Replace the earlier per-cell rounded-square groove interpretation with straight V grooves located at internal 28 mm grid seams, matching the original bridge-clearance purpose.
- [x] 6.2 Make each seam groove a bed-facing 1.6 mm opening with 0.8 mm depth and two 45° faces, so the groove has no horizontal suspended ceiling; use the reference-style 0.8 mm bottom foot chamfer, 1.6 mm vertical support segment at a 2 mm inset, and 2.0 mm bottom outer lead-in while preserving the upper 2 / 1.6 / 0.8 / 1 / 2 mm rail sequence and outer stacking datum.
- [x] 6.3 Add behavior-focused regression coverage for seam placement, open central clearance, sloped transition material, and the 2×2-over-two-1×2 bridge fixture.
- [x] 6.4 Synchronize the proposal, design, delta spec, canonical capability spec, panel copy, catalog description, and README with the grid-seam V-groove geometry.

## 7. Reference rail and quality readability refactor

- [x] 7.1 Restore the reference-style independent stepped top rail as a fused rounded ring with fixed height, width, and chamfer transitions while preserving the external bounds.
- [x] 7.2 Treat the fixed bottom 0.8 mm foot chamfer, 1.6 mm vertical support segment at a 2 mm inset, 2.0 mm outer lead-in, and internal V grooves as the complementary relief/support profile; preserve the upper 2 / 1.6 / 0.8 / 1 / 2 mm rail sequence and expose measurable top-rail and bottom-feature quality evidence.
- [x] 7.3 Split the oversized quality implementation into focused metric, seam, socket, interface-report, and geometry-gate modules while preserving the `quality.ts` public re-export surface.
- [x] 7.4 Update behavior-focused tests, user-facing descriptions, and OpenSpec artifacts for the restored rail, fixed bottom profile, and quality-module split.

## 8. Example-aligned profile revision

- [x] 8.1 Replace the upper rail with the fixed 2 / 1.6 / 0.8 / 1 / 2 mm inner-to-side 45°/vertical staircase and keep it fused inside the requested outer envelope.
- [x] 8.2 Change the bottom support segment to 1.6 mm while retaining the 2 mm outer 45° lead-in and 0.8 mm bed-facing chamfer; restore the printable 5 mm floor core before applying the final bottom and hole cuts.
- [x] 8.3 Recalibrate interface probes, seated-stack fixtures, user-facing descriptions, and OpenSpec artifacts against `public/example.png` and the reference STEP profile.
