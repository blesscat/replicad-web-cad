## Why

The OpenGrid dimension calculator currently converts a target size into one board's
row and column counts. It does not account for a printer's usable X/Y area, so it
cannot tell users how many printable boards are needed for a larger target or how to
handle the final remainder without producing an impractical number of tiny boards.

## What Changes

- Replace the OpenGrid calculator's target-only workflow with a print-plan workflow
  that accepts target X/Y dimensions and printer X/Y dimensions in millimetres.
- Convert target dimensions to the largest full-cell target footprint that does not
  exceed the target, using the existing 28 mm OpenGrid pitch.
- Convert printer dimensions to the maximum legal full-cell footprint per printed
  piece, respecting both printer capacity and the existing OpenGrid per-board limit.
- Recommend a practical repeated piece size when an exact uniform tiling is available;
  otherwise recommend a large repeated main piece plus repeated edge/corner remainder
  pieces instead of selecting a tiny uniform divisor solely for consistency.
- Show total target cells, per-piece limits, recommended piece dimensions, piece counts,
  and the total number of pieces.
- Keep the existing OpenGrid model identity, manual row/column controls, half-cell
  controls, validation flow, and preview lifecycle compatible.
- Leave the HSW, modular-grid-base, and other consumers of the shared dimension
  calculator unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `dimension-based-grid-count`: Change the OpenGrid calculator contract from calculating
  one board from target dimensions to producing a printer-aware multi-piece plan while
  preserving the existing manual controls and OpenGrid model identity.

## Impact

- OpenGrid dimension-calculation domain logic and its unit tests.
- The OpenGrid component parameter panel and its end-to-end tests.
- Existing dimension-calculator copy, accessible labels, validation messages, and result
  rendering for the OpenGrid-specific workflow.
- No CAD geometry contract, model ID, route, export format, or Worker generation API
  changes are expected.
