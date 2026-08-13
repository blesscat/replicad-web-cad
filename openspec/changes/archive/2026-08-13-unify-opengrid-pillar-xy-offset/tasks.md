## 1. Contract and migration tests

- [x] 1.1 Update pillar contract tests to require exactly one `offset` field, equal X/Y bounds, shared-offset validation, and the new deterministic non-zero export stem.
- [x] 1.2 Add behavior-focused migration tests for equal legacy X/Y offsets, unequal legacy X/Y offsets, legacy positioning records, and malformed snapshots.
- [x] 1.3 Update workspace validation, raw-parameter round-trip, persistence, and runtime request tests to cover one shared XY input and reject the removed independent fields.

## 2. Parameter contract and catalog

- [x] 2.1 Change the canonical pillar parameter types, exact-key validation, defaults, normalization, bounds, and export helpers from `offsetX`/`offsetY` to scalar `offset`.
- [x] 2.2 Update workspace parsing and raw hydration to read/write one `offset` value, while migrating compatible legacy snapshots without emitting the old fields.
- [x] 2.3 Update the model catalog schema and description to expose one `XY 直徑增量` field, preserving the existing `opengrid-pillar` model ID, build key, route, modes, and axial dimensions.
- [x] 2.4 Update the locating-post panel and end-to-end coverage so fixed and positioning modes render exactly one shared offset control and no X/Y pair.

## 3. Complete-solid geometry integration

- [x] 3.1 Update the Worker pillar builder to apply `nominalDiameter + offset` to the centered Ø7 mm flange and Ø5 mm body, keeping all Z dimensions unchanged, and update quality probes for the effective diameters.
- [x] 3.2 Update Worker integration and model-generation tests for centered resized bounds, valid one-solid output, preserved axial profiles, and positioning chamfers at the shared XY diameter increment.
- [x] 3.3 Remove all remaining pillar-specific `offsetX`/`offsetY` runtime references and confirm export requests and committed B-Rep metadata use the scalar contract.

## 4. Verification and handoff

- [x] 4.1 Run focused pillar contract, workspace, persistence, model-catalog, runtime, and Worker tests; fix any behavior regressions.
- [x] 4.2 Run formatting, TypeScript checks, production build, and relevant end-to-end tests.
- [x] 4.3 Run strict OpenSpec validation and review the final diff for unchanged public model identity/routes, complete artifact status, and no unrelated file changes.

## 5. Clarified XY sizing semantics

- [x] 5.1 Add regression coverage proving `offset=0.5` changes Ø7 to Ø7.5 and Ø5 to Ø5.5 while keeping the center and Z bounds unchanged.
- [x] 5.2 Implement the effective-diameter contract across bounds, builder, quality probes, and the user-facing catalog label.
- [x] 5.3 Synchronize the OpenSpec artifacts, rerun focused verification, and re-archive the completed change.
