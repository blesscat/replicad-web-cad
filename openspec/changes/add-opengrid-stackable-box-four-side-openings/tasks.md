## 1. Typed contract and defaults

- [x] 1.1 Extend the stackable-box parameter keys, typed snapshot, configuration defaults, and public unit exports with the twelve opening fields using `(depth=0, bottomLength=1, angle=90)` for every direction.
- [x] 1.2 Add field-level validation for opening integer millimetres, 1–90 degree angles, zero-depth disabling, active-floor depth limits, side-specific bottom-length limits, and neighboring/corner bridge constraints.
- [x] 1.3 Add derived opening helpers that map `+X`, `-X`, `+Y`, and `-Y` to the box wall normal/tangent axes and calculate final normal/base-plate rim and floor datums.

## 2. Parameter lifecycle and catalog

- [x] 2.1 Register all twelve opening keys in raw workspace parsing, typed snapshot construction, parameter-key lookup, and invalidation handling without changing the existing box identity.
- [x] 2.2 Add the opening fields to the stackable-box catalog schema with 1 mm numeric controls, degree display, defaults, and dynamic depth/bottom-length ranges.
- [x] 2.3 Normalize legacy persisted and restored box snapshots that lack opening fields to four `(0, 1, 90)` triples, while preserving existing bottom-hole and base-plate values.
- [x] 2.4 Update normalized parameter serialization and model-state defaults so equivalent typed opening values round-trip without persisting raw or partial input.

## 3. Opening controls

- [x] 3.1 Add the `四個方向開口設定` disclosure and the `前方`/`後方`/`左方`/`右方` groups with the cylinder-compatible direction mapping and depth, bottom-length, angle field order.
- [x] 3.2 Match the cylinder control behavior: collapsed outer disclosure, front group expanded after disclosure open, other groups collapsed, RTL angle sliders, degree unit, and independent per-direction updates.
- [x] 3.3 Keep the existing X/Y calculator, bottom-hole controls, and normal/base-plate mode radios unchanged and verify their values survive opening edits.

## 4. Box-native geometry

- [x] 4.1 Implement a straight-edged tangent/Z notch profile with a requested flat sill and angle-derived upper width; orient it by Cartesian wall normal/tangent axes and do not use circular, radial, revolved, or cylinder cutter geometry.
- [x] 4.2 Integrate centered `+X`, `-X`, `+Y`, and `-Y` opening cuts into the Worker builder after the existing base-plate transform, skipping zero-depth directions and retaining current-build cancellation checks.
- [x] 4.3 Enforce side straight-run, rounded-corner reserve, active-floor, bottom-guide, socket, hole, and neighboring-opening safety limits before applying Boolean cuts.

## 5. Quality gates and exports

- [x] 5.1 Extend stackable-box geometry quality probes for disabled-wall preservation, sill depth/length, planar side slopes, corner bridges, floor/bottom-feature preservation, single-solid validity, and both bottom modes.
- [x] 5.2 Add direction-aware opening validation errors and ensure failed opening candidates cannot replace the last valid revision or enable STEP/STL export.
- [x] 5.3 Add a typed deterministic opening fingerprint to STEP/STL filenames only when any opening depth is positive, preserving the existing no-opening and bottom-mode filename identities.

## 6. Verification

- [x] 6.1 Add contract and persistence tests for defaults, exact normalized keys, invalid opening values, legacy normalization, independent direction updates, and degree-unit behavior.
- [x] 6.2 Add panel/runtime tests for labels, direction mapping, disclosure defaults, field order, RTL angle controls, dynamic ranges, and preservation of existing box controls.
- [x] 6.3 Add Worker integration tests for one-sided and four-sided openings, distinct angles/lengths, zero-depth closed sides, normal/base-plate modes, half-cell footprints, and bottom-hole combinations.
- [x] 6.4 Add geometry failure and export tests for below-floor cuts, merged openings, broken bridges/features, invalid B-Rep, stale candidates, and deterministic enabled/no-opening filenames.
