## Purpose

定義一套可重複、可比較且不接入正式產品路由的 OpenGrid 幾何 benchmark，讓後續 generator 能依據實測效能與幾何品質選定建模策略，並承接完整的板型與孔位決策。

## Requirements

### Requirement: Comparable OpenGrid geometry strategies

The benchmark MUST compare the same normalized OpenGrid request through three independently identifiable geometry strategies: a whole-board profile strategy, a row-or-block assembly strategy, and a cell-level balanced-fuse strategy. Every strategy MUST receive the same board type, grid counts, screw configuration, connector configuration, preview tolerances, and native execution environment for a given comparison fixture.

#### Scenario: Same fixture is compared fairly

- **WHEN** a benchmark fixture is executed for more than one strategy
- **THEN** every strategy MUST use identical normalized parameters and preview settings
- **AND** the report MUST identify the strategy separately
- **AND** a strategy MUST NOT be declared faster using a fixture or quality setting that the other strategies did not run

#### Scenario: Candidate strategy is unavailable

- **WHEN** a strategy cannot construct the requested fixture
- **THEN** the benchmark MUST retain a failed result for that strategy and fixture
- **AND** the failure MUST include the failing phase and error message
- **AND** the other strategies MUST remain eligible to run

### Requirement: Representative OpenGrid fixture coverage

The benchmark MUST cover the three supported board variants `Full`, `Lite`, and `Heavy`, using the OpenGrid 28 mm grid and the variant-specific board thicknesses. Required scale fixtures MUST include `1×1`, `2×2`, `5×5`, `10×10`, and the largest legal rectangular fixture that remains within the current 500 mm workspace dimension limit. Feature-load fixtures MUST cover no screw holes, standard corner screw holes, all eligible screw holes, and a deterministic custom hole pattern; connector-hole behavior MUST be exercised in at least one small and one large fixture.

#### Scenario: Variant and scale coverage is present

- **WHEN** the benchmark report is generated
- **THEN** it MUST contain results or explicit failures for Full, Lite, and Heavy
- **AND** it MUST contain results or explicit failures for every required scale fixture
- **AND** the largest fixture MUST NOT silently exceed the workspace dimension limit

#### Scenario: Screw and connector load is represented

- **WHEN** feature-load fixtures are executed
- **THEN** the report MUST distinguish no-hole, corner-hole, all-hole, and custom-hole configurations
- **AND** it MUST identify the connector-hole configuration used by each fixture
- **AND** a custom pattern MUST be deterministic and reproducible from the report metadata

### Requirement: Controlled cold and warm measurement protocol

The benchmark MUST distinguish first-run construction from warm generation in the same native CAD epoch. It MUST perform a cold run, perform an explicit warm-up before measured samples, execute at least five measured runs for every strategy and fixture, and report median and P95 timings for profile construction, extrusion, assembly or fuse, boolean cuts, mesh generation, and total generation. A phase that does not apply to a strategy MUST be represented explicitly rather than omitted.

#### Scenario: Warm samples are measured consistently

- **WHEN** a strategy and fixture has completed its warm-up
- **THEN** the benchmark MUST collect at least five measured samples in the same native epoch
- **AND** the report MUST include the sample count, median, and P95 for each applicable phase and total generation
- **AND** cold construction time MUST remain distinguishable from warm generation time

#### Scenario: Measurement failure is retained

- **WHEN** a measured run errors, times out, or cannot produce a timing
- **THEN** the report MUST retain the strategy, fixture, sample index, phase, and error
- **AND** the failed sample MUST NOT be silently removed from the report
- **AND** the benchmark MUST continue with independent fixtures when the CAD runtime remains usable

### Requirement: Geometry quality gate for every successful sample

Every successful benchmark sample MUST verify the expected OpenGrid envelope, centered X/Y placement, base Z at zero, positive volume, a valid single-solid B-Rep, a non-empty preview mesh, and non-empty STEP and binary STL exports. The expected envelope MUST use the same 28 mm grid and board-variant thickness constants used to construct the sample.

#### Scenario: Successful sample passes CAD quality checks

- **WHEN** a strategy produces a candidate shape
- **THEN** the sample MUST pass bounds and placement checks within the project tolerance
- **AND** the shape MUST contain exactly one solid and pass B-Rep validity checks
- **AND** mesh, STEP, and STL outputs MUST be non-empty before the sample is marked successful

#### Scenario: Geometry quality check fails

- **WHEN** bounds, placement, single-solid, validity, mesh, or export validation fails
- **THEN** the sample MUST be marked failed
- **AND** the report MUST identify the failed quality check and preserve the associated strategy and fixture
- **AND** the failed shape and intermediate native resources MUST be released before the next independent sample

### Requirement: Actionable generator handoff

The benchmark MUST produce a structured report and a human-readable handoff record that identify the tested environment, fixture matrix, strategy results, quality failures, recommended strategy, applicable board variants, supported scale limits, batched screw-cut approach, and known limitations. The handoff MUST distinguish an automatically derived recommendation from the final strategy selected for the subsequent generator change.

#### Scenario: Generator change can consume benchmark results

- **WHEN** the benchmark change is completed
- **THEN** a future `add-opengrid-generator` change MUST be able to select its geometry strategy by reading the committed handoff record
- **AND** the handoff MUST include enough context to avoid rerunning the strategy discussion
- **AND** the future change MUST inherit the Full/Lite/Heavy, rows/columns, screw specification, screw-position matrix, connector-hole, UI, Worker, cancellation, preview, and export scope from the benchmark proposal

#### Scenario: No single strategy works for every variant

- **WHEN** the benchmark shows that different variants require different strategies
- **THEN** the handoff MUST record the selected strategy per variant or fixture class
- **AND** it MUST record the fallback conditions and quality evidence for each strategy
- **AND** the subsequent generator MUST be allowed to dispatch by variant without treating this as a new product requirement

### Requirement: Benchmark isolation from existing CAD components

The benchmark MUST remain an internal test and measurement capability. It MUST NOT add an OpenGrid model id, homepage card, CAD route, public parameter panel, persisted component entry, or versioned Worker model-generation dispatch, and it MUST NOT change existing `box`, `modular-grid-base`, `hsw-cell`, or `hexagonal-column` behavior.

#### Scenario: Existing component behavior remains unchanged

- **WHEN** the benchmark code is present and the existing test suite runs
- **THEN** existing component validation, generation, export filenames, Worker lifecycle, and parameter persistence MUST remain unchanged
- **AND** no existing component MUST resolve through an OpenGrid benchmark strategy

#### Scenario: Benchmark has no product route

- **WHEN** a user visits the existing model catalog or CAD routes
- **THEN** the benchmark MUST NOT expose an OpenGrid product entry or route
- **AND** the benchmark MUST be runnable through the repository's benchmark/test workflow only
