## MODIFIED Requirements

### Requirement: 獨立的分隔牆參數契約

The system MUST expose a runtime-validated component with stable `modelId=opengrid-divider`. Its normalized parameters MUST include non-negative `left`, `right`, `up`, and `down` arm counts that are multiples of 0.5 grid, plus an integer `height` in millimetres. `height` MUST be in the inclusive range 2–500 mm. The normalized parameters MUST also include an integer `wallThickness` from 1 through 5 mm. One full divider grid MUST be 28 mm, one half-grid MUST be 14 mm, and the divider grid definition MUST resolve from the shared official OpenGrid grid contract rather than defining a separate pitch. The divider's planar footprint MUST continue to use its existing 500 mm safety limit independently of the height range. Every directional arm count MUST be no greater than 10 grids, while the combined planar envelope MUST still be checked independently against the 500 mm limit. The default `wallThickness` MUST be 2 mm.

#### Scenario: 合法分隔牆參數

- **WHEN** `left`、`right`、`up`、`down` are non-negative 0.5-grid multiples with at least one non-zero direction, and `height` is an integer from 2 through 500 mm with a planar footprint within 500 mm, and `wallThickness` is an integer from 1 through 5 mm
- **THEN** the component MUST accept the normalized snapshot
- **AND** the generated arm lengths MUST use 28 mm per configured full grid unit and 14 mm per half-grid unit
- **AND** the snapshot MUST remain independent from `modelId=opengrid`

#### Scenario: 不支援的形狀被拒絕

- **WHEN** all four directions are zero, or any directional value is not a 0.5-grid multiple, negative, non-finite, greater than 10 grids, or outside the supported height, planar footprint, or `wallThickness` range
- **THEN** validation MUST fail with field-specific diagnostics
- **AND** the system MUST NOT send the snapshot for CAD generation or export

#### Scenario: Maximum manual height preserves the planar limit

- **WHEN** a valid divider shape has `height=500` and a planar footprint within 500 mm
- **THEN** validation MUST accept the snapshot
- **AND** the wall top MUST be at Z=500 mm
- **AND** a shape whose planar footprint exceeds 500 mm MUST remain invalid even when its height is within 2–500 mm

#### Scenario: 十格臂長上限

- **WHEN** an otherwise valid directional arm uses `count=10`
- **THEN** the arm MUST be accepted and its nominal grid length MUST be 280 mm

#### Scenario: 超過十格的臂格數

- **WHEN** a directional arm uses `count=10.5`
- **THEN** validation MUST reject that arm because the per-direction maximum is 10 grids

#### Scenario: 組合平面上限仍然獨立生效

- **WHEN** `left=10` and `right=10` produce a 560 mm nominal horizontal span
- **THEN** validation MUST reject the snapshot because its planar footprint exceeds 500 mm even though each individual arm is within the 10-grid limit

### Requirement: 依四方向格數判定形狀

The system MUST derive the displayed shape from the non-zero direction counts and MUST NOT require a separate shape selector. Exactly one non-zero direction MUST be classified as a single-arm shape, exactly two opposite non-zero directions MUST be classified as a straight line, exactly two adjacent non-zero directions MUST be classified as an L shape, exactly three non-zero directions MUST be classified as a T shape, and all four non-zero directions MUST be classified as a cross shape.

#### Scenario: 單臂型

- **WHEN** `left=0`, `right=1`, `up=0`, and `down=0`
- **THEN** the UI and normalized geometry metadata MUST identify the result as a single horizontal arm
- **AND** its centerline span MUST be 28 mm

#### Scenario: 一字型

- **WHEN** `left=1`, `right=1`, `up=0`, and `down=0`
- **THEN** the UI and normalized geometry metadata MUST identify the result as a horizontal straight line
- **AND** its centerline span MUST be 56 mm

#### Scenario: T 型

- **WHEN** `left=1`, `right=1`, `up=2`, and `down=0`
- **THEN** the UI and normalized geometry metadata MUST identify the result as a T shape
- **AND** its horizontal centerline span MUST be 56 mm
- **AND** its upward centerline arm length MUST be 56 mm

#### Scenario: L 型與十字型

- **WHEN** exactly two adjacent directions are non-zero
- **THEN** the result MUST be classified as an L shape
- **WHEN** all four directions are non-zero
- **THEN** the result MUST be classified as a cross shape

### Requirement: 連續 5 mm 分隔牆幾何

The generated body MUST be a continuous connected divider whose base support has a 5 mm plan width and whose upper wall has the selected `wallThickness` plan width. For a thinner upper wall, the base support MUST retain the configured geometry-safety ledge at `Z=0` before the planar chamfer begins. The arm centerlines MUST meet at the central junction. The body MUST use the configured height, start at `Z=0`, and remain a single connected solid after the arms and profile transitions are joined. Every non-zero arm MUST end 2.275 mm inward from its nominal grid endpoint along the arm direction; the same retracted endpoint MUST apply to the 5 mm base support, transition profile, and upper wall, leaving a 1 mm target clearance to the normal OpenGrid box inner wall. The central junction MUST remain the construction anchor even when the four arm counts are asymmetric.

#### Scenario: 5 mm 底部與可調上方厚度

- **WHEN** a valid divider snapshot is generated with `wallThickness` less than 5 mm
- **THEN** each active arm MUST measure 5 mm across its base support footprint at `Z=0`
- **AND** the upper wall MUST measure the selected `wallThickness` across its plan profile above the transition
- **AND** the wall top MUST be at the requested height
- **AND** the bottom of the wall MUST be at `Z=0`

#### Scenario: 厚度等於 5 mm 時維持完整牆體

- **WHEN** a valid divider snapshot is generated with `wallThickness=5`
- **THEN** the divider MUST retain a continuous 5 mm plan width through its full wall profile
- **AND** no unnecessary base-to-wall reduction transition MUST be introduced

#### Scenario: 臂端整體內縮

- **WHEN** a valid divider has any non-zero arm direction
- **THEN** the arm's base support, transition, and upper wall MUST share the same 2.275 mm retracted endpoint
- **AND** no part of that arm's terminal profile MAY remain at the old nominal endpoint

#### Scenario: 不對稱臂長保留方向關係

- **WHEN** the four arm counts are not symmetric
- **THEN** the relative lengths and directions around the central junction MUST match the input counts after applying the same active-end retraction
- **AND** the generator MUST NOT silently recenter the junction independently of the generated shape

### Requirement: 預覽、bounds 與匯出

The committed divider MUST expose finite bounds, a non-empty mesh, and a single B-Rep solid. The wall base MUST be at `Z=0` and the complete bounds MUST include the peg bottom at `Z=-3` and the actual shortened 5 mm base support envelope. STEP and binary STL exports MUST be generated from the committed divider B-Rep and MUST be non-empty. Export filenames MUST identify the selected wall thickness and MUST retain the existing identity format for the normalized parameter fields.

#### Scenario: 可預覽的分隔牆

- **WHEN** a valid candidate passes generation
- **THEN** the viewport MUST display the requested shape, selected upper thickness, 45-degree base chamfer, rounded top, locating pegs, and retracted active arm ends
- **AND** the candidate MUST report finite bounds and a non-empty mesh

#### Scenario: STEP 與 STL 匯出

- **WHEN** the user exports a committed divider model
- **THEN** STEP and STL requests MUST use the committed model revision
- **AND** both downloads MUST contain non-empty geometry for the same normalized parameters, including wall thickness and the fixed active-end retraction
- **AND** exports with different wall thicknesses MUST have distinct deterministic filenames
