## 1. Progress contract and state

- [x] 1.1 Extend the versioned CAD progress contract and validator with optional boolean detail for `fuse`, `cut`, and `intersect`, including running/completed state, optional completed/total counts, and elapsed milliseconds while preserving existing four-stage payloads.
- [x] 1.2 Thread the optional boolean detail through CAD progress state and the workspace runtime with generation/model-revision correlation, stale-event rejection, and terminal cleanup for success, error, cancellation, timeout, recovery, and invalidation.
- [x] 1.3 Update the progress indicator to retain `loading`, `building`, `meshing`, and `exporting` as top-level stages and render boolean kind, honest counts, and a locally advancing elapsed timer during an active native call.
- [x] 1.4 Add contract and runtime/UI behavior tests covering valid and invalid details, unknown totals, stale generations, cancellation, terminal cleanup, and backward-compatible top-level progress.

## 2. Shared Worker and kernel reporting

- [x] 2.1 Implement a shared boolean-operation reporting scope that emits start/completion boundaries, enforces count semantics, measures elapsed duration, and does not fabricate inner-native percentages.
- [x] 2.2 Thread the shared reporter and cumulative timing sink through the Worker build context, kernel model context, and component build contexts without changing geometry inputs, cache behavior, or public model identifiers.
- [x] 2.3 Preserve safe event-loop yielding and cancellation checks at existing boundaries, and ensure failed or cancelled native calls cannot be reported as completed operations.

## 3. Instrument production B-Rep builders

- [x] 3.1 Instrument OpenGrid surface assembly and balanced/sequential fuse reductions with known operation scopes where the number of calls is available.
- [x] 3.2 Instrument OpenGrid generation-time cutter construction and application, including fuse/cut/intersect operations used for board features, connectors, screws, clipping, and snap removal; use indeterminate totals where a prepass would be artificial or geometry-affecting.
- [x] 3.3 Inventory and instrument the remaining production OpenGrid builders that participate in CAD generation, including divider, snap, pillar, stackable cylinder, and stackable box paths, while explicitly classifying quality/probe-only intersections so they do not appear as false build progress.
- [x] 3.4 Instrument non-OpenGrid B-Rep builders such as modular-grid-base, hsw-cell, and box-normal through the same reporter, retaining their existing native operation options and progress behavior.
- [x] 3.5 Add representative worker/build coverage proving that fuse, cut, and intersect updates are emitted for each supported operation family and that geometry regression checks remain unchanged.

## 4. Cumulative timing and verification

- [x] 4.1 Change preview and geometry benchmark aggregation to sum all boolean durations, preserve cumulative fuse timing compatibility, and expose cut/intersect attribution and total timing where the diagnostic schema supports it.
- [x] 4.2 Add regression coverage for multi-fuse and mixed-boolean builds so timing output cannot regress to last-operation-only semantics.
- [x] 4.3 Run the focused contract, workspace runtime, worker integration, and geometry benchmark suites, then run OpenSpec validation and record any environment-specific benchmark variance.
