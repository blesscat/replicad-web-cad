## MODIFIED Requirements

### Requirement: OpenGrid dimension calculation respects half-cell directions

The OpenGrid calculator MUST provide a printer-aware full-cell print plan. It MUST
accept target X/Y dimensions and printer X/Y dimensions in millimetres, calculate
full-cell counts using the existing 28 mm pitch, and MUST NOT exceed either target or
printer dimension. The print plan MUST use full-cell counts; it MUST NOT infer, add, or
remove a half-cell direction. The existing `halfCellX` and `halfCellY` selections MUST
remain independently controlled and MUST be preserved when a plan is applied to the
current OpenGrid preview.

#### Scenario: Printer-aware full-cell calculation

- **WHEN** the target is 1000 × 1000 mm and the printer is 256 × 256 mm
- **THEN** the target footprint MUST be calculated as 35 × 35 full cells because
  `floor(1000 / 28) = 35`
- **AND** the per-piece limit MUST be calculated as 9 × 9 full cells because
  `floor(256 / 28) = 9`
- **AND** the recommended plan MUST use 7 × 7 full-cell pieces with 25 total pieces

#### Scenario: Half-cell selections remain unchanged

- **WHEN** a user has selected an X or Y half-cell direction before calculating a
  print plan
- **THEN** the recommendation MUST still be expressed in full-cell counts and
  28 mm full-cell dimensions
- **AND** applying the plan MUST preserve both selected half-cell direction values
- **AND** the planner MUST NOT automatically add a half-cell to the recommended
  piece counts

#### Scenario: Printer and target dimensions are independent

- **WHEN** target X/Y dimensions and printer X/Y dimensions are different on each axis
- **THEN** the planner MUST calculate target counts independently for X and Y
- **AND** it MUST calculate printer limits independently for X and Y
- **AND** every recommended piece MUST fit within both corresponding printer-axis limits

### Requirement: OpenGrid calculation remains compatible with manual controls

Applying a valid OpenGrid print plan MUST apply the primary repeated piece's rows and
columns through the existing parameter flow, while preserving the current half-cell
directions and all unrelated OpenGrid parameters. The existing OpenGrid model identity,
route, preview lifecycle, and manual row/column controls MUST remain unchanged. The
planner MUST report the complete multi-piece plan but MUST NOT pretend that one preview
or one export represents every recommended piece.

#### Scenario: Applying a plan selects the primary piece

- **WHEN** a user calculates a valid plan with a repeated primary piece
- **THEN** the current OpenGrid rows and columns MUST become the primary piece's counts
- **AND** the current preview MUST continue through the existing OpenGrid parameter and
  Worker generation flow
- **AND** the result MUST still show the total target footprint and every piece group

#### Scenario: Manual adjustment remains available after planning

- **WHEN** a user calculates a plan and then changes the OpenGrid row, column, or
  half-cell controls manually
- **THEN** the normal parameter validation and preview lifecycle MUST continue to work
- **AND** the planner result MUST not corrupt unrelated OpenGrid parameters

#### Scenario: Existing OpenGrid identity is preserved

- **WHEN** the revised calculator is used on the OpenGrid panel
- **THEN** the generated component MUST retain the existing OpenGrid model identity,
  build key, route, export identity, and parameter schema
- **AND** HSW, modular-grid-base, and other shared dimension-calculator consumers MUST
  retain their existing calculation behavior

## ADDED Requirements

### Requirement: OpenGrid printer-aware planner inputs and validation

The OpenGrid print planner MUST expose four finite, positive millimetre inputs for
target X, target Y, printer X, and printer Y. Target cell counts MUST be the floor of
the target dimension divided by 28 mm. Printer cell limits MUST be the floor of the
printer dimension divided by 28 mm and MUST be capped by the existing legal maximum
full-cell count for one OpenGrid board. The planner MUST reject any target or printer
axis that cannot contain one 28 mm full cell, show an accessible field-level error, and
leave the current OpenGrid parameters unchanged.

#### Scenario: Valid target and printer dimensions

- **WHEN** all four inputs contain finite positive dimensions and both targets and
  printer axes can contain at least one full cell
- **THEN** the planner MUST produce a valid print plan
- **AND** the target and printer counts MUST be derived independently per axis
- **AND** the current OpenGrid parameters MUST be updated only through a valid plan
  application

#### Scenario: Target below one full cell

- **WHEN** either target axis is less than 28 mm
- **THEN** the corresponding target field MUST show an accessible error explaining that
  at least one full cell is required
- **AND** the current rows, columns, half-cell directions, and accepted snapshot MUST
  remain unchanged

