## 1. Progress contract and formatting

- [x] 1.1 Add a `faces` progress unit to the shared CAD progress contract and
  validator.
- [x] 1.2 Add face-count formatting and mesh-stage messaging to the progress
  feature, with unit coverage.

## 2. Mesh instrumentation and throttling

- [x] 2.1 Add an optional per-face progress callback that reports only the
  existing per-face meshing path, starting at zero and completing at M/M.
- [x] 2.2 Add a clock-testable throttled Worker reporter with initial,
  intermediate, final, monotonic, and failure-safe behavior.
- [x] 2.3 Add unit and Worker/runtime tests proving global meshing stays
  stage-only and rapid face completions do not flood progress events.

## 3. User-facing progress indicator

- [x] 3.1 Wire face progress through the existing generation-correlated Worker
  progress lifecycle without changing stale or terminal semantics.
- [x] 3.2 Keep the four-stage mesh label, show face N/M when available, and
  show elapsed/indeterminate feedback otherwise without adding a duplicate
  current-action message.
- [x] 3.3 Add an end-to-end regression test for visible face progress and
  cleanup after completion or supersession.

## 4. Verification and completion

- [x] 4.1 Run targeted unit, Worker, and browser tests plus typecheck and
  formatting checks.
- [x] 4.2 Run a representative large-mesh performance comparison and document
  that throttled reporting does not introduce a material regression.

  - The existing `Lite-2x2` OpenGrid benchmark passed its quality/export
    gates with a 52–53 ms mesh phase; the throttled reporter test reduced 1,000
    face callbacks to fewer than 1,001 UI events while preserving first/final
    counts. The heavier `Full-5x3-half-cell-x-left` and `Lite-5x5-large`
    benchmark runs exceeded the local runtime budget without producing a
    report, so they remain a residual environment risk.
- [x] 4.3 Validate the OpenSpec change and mark all tasks complete.
