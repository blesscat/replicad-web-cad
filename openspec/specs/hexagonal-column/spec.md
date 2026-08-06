# hexagonal-column Specification

## Purpose

定義獨立的可調高度六角柱 component。模型以 `/Users/blesscat/Downloads/hexagonal.step` 的 mm 幾何特徵為參考，保留六角截面、直線倒角與固定端部倒角，並支援在同一輸出檔案中排列多個未融合的平行柱體。

## Requirements

### Requirement: Independent hexagonal-column component boundary

The system MUST register `hexagonal-column` as an independent component with its own contract, catalog definition, kernel builder, Worker dispatch, export metadata, and tests. It MUST NOT route this model through `hsw-cell`, `modular-grid-base`, or `box` component-specific builders, caches, or geometry constants.

#### Scenario: Hexagonal-column dispatch is explicit

- **WHEN** a valid `hexagonal-column` request is validated, generated, previewed, or exported
- **THEN** every dispatch point MUST resolve to the hexagonal-column component definition and component-local builder
- **AND** an unknown or missing registration MUST produce a diagnosable model error rather than falling through to another component

#### Scenario: Existing components remain unchanged

- **WHEN** the new component is enabled alongside `hsw-cell`, `modular-grid-base`, and `box`
- **THEN** existing model parameters, bounds, builders, template caches, filenames, and geometry behavior MUST remain unchanged

### Requirement: Height, count, gap, and orientation parameters

The system MUST provide integer `height`, `count`, and `gap` parameters in millimetres. `height` MUST represent the complete end-to-end outer length of every column and MUST be an integer from `1..999 mm`; `count` MUST be an integer from 1 through 20; and `gap` MUST be an integer from `1..99 mm`. The `orientation` parameter MUST be either `lying` or `standing`, where `lying` means the long axis is world X and `standing` means the long axis is world Z. When omitted, `height` MUST default to `8 mm`, `count` MUST default to `1`, `gap` MUST default to `1 mm`, and `orientation` MUST default to `lying`. The catalog MUST expose `height` as both a `1..200 mm` slider and a `1..999 mm` integer input, and MUST expose `gap` as both a `1..10 mm` slider and a `1..99 mm` integer input.

#### Scenario: Default parameter values

- **WHEN** a request omits height, count, and gap
- **THEN** the component MUST use `height=8 mm`, `count=1`, and `gap=1 mm`
- **AND** the generated column MUST use an overall height of `8 mm`
- **AND** its default orientation MUST be `lying` with the long axis along world X

#### Scenario: Three columns at height 50

- **WHEN** the component is generated with `height=50`, `count=3`, and the default gap
- **THEN** the model MUST contain three columns each with an overall length of `50 mm`
- **AND** the clear gap between adjacent columns MUST be `1 mm`

#### Scenario: Invalid parameters are rejected before CAD creation

- **WHEN** height is non-integer or outside `1..999`, count is non-integer or outside `1..20`, gap is non-integer or outside `1..99`, or orientation is not `lying` or `standing`
- **THEN** generation MUST be rejected before any native prototype, clone, or Compound is created
- **AND** the caller MUST receive the existing generic `INVALID_INPUT` validation error

### Requirement: Reference geometry and fixed sharp chamfers

The system MUST preserve the reference asset's millimetre convention, six-sided column profile, straight longitudinal corner chamfers, and sharp planar/linear edge character. In local X coordinates, the generated profile MUST match the reference at stations `0`, `0.2`, `height-0.2`, and `height` within workspace tolerance: the outer stations use the six-point end profile `[(0,2.219060),(1.921762,1.109530),(1.921762,-1.109530),(0,-2.219060),(-1.921762,-1.109530),(-1.921762,1.109530)]`, and the inner stations use the twelve-point chamfered body profile with outer extents Y=`±2.121762` and Z=`±2.350000`. Both end transitions MUST remain fixed at `0.2 mm` along the column axis for every valid height; the end transitions MUST NOT scale proportionally with height, and the component MUST NOT add rounded fillets.

#### Scenario: Overall height includes both fixed end transitions

- **WHEN** a column is generated with `height=50`
- **THEN** its outer bounds along the height axis MUST span exactly `50 mm` within workspace tolerance
- **AND** the straight central section MUST account for the remaining `49.6 mm` after the two fixed `0.2 mm` end transitions
- **AND** the local profile station coordinates MUST be at `0`, `0.2`, `49.8`, and `50 mm`

#### Scenario: End transition remains fixed across heights

- **WHEN** columns are generated with two different valid heights
- **THEN** each column's start and end transition lengths MUST remain `0.2 mm`
- **AND** only the central straight span MUST change with height

