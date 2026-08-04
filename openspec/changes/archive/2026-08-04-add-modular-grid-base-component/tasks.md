## 1. Component assets and geometry boundary

- [x] 1.1 Add the provided 17 × 17 cutout `cell-template.step` to `src/cad-kernel/components/modular-grid-base/` as the canonical runtime asset.
- [x] 1.2 Add a component-local asset loader that resolves the bundled STEP URL, imports it as a B-Rep in the Worker, and validates non-empty 20 × 20 × 5 mm bounds.
- [x] 1.3 Implement the `modular-grid-base` builder with 20 mm cell spacing, centered rows/columns placement, template clone/translate, adjacent-cell fuse, and a final R2.5 mm fillet on only the four external vertical edges.
- [x] 1.4 Make the builder release intermediate native shapes on success and failure, and return geometry/bounds metadata through the existing candidate pipeline.

## 2. Shared component contract and catalog

- [x] 2.1 Define stable model IDs, the discriminated `ModelParameters` union, modular-grid-base parameter validation, and derived bounds/filename helpers in shared contract modules.
- [x] 2.2 Refactor the model catalog into independent serializable definitions, retain the current box definition, and add the display name `模組化網格底板` with rows/columns fields.
- [x] 2.3 Add a Worker-side component registry that routes each validated model ID to its component-local builder without importing UI-only metadata or CAD wrappers into the main thread.
- [x] 2.4 Generalize candidate, revision, committed state and Worker event types to retain model ID and serializable component parameters.
- [x] 2.5 Update runtime command/event validation to reject unknown model IDs, mismatched parameter shapes, invalid grid counts, and invalid component export metadata.

## 3. Worker generation and resource lifecycle

- [x] 3.1 Integrate the component registry into `CadWorkerRuntime` while preserving the existing box path and latest-wins candidate semantics.
- [x] 3.2 Add an epoch-scoped cached template promise so concurrent modular-grid-base generations import `cell-template.step` once per Worker runtime.
- [x] 3.3 Re-check generation after asynchronous template loading and before committing expensive geometry work so stale requests cannot create a current candidate.
- [x] 3.4 Dispose cached template, cloned shapes, candidates, revisions and export pins on worker dispose, stale cleanup, mesh failure, and terminal export paths.
- [x] 3.5 Map asset-load, boolean, fillet and mesh failures to stable diagnosable CAD errors without leaving the UI in generating state.

## 4. Workspace UI and export integration

- [x] 4.1 Add a component selector to the CAD controls and preserve box as the initial selection.
- [x] 4.2 Split component-specific control panels into separate files, keep box controls independent, and render modular-grid-base rows/columns as validated range sliders with per-field messages.
- [x] 4.3 Treat component selection and parameter edits as generation snapshots, invalidate superseded candidates, and keep any previous committed preview explicitly stale until replacement commit.
- [x] 4.4 Propagate committed model ID, parameters and actual bounds to the viewport so X/Y/Z annotations show modular-grid-base dimensions of columns × 20, rows × 20 and 5 mm.
- [x] 4.5 Generate component-specific STEP metadata and filenames, including `modular-grid-base-{columns}x{rows}.step`, while keeping the existing box filename format.

## 5. Behavior-focused verification

- [x] 5.1 Add CAD-kernel integration coverage for 1x1 and 2x2 bounds, centered 17 × 17 cutouts, 1.5 mm margins, 5 mm height, single-solid output, and preserved internal sharp junctions.
- [x] 5.2 Add geometry coverage proving the final operation rounds only the four overall external corners to R2.5 mm and does not fillet top/bottom perimeter edges.
- [x] 5.3 Add contract and validator tests for valid/invalid box and modular-grid-base messages, unknown model IDs, mismatched parameter shapes, and derived 500 mm limits.
- [x] 5.4 Add Worker lifecycle tests for one-time template loading per epoch, stale generation rejection, candidate cleanup, worker dispose, and asset-load failure responses.
- [x] 5.5 Add browser/e2e coverage for catalog selection, dynamic fields, a 2x2 preview, actual bounds annotations, stale-preview behavior, and successful component STEP download.

## 6. Documentation and quality gates

- [x] 6.1 Update CAD README/design notes with the component directory convention, STEP-over-STL/DXF rationale, precomputed template workflow, and `modular-grid-base` parameters.
- [x] 6.2 Verify Vite dev-server and production preview both bundle and load the component-local STEP asset inside the Worker.
- [x] 6.3 Run formatting, type-check, unit/integration tests, browser tests, and production build; resolve failures before marking the change ready to apply.
