# OpenGrid Preview Performance Specification

## Purpose

定義 OpenGrid 從 Worker 生成、候選交接到 viewport 預覽準備的可量測效能與幾何保真要求。OpenGrid 使用既有 `opengrid` modelId 與 `cell-balanced` 產品策略；預覽最佳化不得改變 B-Rep、匯出精度或既有幾何契約。

## Requirements

### Requirement: Production-aligned OpenGrid preview measurement

The system MUST provide a repeatable measurement path for the official `opengrid` product flow from accepted generation input through `model.ready` and viewport preview preparation. The measurement MUST identify the normalized fixture, preview configuration, browser/build mode, Worker epoch, cold or warm state, and sample index.

The measurement MUST report separate timings for B-Rep assembly, preview meshing, OpenGrid quality validation, candidate bookkeeping, mesh serialization/transfer, viewport base geometry creation, viewport edge geometry creation, and the end-to-end total when a phase applies. Failed samples MUST retain the failing phase and error.

#### Scenario: Complete production preview sample

- **WHEN** a valid OpenGrid fixture is generated through the production Worker and committed
- **THEN** the report MUST contain the fixture, preview settings, lifecycle identifiers, every applicable phase timing, and total elapsed time
- **AND** the report MUST distinguish Worker-side timing from main-thread viewport timing

#### Scenario: Failed preview sample remains diagnosable

- **WHEN** B-Rep, mesh, quality, candidate handoff, transfer, or viewport preparation fails
- **THEN** the sample MUST record the phase, error, fixture, and sample index
- **AND** the measurement run MUST continue with independent fixtures when the runtime remains usable

### Requirement: Geometry-preserving OpenGrid optimization

The product MUST continue to use the existing `opengrid` modelId and `cell-balanced` product strategy while allowing measured optimizations to assembly, half-cell extension, cutter application, fuse batching, and preview meshing. An optimized candidate MUST pass the existing OpenGrid quality contract before it becomes a committed revision.

For every supported variant and tested half-cell direction, the optimized result MUST preserve the official envelope and placement, positive volume, single-solid topology, valid B-Rep, complete cell openings, official profile probes, half-cell boundary behavior, non-empty finite preview mesh, and STEP/STL export behavior.

#### Scenario: Optimized full-cell fixture

- **WHEN** a Full, Lite, or Heavy OpenGrid request without half-cell extensions uses an optimized path
- **THEN** the committed result MUST pass the same bounds, topology, profile, mesh, and export checks as the current production path
- **AND** the Worker MUST NOT silently select prototype-template, whole-profile, or row-block as a product fallback

#### Scenario: Optimized half-cell fixture

- **WHEN** a request contains an X half-cell, Y half-cell, or both
- **THEN** the committed result MUST preserve the expected half-cell envelope, boundary rails, corner behavior, openings, and screw/connector eligibility
- **AND** stale-generation cancellation and native shape cleanup MUST remain correct during extension assembly and fuse operations

### Requirement: Independent preview mesh fidelity

The system MUST keep OpenGrid preview mesh configuration independent from STEP/STL export configuration. Changing the preview tolerance MAY change only the display tessellation and transfer size; it MUST NOT change the generated B-Rep, normalized parameters, quality contract, or export precision.

The selected OpenGrid preview setting MUST be recorded by the performance measurement and MUST be chosen from a tested A/B set that includes the current product value. The product MUST retain a configuration path that can restore the current value without changing the OpenGrid model contract.

#### Scenario: Preview tolerance change preserves export geometry

- **WHEN** the same normalized OpenGrid request is generated with two supported preview tolerances
- **THEN** both requests MUST produce quality-valid B-Reps with equivalent bounds, volume tolerance, profile checks, and export outputs
- **AND** only the preview mesh tessellation and its derived transfer/viewport work MAY differ

#### Scenario: Export remains high fidelity

- **WHEN** a user exports STEP or STL after a preview generated with a tuned tolerance
- **THEN** the export MUST use the existing export precision and the committed B-Rep
- **AND** the preview tolerance MUST NOT lower export tolerance or alter export format behavior

### Requirement: Safe candidate and viewport handoff

The successful preview lifecycle MUST avoid redundant full-size mesh serialization between `model.candidate-ready` and `model.ready`, or use an ownership-safe equivalent that does not duplicate the complete typed-array payload. The Worker MUST retain a usable committed revision until its normal lifetime cleanup, and transferred buffers MUST NOT be reused after detachment.

The viewport MUST be able to create and display the base model geometry before optional edge overlay work for large preview meshes. Existing edge appearance MUST remain available for small meshes, and all generated Three.js geometries/materials MUST be disposed when replaced.

#### Scenario: Candidate commits without duplicate mesh payload

- **WHEN** the main thread validates a current candidate and sends `model.commit`
- **THEN** the commit lifecycle MUST deliver the validated mesh to the current model without serializing and transferring a second full-size copy of the same mesh
- **AND** repeated commit, discard, stale generation, and Worker restart MUST preserve the existing terminal semantics

#### Scenario: Large preview is not blocked by edges

- **WHEN** a committed mesh exceeds the configured large-preview threshold
- **THEN** the base `BufferGeometry` MUST be eligible for display before `EdgesGeometry` completes
- **AND** deferred or skipped edge work MUST NOT block later generations or leak replaced geometry

### Requirement: OpenGrid preview performance gate

The optimized production path MUST be compared with the current production baseline on the same reference environment using at least one cold run, one warm-up, and five measured warm runs per required fixture. The gate MUST include a default small fixture and a representative large half-cell fixture.

On the reference environment, the optimized path MUST reduce median Worker end-to-end generation-to-`model.ready` time by at least 20% for the representative `Full 5×3` X-left half-cell fixture, while not regressing the median `Lite 2×2` fixture by more than 10%. The report MUST also expose viewport base and edge timings even if the primary gate is Worker-side.

#### Scenario: Large half-cell improvement

- **WHEN** baseline and optimized paths run the same `Full 5×3` X-left half-cell fixture with identical parameters and preview settings
- **THEN** the optimized median generation-to-`model.ready` time MUST be at least 20% lower on the reference environment
- **AND** the report MUST identify which phases account for the improvement

#### Scenario: Small fixture does not regress

- **WHEN** baseline and optimized paths run the same official `Lite 2×2` fixture
- **THEN** the optimized median generation-to-`model.ready` time MUST NOT be more than 10% slower
- **AND** the optimized result MUST pass the same quality and export checks
