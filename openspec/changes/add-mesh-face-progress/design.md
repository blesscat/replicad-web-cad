## Context

See `proposal.md` for the motivation. The Worker already emits a generation-
correlated `meshing` stage, and the mesh adapter already counts faces before
choosing between global and per-face meshing. The existing progress contract
supports optional counters, but its units do not yet include faces.

The native global mesher has no reliable inner callback. The per-face path,
used for shapes above the existing face threshold, already has a natural
completion boundary after each face's meshing and triangulation work.

## Goals / Non-Goals

**Goals:**

- Reuse the existing face count and per-face completion boundaries.
- Deliver generation-correlated `meshing` counters with a `faces` unit.
- Throttle Worker-to-UI updates while keeping initial and final counts.
- Make the current mesh activity and available count visible in the existing
  progress indicator.
- Preserve global meshing as honest indeterminate/elapsed-only progress.

**Non-Goals:**

- Adding a native OpenCascade progress callback.
- Reporting a guessed percentage inside one native face-meshing call.
- Changing the face threshold, tessellation settings, geometry, or exports.
- Replacing the four top-level progress stages.

## Decisions

### Reuse the existing progress counter contract

Add `faces` to the existing progress-unit vocabulary rather than introducing a
second Worker event. This keeps generation filtering, validation, terminal
cleanup, and UI state handling on the established path. Global meshing emits
the existing stage-only event without counters.

Alternative: add a mesh-specific event type. That would duplicate correlation
and lifecycle handling for a detail that is structurally the same as existing
stage counters.

### Report only the per-face branch

The mesh adapter will invoke an optional face-progress callback only after the
per-face path has completed a face. The existing `countFaces()` result supplies
M, so no additional geometry scan is needed. The global path will not report
face counts because its native meshing work is completed before the subsequent
face collection loop and that loop would not represent actual meshing progress.

Alternative: report face collection progress after global meshing. That would
look precise while measuring only post-processing, which is misleading.

### Throttle at the Worker event boundary

The mesh adapter may notify the Worker for each completed face, but the Worker
will coalesce those callbacks before calling `postMessage`. The reporter will
send the first `0 / M`, send an intermediate update when the elapsed interval
or roughly one-percent count threshold is reached, and always send `M / M`.
The throttle uses an injectable clock in tests and keeps the count monotonic.

This keeps the kernel callback cheap and prevents high-frequency UI renders.
The exact interval is an implementation constant in the Worker-facing helper,
not part of the public protocol.

### Render counters as stage progress, not end-to-end progress

The existing progress indicator will display the face count while retaining
`meshing` as stage 3 of 4. The existing four-stage list is the visible
human-readable stage label, so no duplicate current-action message is added
above it. Accessibility text will still describe the current stage and count;
it will not reinterpret face completion as total model completion. A local
elapsed clock remains available for mesh work that has no face counters.

### Keep lifecycle handling at the existing runtime boundary

The existing operation and generation checks remain the source of truth. No
new persistent state is introduced. Model-ready, error, supersession,
invalidation, timeout, and recovery continue to clear the enclosing progress,
which also removes the face detail.

## Risks / Trade-offs

- [Risk] A large model can produce many face callbacks. → Mitigation: emit
  throttled Worker events, cap intermediate updates through the time/count
  thresholds, and always preserve first/final visibility.
- [Risk] Face meshing can still block the Worker inside one native call. →
  Mitigation: show the last completed count and elapsed/indeterminate state;
  native interruption remains out of scope.
- [Risk] A future global meshing implementation could make face counts
  available. → Mitigation: keep the callback optional and only attach it to a
  path whose completion semantics are known.

## Migration Plan

1. Extend the additive progress unit and UI formatting with `faces`.
2. Add the optional per-face callback and throttled Worker reporter.
3. Wire the reporter through the existing generation-correlated progress path.
4. Add unit, runtime, Worker, and browser coverage plus a representative
   performance check.

Rollback is additive: stop attaching the face reporter and the existing
`meshing` stage-only behavior remains valid. No persisted data, model IDs, or
routes require migration.
