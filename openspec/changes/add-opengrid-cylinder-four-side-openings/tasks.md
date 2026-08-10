## 1. Parameter contract and derived opening geometry

- [x] 1.1 Extend `OpenGridStackableCylinderParameterKey`, parameter types, configuration, defaults, and validation with the twelve `+X`/`-X`/`+Y`/`-Y` depth, flat-bottom length, and angle fields, including legacy no-opening defaults and field-specific errors.
- [x] 1.2 Add derived opening calculations for lower Z, fixed 2.5 mm lower/upper transition radius, side slope, upper half-run, upper opening width, and direction footprint; reject non-finite, degenerate, floor-cutting, diameter-fitting, or neighboring-overlap combinations.
- [x] 1.3 Update the model parameter unions, public unit exports, raw-parameter key registry, storage normalizer, and raw-to-typed conversion so old snapshots remain valid and all twelve new values round-trip independently.
- [x] 1.4 Add degree-unit support to the shared parameter-field contract and confirm the existing OpenGrid component identity, route, build key, and catalog naming remain unchanged.

## 2. Catalog, panel, and export identity

- [x] 2.1 Add the twelve opening fields to the cylinder catalog schema with no-opening defaults, 1 mm/1 degree steps, an active-opening 1 mm bottom-length minimum, and safe configuration-driven ranges.
- [x] 2.2 Redesign the cylinder parameter panel into one collapsed disclosure containing nested `前方`, `後方`, `左方`, and `右方` groups mapped to `-Y`, `+Y`, `-X`, and `+X`; leave `前方` expanded by default and the other three collapsed while retaining depth, flat-bottom length, side-wall angle, mode radios, the shared hole switch, restore buttons, and validation messages. Render the four side-wall angle sliders in reverse visual direction while preserving their numeric and geometric semantics.
- [x] 2.3 Update deterministic STEP/STL filename generation with a canonical opening-settings fingerprint when any opening is enabled, while preserving the existing filename for no-opening defaults.

## 3. Exact B-Rep side-opening builder

- [x] 3.1 Build a canonical top-open U/V-shaped cutter from a local Sketcher profile with a flat bottom, fixed 2.5 mm rounded transitions at both edges, and side walls derived from the requested angle; do not create a circular hole.
- [x] 3.2 Transform the canonical cutter to the four cardinal directions and apply only the enabled cuts to the existing revolved shell with generation-current checks and temporary-shape cleanup.
- [x] 3.3 Integrate side openings with all default, thin, and bottom-plate profiles without changing the existing stepped holes, lower printable profile, top guide chamfer, or same-diameter mating interface.
- [x] 3.4 Extend cylinder quality diagnostics and Worker error mapping to report invalid opening profiles, floor/stacking violations, neighboring overlap, invalid B-Rep topology, or failed interface probes without committing a bad candidate.

## 4. Behavior-focused verification

- [x] 4.1 Add unit coverage for legacy/default normalization, all twelve field validations, zero-depth omission, angle limits, and independent parameter round-trips.
- [x] 4.2 Add derived-geometry tests proving that flat-bottom length, depth, and the fixed 2.5 mm radius remain fixed while changing the side angle changes the side slope and upper width.
- [x] 4.3 Add Worker integration coverage for each cardinal direction individually, four distinct direction profiles, one disabled direction, all three bottom modes, hole on/off, valid B-Rep, floor preservation, and same-diameter mating.
- [x] 4.4 Add browser E2E coverage for the four grouped controls, independent edits/restoration, validation feedback, persisted values, no-opening backward compatibility, and deterministic opening-aware exports.
- [x] 4.5 Run the focused and full test suites, formatting/type checks, OpenSpec validation, and `git diff --check`; record any geometry/performance findings before marking the change complete.

Verification note: the unfiltered Vitest suite previously passed 73 files with 563 tests and 30 skipped tests; two focused contract tests were added afterward, and one unrelated OpenGrid stackable-box test remains red because `public/openGrid Bare Lite Snap hold.step` is absent from this worktree. The focused cylinder contract suite now passes all 51 tests, the cylinder integration suite passes all 42 tests, and the cylinder E2E suite passes all 6 Chromium tests.
