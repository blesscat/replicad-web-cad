## Context

The existing model catalog already carries separate `min`/`max` and optional `sliderMin`/`sliderMax` metadata, and the shared control already sends `field.max` to the text input while using `field.sliderMax` for the range input. The remaining work is to add explicit 200 mm slider overrides while keeping every affected manual-input contract at its existing 500 mm maximum, including the hexagonal-column height contract.

## Goals / Non-Goals

**Goals:**

- Make accepted manual height/length values and slider navigation limits independent and explicit.
- Keep the targeted manual height/length values valid through 500 mm while allowing slider navigation to stop at 200 mm.
- Keep all existing X/Y grid and OpenGrid planar footprint safety checks at 500 mm.
- Keep existing model IDs, routes, component assets, geometry profiles, and non-target parameter domains stable.

**Non-Goals:**

- Do not redesign the shared slider or text-input components.
- Do not change the OpenGrid board's grid-count limits, divider arm-count limits, cylinder diameter range, or hexagonal-column geometry and row-envelope behavior.
- Do not add a new model, route, API, persistence version, or CAD dependency.

## Decisions

### Keep the existing field-level slider override

Use the existing `ParameterField.sliderMax` path rather than introducing a global UI clamp. Each targeted model schema will point its slider to a component configuration value of 200 while its `max` remains the accepted manual-input maximum of 500. This preserves the existing control contract and keeps fields with smaller domains unchanged.

Alternatives considered:

- A global `Math.min(field.max, 200)` in `ParameterControl` would silently change every future field and would make per-component exceptions difficult to express.
- Changing only the HTML range `max` would leave the model validators and catalog metadata coupled, so the UI could drift from the validated contract.

### Preserve the shared 500 mm workspace limit

The shared prototype configuration already uses 500 mm for the basic box and for modular-grid-base, HSW, and hexagonal-column planar safety checks. It will remain unchanged. OpenGrid stackable-box and divider configurations already name their footprint limits separately and will retain those 500 mm values.

This keeps the height/length slider change independent from planar workspace safety checks. The hexagonal-column row-envelope check will continue to use the workspace maximum while its manual height maximum is restored to 500 mm.

### Keep 500 mm as the manual contract value

For box-normal height, OpenGrid pillar length, divider height, stackable-box height, stackable-cylinder height, and hexagonal-column height, the contract maximum remains 500 and each applicable schema receives a 200 mm slider maximum. Validation, bounds, filenames, persistence, and Worker generation continue to consume the typed value without clamping. The cylinder diameter remains 20–300 mm and is not part of this change.

### Preserve the existing generation lifecycle

No debounce, raw-input parsing, generation invalidation, candidate commit, or export lifecycle changes are required. The implementation will extend boundary tests through the existing paths: values above the slider maximum must remain valid when entered manually up to 500, while invalid values above 500 or outside a model's planar footprint limit must still invalidate the snapshot.

## Risks / Trade-offs

- [Risk] Reducing the existing hexagonal-column manual maximum from 999 mm could invalidate persisted values above 500 mm. → Treat those snapshots as invalid under the new contract, preserve the existing invalid-input lifecycle, and add an explicit 501 mm boundary test.
- [Risk] A slider override could be omitted from one catalog field. → Audit every affected field and assert both text-input and range-input metadata independently.
- [Risk] Documentation and E2E attributes can drift from catalog metadata. → Update user-facing descriptions and assert both text-input and slider `max` attributes in the affected route tests.
- [Risk] Existing persisted snapshots may contain hexagonal-column values above 500 mm. → No storage migration is needed; such snapshots will be rejected by the normal component validation path and the UI will remain in its existing invalid-input state.

## Migration Plan

1. Update the shared and component-local configuration contracts, model schemas, validators, descriptions, and tests together.
2. Run formatting, type checks, unit tests, Worker tests, and the affected E2E suites.
3. Deploy as a slider usability change with the existing 500 mm manual-input contract; existing stored parameters at or below 500 mm continue to hydrate normally.
4. Roll back by restoring the slider metadata, documentation, and boundary assertions if the interaction is unacceptable. No persisted-data migration is required.
