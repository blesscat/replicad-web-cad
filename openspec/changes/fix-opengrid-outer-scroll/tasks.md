## 1. Regression coverage

- [x] 1.1 Add a behavior-focused end-to-end test for `/cad/opengrid` at 1600 × 1394 that proves the document has no outer vertical overflow while the parameter panel still scrolls independently.
- [x] 1.2 Keep the existing 1280 × 720 panel-scroll and viewport-stability assertions passing, and add a responsive assertion that the single-column layout remains normally scrollable where appropriate.

## 2. Height-budget implementation

- [x] 2.1 Apply one shared desktop `calc(100dvh - 16rem)` budget to the parameter panel maximum and viewport height cap, preserving the `max-cad` overrides and panel-owned `overflow-y: auto`.
- [x] 2.2 Verify the viewport remains top-aligned and bounded while OpenGrid controls overflow, with no changes to Worker, geometry, persistence, export, or route behavior.

## 3. Verification

- [x] 3.1 Run the targeted Chromium workspace-layout tests, then run typecheck, formatting check, build, and the relevant browser regression suite.
