## MODIFIED Requirements

### Requirement: 獨立的分隔牆參數契約

The system MUST expose a runtime-validated component with stable `modelId=opengrid-divider`. Its normalized parameters MUST include non-negative `left`, `right`, `up`, and `down` arm counts that are multiples of 0.5 grid, an integer `height` in millimetres, and an integer `wallThickness` from 1 through 5 mm. One full divider grid MUST be 14 mm, one half-grid MUST be 7 mm, and the divider grid definition MUST NOT be inherited from the official 28 mm `opengrid` component. The default `wallThickness` MUST be 2 mm.

#### Scenario: 合法分隔牆參數

- **WHEN** `left`、`right`、`up`、`down` are non-negative 0.5-grid multiples, at least two adjacent or opposite directions are non-zero, `height` is an integer from 2 through 500 mm, and `wallThickness` is an integer from 1 through 5 mm
- **THEN** the component MUST accept the normalized snapshot
- **AND** the generated arm lengths MUST use 14 mm per configured full grid unit and 7 mm per half-grid unit
- **AND** the snapshot MUST remain independent from `modelId=opengrid`

#### Scenario: 不支援的形狀被拒絕

- **WHEN** fewer than two directions are non-zero, or the values are not 0.5-grid multiples, negative, non-finite, or outside the supported height or `wallThickness` range
- **THEN** validation MUST fail with field-specific diagnostics
- **AND** the system MUST NOT send the snapshot for CAD generation or export

### Requirement: 連續 5 mm 分隔牆幾何

The generated body MUST be a continuous connected divider whose base support has a 5 mm plan width and whose upper wall has the selected `wallThickness` plan width. For a thinner upper wall, the base support MUST retain the configured geometry-safety ledge at `Z=0` before the planar chamfer begins. The arm centerlines MUST meet at the central junction. The body MUST use the configured height, start at `Z=0`, and remain a single connected solid after the arms and profile transitions are joined. The central junction MUST remain the construction anchor even when the four arm counts are asymmetric.

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

#### Scenario: 不對稱臂長保留方向關係

- **WHEN** the four arm counts are not symmetric
- **THEN** the relative lengths and directions around the central junction MUST match the input counts
- **AND** the generator MUST NOT silently recenter the junction independently of the generated shape

### Requirement: 側邊圓角

The generator MUST round the vertical side edges of the divider with the existing nominal 2.5 mm profile where the local 5 mm base supports it. On thinner upper walls, the side-rounding radius MUST be limited to a geometrically stable value no greater than half of the local wall thickness. The side rounding MUST coexist with the separate 1 mm upper-perimeter fillet and the 45-degree base chamfer. The bottom wall edge and locating-peg edges MUST remain sharp.

#### Scenario: 薄牆側邊圓角穩定

- **WHEN** a valid divider with `wallThickness` from 1 through 5 mm is generated
- **THEN** the upper wall side profile MUST remain valid and connected
- **AND** its side-rounding radius MUST NOT exceed the local upper wall half-width
- **AND** the 5 mm base support MUST retain the largest stable side rounding allowed by its profile

#### Scenario: 圓角與頂部輪廓共存

- **WHEN** a valid divider with an active arm is generated
- **THEN** the side rounding MUST coexist with the separate 1 mm upper-perimeter rounding and the base chamfer
- **AND** the bottom wall edge and locating-peg edges MUST remain sharp

### Requirement: 預覽、bounds 與匯出

The committed divider MUST expose finite bounds, a non-empty mesh, and a single B-Rep solid. The wall base MUST be at `Z=0` and the complete bounds MUST include the peg bottom at `Z=-3` and the actual 5 mm base support envelope. STEP and binary STL exports MUST be generated from the committed divider B-Rep and MUST be non-empty. Export filenames MUST identify the selected wall thickness.

#### Scenario: 可預覽的分隔牆

- **WHEN** a valid candidate passes generation
- **THEN** the viewport MUST display the requested shape, selected upper thickness, 45-degree base chamfer, rounded top, and locating pegs
- **AND** the candidate MUST report finite bounds and a non-empty mesh

#### Scenario: STEP 與 STL 匯出

- **WHEN** the user exports a committed divider model
- **THEN** STEP and STL requests MUST use the committed model revision
- **AND** both downloads MUST contain non-empty geometry for the same normalized parameters, including wall thickness
- **AND** exports with different wall thicknesses MUST have distinct deterministic filenames

## ADDED Requirements

### Requirement: 底部 45 度斜角過渡

When the selected upper wall is thinner than the 5 mm base support, the generated profile MUST retain the configured geometry-safety ledge at `Z=0` and then use a symmetric planar 45-degree chamfer rather than a rounded shoulder or an abrupt sharp step. The chamfer MUST use equal horizontal and vertical runs whenever the requested height permits; if the minimum height leaves insufficient room, its vertical rise MAY be capped at `height - 2 * geometrySafetyMargin` while preserving the selected upper wall at the top. When the selected upper wall is 5 mm, the chamfer and the extra ledge MUST be omitted.

#### Scenario: 2 mm 上牆的 45 度斜角過渡

- **WHEN** a valid divider is generated with `wallThickness=2`
- **THEN** the 5 mm base support MUST blend into the 2 mm upper wall through a symmetric 45-degree planar chamfer
- **AND** the transition MUST not expose a curved fillet surface
- **AND** the generated result MUST remain one valid solid

#### Scenario: 極薄牆的穩定斜角

- **WHEN** a valid divider is generated with `wallThickness=1`
- **THEN** the transition MUST use a stable 45-degree profile whenever the requested height permits, without self-intersection or a zero-thickness region, after the geometry-safety ledge
- **AND** the generator MUST return a diagnostic geometry error rather than a partial result if no valid chamfered profile can be constructed

#### Scenario: 5 mm 上牆不產生多餘斜角

- **WHEN** a valid divider is generated with `wallThickness=5`
- **THEN** the base and upper wall MUST remain a continuous 5 mm profile
- **AND** no separate chamfer feature MUST be added
