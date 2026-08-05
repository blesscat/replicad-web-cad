## 1. Define the STL export contract

- [x] 1.1 Add STL extension, MIME, deterministic filename metadata, and explicit STL tessellation settings to the CAD configuration/catalog types.
- [x] 1.2 Add STL-specific export error codes and error mapping while preserving the existing STEP codes and messages.
- [x] 1.3 Add the `export.stl` Worker command and STL-ready response validation, including request correlation, worker epoch, model revision, format, MIME, filename, and transferable bytes.
- [x] 1.4 Add contract fixtures for valid STL commands/responses and reject malformed, stale, empty, or mismatched STL payloads.

## 2. Implement Worker-side binary STL generation

- [x] 2.1 Implement a Worker-only STL writer that calls the pinned `Shape3D.blobSTL` path with binary output and explicit STL tessellation settings, then returns a non-empty ArrayBuffer.
- [x] 2.2 Extend `CadWorkerRuntime` to route `export.stl` through the existing revision lookup, export pin, timeout, and terminal error lifecycle.
- [x] 2.3 Ensure STL writer failures release export pins correctly and do not replace or discard the committed model.
- [x] 2.4 Add kernel/Worker tests proving STL is generated from the B-Rep path and that empty or failed writer results never become downloadable files.

## 3. Add main-thread STL download handling

- [x] 3.1 Add STL response validation for binary layout, triangle-count-derived byte length, metadata, revision, worker epoch, and non-empty bytes.
- [x] 3.2 Add an STL browser download adapter with `.stl` filename handling, `model/stl` Blob metadata, one-trigger behavior, and Object URL cleanup.
- [x] 3.3 Extend export request/runtime handling with an explicit format so STEP and STL share lifecycle cleanup but dispatch to format-specific validators and download adapters.
- [x] 3.4 Add STL filename metadata for `box` and `modular-grid-base` definitions without changing the existing STEP filename behavior.

## 4. Expose STL in the CAD workspace

- [x] 4.1 Add a `下載 STL` action beside `下載 STEP` for every catalog model.
- [x] 4.2 Reuse the existing ready, stale, invalid-input, generating, Worker recovery, active-export, progress, and retry gates for STL.
- [x] 4.3 Add user-facing STL export status and error text while keeping the committed preview and STEP action recoverable after an STL failure.
- [x] 4.4 Make the normal workflow explicit in UI/help text: download STL, then open/import it through Bambu Studio's local-file workflow; do not add automatic desktop-app launching.

## 5. Verify geometry, quality, and browser behavior

- [x] 5.1 Run representative STL measurements for the box, 2×2 modular grid, and a larger modular grid to choose and lock the STL tolerance/angular-tolerance configuration.
- [x] 5.2 Add Worker/integration checks for non-empty binary STL output and expected millimetre bounds for both catalog models.
- [x] 5.3 Add unit coverage for STL contract validation, binary layout validation, filenames, error mapping, and download cleanup.
- [x] 5.4 Add Chromium E2E coverage for one STL download per click, expected box/grid filenames, and disabled export during stale or generating states.
- [x] 5.5 Run existing STEP tests and full project quality gates to prove the additive STL path does not regress STEP export or Worker lifecycle behavior.

## 6. Update documentation

- [x] 6.1 Update README architecture, scope, export, and usage sections to describe STEP versus STL and the Bambu Studio local-file workflow.
- [x] 6.2 Record the selected STL tessellation settings, unit convention, filename patterns, supported browser gate, and explicit non-goals for 3MF, G-code, and automatic Bambu Studio integration.
