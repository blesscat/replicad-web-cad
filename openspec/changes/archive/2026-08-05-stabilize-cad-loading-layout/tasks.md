## 1. Stabilize the viewport layout boundary

- [x] 1.1 Update the CAD workspace grid alignment so a growing parameter panel does not stretch the adjacent viewport item.
- [x] 1.2 Give the viewport frame one explicit height boundary and make its Canvas plus no-mesh/WebGL fallback fill that boundary.
- [x] 1.3 Preserve the existing model, dimension annotation, stale-preview, status, retry and export overlays within the stabilized viewport without changing Worker or camera behavior.

## 2. Verify loading and responsive behavior

- [x] 2.1 Extend the delayed-WASM loading browser test to assert the viewport top position and height remain stable while the progress indicator appears and changes stage.
- [x] 2.2 Update responsive browser coverage to verify the existing 760px one-column/two-column boundary, fixed viewport height and absence of horizontal overflow during loading.
- [x] 2.3 Manually inspect box and modular-grid-base loading states at desktop and narrow viewport sizes to confirm the progress panel remains readable and the preview frame does not jump.

## 3. Quality gates

- [x] 3.1 Run formatting, type-check, unit tests and production build; resolve any layout or type regressions.
- [x] 3.2 Run Chromium and Firefox browser gates plus strict OpenSpec validation, then review the final diff and task status.