#### Scenario: Reference profile stations are preserved

- **WHEN** a valid column is generated at any legal integer height
- **THEN** the start and end cap profiles MUST match the six-point reference end profile within tolerance
- **AND** the body-start and body-end profiles MUST match the twelve-point reference chamfered profile within tolerance
- **AND** the transition faces MUST remain planar or ruled and MUST NOT introduce rounded geometry

#### Scenario: No generated rounded edges

- **WHEN** a valid column is finalized
- **THEN** the builder MUST NOT apply a fillet or rounded-corner stage
- **AND** the column's generated edge and face geometry MUST remain sharp according to the reference asset

### Requirement: Point-to-point orientation and centered placement

The system MUST normalize the reference asset's long local X axis to a canonical world-Z height axis, then rotate the cross-section `30°` around world Z. This fixed rotation MUST place the end-profile tips point-to-point along the row's world-Y direction while preserving a complete planar body face. For `standing`, every column MUST have its lower outer extent at `Z=0`, its upper outer extent at `Z=height`, and its cross-section centered in X/Y; the world cross-section outer extents MUST be X=`4.243524 mm` and Y=`4.700000 mm`. For `lying`, the canonical column MUST rotate 90° around world Y, center its long axis on X, and place its lower outer extent at `Z=0`; its world bounds MUST be X=`[-height/2,height/2]`, Y=`[-rowExtent/2,rowExtent/2]`, and Z=`[0,4.243524]`. Multiple columns MUST remain parallel and the complete row MUST be centered around `Y=0` in both orientations.

#### Scenario: Single column is vertical and point-to-point in world coordinates

- **WHEN** the component is generated with `count=1`
- **THEN** the measured world Z bounds MUST be approximately `[0, height]`
- **AND** the column's cross-section MUST remain centered around the world X/Y origin
- **AND** the two end-profile tips MUST lie on opposite sides of world Y
- **AND** the body profile MUST retain a complete planar face

#### Scenario: Default column lies along world X

- **WHEN** the component is generated without an orientation value
- **THEN** the measured world X bounds MUST be approximately `[-height/2,height/2]`
- **AND** the measured world Z bounds MUST be approximately `[0,4.243524]`
- **AND** the end-profile tips MUST remain point-to-point along world Y

#### Scenario: Standing orientation remains selectable

- **WHEN** the component is generated with `orientation=standing`
- **THEN** the measured world Z bounds MUST be approximately `[0,height]`
- **AND** the long axis MUST remain parallel to world Z

#### Scenario: Three columns are centered as a row

- **WHEN** the component is generated with `count=3`
- **THEN** all columns MUST share the same world Z range and orientation
- **AND** the first and last column centers MUST be symmetric around `Y=0`

### Requirement: Separate multi-column Compound output

The system MUST return one Shape3D/Compound containing exactly `count` independent Solid members. It MUST place columns by clone-and-translate and MUST NOT fuse, union, overlap, or otherwise merge adjacent columns. The output topology MUST remain separated by the requested gap.

#### Scenario: Three columns remain three solids

- **WHEN** a valid request has `count=3`
- **THEN** the generated Compound MUST contain exactly three Solid members
- **AND** each member MUST have the requested overall height and reference cross-section
- **AND** no Boolean fuse operation may be required to finalize the result

#### Scenario: One column uses the stable output contract

- **WHEN** a valid request has `count=1`
- **THEN** the output MUST use the same Shape3D/Compound contract as multi-column requests
- **AND** it MUST contain exactly one Solid member

### Requirement: Gap-based row layout

The system MUST arrange columns in one parallel row along world Y. The center-to-center pitch MUST equal the rotated reference cross-section's world-Y outer extent (`4.700000 mm`) plus `gap`; the first and last column centers MUST be symmetrically placed around Y=0. The generated model MUST reject an envelope that exceeds the configured workspace dimension limit.

#### Scenario: Default gap produces separated neighbors

- **WHEN** two adjacent columns are generated with the default `gap=1 mm`
- **THEN** their measured minimum clear separation along the layout direction MUST be `1 mm` within tolerance
- **AND** their B-Rep members MUST remain distinct

#### Scenario: Layout bounds grow by count and gap

- **WHEN** count or gap increases while the profile and height remain unchanged
- **THEN** the row envelope MUST grow by the corresponding cross-section pitch increments
- **AND** the envelope MUST remain centered around Y=0 until workspace validation rejects it

#### Scenario: Maximum legal row remains independently represented

