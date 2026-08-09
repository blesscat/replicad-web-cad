## Purpose

提供適用於自製 14 mm 整格／7 mm 半格 OpenGrid 底座的獨立分隔牆產生器，讓使用者以四方向 0.5 格步進建立可調高度、具底部定位柱與頂部圓角的可匯出 CAD 零件。

## ADDED Requirements

### Requirement: 獨立的分隔牆參數契約

The system MUST expose a runtime-validated component with stable `modelId=opengrid-divider`. Its normalized parameters MUST include non-negative `left`, `right`, `up`, and `down` arm counts that are multiples of 0.5 grid, plus an integer `height` in millimetres. One full divider grid MUST be 14 mm, one half-grid MUST be 7 mm, and the divider grid definition MUST NOT be inherited from the official 28 mm `opengrid` component.

#### Scenario: 合法分隔牆參數

- **WHEN** `left`、`right`、`up`、`down` are non-negative 0.5-grid multiples, at least two adjacent or opposite directions are non-zero, and `height` is an integer from 2 through 500 mm
- **THEN** the component MUST accept the normalized snapshot
- **AND** the generated arm lengths MUST use 14 mm per configured full grid unit and 7 mm per half-grid unit
- **AND** the snapshot MUST remain independent from `modelId=opengrid`

#### Scenario: 不支援的形狀被拒絕

- **WHEN** fewer than two directions are non-zero, or the values are not 0.5-grid multiples, negative, non-finite, or outside the supported height range
- **THEN** validation MUST fail with field-specific diagnostics
- **AND** the system MUST NOT send the snapshot for CAD generation or export

### Requirement: 依四方向格數判定形狀

The system MUST derive the displayed shape from the non-zero direction counts and MUST NOT require a separate shape selector. Exactly two opposite non-zero directions MUST be classified as a straight line, exactly two adjacent non-zero directions MUST be classified as an L shape, exactly three non-zero directions MUST be classified as a T shape, and all four non-zero directions MUST be classified as a cross shape.

#### Scenario: 一字型

- **WHEN** `left=1`, `right=1`, `up=0`, and `down=0`
- **THEN** the UI and normalized geometry metadata MUST identify the result as a horizontal straight line
- **AND** its centerline span MUST be 28 mm

#### Scenario: T 型

- **WHEN** `left=1`, `right=1`, `up=2`, and `down=0`
- **THEN** the UI and normalized geometry metadata MUST identify the result as a T shape
- **AND** its horizontal centerline span MUST be 28 mm
- **AND** its upward centerline arm length MUST be 28 mm

#### Scenario: L 型與十字型

- **WHEN** exactly two adjacent directions are non-zero
- **THEN** the result MUST be classified as an L shape
- **WHEN** all four directions are non-zero
- **THEN** the result MUST be classified as a cross shape

### Requirement: 連續 5 mm 分隔牆幾何

The generated body MUST be a continuous 5 mm wide planar divider wall whose arm centerlines meet at the central junction. The body MUST use the configured height, start at `Z=0`, and remain a single connected solid after the arms are joined. The central junction MUST remain the construction anchor even when the four arm counts are asymmetric.

#### Scenario: 5 mm 寬度與高度

- **WHEN** a valid divider snapshot is generated
- **THEN** every wall arm MUST have a 5 mm plan width
- **AND** the wall top MUST be at the requested height
- **AND** the bottom of the wall MUST be at `Z=0`

#### Scenario: 不對稱臂長保留方向關係

- **WHEN** the four arm counts are not symmetric
- **THEN** the relative lengths and directions around the central junction MUST match the input counts
- **AND** the generator MUST NOT silently recenter the junction independently of the generated shape

### Requirement: 依長度自動配置底部定位柱

The generator MUST automatically add cylindrical locating pegs with nominal diameter 5 mm and downward length 1 mm. It MUST place one peg at the central junction, then consider positions every 28 mm (four 7 mm half-grids) along each active arm and emit only positions strictly inside that arm. This MUST keep the maximum initial empty run to four half-grid intervals, avoid dense placement, emit repeated coordinates only once, and fuse every peg to the wall so the result remains one connected solid.

#### Scenario: 短分隔牆定位柱

- **WHEN** `left=1`, `right=1`, `up=1`, and `down=1` form a 3×3 cross
- **THEN** the generator MUST create exactly the central peg and no arm peg
- **AND** each peg MUST be 5 mm in diameter and extend 1 mm below the wall base

#### Scenario: 長臂自動增加支撐

- **WHEN** an arm grows beyond another 28 mm interior locating position
- **THEN** that arm MUST gain one additional peg at the next deterministic 28 mm position
- **AND** existing peg positions MUST remain deterministic

#### Scenario: 分支位置去重

- **WHEN** multiple arms meet at the central junction
- **THEN** only one central peg MUST be created at that coordinate
- **AND** no duplicate peg solids may be produced

### Requirement: 頂部圓角

The generator MUST round the upper wall perimeter with a nominal 1 mm fillet. The fillet MUST apply to the wall top edges only; the bottom wall edge and locating-peg edges MUST remain sharp. Inputs that cannot accommodate the required fillet MUST fail validation or generation with a diagnosable error rather than producing a partial shape.

#### Scenario: 頂部圓角存在

- **WHEN** a valid divider is generated
- **THEN** the upper wall perimeter MUST contain the requested 1 mm rounding
- **AND** the exported B-Rep and preview MUST include the rounded geometry

#### Scenario: 圓角幾何無法成立

- **WHEN** the requested height or wall profile cannot support the 1 mm top fillet
- **THEN** the generator MUST return a diagnosable geometry error
- **AND** it MUST NOT commit or export a partial result

### Requirement: 預覽、bounds 與匯出

The committed divider MUST expose finite bounds, a non-empty mesh, and a single B-Rep solid. The wall base MUST be at `Z=0` and the complete bounds MUST include the peg bottom at `Z=-1`. STEP and binary STL exports MUST be generated from the committed divider B-Rep and MUST be non-empty.

#### Scenario: 可預覽的分隔牆

- **WHEN** a valid candidate passes generation
- **THEN** the viewport MUST display the requested shape, height, rounded top, and locating pegs
- **AND** the candidate MUST report finite bounds and a non-empty mesh

#### Scenario: STEP 與 STL 匯出

- **WHEN** the user exports a committed divider model
- **THEN** STEP and STL requests MUST use the committed model revision
- **AND** both downloads MUST contain non-empty geometry for the same normalized parameters

### Requirement: 不與官方 OpenGrid 相容性混淆

The divider component MUST be documented and identified as a custom 14 mm full-grid/7 mm half-grid accessory. It MUST NOT claim official 28 mm OpenGrid Full/Lite/Heavy compatibility, and changes to the divider contract MUST NOT alter existing `opengrid` or `opengrid-stackable-box` behavior.

#### Scenario: 既有 OpenGrid 行為保持不變

- **WHEN** a user generates the existing `opengrid` or `opengrid-stackable-box` model
- **THEN** its existing model id, parameter validation, geometry route, and export behavior MUST remain unchanged by the divider component
