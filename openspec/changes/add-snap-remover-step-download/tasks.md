## 1. Naming rule and component asset

- [x] 1.1 Add the OpenGrid `opengrid-<component-slug>` naming convention to `openspec/config.yaml`, including modelId, buildKey, route slug, display name, and component directory rules.
- [x] 1.2 Move `/Users/blesscat/Downloads/snap remover.step` byte-for-byte to the `opengrid-snap-remover` component-local CAD-kernel directory and verify 54,347 bytes plus SHA-256 `8f34c88dfea6b2c3352301d68dadc0b43665c0f8424f7da2b61c8dcda38ac41b`.

## 2. Shared contract and catalog

- [x] 2.1 Add `opengrid-snap-remover` to the shared ModelId/ModelParameters validation union with an exact empty parameter object.
- [x] 2.2 Add the OpenGrid catalog definition with an empty parameter schema, `OpenGrid ` display name, `snap remover.step` export filename, and preserve the existing box/grid definitions in the catalog.
- [x] 2.3 Update raw-parameter/state helpers so the empty parameter component starts generation 1 without rendering or validating parameter fields.

## 3. Worker preview and lifecycle

- [x] 3.1 Add a component-local STEP loader and builder that imports the supplied asset, validates a non-empty Shape3D, and clones it per generation without geometry adjustment.
- [x] 3.2 Add epoch-scoped Worker asset caching and disposal for the OpenGrid source shape while preserving existing modular-grid-base caching and cleanup.
- [x] 3.3 Register the new kernel definition and preserve existing box/modular-grid-base Worker routing, revision lifetime, mesh, and export semantics.

## 4. Preview UI and route

- [x] 4.1 Add the catalog-generated `/cad/opengrid-snap-remover` route and homepage card without replacing existing model cards.
- [x] 4.2 Render the existing workspace shell, status, retry, viewport, and download action for the OpenGrid component while omitting the parameter panel when its schema is empty.
- [x] 4.3 Remove the old homepage standalone static-download card and public-only asset path.

## 5. Behavior-focused verification

- [x] 5.1 Add contract/catalog tests for the OpenGrid prefix, empty parameters, homepage catalog preservation, and existing model IDs.
- [x] 5.2 Add CAD-kernel/Worker asset tests for non-empty import, byte identity, clone-per-generation behavior, cache reuse, and disposal.
- [x] 5.3 Add Chromium route coverage for OpenGrid preview readiness, no sidebar parameter controls, `snap remover.step` download, and unchanged box/grid entries and exports.

## 6. Quality gates

- [x] 6.1 Run formatting, TypeScript check, unit/Worker tests, and production build.
- [x] 6.2 Run the OpenGrid route and existing CAD regression tests against dev and production preview; validate the OpenSpec change strictly.
