## Context

The shared `GridDimensionCalculator.svelte` is used by several component panels. The
OpenGrid panel currently supplies `calculateOpenGridCounts`, which derives one board's
rows and columns from target dimensions and applies them immediately. OpenGrid's full
cell pitch is 28 mm and its existing legal per-board maximum is
`floor(500 / 28) = 17` full cells per axis. The existing half-cell selections add a
14 mm extension but are independent OpenGrid parameters.

The proposal changes only the OpenGrid-facing calculation experience. See
`proposal.md` and the delta specification for the user-visible contract.

## Goals / Non-Goals

**Goals:**

- Keep the shared calculator behavior for HSW, modular-grid-base, and stackable-box
  panels unchanged.
- Add a deterministic pure planner for target cells, printer limits, practical piece
  selection, and repeated edge/corner remainder groups.
- Keep the current OpenGrid preview focused on one primary piece while making the full
  multi-piece recommendation visible.
- Preserve half-cell selections, existing OpenGrid parameter validation, model identity,
  and Worker generation lifecycle.

**Non-Goals:**

- Do not change OpenGrid CAD geometry, model IDs, routes, export filenames, or Worker
  APIs.
- Do not automatically generate or download every recommended piece.
- Do not infer half-cell placement for a multi-piece plan; planning is expressed in full
  28 mm cells and the existing half-cell controls remain manual.
- Do not change the calculators or contracts for other component types.

## Decisions

### Add an OpenGrid-specific planner beside the shared calculator

Add a dedicated `OpenGridPrintPlanCalculator.svelte` and wire it into
`OpenGridComponentPanel.svelte`. Keep `GridDimensionCalculator.svelte` and
`calculateOpenGridCounts` intact for existing consumers and compatibility tests.

This avoids adding printer-specific branches and four-field UI state to a shared
component whose current target-to-count behavior is still correct for HSW, modular
grid, and stackable-box panels. The new UI component is a parameter-panel helper, not a
new catalog/CAD component, so it does not introduce a new model identity.

### Keep planning logic pure and return a grouped plan

Add a pure `calculateOpenGridPrintPlan` domain function in
`src/features/cad/grid-dimensions/index.ts`. Its input contains target X/Y and printer
X/Y strings. Its result contains:

- target full-cell counts and physical footprint;
- effective per-piece full-cell limits and physical limits;
- the primary repeated piece;
- ordered piece groups with cell dimensions, physical dimensions, and quantities; and
- total piece count.

Parsing and validation stay in the domain function so the Svelte component only maps
field errors, renders results, and applies the primary piece.

### Derive effective limits from both printer and model constraints

For each axis:

1. Parse the positive finite millimetre input.
2. Calculate `targetCells = floor(targetMm / 28)`.
3. Calculate `printerCells = floor(printerMm / 28)`.
4. Cap the printable piece limit at the existing OpenGrid legal maximum of 17.

Reject an axis when either target or printer cannot contain one 28 mm full cell. The
planner uses no half-cell extension in these calculations and does not mutate the
selected half-cell directions.

### Select practical spans deterministically

The planner works independently on the X and Y cell counts, then combines the axis
segments into rectangular piece groups.

For an axis with target count `T` and effective piece limit `L`, define the practical
candidate floor as `ceil(min(T, L) / 2)`. First enumerate candidate spans from that
floor through `L` whose remainder is zero. If both axes have a zero-remainder span,
consider their Cartesian products as uniform rectangular plans and choose the largest
piece area, breaking ties by the fewest pieces.

If a practical uniform plan does not exist, choose the main span independently on each
axis from the practical range through `L` by the following order:

1. smallest `T % span` remainder;
2. largest span when remainders tie.

This makes 35 cells with a 9-cell limit choose 7 (an exact practical divisor), while 34
cells choose 8 with a remainder of 2 instead of choosing the tiny exact divisor 2.
For each axis, represent the result as full main spans plus at most one remainder span.

### Build edge and corner groups by Cartesian product

Combine the X and Y segment lists into groups. A full/full combination is the primary
group. A remainder/full or full/remainder combination is an edge group, and a
remainder/remainder combination is the corner group. Merge identical dimensions and
omit zero-quantity groups. This keeps repeated edge pieces together and guarantees
that the group footprints sum to the target cell rectangle.

Apply only the primary group's row and column counts to the current OpenGrid preview.
The result list is informational and does not claim to export all groups.

### Preserve existing parameter flow

The new panel calls the existing `onParametersChange` path with only the primary
piece's `rows` and `columns`, leaving `halfCellX`, `halfCellY`, variant, screw
settings, custom screw positions, connector settings, and other parameters untouched.
The existing manual row/column controls keep their current position-cleanup behavior;
the print-plan path does not reuse that cleanup because planning must not silently
change unrelated screw configuration. Invalid planner results call the existing
invalidation callback and do not change the accepted snapshot.

## Risks / Trade-offs

- [Practical-span heuristic] The half-of-effective-limit threshold is a deterministic
  heuristic, not a universal packing optimum. → Keep it in the pure planner, document
  representative examples in unit tests, and make the grouped result explicit so the
  user can choose a different manual piece if needed.
- [Half-cell ambiguity] A half-cell is an edge-specific geometry feature and cannot be
  inferred safely for every tiled piece. → Keep it outside automatic planning and
  preserve the current manual controls.
- [No bulk export] The plan does not create 25 separate files. → Apply only the primary
  piece and state the limitation in the result UI; bulk export remains a separate
  feature.
- [Existing UI tests] OpenGrid end-to-end selectors currently assume two target fields.
  → Update only OpenGrid fixtures/selectors and leave shared calculator coverage for
  the other panels intact.

## Migration Plan

No persisted schema or generated model identity changes are required. Existing saved
OpenGrid parameter snapshots remain valid. Deploy by adding the pure planner and
OpenGrid-specific UI, then update focused unit/e2e coverage. Rollback is limited to
removing the new planner wiring and component; existing manual controls and the shared
calculator remain available.
