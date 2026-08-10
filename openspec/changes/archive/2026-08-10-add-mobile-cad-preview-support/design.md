## Context

The existing CAD workspace already switches to a single-column layout at the `760px` breakpoint and keeps the mobile document scrollable. The preview is rendered by Threlte's `<Canvas>` and uses Three.js `OrbitControls` for camera interaction. Threlte places the canvas inside a wrapper element, and the controls listen on that wrapper rather than on the application-owned viewport frame.

In the current mobile emulation, the rendered preview surface and its Threlte wrapper resolve to `touch-action: auto`. A one-finger drag therefore allows the browser's native touch gesture negotiation to cancel the pointer stream after a short movement. The controls receive the initial movement but no longer receive later movement events until the finger is lifted.

## Goals / Non-Goals

**Goals:**

- Give the preview surface exclusive touch-gesture ownership while a touch begins inside it.
- Preserve the existing OrbitControls mapping for one-finger orbit and two-finger gestures.
- Keep normal document scrolling available outside the preview.
- Add behavior-focused mobile regression coverage for a continuous drag and desktop compatibility.

**Non-Goals:**

- Replacing OrbitControls or introducing custom touch event forwarding.
- Changing the `760px` breakpoint, viewport sizing, camera framing, or model-generation lifecycle.
- Disabling page scrolling globally or changing the interaction behavior of parameter controls.
- Adding a new runtime dependency or changing any CAD Worker contract.

## Decisions

### Scope touch gesture ownership to the application-owned preview surface

Apply the declarative `touch-action: none` behavior to the existing `.viewport-surface` boundary in `CadViewport.svelte`. This boundary contains the Threlte wrapper and canvas, so the browser can resolve the gesture policy before pointer events are promoted or cancelled. Keeping the rule on the preview surface also prevents it from affecting the parameter panel or the rest of the document.

The alternatives are less suitable:

- Calling `preventDefault()` from pointer handlers is too late to reliably control browser gesture negotiation and would duplicate control-library behavior.
- Adding custom touch listeners would require forwarding pointer state to OrbitControls and could diverge from its existing one- and two-pointer state machine.
- Styling only a generated Threlte wrapper or only the canvas couples the fix to an implementation detail of the rendering library; the application-owned surface is the stable integration boundary.

### Keep OrbitControls as the gesture implementation

Do not change the `<OrbitControls>` configuration. Once the preview surface owns the touch gesture, the existing controls continue to receive the complete pointer stream and retain their current one-finger rotate and two-finger zoom/pan semantics. This minimizes the change and keeps desktop mouse behavior identical.

### Test the observable pointer stream on a mobile viewport

Add a Chromium mobile-viewport E2E scenario that scrolls the preview into view, dispatches a real touch start followed by multiple touch moves before touch end, and observes the resulting pointer lifecycle. The test must fail when the browser emits an early `pointercancel` and must verify that the model continues to update through the end of the drag. Keep a separate assertion that scrolling outside the preview remains possible so the gesture policy does not leak to the document.

## Risks / Trade-offs

- **Preview gestures can no longer scroll the page when they start inside the preview** → This is intentional for a 3D manipulation surface; keep the rule scoped to `.viewport-surface` and verify document scrolling from the surrounding mobile layout.
- **Mobile browser gesture behavior differs between engines and real devices** → Use Chromium mobile emulation for deterministic regression coverage and keep physical iOS/Android verification as an external follow-up when hardware is available.
- **A future Threlte DOM structure change could alter the effective touch-action intersection** → Keep the rule on the application-owned surface and retain the end-to-end pointer-stream test.

## Migration Plan

No data or API migration is required. Apply the scoped preview style, add the regression test, and run the existing type-check, unit, formatting, build, and focused E2E gates. Rollback consists of removing the scoped style and its test if the change needs to be reverted.
