## Why

The Hybrid geometry is structurally correct, but its perimeter surface, bridge,
and transition are assembled from many small B-Rep pieces and fused through a
row-major reduction. Larger boards therefore spend a disproportionate amount
of time in native boolean operations. This change explores a Hybrid-only
assembly optimization while preserving the existing OpenGrid geometry and
public contracts.

## What Changes

- Add a spatially aware fuse tree for Hybrid assembly that keeps nearby cells
  together while reducing region sizes hierarchically.
- Assemble Hybrid perimeter surfaces, bridges, and transitions by spatial
  regions before the final board fuse.
- Preserve Full, Lite, Heavy, and one-cell Hybrid behavior, Worker protocol,
  progress reporting, cancellation, quality gates, and export lifecycle.
- Add behavior-focused regression coverage and a repeatable comparison of the
  existing and optimized Hybrid assembly paths.

## Capabilities

### New Capabilities

None. This is an implementation-only optimization; observable geometry and
contracts remain unchanged.

### Modified Capabilities

None. Existing OpenGrid requirements remain authoritative.

## Impact

- Primary code: `src/cad-kernel/components/opengrid/builder.ts`.
- Validation: Hybrid integration tests, OpenGrid regression tests, and the
  existing geometry benchmark harness.
- No new dependencies, model ids, routes, Worker messages, or persisted fields.
