## 1. Dimension Geometry

- [x] 1.1 Define a pure dimension-annotation geometry model for X/width, Y/depth and Z/height using mesh bounds, proportional outward offsets, extension segments, dimension segments, endpoint ticks and label metadata.
- [x] 1.2 Add behavior-focused unit tests covering the default 20 × 30 × 40 mm box, non-uniform dimensions, axis mapping, annotation lengths and anchors remaining outside the model bounds.

## 2. Viewport Rendering

- [x] 2.1 Extend the viewport input boundary to receive committed box parameters separately from the mesh and render no annotations when either committed preview input is unavailable.
- [x] 2.2 Implement the three attached annotations with Drei `Line` and DOM-backed labels, including readable `mm` values, axis/name accessibility labels and pointer-events behavior that preserves OrbitControls.
- [x] 2.3 Place model and annotations inside the existing Bounds framing, configure annotation visibility/render order, and preserve mesh/material disposal, WebGL fallback and responsive viewport styling.

## 3. Workspace Integration

- [x] 3.1 Pass `state.committed.parameters` together with the committed mesh to the viewport without exposing `state.input` or changing the Worker contract.
- [x] 3.2 Verify stale, invalid-input, worker-restart and no-model paths keep annotations tied to the previous committed revision and do not display uncommitted dimensions.

## 4. Acceptance Tests and Quality Gates

- [x] 4.1 Extend CAD route E2E coverage to assert width/depth/height labels and `mm` values are visible after the default model commits.
- [x] 4.2 Extend parameter/stale E2E coverage to verify committed annotation values update after a valid generation and remain on the previous revision during invalid or pending input.
- [x] 4.3 Exercise responsive viewport boundaries and camera interaction in the browser gate, confirming annotations remain present and the viewport has no runtime or layout errors.
- [x] 4.4 Run `pnpm run check`, `pnpm run test`, `pnpm run build`, `pnpm run test:e2e`, `pnpm test:e2e:firefox`, `git diff --check`, and `openspec validate --changes --strict`.