#### Scenario: Printer below one full cell

- **WHEN** either printer axis is less than 28 mm
- **THEN** the corresponding printer field MUST show an accessible error explaining
  that at least one full cell is required
- **AND** the current OpenGrid parameters MUST remain unchanged

#### Scenario: Malformed planner input

- **WHEN** any planner input is blank, non-numeric, non-finite, zero, or negative
- **THEN** the planner MUST show a visible accessible field-level error
- **AND** it MUST NOT throw an uncaught exception or update the current OpenGrid
  parameters

### Requirement: OpenGrid practical repeated-piece recommendation

The planner MUST recommend a rectangular decomposition of the target full-cell
footprint into printable pieces. Every piece width and height MUST be positive integers
within the corresponding printer cell limits. The planner MUST prefer one repeated
piece dimension when a practical exact uniform tiling exists. An exact uniform candidate
is practical only when each of its axis counts is at least half of the corresponding
effective per-piece limit, rounded up, unless that axis target itself is smaller. Among
practical exact candidates, the planner MUST choose the candidate with the greatest
piece area, breaking ties by the fewest pieces. If no practical exact candidate exists,
the planner MUST choose a main piece size in the practical range that minimizes the
axis remainder, breaking ties by the larger main size, then combine the X/Y remainders
into repeated edge and corner groups. It MUST NOT choose a tiny exact divisor solely to
make every piece identical.

#### Scenario: Exact uniform tiling is preferred

- **WHEN** the target is 35 × 35 cells and the printer limit is 9 × 9 cells
- **THEN** the planner MUST choose 7 × 7 cells as the repeated piece size
- **AND** it MUST recommend 5 pieces across, 5 pieces down, and 25 total pieces
- **AND** it MUST not recommend a mixed 9/8-cell decomposition

#### Scenario: Tiny uniform divisor is rejected

- **WHEN** the target is 34 × 34 cells and the printer limit is 9 × 9 cells
- **THEN** the planner MUST NOT choose 2 × 2 cells as the repeated piece size
- **AND** it MUST choose a practical main decomposition using 8-cell main spans and
  2-cell remainders on each axis
- **AND** the resulting groups MUST include 16 pieces of 8 × 8, 4 pieces of 8 × 2,
  4 pieces of 2 × 8, and 1 piece of 2 × 2
- **AND** the total MUST be 25 pieces

#### Scenario: One-axis remainder is consolidated

- **WHEN** only one target axis has a remainder after selecting the practical main
  spans
- **THEN** all full pieces MUST use the same main dimensions
- **AND** the remainder MUST be represented as repeated pieces of one independent
  edge dimension rather than many unrelated sizes

#### Scenario: Two-axis remainders produce a corner group

- **WHEN** both target axes have remainders after selecting the practical main spans
- **THEN** the planner MUST report the main group, each repeated edge group, and one
  corner group when the corner exists
- **AND** each group MUST report its piece cell dimensions, physical dimensions, and
  quantity
- **AND** the sum of all group footprints MUST equal the calculated target cell
  footprint

#### Scenario: Printer capacity is respected

- **WHEN** a valid plan is generated for any printer X/Y dimensions
- **THEN** no recommended piece may exceed the corresponding printer cell limit or
  physical printer dimension
- **AND** no recommended piece may exceed the existing legal OpenGrid board maximum

### Requirement: OpenGrid print-plan result is accessible and understandable

The OpenGrid planner MUST clearly label target and printer inputs with their axis and
millimetre unit, expose a keyboard-operable calculation action, and present validation
errors next to the relevant fields. A valid result MUST visibly communicate the target
cell footprint, printer cell limit, primary piece size, per-group piece quantities, and
total piece count. The result MUST remain usable without horizontal overflow on narrow
viewports.

#### Scenario: Keyboard user calculates a print plan

- **WHEN** a keyboard user focuses the four planner fields and activates the calculation
  action
- **THEN** the planner MUST calculate without requiring pointer input
- **AND** any validation error MUST be associated with its corresponding field

#### Scenario: User can understand a valid recommendation

- **WHEN** a valid print plan is displayed
- **THEN** the result MUST identify the target as full-cell counts and millimetres
- **AND** it MUST identify the printer limit as full-cell counts and millimetres
- **AND** it MUST list each recommended piece group and the total quantity

#### Scenario: Narrow viewport displays the planner

- **WHEN** the OpenGrid panel is rendered at a narrow mobile viewport
- **THEN** all four inputs, the calculation action, validation feedback, and result
  summary MUST remain reachable and understandable
- **AND** the planner MUST NOT introduce horizontal overflow
