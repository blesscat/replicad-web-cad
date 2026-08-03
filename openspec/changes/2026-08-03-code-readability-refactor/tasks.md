## 1. Replace dense production control flow

- [x] 1.1 Add a named progress-message helper for Worker operation stages and replace the nested ternary in `CadWorkspace` without changing user-visible messages.
- [x] 1.2 Replace the conditional field-error object construction in `CadWorkspace` with explicit control flow while preserving field association and empty-error behavior.
- [x] 1.3 Add ordered early-return or switch helpers for Worker error code and error stage mapping, preserving the current precedence and `CadError` outputs.
- [x] 1.4 Extract the mesh/empty-state viewport content into a named render helper or small component, preserving the existing Canvas props, fallback, accessibility labels, stale badge, and styling.

## 2. Remove duplicated setup and defaults

- [x] 2.1 Replace the state module's duplicated initial dimensions with the shared `PROTOTYPE_CONFIGURATION.defaultDimensions` value, using a readonly-safe state boundary if needed.
- [x] 2.2 Replace the units test's conditional fallback object with a named valid-parameters fixture and an explicit validation precondition.
- [x] 2.3 Extract the repeated Firefox WebGL skip condition in `routes.spec.ts` into a helper used only by the WebGL-dependent tests.
- [x] 2.4 Review the post-refactor `CadWorkspace` boundary and extract only lifecycle-independent helpers or view pieces that materially improve readability without changing Worker ownership. The progress mapping and field-error branches are now isolated; the remaining effect intentionally stays co-located because it owns the Worker lifecycle and timer cleanup.

## 3. Behavior-focused verification

- [x] 3.1 Update or add behavior-focused unit tests for any newly extracted pure helpers; do not assert source text or implementation structure.
- [x] 3.2 Run the full readability scan across `src/` and `tests/` and confirm no nested/multi-line ternary or conditional object findings remain in the scoped code.
- [x] 3.3 Run `pnpm run check`, `pnpm run test`, and `pnpm run build`.
- [x] 3.4 Run `pnpm run test:e2e` and `pnpm test:e2e:firefox`, confirming route, fallback, responsive, WebGL, parameter, and STEP export behavior.
- [x] 3.5 Run `openspec validate --changes --strict` and review the final diff for unchanged CAD protocol, accessibility, and visual behavior.
