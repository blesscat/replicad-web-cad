## 1. Contract and layout calculation

- [x] 1.1 Add the `opengrid-organizer-box` typed parameter union, configuration, defaults, validation issues, and derived layout types without changing existing model IDs.
- [x] 1.2 Implement linked versus independent X/Y edge-to-edge spacing normalization, fixed polygon orientation, regular-polygon inscribed-diameter math, centered cavity coordinates, and derived legal OpenGrid half-grid occupancy.
- [x] 1.3 Add organizer-box bounds, STEP filename, and STL filename dispatch with deterministic fingerprints for shape, counts, spacing, depth, bottom thickness, and bottom interface.
- [x] 1.4 Add contract tests for defaults, enum/count/dimension validation, linked-spacing equality, cavity layout limits, polygon envelopes, centered coordinates, and 500 mm workspace rejection.

## 2. Worker-only CAD geometry

- [x] 2.1 Create the `src/cad-kernel/components/opengrid-organizer-box/` builder and geometry modules for a solid rounded envelope with a flat top and no side openings.
- [x] 2.2 Build circle and regular 3-, 4-, 5-, and 6-sided blind cavity cutters at the derived centers, preserve the requested bottom thickness, and cut them in bounded boolean batches with generation checks.
- [x] 2.3 Extract or wrap the existing OpenGrid bottom-interface primitives so `corner-seat` uses the fixed four-corner socket layout and `stackable` uses the normal bottom guide, while neither mode generates the other interface.
- [x] 2.4 Add organizer geometry quality checks for single-solid/watertight output, cavity count and spacing, finite bounds, bottom thickness, interface exclusivity, and absence of side openings.
- [x] 2.5 Add kernel model registration and Worker dispatch for `opengrid-organizer-box`, including progress/error mapping and revision/export lifecycle compatibility.

## 3. Catalog, state, and user controls

- [x] 3.1 Register `opengrid-organizer-box` consistently in the model union, build key, route slug, catalog component directory, CAD-kernel directory, and `OpenGrid ` display/localization keys; verify existing IDs remain unchanged.
- [x] 3.2 Add the catalog definition, initial state defaults, route generation, workspace parameter keys, bounds/schema summaries, and component-specific validation plumbing.
- [x] 3.3 Add a dedicated organizer-box Svelte panel with X/Y hole counts, linked/independent spacing controls, shape selection, diameter/depth/bottom controls, calculated grid occupancy, and exactly two bottom-interface radio options.
- [x] 3.4 Add Traditional Chinese and English labels, descriptions, validation diagnostics, export summaries, and model chooser/documentation copy for all new controls.

## 4. Persistence and export integration

- [x] 4.1 Persist and restore typed organizer-box snapshots under the independent `opengrid-organizer-box` key, with safe defaults for malformed or missing entries and no cross-component merging.
- [x] 4.2 Integrate organizer-box validation with raw workspace input parsing, debounce/generation invalidation, stale revision handling, and export enablement rules.
- [x] 4.3 Add unit tests for catalog identity, state defaults, parameter persistence isolation, raw input validation, diagnostics, and STEP/STL filename uniqueness.

## 5. End-to-end verification and documentation

- [x] 5.1 Add worker integration tests covering circle and every polygon shape, linked and independent spacing, blind depth/bottom thickness, both bottom-interface modes, derived footprint bounds, and invalid geometry rejection.
- [x] 5.2 Add focused UI/e2e coverage for route discovery, radio exclusivity, spacing mode switching, calculated grid occupancy, preview updates, and export availability.
- [x] 5.3 Update README and relevant OpenGrid documentation with organizer-box parameters, units, interface modes, cavity-diameter semantics, spacing semantics, and export filename examples.
- [x] 5.4 Run formatting, type checking, targeted unit/worker/e2e tests, full validation, and the project build; record exact results and mark all completed tasks.
