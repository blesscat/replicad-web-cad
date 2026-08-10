## 1. Reference characterization and profile foundations

- [x] 1.1 Add the four Bare Standard/Directional STEP files or equivalent repository-owned profile fixtures under the existing `opengrid-snap` component asset boundary, without introducing any runtime dependency on `/Users/.../Downloads`.
- [x] 1.2 Build characterization tests/data for each fixture covering bounds, Z height, topology, assembly orientation, fixed features, and Directional asymmetry.
- [x] 1.3 Define the `Standard`/`Directional` × `Full`/`Lite` profile registry, including variant heights, host bounds, fixed probes, canonical orientation, intrinsic features, and optional feature definitions.
- [x] 1.4 Record and test the fixed four-corner locating-hole dimensions/centers and the center-remover 2D profile for every profile that supports those options.

## 2. Contract, validation, and persistence

- [x] 2.1 Extend `OpenGridSnapParameters` and its parameter keys/defaults to include `profile`, `fourCornerLocatingHoles`, and `centerRemoverHole` while preserving the `opengrid-snap` modelId, buildKey, route, and existing half-cell axis fields.
- [x] 2.2 Update Snap validation, bounds helpers, filename helpers, model unions, Worker dispatch, and catalog definitions to accept only the new exact normalized snapshot shape.
- [x] 2.3 Implement safe normalization for legacy Snap persistence entries, defaulting missing new fields to `profile=Standard` and both optional features disabled without merging the `opengrid` board entry.
- [x] 2.4 Update parameter-store and workspace validation tests for typed profile/feature persistence, malformed values, legacy snapshots, and isolation from board parameters.

## 3. Standard programmatic geometry

- [x] 3.1 Implement the solid Standard Body baseline for Full and Lite, preserving the measured XY footprint, variant Z profile, and fixed source details without using a uniform scale of the complete assembly.
- [x] 3.2 Implement reusable Standard Side Holder and Snap geometry/profile builders and verify their placement, rotations, and variant-specific Z positions against the Bare fixtures.
- [x] 3.3 Implement the four-corner locating-hole and center-remover cutters as independent operations on the Body, keeping cutter dimensions fixed under offset and footprint derivation.
- [x] 3.4 Compose the complete Standard assembly as Body ×1, Side Holder ×4, and Snap ×4 before any half-cell or quarter-cell boundary operation.

## 4. Directional geometry profile

- [x] 4.1 Implement the Directional Full and Directional Lite profile path in canonical orientation, using independent source-backed or programmatic geometry rather than rotating Standard.
- [x] 4.2 Preserve Directional-specific topology, asymmetric boundary, Z bounds, intrinsic features, and variant-specific details through profile-specific quality probes.
- [x] 4.3 Apply optional body features to Directional only where characterization marks them as optional, and reject duplicate cutters for intrinsic Directional geometry.
- [x] 4.4 Add profile/variant reference caching, failed-load retry cleanup, and Worker disposal handling for all source-backed profiles.

## 5. Full, half-cell, and quarter-cell assembly derivation

- [x] 5.1 Implement the shared host-shaped boundary operation that applies the total outer-frame offset and OpenGrid-compatible chamfered/locking cut face on newly exposed boundaries.
- [x] 5.2 Update Standard and Directional builders to place Body, Side Holders, and Snaps first, then apply the same boundary operation to every intersecting solid; do not pre-trim Side Holders independently.
- [x] 5.3 Cover all four single-axis half-cell directions and all four dual-axis quarter-cell combinations while preserving the selected profile, central interface, fixed hole dimensions, and host pitch.
- [x] 5.4 Validate offset bounds and reject candidates that exceed the host pitch, intrude into fixed geometry, lose the central interface, or expose a flat incompatible cut face.

## 6. UI, catalog, and export integration

- [x] 6.1 Extend the existing `opengrid-snap` panel with Standard/Directional selection and independent four-corner locating-hole and center-remover controls, while retaining Full/Lite, offset, and half-cell controls.
- [x] 6.2 Keep the existing `opengrid-snap` catalog identity and route, show the new typed defaults, and verify that the OpenGrid board catalog and controls remain unchanged.
- [x] 6.3 Include profile, feature selections, variant, offset, and half-cell directions in deterministic STEP/STL filenames without collisions between snapshots.
- [x] 6.4 Ensure viewport, STEP export, and binary STL export use the same committed profile/feature/footprint revision and remain disabled for failed quality candidates.

## 7. Quality gates and regression coverage

- [x] 7.1 Update the Snap quality report and commit gate for Standard nine-solid topology, Directional profile-specific topology, optional-hole state, fixed feature probes, B-Rep validity, finite mesh, bounds, and canonical direction.
- [x] 7.2 Add behavior-focused unit tests for the exact contract, four optional-hole combinations, Full/Lite heights, Standard/Directional selection, offset invariants, and rejection of legacy board fields.
- [x] 7.3 Add Worker/integration tests covering the profile cache lifecycle, full-cell generation, all half-cell/quarter-cell directions, side-holder post-placement clipping, chamfered cut faces, and failed-candidate retention.
- [x] 7.4 Add end-to-end tests covering controls, persistence restore, profile/feature changes, deterministic filenames, viewport readiness, and STEP/STL export consistency.
- [x] 7.5 Run formatting, type-checking, unit tests, Worker integration tests, and the focused OpenGrid Snap E2E suite; resolve any regression without changing the existing OpenGrid board contract.
