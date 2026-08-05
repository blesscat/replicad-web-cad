## 1. Stabilize viewport model identity

- [x] 1.1 Thread the committed model revision from `CadWorkspace` through `CadViewport` into `CadViewportScene`, including the no-committed-model case.
- [x] 1.2 Change the model replacement boundary to use the stable committed revision instead of the reactive mesh object identity, while keeping `PerspectiveCamera` and `OrbitControls` outside that keyed boundary.
- [x] 1.3 Verify that stale/raw parameter updates do not trigger bounds fitting, while a new committed revision still replaces the mesh, updates annotations, fits the model into view, and disposes prior geometry/material resources.

## 2. Add behavior-focused regression coverage

- [x] 2.1 Add an E2E assertion helper that records dimension annotation bounding boxes with a small rendering tolerance and does not inspect Svelte, Three.js, or source implementation details.
- [x] 2.2 Add a modular-grid-base regression test that drags a parameter slider while the previous revision is stale and verifies the committed annotations and camera framing remain stable before the new revision commits.
- [x] 2.3 Extend parameter-input coverage to use keyboard slider adjustment and verify that the viewport remains stable before commit, then displays the new dimensions and remains usable after the new revision is ready.
- [x] 2.4 Preserve and rerun the existing viewport resize and orbit interaction coverage to ensure the fix does not disable intentional camera interaction or valid new-model framing.

## 3. Validate the change

- [x] 3.1 Run `openspec validate "prevent-slider-camera-rotation" --type change` and resolve any proposal/spec/design/task validation errors.
- [x] 3.2 Run `pnpm check`, `pnpm test`, `pnpm test:e2e`, and `pnpm build`; investigate any regression in existing CAD, export, layout, or resource-lifecycle behavior.
