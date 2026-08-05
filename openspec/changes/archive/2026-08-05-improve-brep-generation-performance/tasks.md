## 1. Baseline benchmark and geometry fixtures

- [x] 1.1 Define a Worker-side benchmark fixture matrix for 1×1, 2×2, 5×5, 10×10, 20×20, and 25×25 modular-grid-base models using the production template and preview configuration.
- [x] 1.2 Add timing helpers that record template load, clone/translate, fuse/assembly, fillet, mesh, and generation total durations, with one warm-up STEP quality check, repeated samples, median/P95, browser/build mode, dependency version, reference environment, and structured failed samples.
- [x] 1.3 Run the existing sequential builder through the benchmark; preserve successful geometry results as baseline fixtures and retain any large-fixture native failure as an explicit baseline-unavailable record.

## 2. Progress contract and build context

- [x] 2.1 Extend the versioned `operation.progress` contract and runtime validator with optional `completed`, `total`, and `unit` fields, preserving stage-only progress for phases without natural counters.
- [x] 2.2 Extend the Worker-side kernel build context with generation-current checks and a progress callback that does not import UI or DOM types into `cad-kernel`.
- [x] 2.3 Update `CadWorkerRuntime` to correlate build progress to operationId/generation, emit cell or batch progress at safe boundaries, and preserve existing terminal responses.
- [x] 2.4 Add contract and Worker tests for valid counters, invalid counters, stale progress filtering, progress correlation, and terminal completion/error behavior.

## 3. Cooperative cancellation and native lifetime

- [x] 3.1 Add generation checks before cell creation, after clone/translate, and before/after fuse or fillet boundaries; stale work must stop only after the current atomic OpenCascade call returns.
- [x] 3.2 Centralize cleanup for cloned cells, partial groups, combined shapes, and fillet results so cancellation, boolean failure, mesh failure, and success release each unowned native shape exactly once.
- [x] 3.3 Add Worker lifecycle tests proving a superseded grid generation cannot create or commit a candidate, releases intermediates, and leaves the same Worker epoch usable for the latest generation.
- [x] 3.4 Route `model.invalidate` around the serial Worker command queue and test that an in-flight generation observes invalidation before it can publish a candidate.
- [x] 3.5 Yield to the Worker event loop at safe native boundaries and add builder coverage proving invalidation is observed after the yield rather than only after the whole synchronous assembly loop.

## 4. Batched grid assembly optimization

- [x] 4.1 Extract the current sequential assembly into a testable baseline strategy and add a shape-group abstraction with explicit ownership and disposal rules.
- [x] 4.2 Implement row/block balanced fuse for large grids, selecting a bounded group size from benchmark results while retaining a small-grid or correctness fallback path.
- [x] 4.3 Add geometry regression coverage for 1×1, 2×2, 5×5, 10×10, 20×20, and 25×25 bounds, single-solid output, internal sharp junctions, four external vertical fillets, preview mesh, and non-empty STEP export.
- [x] 4.4 Compare optimized and baseline benchmark results, requiring at least 20% median total improvement for 10×10 and 25×25 when both paths complete, or the configured operation-timeout safety gate plus an explicit warning when a large sequential baseline is unavailable; require no more than 10% regression for 1×1 and 2×2 before selecting the optimized path by default.

## 5. Input coalescing and progress UI

- [x] 5.1 Update modular-grid slider scheduling so continuous pointer changes update the latest input but send at most one settled legal `model.generate`, while invalid snapshots still advance generation and send `model.invalidate`.
- [x] 5.2 Update workspace progress state and indicator to render stage plus completed/total counts when supplied, ignore stale operation updates, and clear on ready, error, superseded, timeout, recovery, or invalidation.
- [x] 5.3 Add unit tests for slider coalescing, latest legal snapshot selection, invalidation, stale progress filtering, and progress terminal cleanup.
- [x] 5.4 Add Chromium route coverage showing fine-grained modular-grid progress and verifying the existing ready, stale, retry, viewport, and STEP export flows remain usable.
- [x] 5.5 Correlate progress cleanup to the active operationId so an older model/export terminal cannot clear newer operation progress, with a regression test.

## 6. Quality gates and documentation

- [x] 6.1 Document how to run the B-Rep benchmark, capture the reference environment, interpret phase timings and baseline failure records, and fall back to the baseline assembly strategy.
- [x] 6.2 Run formatting, type-check, unit/Worker tests, CAD-kernel geometry tests, Chromium route tests, production build, and the benchmark performance gate. The responsive-column route has a separately recorded Vite `504 Outdated Optimize Dep` dev-server flake; CAD-specific Chromium routes and isolated static route checks pass.
- [x] 6.3 Verify that the change does not add GPU B-Rep code, does not move CAD kernel calls to the main thread, and preserves existing box/component contract and STEP naming behavior.
