## Why

`cad-workspace/spec.md` has become the de facto home for both generic CAD
workspace lifecycle rules and the UI, route, validator, and export rules of
individual components. That makes it unclear which document is authoritative
when a component changes and causes the same behavior to be reviewed in several
places. The current component specs already cover most geometry contracts, so
this is the right point to make ownership explicit before adding more models.

## What Changes

- Reduce `cad-workspace` to the component-agnostic browser, Worker, generation,
  preview, export, progress, and recovery lifecycle.
- Move baseline catalog registration, route locking, and box/grid control
  requirements into a dedicated catalog capability.
- Move HSW, OpenGrid board/Snap/half-cell, divider, pillar, stackable-box,
  stackable-cylinder, and Open Shelf route/control/validation/lifecycle
  requirements into their existing component capability specs.
- Move system-context initialization, restore, and active-label requirements to
  `opengrid-system-entry-context`.
- Give honeycomb performance-warning behavior its own cross-component capability
  spec so it is not hidden inside a workspace document.
- Add an ownership matrix to the design and traceability notes so future changes
  have one normative owner per behavior.
- Reconcile stale copied Snap and Pillar workspace wording with the existing
  canonical component contracts without changing runtime identifiers or behavior.
- Preserve every existing model ID, route slug, persistence key, export name,
  and OpenGrid naming convention; this change does not alter runtime behavior.

## Capabilities

### New Capabilities

- `cad-component-catalog`: baseline catalog, route-locking, and component validation boundaries.
- `cad-render-performance-warning`: cross-component honeycomb warning behavior.

### Modified Capabilities

- `cad-workspace`: generic workspace lifecycle owns shared behavior only.
- `hsw-cell`: owns HSW route, controls, validation, preview, and export integration.
- `opengrid-generator`: owns OpenGrid board workspace integration and board lifecycle.
- `opengrid-snap`: owns Snap workspace controls and lifecycle integration.
- `opengrid-half-cell`: owns the board half-cell workspace controls.
- `opengrid-divider-generator`: owns divider route, controls, and lifecycle integration.
- `opengrid-pillar-generator`: owns pillar route, controls, and lifecycle integration.
- `opengrid-stackable-box`: owns stackable-box route, controls, and lifecycle integration.
- `opengrid-stackable-cylinder`: owns cylinder route, controls, and lifecycle integration.
- `opengrid-open-shelf`: owns Open Shelf route, controls, and lifecycle integration.
- `opengrid-system-entry-context`: owns context-aware initialization, reset, and labels.
- `opengrid-locating-assembly-interface`: owns shared locating-seat descriptions.

## Impact

- OpenSpec documentation only; no application source, API, or CAD-kernel changes.
- The affected main specs and their archived change traceability will be edited.
- Reviewers can now find shared runtime invariants in `cad-workspace` and
  component-specific behavior in the corresponding component spec.
- Existing IDs remain unchanged. Any new capability path introduced here is
  cross-component and is not an OpenGrid model, so the `opengrid-` naming rule
  does not apply to it.
