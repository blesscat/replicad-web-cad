## 1. Contract and migration tests

- [x] 1.1 Update pillar contract tests to require exactly one `offset` field, equal X/Y bounds, shared-offset validation, and the new deterministic non-zero export stem.
- [x] 1.2 Add behavior-focused migration tests for equal legacy X/Y offsets, unequal legacy X/Y offsets, legacy positioning records, and malformed snapshots.
- [x] 1.3 Update workspace validation, raw-parameter round-trip, persistence, and runtime request tests to cover one shared XY input and reject the removed independent fields.

## 2. Parameter contract and catalog

- [x] 2.1 Change the canonical pillar parameter types, exact-key validation, defaults, normalization, bounds, and export helpers from `offsetX`/`offsetY` to scalar `offset`.
- [x] 2.2 Update workspace parsing and raw hydration to read/write one `offset` value, while migrating compatible legacy snapshots without emitting the old fields.
- [x] 2.3 Update the model catalog schema and description to expose one `XY 偏移` field, preserving the existing `opengrid-pillar` model ID, build key, route, modes, and fixed dimensions.
- [x] 2.4 Update the locating-post panel and end-to-end coverage so fixed and positioning modes render exactly one shared offset control and no X/Y pair.

## 3. Complete-solid geometry integration

- [x] 3.1 Update the Worker pillar builder to translate the completed fused/chamfered solid by `(offset, offset, 0)` and update quality probes to verify the Ø7 mm flange and Ø5 mm body share the same displacement.
- [x] 3.2 Update Worker integration and model-generation tests for equal-axis bounds, valid one-solid output, preserved fixed profiles, and positioning chamfers at the shared offset.
- [x] 3.3 Remove all remaining pillar-specific `offsetX`/`offsetY` runtime references and confirm export requests and committed B-Rep metadata use the scalar contract.

## 4. Verification and handoff

- [x] 4.1 Run focused pillar contract, workspace, persistence, model-catalog, runtime, and Worker tests; fix any behavior regressions.
- [x] 4.2 Run formatting, TypeScript checks, production build, and relevant end-to-end tests.
- [x] 4.3 Run strict OpenSpec validation and review the final diff for unchanged public model identity/routes, complete artifact status, and no unrelated file changes.
