## 1. Divider contract and shared envelope math

- [x] 1.1 Update the Divider contract to classify one active direction as `single`, reject only the all-zero direction set, and make `openGridDividerAxisFor` report the active axis for single-arm and straight configurations.
- [x] 1.2 Set the directional maximum to 10 grids while preserving 0.5-grid steps, 28/14 mm official spacing, 2–500 mm text height, 2–200 mm slider height, and the independent 500 mm planar guard.
- [x] 1.3 Add the fixed 2.275 mm active-end retraction and a shared retraction-aware plan-bound/endpoint helper; use it for plan dimensions, validation, and centered committed bounds.

## 2. CAD generation and runtime surfaces

- [x] 2.1 Update the horizontal and vertical Divider wall extrusions to start and end at the shared effective endpoints, so the 5 mm base, transition, and upper wall all stop at the retracted station while the central junction and peg spacing remain unchanged.
- [x] 2.2 Update Divider quality and placement probes to use the shared retraction-aware center/envelope, and verify the generated result still has finite bounds, one solid, valid mesh, pegs, transitions, and exports.
- [x] 2.3 Update the Divider catalog controls through the shared configuration, remove the repeated technical paragraph from the catalog description and Svelte panel, and verify the existing `opengrid-divider` id, build key, route, parameter keys, persistence shape, and export filename format remain unchanged.

## 3. Behavior-focused verification

- [x] 3.1 Update and extend Divider contract/unit tests for single-arm classification, all-zero rejection, the 10-grid per-direction limit, 0.5 steps, 500 mm combined footprint rejection, and retraction-aware centered bounds.
- [x] 3.2 Update Worker integration tests for single-arm generation and asymmetric arms, including terminal measurements for the shortened base/transition/upper profile and non-empty STEP/STL output.
- [x] 3.3 Update catalog, workspace-validation, persistence, lifecycle/runtime, and E2E tests for the 10-grid controls and removed paragraph while retaining identifier and round-trip coverage.
- [x] 3.4 Run focused tests, typecheck/lint/build validation, and the full repository test command required by the implementation workflow; resolve any regressions without changing unrelated OpenGrid components.
