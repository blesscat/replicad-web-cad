## Why

The current Hybrid transition is built outward inside the Heavy perimeter cell
and spans only one quarter of a grid pitch. The reference Hybrid profile shows
the sloped surface extending inward from the Full area for approximately half
of a cell, ending at the Heavy perimeter boundary. The current placement also
leaves corner transitions as two outward-facing steps instead of a diagonal
transition toward the inner corner.

## What Changes

- Move each Hybrid perimeter transition into the adjacent Full-side cell.
- Extend the transition over half of the OpenGrid pitch, from the Full profile
  toward the Heavy boundary.
- Preserve the existing Heavy perimeter, Full interior, bridge, feature
  subtraction, and spatial assembly behavior.
- Make corner side transitions overlap in the inner corner so the resulting
  surface forms a diagonal ridge toward the interior.
- Add behavior-focused coverage for inward placement, half-cell span, corner
  diagonals, and preserved through-openings.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `opengrid-generator`: update the Hybrid transition geometry and corner
  behavior.

## Impact

- Primary code: `src/cad-kernel/components/opengrid/builder.ts` and the
  OpenGrid configuration/quality probes.
- Validation: Hybrid integration tests, OpenGrid regression tests, and export
  smoke checks.
- Existing Full, Lite, Heavy, and Hybrid model ids and Worker contracts remain
  unchanged.
