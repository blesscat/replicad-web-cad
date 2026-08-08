## 1. Official source and contract reset

- [ ] 1.1 Record the pinned official OpenGrid source URL, commit, attribution, and license boundary in the change artifacts and implementation comments.
- [ ] 1.2 Replace the old OpenGrid domain schema with official variant, pitch, chamfer, connector-side, generic screw-dimension, screw-mode, interval, and internal-intersection custom-position types.
- [ ] 1.3 Implement normalization/validation for the new schema, including `(rows-1) × (columns-1)` screw coordinates, side flags, corner flags, dimensions, intervals, deterministic ordering, and rejection of the old incompatible snapshot shape.
- [ ] 1.4 Update model/catalog/protocol/error/bounds/filename dispatch for the new typed snapshot without changing Worker protocol version 1.
- [ ] 1.5 Rewrite contract tests around official defaults, source dimensions, internal-lattice positions, connector sides, chamfers, invalid legacy values, and parameter-free invalidation.

## 2. Official geometry profile

- [ ] 2.1 Implement the pinned source's Full/Lite canonical tile profile with edge rails, capture ledges, corner nodes, inner 25 mm clear region, and official profile constants.
- [ ] 2.2 Implement official outer chamfer modes and independent corner flags without changing the board envelope.
- [ ] 2.3 Implement the official connector cutout profile, inward directions, side-specific placement, Lite/Full Z placement, and axis de-duplication.
- [x] 2.4 Implement official generic screw through/head/countersink geometry and internal-intersection placement modes: none, corners, everywhere, by-row-column, and custom.
- [x] 2.5 Implement Heavy as the official opposing profiled layers with 0.2 mm gap and projected middle layer; do not use a solid 13.8 mm plate.
- [ ] 2.6 Add observable profile tests for 1×1 and multi-cell Full/Lite/Heavy fixtures: envelope, thickness, inner clear region, rail/capture cross-sections, corner cuts, connector profiles, screw lattice, and Heavy layers/gap.
- [ ] 2.7 Add native ownership, cancellation, event-loop yielding, and failure cleanup for canonical tiles, assemblies, cutters, and Heavy intermediates.

## 3. Rebuild benchmark and select strategy

- [ ] 3.1 Rewrite benchmark fixtures and request adapters for the official parameter schema; remove the old 16 mm/slot/small-large assumptions.
- [ ] 3.2 Benchmark official-profile whole-board, row-block, cell-balanced, and saved-1×1 prototype-template strategies across Full/Lite/Heavy representative sizes.
- [ ] 3.3 Confirm and record `cell-balanced` as the selected product strategy after every selected fixture passes profile, B-Rep, mesh, and export gates; keep `prototype-template` benchmark-only.
- [ ] 3.4 Add a release report that pins the source commit, records cold/warm/measured samples, median/P95, profile evidence, and any new limitation.
- [x] 3.5 Add the opt-in pinned-OpenSCAD reference harness and compare Full/Lite/Heavy feature-free, screw, connector, chamfer, and default fixtures for envelope, volume, and representative Z-sections.

## 4. Product builder and quality gate

- [x] 4.1 Dispatch `cell-balanced` through a single product builder for Full/Lite/Heavy with no silent prototype fallback.
- [x] 4.2 Apply official connector, screw, chamfer, and Heavy geometry from the normalized snapshot.
- [ ] 4.3 Replace the old cell-opening quality check with official profile probes plus bounds, centering, base Z, volume, one-solid, B-Rep, and finite mesh checks.
- [ ] 4.4 Add geometry tests for 1×1, 2×2, 3×4 connector-side fixtures, 5×5 custom intersections, 10×10, and 17×17 across all variants and screw/chamfer modes.
- [ ] 4.5 Verify official-profile STEP and binary STL exports are non-empty and come from the pinned committed B-Rep revision.

## 5. Worker, workspace, and persistence integration

- [ ] 5.1 Update Worker generation, candidate, commit/discard, stale/latest-wins, timeout/recovery, and export tests for the new snapshot.
- [ ] 5.2 Replace the OpenGrid panel with official controls and an internal-intersection custom screw matrix; remove cell corner slots and small/large connector controls.
- [ ] 5.3 Preserve route locking, derived dimensions, progress, stale preview, invalidation, export enablement, and existing-model regression behavior.
- [ ] 5.4 Update persistence to deep-normalize the official snapshot and fall back from legacy incompatible OpenGrid entries without affecting other models.

## 6. Verification and independent review

- [ ] 6.1 Run targeted contract, profile, Worker, UI, persistence, export, and official-profile matrix tests.
- [ ] 6.2 Run the full existing test, typecheck, format, build, and relevant browser suites.
- [ ] 6.3 Run strict OpenSpec validation and confirm every task is complete.
- [ ] 6.4 Dispatch a read-only independent OpenSpec compliance review, verify findings locally, fix valid gaps, and rerun affected verification.
