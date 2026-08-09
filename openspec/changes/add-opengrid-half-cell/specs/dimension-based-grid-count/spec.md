## ADDED Requirements

### Requirement: OpenGrid dimension calculation respects half-cell directions

The OpenGrid dimension calculator MUST continue to treat X as the columns direction and Y as the rows direction, and MUST calculate against the current typed `halfCellX` and `halfCellY` selections. With a `none` selection, an axis dimension MUST be `count × 28 mm`; with a selected side, it MUST be `count × 28 + 14 mm`. The calculator MUST choose the greatest legal full-cell count from 1 through the OpenGrid maximum whose derived dimensions do not exceed the respective targets. It MUST preserve the selected side values and MUST return the selected half-cell parameters together with rows and columns.

#### Scenario: Single-axis half-cell calculation

- **WHEN** the target is X=100 mm and Y=70 mm, with `halfCellX=right` and `halfCellY=none`
- **THEN** the calculator MUST return `columns=3` and `rows=2`
- **AND** the derived dimensions MUST be 98 × 56 mm
- **AND** the selected X side MUST remain `right`

#### Scenario: Dual-axis half-cell calculation

- **WHEN** the target is X=100 mm and Y=70 mm, with `halfCellX=left` and `halfCellY=bottom`
- **THEN** the calculator MUST return `columns=3` and `rows=2`
- **AND** the derived dimensions MUST be 98 × 70 mm
- **AND** both selected directions MUST remain in the returned parameters

#### Scenario: No-half calculation retains full-cell behavior

- **WHEN** the target is X=100 mm and Y=70 mm, with both half-cell selections set to `none`
- **THEN** the calculator MUST return `columns=3` and `rows=2`
- **AND** the derived dimensions MUST be 84 × 56 mm
- **AND** it MUST not infer or add a half-cell direction

#### Scenario: Selected half-cell does not fit

- **WHEN** a selected axis target is smaller than one full 28 mm cell plus the requested 14 mm half-cell
- **THEN** the calculator MUST return a field-level error for that axis
- **AND** it MUST leave the current rows, columns, and direction selections unchanged

### Requirement: OpenGrid calculation remains compatible with manual controls

Applying a valid OpenGrid dimension calculation MUST update only the calculated rows and columns through the existing parameter flow. The X/Y half-cell side controls MUST remain independently usable before and after calculation, and invalid calculation input MUST follow the existing generation invalidation behavior without changing the last accepted snapshot.

#### Scenario: Calculation followed by manual direction adjustment

- **WHEN** a user applies a valid calculated OpenGrid size and then changes the X direction from `none` to `left`
- **THEN** the next typed snapshot MUST retain the calculated rows and columns
- **AND** the next derived width MUST include one 14 mm X half-cell
- **AND** the normal debounce and Worker generation lifecycle MUST be used

#### Scenario: Invalid target preserves accepted parameters

- **WHEN** either target is blank, malformed, non-finite, non-positive, or too small for the selected axis footprint
- **THEN** the corresponding target field MUST show an accessible error
- **AND** the current accepted rows, columns, and half-cell directions MUST remain unchanged
- **AND** the UI MUST invalidate the newer generation rather than send `model.generate`

