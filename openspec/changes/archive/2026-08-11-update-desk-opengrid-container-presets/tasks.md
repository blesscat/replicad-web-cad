## 1. Desk preset resolution

- [x] 1.1 Extend the existing OpenGrid system preset resolver with a fresh validated Desk preset for `opengrid-stackable-box` using `x=8`, `y=4`, `height=50`, `thinShellMode=true`, and `basePlateMode=false` while preserving all other box defaults.
- [x] 1.2 Extend the resolver with a fresh validated Desk preset for `opengrid-stackable-cylinder` using `diameter=60`, `height=50`, `thinBottomMode=true`, and `bottomPlateMode=false` while preserving all other cylinder defaults.
- [x] 1.3 Add unit coverage for both complete typed presets, unsupported Wall/container fallback, unchanged Snap/board presets, and fresh-object/default isolation.

## 2. Persistence and workspace behavior

- [x] 2.1 Add component-store coverage proving a missing Desk snapshot uses each new preset, a valid saved Desk snapshot still wins, and unscoped legacy data does not pollute Desk.
- [x] 2.2 Extend container E2E coverage to clear storage and verify the Desk route controls, selected thin-shell mode, requested dimensions, ready generation, and unchanged context-free defaults.

## 3. Desk preview assets

- [x] 3.1 Recapture `opengrid-stackable-box-desk.png` and `opengrid-stackable-cylinder-desk.png` through the existing preview workflow with isolated browser storage.
- [x] 3.2 Run preview verification and confirm both catalog identities remain present, non-empty, and 640×400 PNGs generated from the new Desk presets.

## 4. Validation and completion

- [x] 4.1 Run focused system-context, component-parameter-store, container unit, and relevant Worker integration tests.
- [x] 4.2 Run formatting, typecheck, build, relevant E2E tests, and strict OpenSpec validation; resolve any failures and record the results.
