## Context

See `proposal.md` for the motivation. The current CAD Worker already transports generation-scoped progress and the UI already renders four top-level stages. B-Rep builders have explicit yield and phase-timing hooks, but boolean calls are spread across shared model code and component-specific builders. The current native OpenCascade binding does not provide a dependable callback for progress inside a single `BRepAlgoAPI` boolean call.

The implementation therefore needs two kinds of visibility: an operation-boundary event before and after each boolean call, and a UI-side elapsed clock that remains useful while the native call is running. Builder code must opt into the shared reporter; a global interception layer cannot reliably infer the intended scope or total for every builder.

## Goals / Non-Goals

**Goals:**

- Define one additive, generation-correlated boolean subprogress shape shared by all CAD Worker build paths.
- Keep `loading`, `building`, `meshing`, and `exporting` as the only top-level stages.
- Make long native fuse, cut, and intersect calls visibly active through elapsed time even when their inner progress is unavailable.
- Report honest operation counts only where the builder has a known scope, and aggregate boolean timing across the full build.
- Preserve latest-wins, cancellation, terminal cleanup, geometry, cache behavior, and existing public model identifiers.

**Non-Goals:**

- Adding a guessed percentage for work inside a native boolean call.
- Replacing OpenCascade or adding a new native progress-indicator binding in this change.
- Changing the shape, ordering, or tolerance of generated geometry.
- Reworking the four-stage progress layout into a new end-to-end progress model.

## Decisions

### Use an additive operation detail on the existing progress event

Extend the existing progress payload with optional boolean detail rather than creating a second event stream. The detail carries an operation kind (`fuse`, `cut`, or `intersect`), lifecycle state (`running` or `completed`), optional `completed`/`total`, and elapsed milliseconds. Existing consumers that only understand the four-stage fields continue to work, while the runtime and indicator can opt into the detail.

The Worker sends a running update immediately before the native call and a completed update immediately after it. The UI records a monotonic local start time when the current generation enters `building` and refreshes one cumulative building elapsed value on a lightweight timer; this avoids sending timer ticks from the Worker, keeps the timer stable across boolean calls, and still gives feedback during a blocked native call. Per-call durations remain available in the progress payload and diagnostics but are not rendered as separate user-facing timers.

Alternative considered: add a separate boolean-progress message type. This would duplicate generation filtering, validation, and terminal cleanup, and would make it easier for the two streams to disagree. The additive detail keeps correlation and lifecycle behavior in one place.

### Use explicit shared scopes instead of automatic boolean interception

Add a small shared reporting helper that builders use around boolean calls. A scope may declare a known number of operations, or leave its total unknown. Balanced and sequential assembly loops can declare their planned reduction count; cutter application and builders whose work is data-dependent can report an indeterminate total without performing a geometry-only prepass.

Each builder remains responsible for placing the hook around its own semantically relevant fuse, cut, and intersect calls. The common helper owns event shape, count validation, elapsed measurement, and cancellation/yield integration. This keeps component-specific operation grouping correct and avoids monkey-patching or wrapping every kernel method globally.

Known totals should be derived from control data already required by the build, such as `shapes.length - 1`, enabled feature counts, or a fixed single call. Separate scopes should be used for different boolean kinds when their counts are independent. A total must remain unknown when determining it would require executing or preflighting geometry, such as a later cut that only runs for solids surviving an earlier intersection.

Alternative considered: instrument every kernel `.fuse()`/`.cut()` method centrally. That would obscure nested operations, make totals impossible to interpret, and risk changing geometry or performance-sensitive behavior.

### Keep operation-boundary progress honest

The reporter does not infer progress from elapsed time and does not subdivide a native call into artificial percentages. A running operation with an unknown or single-call total is displayed as indeterminate/elapsed-only. Counts advance after successful return, so a failed or cancelled native call cannot be reported as completed.

This is intentionally less granular than a native progress callback, but it matches the current binding capabilities and provides the key user-visible signal: the build is actively inside a named boolean operation.

### Aggregate timing at the collection point

Boolean durations are accumulated rather than assigned into a single phase slot on each callback. Diagnostics should preserve a cumulative fuse duration for compatibility with the existing assembly timing field and add cut/intersect attribution plus a total where the timing schema permits it. The benchmark adapter will consume the accumulated values after the build, not the last callback value.

Alternative considered: change only the benchmark display. That would leave runtime diagnostics and any future consumers with the same last-operation bug, so aggregation belongs in the shared timing/reporting path.

### Preserve lifecycle handling at the existing runtime boundary

The event validator, Worker emitter, workspace event reducer, and active-progress store will all treat boolean detail as optional data on the current generation-scoped event. On model-ready, error, cancellation, timeout, recovery, or invalidation, the active operation timer and detail are cleared with the parent progress state. A stale event is rejected before it can start a UI timer.

## Risks / Trade-offs

- [Risk] A builder-specific boolean call is missed during the initial inventory, so part of a build still appears coarse. → Mitigation: keep the helper shared, enumerate all production B-Rep builders in implementation tasks, and add behavior tests for each operation family and representative path.
- [Risk] A single native boolean call can still occupy the Worker for a long time. → Mitigation: show the running operation and local elapsed clock; retain existing cancellation/yield behavior at safe boundaries. Native interruption is out of scope.
- [Risk] Frequent operation-boundary events add overhead for highly fragmented geometry. → Mitigation: emit only start/completion boundary updates, keep timer ticks in the UI, and reuse existing Worker yield points.
- [Risk] Some totals require a prepass or are data-dependent. → Mitigation: make totals optional and render indeterminate progress instead of adding geometry-affecting precomputation.
- [Risk] Additive contract changes can be inconsistently validated across worker and UI versions. → Mitigation: keep fields optional, update the shared validator and runtime together, and test malformed and stale events.

## Migration Plan

1. Add the optional progress detail and validator support, then update the Worker/runtime/UI together so old top-level progress remains a valid fallback.
2. Add the shared boolean reporting helper and instrument the common build paths and component-specific boolean loops without changing their geometry operations.
3. Switch benchmark/timing aggregation to cumulative semantics and add regression coverage for multi-operation builds.
4. Rollback is additive: remove or disable the boolean detail emission and UI rendering while retaining the existing four-stage progress path. No persisted data, model IDs, or route migration is required.
