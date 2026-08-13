## Context

The three existing OpenGrid parameter panels expose the honeycomb saving switch
through different layouts: the stackable-box, stackable-cylinder, and Open
Shelf panels each render a checkbox. The repository already has the
`text-error` token for red user-facing messages and uses live status text for
changing mode summaries. See the proposal and
`specs/cad-workspace/spec.md` for the motivation and behavior contract.

## Goals / Non-Goals

**Goals:**

- Present one consistent warning component and exact Chinese copy whenever
  honeycomb saving mode is active.
- Place the warning below the saving-mode checkbox in all three panels.
- Keep the message informational and accessible without treating it as a
  validation error.
- Verify the visible/hidden behavior through existing Playwright workspace
  flows.

**Non-Goals:**

- No changes to honeycomb geometry, generation timing, debounce behavior,
  parameter schema, persistence, or export lifecycle.
- No new settings, acknowledgement control, modal, or download restriction.
- No changes to the existing mode labels or descriptions.

## Decisions

1. **Use a shared warning component.**
   The exact copy and presentation are shared by the box, cylinder, and Open
   Shelf panels through one small CAD panel component. This avoids copy drift
   while allowing each parent to decide when the component is rendered
   according to its existing checkbox state. Duplicating literal strings in
   each panel was rejected because future copy changes could leave the three
   warnings inconsistent.

2. **Render only while honeycomb saving mode is enabled.**
   The box, cylinder, and Open Shelf parents render the warning when their
   `honeycombMode` checkbox is checked. This matches the requirement's
   "啟用後" behavior and avoids permanently adding warning noise when saving
   mode is disabled.

3. **Reuse the existing error color token with status semantics.**
   The component uses the existing `text-error` class for the red appearance,
   but exposes the text as an informational live status rather than a form
   validation error. It will use a stable test id so tests assert the visible
   user-facing warning without inspecting source structure.

4. **Keep warning layout flow-local.**
   The warning is inserted below the existing saving-mode checkbox in all
   three panels. It remains normal-flow text so narrow panels wrap naturally;
   it does not overlay controls or alter the model lifecycle.

## Risks / Trade-offs

- [Risk] The extra line increases the vertical height of a parameter panel when
  honeycomb saving mode is active. → [Mitigation] Use the existing small-text style and
  normal wrapping; do not introduce fixed heights or overlays.
- [Risk] A live status could be announced when the user switches modes. →
  [Mitigation] Use polite status semantics for an informational warning rather
  than assertive validation-alert semantics.
- [Risk] The warning might be mistaken for a blocking error because it is red.
  → [Mitigation] Keep the copy advisory, do not attach it to field validation,
  and leave all existing controls and downloads operable.

## Migration Plan

No migration is required. Deploying the UI change makes the warning appear on
the next render whenever an existing honeycomb snapshot is active; persisted
parameters and exports remain compatible. Rollback consists of reverting the
shared warning component and its parent render branches/tests.
