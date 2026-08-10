## 1. Preview touch interaction

- [x] 1.1 Scope `touch-action: none` to the application-owned `.viewport-surface` in `src/features/cad/viewport/CadViewport.svelte`, preserving normal scrolling outside the preview.
- [x] 1.2 Keep the existing `OrbitControls` configuration and verify that one-finger orbit plus the existing two-finger zoom/pan mapping remain available after the touch policy change.

## 2. Mobile regression coverage

- [x] 2.1 Add a Chromium mobile-viewport E2E helper that scrolls the CAD preview into view and dispatches a real touch start, multiple touch moves, and touch end.
- [x] 2.2 Add a behavior-focused E2E test for `/cad/box` that proves a continuous one-finger drag does not emit an early `pointercancel`, continues through the final move, and changes the committed model's view.
- [x] 2.3 Add mobile interaction coverage proving a gesture started outside the preview can still scroll the document, and retain the existing desktop mouse-orbit coverage as the compatibility gate.

## 3. Verification

- [x] 3.1 Run formatting, type-checking, unit tests, and the focused Chromium CAD viewport E2E tests; resolve any regression without changing the existing model-generation or export contracts.
- [x] 3.2 Run the production build and verify continuous one-finger orbit, two-finger viewport interaction, and page scrolling outside the preview with iPhone 13 Chromium touch emulation; physical-device validation remains an external follow-up when hardware is available.

Verification note: the default `pnpm test` run completed with four unrelated 5-second timeout failures in `tests/worker/opengrid-snap-builder.integration.test.ts`; the four cases passed with a 30-second timeout, and all viewport-scoped unit/E2E gates passed. Physical-device access was unavailable, so mobile behavior was verified with iPhone 13 Chromium touch emulation.
