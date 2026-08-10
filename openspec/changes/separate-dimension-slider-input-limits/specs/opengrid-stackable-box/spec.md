## MODIFIED Requirements

### Requirement: OpenGrid stackable box parameters

The system MUST expose an independently validated OpenGrid stackable-box model with stable `modelId=opengrid-stackable-box`. Its user-facing parameters MUST include `x`, `y`, `height`, the boolean `cornerBottomHoles`, the boolean `fullBottomHoleGrid`, and the boolean `basePlateMode`; `x` and `y` MUST be positive multiples of 0.5, and the derived footprint MUST remain within the current 500 mm workspace limit. The standard OpenGrid pitch MUST be 28 mm. The generated footprint MUST apply a total 0.15 mm clearance per axis, so the nominal width and depth are `x × 28 − 0.15 mm` and `y × 28 − 0.15 mm`. The `height` control MUST represent the clear internal box height measured from the upper surface of the fixed 5.0 mm bottom assembly to the upper inner-rim datum, rather than the external Z bound. `height` MUST be a safe integer in the inclusive range 10–500 mm. In the normal mode, the bottom assembly height and reference-style upper interface height MUST remain fixed independently of `height`; the nominal external height MUST therefore be `height + 5.0 mm + 7.55 mm`, excluding only the small top-edge rounding tolerance. `cornerBottomHoles` MUST default to `true`, `fullBottomHoleGrid` MUST default to `false`, and `basePlateMode` MUST default to `false`, preserving the existing default while allowing the three boolean modes to be selected independently.

The parameter panel MUST present the normal `預設模式` and `底版模式` choices as mutually exclusive radio options. The selected normal-mode description MUST read `預設模式：可堆疊滑動，使用標準8mm固定柱` The selected base-plate-mode description MUST read `底版模式：不可堆疊，使用6mm固定柱`

The stackable-box parameter panel MUST provide a width/depth calculator that accepts X/Y dimensions in millimetres and chooses the smallest valid X/Y count on the 0.5-cell step whose generated footprint is not smaller than the requested dimensions. The calculator MUST use the same 28 mm pitch and 0.15 mm total per-axis clearance as the generated model.

#### Scenario: Generate a full-cell box

- **WHEN** a valid `x`, `y`, `height`, `cornerBottomHoles`, `fullBottomHoleGrid`, and `basePlateMode=false` snapshot is submitted with whole-cell dimensions
- **THEN** the generated box MUST use 28 mm per OpenGrid cell before the 0.15 mm total axis clearance
- **AND** the box MUST remain centered on X/Y with its base aligned to Z=0
- **AND** the clear internal height MUST equal the requested `height`
- **AND** the external Z bound MUST equal the requested internal height plus the fixed bottom and upper-interface heights within geometry tolerance
- **AND** the result MUST expose a non-empty preview and exportable CAD shape

#### Scenario: Generate a maximum manual-height box

- **WHEN** a valid snapshot has `height=500` and an X/Y footprint within the existing 500 mm workspace limit
- **THEN** the clear internal height MUST equal 500 mm
- **AND** the external Z bound MUST include the fixed bottom and upper-interface heights without clamping the requested height

#### Scenario: Generate a half-cell box

- **WHEN** a valid snapshot contains `x=0.5` or `y=0.5`
- **THEN** the model MUST accept the value without rounding it to a whole cell
- **AND** the derived footprint MUST use 14 mm for that axis before clearance
- **AND** the model MUST reject only values that fail the half-cell step, positivity, or workspace-bound rules

#### Scenario: Invalid dimensions or grid mode

- **WHEN** `x`, `y`, or `height` is empty, non-finite, negative, zero, not on the permitted step, or outside its declared input range, or `cornerBottomHoles`, `fullBottomHoleGrid`, or `basePlateMode` is not a boolean
- **THEN** the model snapshot MUST be rejected with a field-specific validation error
- **AND** no invalid shape or export request MUST be committed

#### Scenario: Calculate half-cell counts without undersizing

- **WHEN** a user enters requested X/Y dimensions in millimetres in the stackable-box calculator
- **THEN** the calculator MUST evaluate candidate counts at 0.5-cell increments
- **AND** it MUST return the closest counts whose generated X/Y footprints are greater than or equal to the requested dimensions
- **AND** the returned counts MUST be applied to the stackable-box X/Y parameters without changing height, `cornerBottomHoles`, `fullBottomHoleGrid`, or `basePlateMode`

#### Scenario: Printable base-plate mode

- **WHEN** a valid snapshot has `basePlateMode=true`
- **THEN** the generator MUST keep the upper box body, open interior, and independent stepped top sliding rail
- **AND** it MUST remove all geometry below the fixed 2.0 mm plane, leaving a 3.0 mm bottom shell to the fixed 5.0 mm interior-floor datum
- **AND** the remaining cut face MUST be translated to `Z=0` and form a continuous printable base plate
- **AND** the external height MUST be reduced by exactly 2.0 mm while the requested clear internal height and upper rail dimensions remain unchanged
- **AND** the four corner sockets MUST use an outside/lower Ø5.05 mm bore for 2.0 mm followed by an inside/upper Ø7.05 mm retaining seat for 1.0 mm
- **AND** the base-plate export MUST use a mode-specific filename so it cannot overwrite the normal stackable-box export
