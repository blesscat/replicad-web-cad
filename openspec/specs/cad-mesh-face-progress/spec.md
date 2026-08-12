## Purpose

Expose honest, user-visible progress while large CAD previews are meshed one
face at a time, without pretending that global native meshing has a percentage.

## Requirements

### Requirement: Per-face meshing exposes monotonic face progress

The CAD operation MUST, when the preview mesher uses a per-face path with a known face count, expose the
current meshing subphase as completed faces and total
faces. The completed count MUST start at zero, increase only after a face has
finished processing, never exceed the total, and reach the total before the
meshing operation completes.

#### Scenario: Large preview reports face progress

- **WHEN** a model enters the per-face preview meshing path with M faces
- **THEN** progress exposes `0 / M` before face processing begins
- **AND** later progress values are monotonic and do not exceed M
- **AND** the final meshing progress exposes `M / M`

#### Scenario: Global native meshing remains indeterminate

- **WHEN** a model uses the global native meshing path
- **THEN** progress identifies the `meshing` stage without a fabricated face
  count or percentage

### Requirement: Face progress updates are throttled and complete

The CAD Worker MUST coalesce rapid face completions before publishing them to
the UI. It MUST publish the initial and final face counts, MAY publish
intermediate counts at a time or meaningful-count threshold, and MUST preserve
the latest observed count when the meshing operation succeeds or fails.

#### Scenario: Rapid face completions do not flood the UI

- **WHEN** many faces finish within a short interval
- **THEN** the UI receives fewer progress updates than completed faces
- **AND** the displayed count never moves backwards
- **AND** the final update is still delivered

#### Scenario: Slow face completions remain visible

- **WHEN** individual face processing takes longer than the update interval
- **THEN** intermediate completed counts are published while meshing remains
  active

### Requirement: Mesh subphase is visible without changing the stage model

The progress indicator MUST keep `meshing` as the current top-level stage and
MUST show a human-readable mesh label through the existing stage list. It MUST
not add a duplicate current-action message above that list. When face counters
exist, it MUST show the completed and total face counts; when counters do not
exist, it MUST show an indeterminate or elapsed-only mesh state.

#### Scenario: User sees current mesh activity

- **WHEN** preview meshing is active
- **THEN** the stage list identifies that a preview mesh is being generated
- **AND** the existing four top-level stages remain visible

#### Scenario: User sees face count when available

- **WHEN** per-face progress is available as N completed faces out of M
- **THEN** the indicator shows `N / M` with a face unit
- **AND** it does not present that count as an end-to-end model percentage

### Requirement: Mesh progress follows CAD operation lifecycle

Mesh face progress MUST use the enclosing generation and operation
correlation. Stale, superseded, cancelled, timed-out, recovered, failed, and
completed operations MUST NOT leave face progress visible for a later
operation.

#### Scenario: New generation replaces old mesh progress

- **WHEN** a newer generation starts while an older generation is meshing
- **THEN** late face updates from the older generation are ignored
- **AND** progress belongs only to the newer generation

#### Scenario: Terminal state clears mesh progress

- **WHEN** meshing reaches success, failure, cancellation, timeout, or worker
  recovery
- **THEN** the active face progress is cleared with the enclosing CAD progress
