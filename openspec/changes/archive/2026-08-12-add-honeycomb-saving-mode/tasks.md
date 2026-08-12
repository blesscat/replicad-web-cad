## 1. Contract and compatibility foundation

- [x] 1.1 Add the shared honeycomb geometry configuration and typed `honeycombMode` fields/defaults for both existing OpenGrid container contracts, preserving model IDs and routes.
- [x] 1.2 Add behavior-focused unit coverage for legacy hydration, exact-key validation, default-off normalization, mode combinations, deterministic honeycomb filenames, and unchanged filenames when disabled.

## 2. Workspace and catalog integration

- [x] 2.1 Thread `honeycombMode` through raw parameter parsing/serialization, workspace parameter-key validation, persisted parameter hydration, and normalized model snapshots for both models.
- [x] 2.2 Add the `省料模式（六角鏤空）` checkbox to the box and cylinder panels without changing their existing mode radios, hole controls, opening controls, or numeric schemas.
- [x] 2.3 Add catalog/default metadata and panel tests proving the toggle is typed, persisted, restored, and does not alter unrelated controls or legacy snapshots.

## 3. Shared protected honeycomb geometry

- [x] 3.1 Add the Worker-only lattice utility for regular-hex profiles, planar and radial local-plane prisms, stable 14 mm anchored candidate centers, complete-cell fit checks, and protected-region overlap rejection.
- [x] 3.2 Add unit tests for hex orientation, edge-frame containment, bottom-hole/socket keep-outs, seam/opening keep-outs, circular-boundary containment, no-cell fallback, and compound cutter ownership.
- [x] 3.3 Add batched cutter assembly with explicit native-shape cleanup, generation-current checks, measured Boolean scopes, and diagnosable honeycomb-stage failures.

## 4. Stackable-box honeycomb profile

- [x] 4.1 Integrate the final protected honeycomb stage into the existing box build sequence for side panels and eligible bottom-floor panels across normal, base-plate, and thin-shell modes.
- [x] 4.2 Extend box quality reporting and gates with honeycomb state/safe-cell metrics plus protected socket, ordinary-hole, seam, side-opening, floor, and stacking-interface checks.
- [x] 4.3 Add box Worker integration coverage for honeycomb side/bottom openings, full and corner-only bottom holes, side openings, all floor modes, small no-cell fallback, single-solid B-Rep validity, lower volume, and STEP/STL exports.

## 5. Stackable-cylinder honeycomb profile

- [x] 5.1 Integrate the final protected honeycomb stage into the existing cylinder build sequence for the curved wall and eligible circular-floor panels across default, thin-bottom, and bottom-plate modes.
- [x] 5.2 Extend cylinder quality reporting and gates with honeycomb state/safe-cell metrics plus protected stepped holes, floor/ramp, side-opening, and same-diameter mating-interface checks.
- [x] 5.3 Add cylinder Worker integration coverage for honeycomb side/bottom openings, holes enabled/disabled, side openings, all bottom profiles, small no-cell fallback, single-solid B-Rep validity, lower volume, and STEP/STL exports.

## 6. End-to-end verification and delivery gates

- [x] 6.1 Add focused Worker/runtime/export and browser panel coverage for the new toggle, normalized snapshots, deterministic filenames, stale-generation behavior, and legacy parameter restoration.
- [x] 6.2 Run focused unit and CAD integration tests, then `pnpm check`, `pnpm format:check`, `pnpm build`, and the relevant full test suite; record results and resolve regressions.
- [x] 6.3 Run an opt-in honeycomb build/mesh benchmark on representative box and cylinder fixtures, reporting volume and timing without imposing hardware-dependent thresholds.
