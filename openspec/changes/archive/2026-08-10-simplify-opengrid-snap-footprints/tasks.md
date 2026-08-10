## 1. Official edge fixture and characterization

- [x] 1.1 Copy `opengrid-lite-2x2-xleft-ytop-official-default-none-corners-none.step` into a repository-owned test fixture path and verify the fixture is not loaded from a developer-local absolute path.
- [x] 1.2 Add a read-only OCC characterization helper/test for the fixture bounds, 70 × 70 mm host regions, edge rail/capture surfaces, diagonal corners, z reference, and canonical placement centers `(-28, 7)` and `(-28, 28)`.
- [x] 1.3 Record the official-edge interference, clearance, contact, and B-Rep tolerances in the OpenGrid Snap quality configuration and cover the mating-z decision with a fixture test.

## 2. Snap footprint contract and migration

- [x] 2.1 Replace the Snap normalized `halfCellX`/`halfCellY` fields with typed `footprint: full | half | quarter` while preserving the `opengrid-snap` modelId, buildKey, route, profile, variant, offset, and optional feature fields.
- [x] 2.2 Update Snap defaults, exact-key validation, field errors, bounds calculation, host-pitch checks, model catalog schema, and parameter typing for the three footprints.
- [x] 2.3 Implement the canonical mapping `full → none/none`, `half → left/none`, and `quarter → left/top` for internal geometry only; keep the OpenGrid board axis contract unchanged.
- [x] 2.4 Update Snap STEP/STL filename helpers and export metadata to include the footprint without exposing arbitrary X/Y directions.
- [x] 2.5 Add persistence normalization for legacy Snap axis snapshots, malformed entries, missing fields, board-entry isolation, and defaults fallback; ensure new writes contain no `halfCellX` or `halfCellY`.

## 3. Footprint controls and workspace wiring

- [x] 3.1 Replace the Snap panel's X/Y direction selects with one Full/1/2/1/4 footprint select and map raw input to the typed footprint field.
- [x] 3.2 Remove obsolete Snap direction raw-input, error, restore, and display paths while retaining the existing offset, profile, variant, and optional-hole controls.
- [x] 3.3 Update workspace generation messages, parameter snapshots, persistence display, and export labels to use Full/1/2/1/4 terminology.

## 4. Official-compatible boundary geometry

- [x] 4.1 Implement the repository-local canonical OpenGrid Snap edge profile from the official fixture characterization, including outer rail, seam capture, diagonal locking corner, insertion bevel, z layers, and offset expansion limits.
- [x] 4.2 Replace the current rectangular/own-envelope half-cell prism path with a shared allowed-volume or boundary cutter that uses the canonical profile for half and quarter footprints.
- [x] 4.3 Apply the boundary operation only after Body, optional cutters, Side Holders, Snaps, rotations/translations, and outer offset have been assembled; clip every affected solid with the same operation.
- [x] 4.4 Preserve Full/Lite Z behavior, Standard/Directional asymmetry, central fixed geometry, locating-hole diameter/centers, underside elastic slots, center remover profile, and valid surviving outer supports through footprint clipping.
- [x] 4.5 Add generation/disposal handling for all new OCC cutters and ensure no runtime path references the Downloads fixture.

## 5. Quality gates and Worker integration

- [x] 5.1 Update Snap quality inspection and committed-candidate checks to validate footprint bounds, canonical orientation, official-edge probes, non-empty B-Rep, finite mesh, central interface, and surviving support geometry.
- [x] 5.2 Add official-board fit checks for Lite/Full half at `(-28, 7)` and quarter at `(-28, 28)`, distinguishing forbidden solid interference from permitted face contact.
- [x] 5.3 Keep no-half Standard nine-solid validation and Directional profile-specific validation intact while routing half/quarter candidates through the new footprint quality path.
- [x] 5.4 Verify Worker reference caching, generation cancellation, stale-candidate behavior, STEP/STL export revision consistency, and disposal with the new footprint field.

## 6. Regression tests and acceptance matrix

- [x] 6.1 Update contract, bounds, validation, filename, catalog, and persistence unit tests for full/half/quarter and legacy axis normalization.
- [x] 6.2 Add Worker geometry tests covering Full/Lite × Standard/Directional × full/half/quarter × four optional-hole combinations with zero and representative valid offsets.
- [x] 6.3 Add behavior-focused fit tests against the official Lite 2×2 fixture for host placement, interference volume, edge clearance, cut-face chamfer/locking probes, hole preservation, and valid exports.
- [x] 6.4 Update Snap E2E tests to assert one footprint control, absence of X/Y controls, correct normalized generation payloads, persistence restoration, and distinct export filenames.
- [x] 6.5 Run formatting, typecheck, unit, Worker integration, and relevant Playwright tests; resolve any regressions without changing OpenGrid board behavior or component identity.
