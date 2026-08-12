## 1. Contract and component definition

- [x] 1.1 Add the `opengrid-open-shelf` typed parameter model, defaults, bounds, footprint/angle derivations, validation diagnostics, peg centers, and deterministic STEP/STL file names under the matching OpenGrid contract module.
- [x] 1.2 Add the catalog definition with `modelId=opengrid-open-shelf`, `buildKey=opengrid-open-shelf`, a display name beginning with `OpenGrid `, the default six-field schema, Desk preview metadata, and the existing `x*28-0.15` / `y*28-0.15` footprint semantics.
- [x] 1.3 Verify the naming/catalog invariant: stable id, build key, route slug, catalog component directory, and CAD-kernel component directory all use the exact lowercase `opengrid-open-shelf` slug, while existing model ids remain unchanged.

## 2. CAD-kernel geometry

- [x] 2.1 Implement the component-local builder in `src/cad-kernel/components/opengrid-open-shelf/` using horizontal bottom, vertical backboard, sloped full-depth shelves/dividers/top, and the specified 2.0/1.2/1.6 mm thicknesses.
- [x] 2.2 Add the four plain Ø4.5 mm × 3 mm integrated downward pegs at the existing OpenGrid corner positions without the Ø7.05 mm retaining shoulder, and fuse all parts into one solid with generation-current checks.
- [x] 2.3 Register the new kernel definition and typed model dispatch, then add geometry quality assertions for bounds, single-solid output, full-depth rear contact, common inclination, total-height datum, and peg interface.

## 3. Workspace and system integration

- [x] 3.1 Add the new model id and parameter keys to contract validation, model bounds/file-name dispatch, raw workspace parsing, default state, and controller parameter handling.
- [x] 3.2 Add the Open Shelf parameter panel with outer X/Y, total height, internal X/Z cell counts, angle controls, field errors, and the 0–75°/effective-geometry messaging.
- [x] 3.3 Register the catalog route and Desk-only chooser entry at `/cad/opengrid-open-shelf?system=desk`, while preserving the existing Wall subgroup behavior and system-context model id.
- [x] 3.4 Add independent typed browser persistence for the new model id, including Desk scope restore precedence and safe fallback for malformed or absent snapshots.
- [x] 3.5 Register the Worker generation path and export metadata so valid candidates use the existing candidate-ready, commit, mesh, STEP, and STL lifecycle.

## 4. Tests and preview asset

- [x] 4.1 Add behavior-focused unit tests for validation, defaults, footprint/bounds, angle feasibility, peg placement, and deterministic export names.
- [x] 4.2 Add Worker/component integration tests for default and edge geometries, full-depth cells, common slope, total-height bounds, single-solid output, and absence of a Ø7.05 mm shoulder.
- [x] 4.3 Add workspace/catalog/persistence tests covering route isolation, Desk-only visibility, typed raw input, invalidation, restore, and export gates.
- [x] 4.4 Generate and verify `public/model-previews/opengrid-open-shelf-desk.png` through the existing canonical preview workflow and add it to the visible catalog target set.

## 5. Quality gates

- [x] 5.1 Run formatting, typecheck, lint, targeted unit/Worker tests, and the full relevant test suites; resolve failures without changing existing component behavior.
- [x] 5.2 Run preview verification and inspect the generated Open Shelf preview, then review the final diff against the proposal, design, and all change specs.
