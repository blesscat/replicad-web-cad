## 1. Shared contract and dimensional helpers

- [x] 1.1 Add shared `halfCellX` and `halfCellY` enums, 14 mm half-cell constants, host-pitch helpers, and direction-to-world-axis mapping without introducing `allowHalfCell` or diagonal fields.
- [x] 1.2 Extend the OpenGrid and OpenGrid Snap typed parameter schemas, defaults, exact-key validators, validation issues, and model catalog definitions with the two half-cell direction fields.
- [x] 1.3 Update OpenGrid and Snap bounds, derived-dimension, height, and deterministic filename helpers to calculate full, single-axis, and dual-axis states from the shared fields.
- [x] 1.4 Add unit coverage for all direction values, full/single/dual derivation, centered bounds, 14 mm increments, host-pitch limits, and rejection of `allowHalfCell` or diagonal-only fields.

## 2. OpenGrid board and dimension calculator

- [x] 2.1 Extend the in-progress official OpenGrid parameter flow so the half-cell fields travel with the existing variant, rows/columns, feature, quality, Worker, and export contract without changing the official full-cell profile.
- [x] 2.2 Implement the OpenGrid half-cell boundary/interface assembly for X-left, X-right, Y-top, Y-bottom, and combined axis states, preserving the official profile in every complete-cell region and centered X/Y bounds.
- [x] 2.3 Update OpenGrid feature coordinates, variant bounds, quality probes, and release fixtures so optional screws, connectors, chamfers, and Heavy construction remain valid when a half-cell boundary is present.
- [x] 2.4 Extend the OpenGrid dimension calculator to respect the current half-cell directions, calculate the largest legal count without exceeding targets, preserve direction selections, and reject targets that cannot contain the selected footprint.
- [x] 2.5 Add unit tests for OpenGrid no-half, X-only, Y-only, dual-axis, maximum-range, too-small-target, and invalid-target calculations.

## 3. Snap half-cell geometry

- [x] 3.1 Preserve the existing no-half Full/Lite reference path and nine-solid checks while updating the Snap builder to derive per-axis target envelopes of 25.6 mm or 12.8 mm plus the shared offset.
- [x] 3.2 Implement project-owned half-cell Snap derivation from the validated Full/Lite reference using explicit clipping/recomposition or equivalent native geometry, with no scaling of the complete assembly.
- [x] 3.3 Implement and validate all four single-axis directions and all four dual-axis combinations, including central interface preservation, at least one usable outer support, variant Z bounds, and local centered output.
- [x] 3.4 Integrate half-cell geometry with reference caching, cloned-shape ownership, stale-generation checks, failure cleanup, and Worker disposal without leaking imported or intermediate shapes.
- [x] 3.5 Add half-cell Snap quality gates for host-pitch bounds, direction probes, central interface, valid B-Rep, solid/support presence, finite mesh, and export readiness; keep the existing nine-solid gate for no-half results.

## 4. Workspace controls and parameter flow

- [x] 4.1 Add accessible OpenGrid X direction controls with `none`/`left`/`right` and Y direction controls with `none`/`top`/`bottom`, including derived width/depth/thickness display and no half-cell checkbox.
- [x] 4.2 Replace the Snap panel’s two-field snapshot assumptions with Full/Lite, offset, and the two mutually exclusive direction controls; display the selected host envelope and remove diagonal options.
- [x] 4.3 Connect OpenGrid dimension calculation to the current direction selections, preserve manual rows/columns adjustment, and show field-level errors without mutating the last accepted snapshot.
- [x] 4.4 Update debounce, typed snapshot creation, invalidation, stale-preview, route-locking, and export-disable behavior for direction changes in both workspaces.
- [x] 4.5 Update OpenGrid/Snap component metadata and documentation labels so half-cell states are described as project-owned extensions and not official Snap variants.

## 5. Persistence, protocol, and exports

- [x] 5.1 Update versioned browser persistence to store typed half-cell directions under their own `opengrid` and `opengrid-snap` model entries without cross-component merging.
- [x] 5.2 Normalize legacy valid no-half entries to `none`/`none`, reject malformed directions, `allowHalfCell`, diagonal-only fields, and incompatible extra keys, and preserve safe fallback behavior.
- [x] 5.3 Update Worker request/response validation, model routing, generation metadata, candidate reports, and catalog schemas to carry the expanded snapshots while retaining version-1 lifecycle semantics.
- [x] 5.4 Update STEP/STL filename and export metadata helpers so variant, offset, and every selected axis direction produce deterministic non-colliding names tied to the committed revision.

## 6. Contract, geometry, and lifecycle tests

- [x] 6.1 Update OpenGrid Snap contract tests for exact four-key snapshots, legacy normalization, invalid half fields, full reference behavior, and per-axis envelope calculations.
- [x] 6.2 Add OpenGrid geometry tests covering 14 mm dimensions, side orientation, centered bounds, complete-cell profile probes, feature placement, and full/single/dual quality gates.
- [x] 6.3 Add Snap geometry tests covering Full/Lite no-half nine-solid references, all single/dual direction states, host-pitch clearance, offset boundaries, fixed-interface probes, and failure rejection.
- [x] 6.4 Add persistence tests covering independent model entries, legacy no-half normalization, invalid direction fallback, and protection against board/Snap parameter leakage.
- [x] 6.5 Add Worker lifecycle and export tests covering direction supersession, invalidation, candidate discard, resource cleanup, committed revision pinning, and distinct direction filenames.

## 7. Browser verification and release gates

- [x] 7.1 Update OpenGrid and Snap E2E fixtures to exercise no-half, X-only, Y-only, and dual-axis selections with accessible controls and correct derived dimensions.
- [x] 7.2 Run formatting, linting, typechecking, unit tests, and targeted geometry/Worker tests; resolve failures without weakening the half-cell quality gates.
- [x] 7.3 Run the relevant CAD E2E and export flows in supported browsers, including legacy persistence fallback and stale/invalid input behavior.
- [x] 7.4 Run the project build and OpenSpec validation, then record the verified direction matrix, tolerances, known limitations, and any dependency on the official OpenGrid generator change.
- [x] 7.5 Review the final diff and working tree to confirm the branch contains only the half-cell change artifacts and implementation/test updates intended for this proposal.
