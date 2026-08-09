## 1. Divider contract and catalog foundation

- [x] 1.1 Add the independent `opengrid-divider` model id, typed parameters, fixed 14 mm full-grid/7 mm half-grid geometry constants, 0.5-grid defaults, safe count/height limits, and model-specific validation to the CAD contract.
- [x] 1.2 Implement deterministic shape classification for straight, L, T, and cross configurations, 0.5-grid normalized arm counts, derived dimensions, and sparse 28 mm locating-peg center calculation.
- [x] 1.3 Add divider bounds and deterministic STEP/STL filename helpers, including the 1 mm peg extension below the wall base.
- [x] 1.4 Register the new parameter type and model id through the shared contract, model catalog, worker registry, and protocol validation without changing the existing `opengrid` or `opengrid-stackable-box` contracts.
- [x] 1.5 Add unit tests for valid/invalid snapshots, shape classification, 14 mm full-grid/7 mm half-grid lengths, 500 mm envelope validation, sparse peg coordinates, deduplication, bounds, and filenames.

## 2. Divider B-Rep builder

- [x] 2.1 Create a component-local divider builder that builds continuous 5 mm wide arms from the central anchor and fuses them into one connected wall solid at the requested height.
- [x] 2.2 Apply the fixed 1 mm fillet only to the wall's upper perimeter edges, preserve sharp bottom and peg edges, and return a diagnosable geometry error when the fillet cannot be constructed.
- [x] 2.3 Build Ø5 mm × 1 mm downward locating pegs at the central junction and sparse 28 mm interior arm positions, fuse them to the wall, and release duplicate/intermediate native shapes safely.
- [x] 2.4 Add generation-current checks, event-loop yielding, cancellation cleanup, and native ownership handling for divider construction and boolean failures.
- [x] 2.5 Add builder integration tests for horizontal/vertical lines, L, T, cross, asymmetric arms, long arms, wall height, top fillet, peg dimensions/locations, one-solid output, and Z bounds.

## 3. Worker, mesh, and export integration

- [x] 3.1 Dispatch `modelId=opengrid-divider` to the divider builder and reject mismatched parameters without falling through to any existing OpenGrid builder.
- [x] 3.2 Add divider-specific progress/error mapping, candidate/commit/discard, latest-wins, stale-generation, timeout/recovery, and revision-lifetime coverage.
- [x] 3.3 Verify divider mesh quality, finite bounds, one-solid B-Rep, committed revision ownership, and transferable mesh data through the Worker boundary.
- [x] 3.4 Verify STEP and binary STL exports use the committed divider B-Rep, include the pegs and rounded top, and return non-empty bytes with divider filenames.

## 4. Workspace, routing, and persistence

- [x] 4.1 Add the `/cad/opengrid-divider` route and independent catalog definition with divider defaults, bounds, preview metadata, and export metadata.
- [x] 4.2 Build the divider-specific Svelte panel with upper/lower/left/right grid-count controls, height control, derived shape label, derived dimensions, validation errors, and restore-default behavior.
- [x] 4.3 Remove any possibility of displaying official OpenGrid Full/Lite/Heavy, screw, or connector controls on the divider route while preserving the existing `/cad/opengrid` panel.
- [x] 4.4 Add `opengrid-divider` to the static `/models` chooser and OpenGrid-series copy, linking to the new route without initializing the CAD Worker on `/models`.
- [x] 4.5 Persist only validated typed divider snapshots under the independent `opengrid-divider` key, safely fall back to defaults for malformed entries, and preserve all existing component entries.
- [x] 4.6 Add workspace, route, chooser, and persistence tests for initialization, valid updates, invalidation, latest-wins, restoration, isolation, and export enablement.

## 5. Regression and release verification

- [x] 5.1 Add explicit regression tests proving existing `opengrid` and `opengrid-stackable-box` model ids, routes, parameters, builders, exports, and persistence behavior are unchanged.
- [x] 5.2 Run targeted divider contract, builder, Worker, workspace, persistence, route, and export tests and fix all failures.
- [x] 5.3 Run format, typecheck, build, full test suite, and relevant browser/e2e suites with the pre-existing worktree modifications preserved.
- [x] 5.4 Run strict OpenSpec validation and confirm every task and artifact for `add-opengrid-divider-generator` is complete before implementation handoff.
