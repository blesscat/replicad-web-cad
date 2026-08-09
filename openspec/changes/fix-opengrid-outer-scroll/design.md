## Context

The CAD route renders a page shell with a navigation bar, padded `main`, a route header, and a two-column Svelte workspace. The parameter panel currently uses `max-height: calc(100vh - 15rem)` and `overflow-y: auto`; the viewport uses the same viewport subtraction with a 520 px cap. On wide screens the OpenGrid panel is taller than the viewport, so the grid row reaches the panel limit. The page shell's own padding and header are then added after that limit, producing a small document-level overflow.

The existing responsive breakpoint is 760 px. Above it, the intended interaction is an independently scrolling parameter panel beside a stable viewport. At or below it, the controls and viewport are stacked and normal page scrolling is required to reach all content.

## Goals / Non-Goals

**Goals:**

- Reserve enough desktop viewport budget for the complete page shell so the two-column CAD route does not create document-level vertical overflow.
- Keep long OpenGrid controls scrollable inside `data-testid="cad-workspace-panel"`.
- Keep the viewport aligned to the workspace top and bounded independently from the panel content.
- Preserve normal document scrolling for the single-column responsive layout.
- Add behavior-focused browser coverage for the reported 1600 × 1394 case.

**Non-Goals:**

- Do not change OpenGrid geometry, parameter semantics, Worker behavior, persistence, or export behavior.
- Do not hide document overflow globally or clip content that belongs to the mobile/single-column layout.
- Do not redesign the page shell or introduce a new layout dependency for this small height-budget correction.

## Decisions

### 1. Use one shared desktop height budget for panel and viewport

Use `calc(100dvh - 16rem)` for the desktop panel maximum and the viewport's capped height expression. The additional reserved rem accounts for the navigation, main padding, route header, workspace spacing, and the page's bottom padding that are outside the workspace itself. `dvh` tracks the visible viewport more accurately than `vh` when browser UI changes the viewport.

The panel retains `overflow-y: auto`, while the viewport retains its explicit height and `overflow: hidden`. This keeps the grid row from being taller than the page budget while ensuring the viewport does not stretch to the OpenGrid panel's intrinsic content height.

**Alternative considered:** setting `body` or `main` to `overflow: hidden` would remove the symptom but could clip legitimate content and would also affect the single-column layout. It is rejected.

**Alternative considered:** replacing the shell with a full flex/grid height refactor would avoid the fixed budget, but it would broaden the change into unrelated routes and make the existing responsive behavior harder to preserve. It is rejected for this focused fix.

### 2. Keep the breakpoint override unchanged

The existing `max-cad` overrides continue to remove the panel height cap and set the viewport to 520 px. At or below 760 px, the page may scroll naturally because the controls and viewport are intentionally stacked.

### 3. Verify observable layout behavior

The regression test will assert document dimensions, panel overflow, and viewport stability at `1600 × 1394`, rather than inspecting CSS source strings. The existing 1280 × 720 independent-panel test remains the lower-height desktop regression case.

## Risks / Trade-offs

- **The 16 rem reserve is coupled to the current page shell geometry** → Keep the desktop regression at the reported large viewport and retain the existing layout test so future shell changes expose the coupling.
- **`dvh` may differ slightly from `vh` in older browsers** → The supported desktop Chrome/Firefox targets support dynamic viewport units; the expression is used only for the desktop CAD height budget and the mobile override remains explicit.
- **A shorter viewport can reduce visible CAD area on short desktop screens** → The panel remains independently scrollable and the viewport is capped at 520 px, preserving the current intent while preventing outer overflow.

## Migration Plan

1. Add the failing wide-viewport layout regression.
2. Apply the shared desktop `dvh` budget to the panel and viewport classes.
3. Run targeted Chromium layout tests, then typecheck, formatting, build, and the relevant browser suite.
4. Rollback is limited to reverting the two height expressions and the regression test if the supported browser matrix exposes an incompatibility.

## Open Questions

None. The reported viewport, existing breakpoint, and desired ownership of scrolling are sufficiently defined.
