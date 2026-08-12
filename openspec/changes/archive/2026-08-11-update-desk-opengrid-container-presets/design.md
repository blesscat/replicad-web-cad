## Context

See `proposal.md` and `specs/opengrid-desk-container-presets/spec.md` for the requested behavior. The existing system-context resolver already accepts Desk for both container model ids, while its preset resolver currently provides special values only for Snap and the OpenGrid board. The parameter store already checks a scoped saved snapshot before asking the resolver for a system preset, so the new behavior can remain a scoped fallback without changing persistence format or model definitions.

The visible Desk preview entries already use deterministic `-desk.png` identities and the capture test derives its routes and targets from the catalog. Changing the effective preset therefore requires recapturing the two existing Desk container assets, not adding new catalog entries or a second CAD builder.

## Goals / Non-Goals

**Goals:**

- Resolve immutable, typed Desk presets for the two existing OpenGrid container model ids.
- Compose each preset from the current validated model defaults so future unrelated controls keep their existing defaults.
- Preserve scoped saved-value precedence, context-free behavior, model identity, and Worker/export contracts.
- Add focused unit and browser coverage and regenerate the two affected Desk preview assets.

**Non-Goals:**

- Do not change `OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS` or `OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS`; those are still the defaults for legacy/context-free routes.
- Do not expose a new user control, add a Wall container entry, or change either container's geometry implementation.
- Do not migrate or erase existing browser persistence; existing valid Desk snapshots intentionally continue to win over the new fallback preset.

## Decisions

### 1. Add explicit Desk-only preset branches in the existing resolver

Extend `getSystemPreset` with Desk branches for `opengrid-stackable-box` and `opengrid-stackable-cylinder`. Each branch starts from the corresponding `*_DEFAULT_PARAMETERS` object and overrides only the requested dimensions and mutually exclusive mode flags:

```text
Desk box      x=8, y=4, height=50, thinShellMode=true, basePlateMode=false
Desk cylinder diameter=60, height=50, thinBottomMode=true, bottomPlateMode=false
```

Return a fresh object so callers cannot mutate the exported defaults or share a snapshot between store instances. The existing resolver remains the single source of truth for system-scoped initialization and restore-defaults behavior.

An alternative of changing the model definition defaults was rejected because it would silently alter context-free routes, legacy persistence fallback, and any direct links without `system=desk`.

### 2. Preserve the existing persistence precedence

No storage schema change is needed. `ComponentParameterStore.get()` already returns a validated scoped entry when present and only calls `getSystemPreset()` when the scope has no entry. Tests will cover both branches explicitly, including the fact that an unscoped legacy entry does not pollute Desk and that context-free access still returns model defaults.

### 3. Keep preview generation on the existing catalog workflow

The preview capture/verification workflow will be run with cleared or isolated browser storage and the existing Desk routes. The two deterministic assets will be overwritten in place after the controls and generation are verified. No preview-specific parameter path or Worker protocol change will be introduced.

### 4. Validate behavior at the resolver, store, and route boundaries

Unit tests will assert the complete typed preset objects and fallback precedence. E2E tests will open the Desk routes after clearing storage, assert the visible dimensions and selected thin-shell controls, and wait for a ready generation. The existing preview asset test will verify the recaptured PNG files and their catalog identities.

## Risks / Trade-offs

- **[A previously stored Desk snapshot can hide the new preset during manual verification.]** → Clear the parameter storage in E2E setup and document that saved values intentionally take precedence; the Restore Defaults action remains the way to apply the current Desk preset to an existing session.
- **[The larger 8×4 thin-shell box may take longer to generate or capture.]** → Reuse the existing Worker timeout and preview capture workflow, and run the focused box Worker/E2E checks before the full validation suite.
- **[A future parameter added to a model default could be omitted from a hand-written preset.]** → Build each preset by spreading the complete exported default object and override only the five requested fields for that model.
- **[The cylinder UI calls `thinBottomMode` “薄殼模式”, although its geometry contract is a thin floor rather than a thinner side wall.]** → Preserve the existing UI and parameter semantics exactly; the Desk preset selects the same validated mode the user can choose manually.

## Migration Plan

1. Add the two Desk resolver branches and unit/store coverage.
2. Add or extend Desk route E2E coverage for dimensions, modes, and ready generation.
3. Recapture and verify `opengrid-stackable-box-desk.png` and `opengrid-stackable-cylinder-desk.png` with isolated storage.
4. Run formatting, typecheck, targeted tests, build, and OpenSpec validation.

Rollback is code-only: remove the two resolver branches and restore the prior preview PNGs if needed. No persisted data migration is required because existing scoped and legacy snapshots remain valid.
