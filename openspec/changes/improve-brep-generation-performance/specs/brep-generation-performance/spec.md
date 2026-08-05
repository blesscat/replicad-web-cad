## ADDED Requirements

### Requirement: B-Rep generation benchmark

The system MUST provide a repeatable benchmark for the Worker-side `modular-grid-base` generation path. The benchmark MUST use the canonical STEP template, the production preview configuration, and representative fixtures of 1×1, 2×2, 5×5, 10×10, 20×20, and 25×25. It MUST warm up once, attempt at least five measured runs per strategy and fixture, and report median and P95 timings for template loading, cell assembly/fuse, final fillet, mesh generation, and total generation. The warm-up MUST also verify a non-empty STEP export once per strategy and fixture; repeated STEP writer work MUST NOT be included in measured generation total. If a strategy cannot complete a fixture, the result MUST record its strategy, fixture, sample, failed phase, and error and continue with the other strategy/fixtures. The result MUST record the browser/build mode, dependency lockfile version, and reference environment.

#### Scenario: Baseline and optimized comparison

- **GIVEN** the existing sequential assembly path and the proposed optimized assembly path are available to the benchmark
- **WHEN** the benchmark runs the same fixture matrix with the same asset and preview configuration
- **THEN** it MUST produce comparable phase and total timing records for both paths
- **AND** it MUST identify the path and reference environment in the result
- **AND** a failed sequential baseline MUST be represented as an explicit failure record rather than an omitted or fabricated timing record

#### Scenario: Performance regression gate

- **GIVEN** baseline and optimized results were collected on the same reference environment
- **WHEN** the performance gate is evaluated
- **THEN** the optimized path MUST reduce median total B-Rep generation time by at least 20% for both 10×10 and 25×25 fixtures
- **AND** the optimized path MUST NOT regress median total time by more than 10% for either 1×1 or 2×2 fixtures
- **AND** if a large sequential baseline cannot complete its measured samples, the gate MAY use the optimized safety condition that its median total is no greater than the configured operation timeout, but MUST emit a warning that the relative 20% comparison was unavailable

### Requirement: Geometry-preserving grid assembly

The system MUST use an assembly strategy that avoids repeatedly fusing every new cell into one growing left-fold shape for large grids, while preserving the existing modular-grid-base geometry contract. For a large rectangular grid, the optimized path SHOULD build one canonical row, clone/translate that row for the remaining rows, and fuse row/block groups with bounded intermediate ownership. Every valid fixture MUST produce a non-empty single solid with the same bounds within the existing tolerance, the same 5 mm height and centered placement, the same internal sharp junctions, the same four external vertical R2.5 mm fillets, a valid exact preview mesh, and a non-empty STEP export.

#### Scenario: Small grid geometry remains unchanged

- **GIVEN** a 1×1, 2×2, or 5×5 modular-grid-base request
- **WHEN** the optimized assembly completes and is committed
- **THEN** the result MUST remain a valid single solid with the existing component bounds and tolerance
- **AND** the result MUST preserve the existing external-corner fillets and internal sharp junctions

#### Scenario: Large grid uses the optimized path

- **GIVEN** a 10×10, 20×20, or 25×25 modular-grid-base request
- **WHEN** the Worker assembles the cell shapes
- **THEN** it MUST use the measured batch/row/tree assembly path rather than the unbounded left-fold path
- **AND** the final candidate MUST pass the same mesh, bounds, single-solid and STEP validation as the existing path

### Requirement: Cooperative stale-generation cancellation

The Worker MUST check whether a generation is still current before creating a new cell, after clone/translate, and before and after each fuse or fillet boundary. If a newer generation or invalidate makes the current operation stale, the Worker MUST stop at the next safe boundary, release all local native shapes that are not owned by a committed revision or pending candidate, and return the existing terminal stale/superseded response for the original operation.

#### Scenario: New input arrives during grid assembly

- **GIVEN** generation G1 is assembling a modular grid and generation G2 becomes the latest input
- **WHEN** the current atomic CAD call completes
- **THEN** G1 MUST NOT start another cell or fuse group
- **AND** G1 MUST NOT produce a candidate or change the current committed revision
- **AND** G1 MUST terminate with its original operation correlation and a stale/superseded reason

#### Scenario: Cancellation releases intermediate shapes

- **GIVEN** a stale generation owns cloned cells, partial fuse groups, or a combined shape
- **WHEN** cooperative cancellation runs at a safe boundary
- **THEN** every unowned intermediate shape MUST be deleted exactly once
- **AND** the Worker MUST remain able to process the latest generation in the same epoch

### Requirement: Expensive input coalescing

The workspace MUST coalesce rapid modular-grid parameter changes so that a continuous slider interaction does not start one expensive `model.generate` operation for every intermediate value. Every raw snapshot MUST still advance generation and invalidation semantics, but after the interaction settles the Worker MUST receive at most the final legal snapshot from that interaction.

#### Scenario: Slider drag keeps only the final legal snapshot

- **GIVEN** the user moves rows or columns through multiple legal values without releasing the control or reaching the configured debounce boundary
- **WHEN** the interaction settles
- **THEN** the workspace MUST send no more than one model.generate for the settled interaction
- **AND** that request MUST contain the final legal rows and columns
- **AND** any earlier generation MUST remain invalidated or stale and MUST NOT become current

#### Scenario: Invalid final slider value

- **GIVEN** a modular-grid parameter interaction ends with an invalid snapshot
- **WHEN** the workspace validates the settled value
- **THEN** it MUST send model.invalidate rather than model.generate for that generation
- **AND** it MUST not leave an earlier expensive generation eligible for commit
