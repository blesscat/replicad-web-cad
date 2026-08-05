## ADDED Requirements

### Requirement: Fine-grained Worker progress

The versioned Worker contract MUST allow `operation.progress` to carry optional `completed`, `total`, and `unit` fields in addition to its existing stage and operation correlation fields. For modular-grid assembly, the Worker MUST report valid completed/total counts at cell or batch boundaries; stages without a natural count MAY report only their stage. The UI MUST show the current stage and, when counts are available, a determinate progress value without presenting stale or unrelated operation progress.

#### Scenario: Grid assembly reports completed work

- **GIVEN** the Worker is generating a modular-grid-base model
- **WHEN** a cell or fuse batch completes
- **THEN** it MUST emit operation.progress with the current operationId and generation
- **AND** completed MUST be a non-negative integer no greater than total
- **AND** total MUST be a positive integer representing the current assembly work
- **AND** the UI MUST update the visible progress indicator with the current stage and count

#### Scenario: Progress from an older generation is ignored

- **GIVEN** generation G2 is the latest input and G1 progress arrives after G2 starts
- **WHEN** the main thread handles the G1 progress event
- **THEN** it MUST ignore the event
- **AND** it MUST keep displaying G2 progress or its current status

### Requirement: Progress terminal lifecycle

The UI MUST clear the active progress indicator when the associated operation reaches model.ready, operation.error, operation.superseded, timeout, recovery, or invalidation. A terminal event for an older operation MUST NOT clear progress belonging to a newer current operation.

#### Scenario: Successful generation clears progress

- **GIVEN** the UI displays progress for the latest model generation
- **WHEN** the Worker returns model.ready and the mesh is committed
- **THEN** the progress indicator MUST be removed or marked complete
- **AND** the status MUST transition to the existing ready message

#### Scenario: Failed or cancelled generation clears progress

- **GIVEN** the UI displays progress for a generation
- **WHEN** that generation returns an error or superseded terminal response
- **THEN** the UI MUST leave the active progress state
- **AND** it MUST show the existing recoverable/error or stale status without an indefinitely running progress indicator
