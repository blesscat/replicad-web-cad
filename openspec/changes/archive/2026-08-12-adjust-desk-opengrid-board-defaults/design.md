## Context

The OpenGrid board has one normalized parameter definition shared by context-free,
Desk, and Wall routes. The global configuration intentionally uses the official
`chamfers=corners` and `screwMode=corners` values, while the existing Desk resolver
already derives a cloned board preset and overrides only its grid to 4 × 4.

The parameter store gives a valid saved snapshot in the active system scope
precedence over a system preset. The controller already uses the system preset for
the full "restore defaults" action, but `OpenGridComponentPanel` currently compares
individual controls against the global configuration and does not receive the
active system context. The panel also renders the screw-mode control after the screw
size source control.

## Goals / Non-Goals

**Goals:**

- Make the Desk OpenGrid board effective preset use `chamfers=none` and
  `screwMode=none` while preserving all other validated defaults and the existing
  4 × 4 Desk grid.
- Keep context-free and Wall board initialization on the official global defaults.
- Make full restore and individual field restore use the same effective defaults for
  the active context.
- Move the screw-mode control before the screw-size source control without changing
  normalized parameter names or generation behavior.
- Verify the behavior through resolver, persistence, route, restore, and control-order
  tests.

**Non-Goals:**

- Do not change `OPENGRID_CONFIGURATION.defaultParameters` or the official OpenGrid
  contract for direct routes.
- Do not change screw geometry, chamfer geometry, Worker messages, model IDs, routes,
  persistence format, previews, or export filenames.
- Do not add a new OpenGrid component or catalog entry.

## Decisions

### 1. Keep the override in the Desk system preset

Extend the existing `getSystemPreset('opengrid', 'desk')` branch to override only
`rows`, `columns`, `chamfers`, and `screwMode`, while continuing to clone the global
parameter object and clear custom positions. Wall and context-free paths remain
unchanged.

Changing `OPENGRID_CONFIGURATION.defaultParameters` was rejected because the main
OpenGrid contract defines the official defaults as corner chamfers and corner
screws; a global change would silently alter direct and Wall routes.

### 2. Derive panel restore baselines from the active context

Thread `systemContext` from `CadWorkspace` through the workspace panel and component
panel dispatcher into `OpenGridComponentPanel`. Add one named effective-default
resolver for the panel that reuses `getSystemPreset` when a context exists and the
validated OpenGrid definition defaults otherwise.

Use that baseline for changed indicators and field-level restore handlers, including
grid counts, chamfer mode, screw mode, screw dimensions, and custom positions. The
existing controller-level full restore remains the authoritative whole-snapshot
operation and already resolves the same system preset.

An alternative of maintaining a second Desk-specific default object inside the UI
was rejected because it could drift from the resolver used by persistence and full
restore.

### 3. Move the complete screw-mode subsection as a unit

Render the screw-mode select before the screw-size source field. Keep the conditional
row/column interval controls immediately after the mode select so selecting a mode
continues to reveal its dependent controls in the same logical group. The center,
interval, and custom-position modifiers remain after the screw-size configuration as
they are independent modifiers of the selected mode.

### 4. Preserve scoped persistence precedence

No storage migration is needed. A valid `(desk, opengrid)` snapshot continues to win
over the new preset; an invalid or missing Desk snapshot uses the new preset; Wall and
legacy context-free stores continue to use their existing scopes and defaults.

## Risks / Trade-offs

- **[Desk users with an existing saved snapshot will not see the new initial values.]**
  → Preserve the documented snapshot precedence and make the full restore action
  explicitly covered by tests.
- **[Passing system context through several Svelte components increases prop wiring.]**
  → Keep the context optional for all non-OpenGrid panels and use a named resolver at
  the OpenGrid panel boundary.
- **[Moving controls can change keyboard/tab order.]**
  → Treat the rendered accessible control order as a browser-level contract and add
  an E2E assertion for screw mode preceding screw size.
- **[A future system preset field could be omitted from a hand-written panel
  baseline.]**
  → Start from the resolver's complete validated preset and override no UI fields
  locally.

## Migration Plan

1. Add the Desk preset values and resolver/unit coverage.
2. Thread context into the panel and use the effective preset for restore indicators
   and handlers.
3. Reorder the screw controls and add route/restore/order E2E coverage.
4. Run focused unit and browser tests, then the project validation suite.
5. Rollback is code-only: remove the two Desk overrides and context-aware panel
   baseline; no persisted data migration or asset rollback is required.

## Open Questions

None. The completed exploration selected Desk-scoped defaults with context-consistent
restore behavior and left global official defaults unchanged.
