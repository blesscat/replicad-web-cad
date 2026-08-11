## Why

The CAD UI currently exposes only four coarse stages. Expensive native boolean operations happen inside B-Rep construction after the existing cell or batch counters may already be complete, so stage 2 can look frozen until meshing starts. A production-like Lite 2x2 run shows the same shape of problem: B-Rep construction takes roughly 4.2 seconds while meshing takes roughly 60 milliseconds.

The codebase already has scattered yield and phase-timing hooks, but there is no shared, user-visible contract for long-running fuse, cut, and intersect work. The result is poor feedback across builders and timing data that can represent only the last boolean operation instead of the cumulative cost.

## What Changes

- Add a shared Worker-to-UI capability for reporting boolean-operation progress across CAD generation paths, including OpenGrid and the other B-Rep builders that use the common worker pipeline.
- Instrument each participating builder at safe fuse, cut, and intersect boundaries so the common reporter can show operation kind, completed/total work when known, and elapsed time.
- Preserve the existing four top-level stages (`loading`, `building`, `meshing`, and `exporting`) while adding a human-readable building subphase such as B-Rep assembly, fuse N of M, cut N of M, or intersect N of M.
- Use an indeterminate or elapsed-only state when a total is not knowable. Do not fabricate an overall percentage or claim progress inside a native boolean call that exposes no callback.
- Preserve generation/latest-wins filtering, cancellation, terminal cleanup, and existing model geometry, IDs, routes, and cache behavior.
- Make diagnostics and benchmarks aggregate cumulative boolean duration rather than overwriting it with the duration of the last operation.

## Capabilities

### New Capabilities

- `cad-boolean-operation-progress`: Shared protocol, worker instrumentation, runtime state, and UI presentation for live fuse/cut/intersect subprogress during B-Rep generation.

### Modified Capabilities

- None.

## Impact

- Worker and contract layers: progress event types, validation, event handling, and generation-scoped runtime state.
- CAD progress state and indicator: subphase, operation kind, counts, and elapsed-time presentation while retaining the four-stage layout.
- CAD kernel/model builders: shared reporting helpers plus explicit hooks around long-running boolean loops and cutter application.
- Preview/geometry benchmark timing and related tests: cumulative boolean timing and coverage for stale updates, cancellation, unknown totals, and terminal cleanup.
- No new runtime dependency is expected, and no public model or routing API should change.