- **WHEN** the component is generated with `height=50`, `count=20`, and `gap=1`
- **THEN** the Compound MUST contain exactly twenty Solid members
- **AND** the row bounds MUST remain centered around Y=0
- **AND** the complete envelope MUST remain within the configured workspace limit

#### Scenario: Oversized row is rejected before native assembly

- **WHEN** the requested count, height, or gap would exceed the configured workspace envelope
- **THEN** generation MUST return the existing generic `INVALID_INPUT` validation error
- **AND** it MUST NOT create a prototype, clone, or Compound

### Requirement: Efficient prototype reuse and native cleanup

The Worker MUST build or load the component reference geometry at most once per Worker epoch for reuse. Each valid generation MUST create at most one target-height prototype, clone and translate it for the requested count, and assemble the Compound without per-column STEP import or Boolean fuse. A benchmark MUST warm up once and run at least five measured iterations for `height=50`, `gap=1`, and `count=1`, `3`, and `20`, reporting median/P95 for reference/profile load, prototype build, clone/translate/Compound, mesh, and total. On the designated reference environment, warm `count=20` total P95 MUST be below `2 seconds`. All native prototype, clone, and Compound members MUST have explicit ownership and be released exactly once on generation failure, invalidation, or Worker disposal.

#### Scenario: Warm generation reuses the prototype path

- **WHEN** multiple valid requests run in one Worker epoch
- **THEN** the Worker MUST reuse cached reference/profile data
- **AND** each request MUST avoid importing the source STEP once per column
- **AND** the final shape MUST still contain the requested number of independent solids

#### Scenario: Warm benchmark meets the generation gate

- **WHEN** the designated benchmark runs the required warm-up and measured fixtures
- **THEN** it MUST report the required stage-level median/P95 values
- **AND** warm `count=20` total P95 MUST be below `2 seconds`
- **AND** the trace MUST show no per-column STEP import and no Boolean fuse

#### Scenario: Stale generation cleans separated members

- **GIVEN** a multi-column generation becomes stale during clone, translate, or Compound assembly
- **WHEN** cleanup runs
- **THEN** every uncommitted native shape MUST be released exactly once
- **AND** the Worker MUST remain able to generate a later request in the same epoch

### Requirement: Native ownership transfers are explicit

The builder MUST treat the generation-owned prototype, clones, and final Compound as distinct ownership states. Clones passed successfully to the Compound builder MUST transfer wrapper ownership to the Compound and MUST NOT be deleted again by the generation cleanup tracker. If Compound construction fails before transfer, all untransferred clones and the prototype MUST be deleted exactly once. Once the Compound is committed, callers MUST own only the Compound and MUST NOT retain or delete the consumed clone wrappers.

#### Scenario: Successful Compound construction transfers clone ownership

- **WHEN** all requested clones are passed to the Compound builder successfully
- **THEN** the resulting Compound MUST own the transferred Solid members
- **AND** generation cleanup MUST delete the prototype once and MUST NOT delete consumed clone wrappers a second time

#### Scenario: Compound construction failure cleans untransferred shapes

- **WHEN** Compound construction fails before all clone ownership transfers
- **THEN** the generation cleanup MUST release every untransferred clone and the prototype exactly once
- **AND** no native shape may remain owned only by a discarded temporary collection

### Requirement: Deterministic STEP and STL export metadata

The model catalog MUST provide deterministic STEP and STL filenames containing the serialized height, count, gap, and orientation. For `height=50`, `count=3`, `gap=1`, and the default `orientation=lying`, the filenames MUST be `hexagonal-column-50x3-g1-lying.step` and `hexagonal-column-50x3-g1-lying.stl`. STEP export MUST preserve the Compound's separate Solid members, and STL export MUST be generated from the committed Compound B-Rep using the existing Worker export lifecycle.

#### Scenario: Three-column STEP export preserves separate solids

- **WHEN** a ready `height=50`, `count=3`, `gap=1`, `orientation=lying` model is exported to STEP and re-imported
- **THEN** the downloaded filename MUST be `hexagonal-column-50x3-g1-lying.step`
- **AND** the re-imported result MUST contain three distinct Solid members with the requested separation

#### Scenario: Three-column STL export uses the committed model

- **WHEN** the same ready model is exported to STL
- **THEN** the downloaded filename MUST be `hexagonal-column-50x3-g1-lying.stl`
- **AND** the Worker MUST generate non-empty STL bytes from the committed Compound B-Rep
- **AND** the generated mesh MUST contain no triangle spanning the `1 mm` gap between adjacent columns
- **AND** the existing revision, epoch, validation, and download lifecycle MUST remain in force
