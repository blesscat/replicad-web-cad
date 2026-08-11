## Context

The completed Hybrid implementation already separates the lower mixed surface,
upper Heavy perimeter, perimeter bridge, and Heavy-to-Full transition. Each
part is currently reduced through the generic row-major fuse path. This change
keeps that geometry decomposition and changes only how Hybrid pieces are
grouped and fused.

## Goals / Non-Goals

**Goals:**

- Keep Full, Lite, Heavy, and prototype-template on their existing assembly
  paths; preserve one-cell Hybrid geometry and contract behavior.
- Keep the existing `OpenGridBuildContext`, Worker messages, progress shape,
  cancellation checks, quality gate, and export lifecycle.
- Fuse nearby Hybrid pieces together as spatial regions so intermediate B-Rep
  shapes remain geographically compact.
- Preserve the configurable balanced fuse batch size and native-resource
  cleanup behavior.
- Make the optimized path observable through existing timing and boolean
  progress instrumentation for later benchmark comparison.

**Non-Goals:**

- Do not change OpenGrid profiles, layer heights, feature cutter geometry, or
  persisted/UI/Worker contracts.
- Do not replace the official cell geometry with a new continuous sketch or
  sweep in this iteration.
- Do not change the shared fuse implementation used by Full, Lite, Heavy, or
  prototype generation.

## Decisions

### 1. Keep the optimization Hybrid-specific

The Hybrid upper perimeter surface, bridge, and transition builders will pass
spatially annotated pieces to a new internal assembler. The dense lower mixed
surface remains on its measured row/cell-balanced path because spatializing
that already compact interior reduction regressed the representative build.
The existing `fuseByStrategy` and `fuseBalanced` remain the default for every
other OpenGrid path. This limits regression risk while letting the Hybrid
perimeter use a different assembly tree.

### 2. Represent pieces by their world-space center

Every regular cell, bridge primitive, transition wedge, and integrated
half-cell extension is represented with its existing world-space center. Pieces
at the same center are fused as a local cell/extension region first. The
resulting regions carry their min/max X/Y centers and are recursively split on
the axis with the largest span. Each split produces two spatially compact
subtrees, which are fused only after both children are complete.

World-space coordinates are used instead of row/column indices so half-cell
extensions participate in the same tree without inventing grid coordinates.

### 3. Share one fuse progress scope per spatial assembly

The top-level spatial assembler creates one boolean-operation scope for
`pieceCount - 1` fuses, reports each native fuse through the existing phase
callback, yields at the same safe boundaries, and checks generation currency
before each fuse. This keeps cancellation, timing, and boolean progress
observable without changing the Worker protocol.

### 4. Preserve the existing feature and final-fuse order

Hybrid lower and upper surfaces continue to receive their existing batched
chamfer cuts, the perimeter bridge continues to receive its Heavy bridge
features, and board-level screw/connector cuts remain after base assembly.
The four resulting Hybrid regions are still fused before the final board-level
cuts. Only the internal reduction order changes.

### 5. Validate behavior and compare timings

Existing Hybrid integration tests remain the correctness gate. A separate
rectangular/feature-enabled regression case exercises spatial splitting,
perimeter regions, and half-cell boundaries while isolating its native CAD
session from the existing heavy cases. The case also observes existing fuse
timing callbacks without asserting machine-dependent thresholds.

## Risks / Trade-offs

- **Spatial order can expose different native fuse tolerances** → retain the
  full Hybrid quality gate and feature-enabled integration coverage.
- **A failed subtree can leak intermediate native shapes** → track every live
  shape in one ownership set and dispose all remaining entries on failure.
- **Region grouping may not improve every board size** → keep the optimization
  isolated to Hybrid and measure 3×3, 5×5, 10×10, and 17×17 cases before
  considering shared fuse changes.
- **Multiple pieces can share a center** → fuse those pieces locally before
  spatial splitting so bridge primitives and corner wedges stay together.

## Migration Plan

No data or protocol migration is required. A normal code revert restores the
previous Hybrid assembly order; the existing Hybrid geometry and contract
tests provide the rollback guard.
