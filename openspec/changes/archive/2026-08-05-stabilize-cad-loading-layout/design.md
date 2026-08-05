## Context

`CadWorkspace` uses a two-column CSS Grid with a parameter panel on the left and `CadViewport` on the right. The panel conditionally renders `CadProgressIndicator` while the CAD engine or a model operation is in progress. The grid's default cross-axis alignment stretches the viewport item to the height of the taller panel. At the same time, the viewport container has a `min-height` and its CSS module forces the Canvas to `520px`, so the outer viewport and its rendering surface can acquire different heights during loading.

The existing `520px` viewport size, Canvas rendering behavior, progress messages, stale-preview indicator, responsive breakpoint and Worker lifecycle are already working contracts. The change should stabilize the layout boundary without changing any CAD computation or interaction semantics.

## Goals / Non-Goals

**Goals:**

- Keep the viewport's top edge and height stable when progress content appears or changes.
- Prevent the adjacent parameter panel from stretching the viewport grid item.
- Use one viewport height contract for the outer frame, Canvas and no-mesh/WebGL fallback.
- Preserve the current two-column/one-column breakpoint and all existing progress, stale, status and export behavior.
- Add behavior-focused browser coverage for loading-time viewport stability.

**Non-Goals:**

- Do not change camera framing, OrbitControls, mesh generation, Worker messages or progress state semantics.
- Do not redesign the progress indicator or reserve a new permanent empty panel area unless testing proves that a separate left-panel shift must also be addressed.
- Do not change the viewport's model color, grid, dimension annotations or export flow.

## Decisions

### 1. Opt the viewport out of grid stretching

Set the workspace grid and/or viewport item to start alignment so the right-hand viewport keeps its intrinsic height even when the left panel grows. This addresses the actual cause: the progress card changes the neighboring grid item's content height. A CSS `transform`, camera adjustment or delayed rendering would hide the symptom without fixing the layout relationship.

### 2. Make the viewport frame the single sizing boundary

Give the viewport frame an explicit stable height of `520px`, retain `overflow-hidden`, and make the Canvas plus fallback fill that frame. Remove the duplicate independent `520px` assumptions where practical so the frame, Canvas and fallback cannot disagree. The existing value is retained to avoid changing the established desktop and mobile preview proportions.

### 3. Keep progress in normal panel flow

The progress indicator remains conditional and inside the parameter panel. Its height may change the panel's own document height, but it must not change the viewport frame height or top position. This keeps the fix narrow and avoids introducing an overlay that could cover parameter controls or status messages.

### 4. Verify the layout through observable browser behavior

Extend the delayed-WASM loading test to inspect the viewport bounding box while `CadProgressIndicator` is visible and after the model becomes ready. Keep the existing responsive column test and assert that the viewport remains the same fixed height in both layout states. The tests should observe rendered geometry and accessible loading state rather than implementation strings.

## Risks / Trade-offs

- [A fixed 520px frame can require more vertical scrolling on short mobile screens] → Preserve the current 520px behavior for this focused fix; treat a mobile-specific viewport height as a separate design decision.
- [Panel height can still change when progress appears] → Align the viewport independently so only the panel grows; add a reserved or redesigned progress slot only if follow-up visual review shows the panel shift itself is a problem.
- [Changing Canvas sizing can affect WebGL rendering dimensions] → Keep the existing Canvas width behavior, use the frame as the height source, and verify the existing mesh/dimension/export browser tests.

## Migration Plan

No data or deployment migration is required. Update the layout and tests, run the existing quality gates, and roll back by reverting the CSS/layout changes if the viewport or responsive tests regress.

## Open Questions

None for the focused fix. A permanent progress-slot redesign can be proposed separately if the remaining left-panel movement is considered undesirable after the viewport stretch is removed.
