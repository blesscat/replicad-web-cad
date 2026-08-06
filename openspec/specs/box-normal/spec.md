# box-normal Specification

## Requirements

### Requirement: box-normal parameters and defaults

The system MUST provide an independent `box-normal` component with exactly four typed parameters: integer `x`, integer `y`, integer `height`, and boolean `cornerPosts`. `x` MUST be in the inclusive range 2–40, `y` MUST be in the inclusive range 2–35, and `height` MUST be a safe integer in the inclusive range 10–500 mm. `cornerPosts` MUST default to true. The default parameter snapshot MUST be `x=2`, `y=2`, `height=10`, and `cornerPosts=true`.

#### Scenario: Default box-normal parameters

- **WHEN** a user opens `/cad/box-normal` without a valid saved `box-normal` entry
- **THEN** the component MUST initialize with `x=2`, `y=2`, `height=10`, and `cornerPosts=true`
- **AND** the first valid generation MUST use those typed values

#### Scenario: Valid parameter limits

- **WHEN** `x`, `y`, and `height` are supplied as integer values within their configured ranges and `cornerPosts` is boolean
- **THEN** component validation MUST accept the complete parameter snapshot
- **AND** the accepted value MUST preserve the typed boolean and integer values without rounding

#### Scenario: Invalid box-normal parameters

- **WHEN** any parameter is missing, fractional, non-finite, outside its range, or has an unsupported type
- **THEN** validation MUST reject the snapshot with a field-specific or parameter-level diagnostic issue
- **AND** the Worker MUST NOT receive a `model.generate` request for that invalid snapshot

### Requirement: Grid-derived footprint and clearance

The system MUST interpret one X grid as 10.219 mm and one Y grid as 11.8 mm. For `x` and `y`, the nominal footprint MUST be `x × 10.219` by `y × 11.8` mm. The generated box body MUST reduce the total X dimension by 0.15 mm and the total Y dimension by 0.15 mm, remain centered on the world X/Y origin, and use the reduced dimensions for its outer envelope. The 0.15 mm reduction MUST NOT shift the corner-post centers away from the nominal grid.

#### Scenario: 2 × 2 footprint

- **WHEN** `box-normal` is generated with `x=2` and `y=2`
- **THEN** the nominal footprint MUST be 20.438 × 23.600 mm
- **AND** the body outer footprint MUST be 20.288 × 23.450 mm within the configured bounds tolerance
- **AND** the body MUST remain centered on X/Y

#### Scenario: Maximum configured footprint

- **WHEN** `box-normal` is generated with `x=40` and `y=35`
- **THEN** the nominal footprint MUST be 408.760 × 413.000 mm
- **AND** the body outer footprint MUST be 408.610 × 412.850 mm within tolerance

### Requirement: Reference-preserving open box geometry

The system MUST package a component-local `box-normal.step` asset and treat it as the sole canonical geometry source. It MUST validate the asset as a non-empty millimetre single-solid reference with an approximately 20.438 × 23.600 × 10 mm **un-cleared nominal** envelope and an open-top box profile, then record profile checkpoints measured from that asset for the outer corner radius, floor/wall thickness, inner opening, the 0.5 mm bottom outer chamfer, and the 0.6 mm top opening chamfer. Generated `box-normal` bodies MUST preserve those canonical checkpoints while extending only the straight X/Y and Z regions for the requested dimensions. The 2 × 2 × 10 generated body MUST compare its outer envelope with a derived clearanced fixture of 20.288 × 23.450 mm, while comparing clearance-invariant profile checkpoints and valid-solid structure with the canonical asset within the configured tolerance. The builder MUST NOT use non-uniform scaling of the complete STEP asset as its general resize algorithm.

#### Scenario: Reference asset validation

- **WHEN** the Worker loads the component-local `box-normal.step` asset
- **THEN** it MUST validate the asset units, non-empty B-Rep, single-solid structure, envelope and open-top orientation
- **AND** an invalid or missing asset MUST produce a diagnosable component asset error

#### Scenario: Height extension preserves the profile

- **WHEN** a valid box-normal body is generated with `height` greater than 10 mm
- **THEN** the body MUST extend its straight wall region along Z
- **AND** the fixed reference bottom and top transition regions MUST remain present
- **AND** the generated body MUST remain a valid solid with an open top

#### Scenario: Canonical profile checkpoints

- **WHEN** the 2 × 2 × 10 reference fixture is compared with the component-local `box-normal.step`
- **THEN** the implementation MUST compare the measured outer corner, floor/wall, inner-opening, bottom-transition, and top-transition checkpoints
- **AND** the comparison MUST use values derived from the supplied STEP rather than newly invented profile dimensions
- **AND** the outer-envelope comparison MUST apply the symmetric total 0.15 mm X/Y clearance before comparing bounds

#### Scenario: Canonical bottom and top opening chamfers

- **WHEN** a 2 × 2 × 10 `box-normal` body is generated without posts
- **THEN** the outer lower perimeter MUST transition from the reduced bottom station at Z=0 to the full outer station at Z=0.5 mm
- **AND** the inner opening MUST remain at the wall station through Z=9.4 mm and expand by 0.6 mm per side to the top opening at Z=10 mm
- **AND** both transitions MUST be represented by straight 45-degree B-Rep faces rather than a sharp corner or an omitted transition

### Requirement: Optional four-corner hexagonal posts

When `cornerPosts=true`, the system MUST add exactly four separate-positioned instances of the existing `hexagonal-column` low-level 7 mm standing profile. The externally exposed post span MUST be exactly 7 mm from Z=0 through Z=7, the posts MUST point downward from the body interface toward Z=0, and their centers MUST be at every combination of:

```text
x = ±((xCount - 1) × 10.219 / 2)
y = ±((yCount - 1) × 11.8 / 2)
```

The box body MUST have its nominal lower interface at Z=7 and its top at Z=`7 + height` when posts are enabled, and the posts MUST be fused to the body into one valid solid. A hidden positive-overlap connector or extension MAY be used inside the body solely to stabilize the Boolean fuse, but it MUST NOT change the external Z bounds or the 7 mm exposed post span. When `cornerPosts=false`, no post geometry MUST be generated and the box body MUST start at Z=0. The post cross-section MUST have its two opposing upper/lower sides parallel to world X, so the X-aligned sides are flat rather than presenting a point toward ±Y. The post end attached to the box underside at Z=7 MUST use the full body hexagonal profile without an end chamfer; only the downward insertion end MAY retain the existing 0.2 mm transition.

#### Scenario: 2 × 2 post centers

- **WHEN** `box-normal` is generated with `x=2`, `y=2`, and `cornerPosts=true`
- **THEN** exactly four post centers MUST be located at X=±5.1095 mm and Y=±5.9 mm within tolerance
- **AND** the exposed posts MUST span Z=0–7 mm
- **AND** the body MUST occupy Z=7–`7 + height`
- **AND** the post cross-section MUST have flat X-aligned upper/lower sides
- **AND** the post-to-box attachment face MUST not contain the 0.2 mm end transition

#### Scenario: Maximum-grid post centers

- **WHEN** `box-normal` is generated with `x=40`, `y=35`, and `cornerPosts=true`
- **THEN** the four post centers MUST be at X=±199.2705 mm and Y=±200.6 mm within tolerance
- **AND** no additional posts MUST be created at interior grid positions

#### Scenario: Posts disabled

- **WHEN** `cornerPosts=false`
- **THEN** the generated shape MUST contain no corner-post geometry
- **AND** the body MUST start at Z=0 with a maximum Z bound equal to `height`

### Requirement: B-Rep output and generation performance

The `box-normal` builder MUST be independent of the existing `box`, `modular-grid-base`, `hsw-cell`, and `hexagonal-column` component builders. It MAY reuse a low-level hexagonal-column profile helper, but it MUST own its own parameterized body assembly, asset lifecycle, and model definition. A valid request MUST produce a non-empty shape suitable for exact mesh generation and STEP/STL export. Generation MUST use one body prototype and at most four post clones, so its geometry operation count MUST remain O(1) with respect to X/Y grid counts. A test-visible benchmark counter MUST use this expected assembly table for every 2 × 2, 3 × 3, and 40 × 35 fixture, with and without posts: no posts `{bodyPrototype: 1, postInstances: 0, placements: 0, assemblyFuses: 0, gridCellBuilds: 0}`; posts `{bodyPrototype: 1, postInstances: 4, placements: 4, assemblyFuses: 4, gridCellBuilds: 0}`. Any hidden connector MUST be included in the corresponding post/assembly operation and MUST NOT add grid-dependent work. The benchmark MUST warm up once, measure at least five runs for build, mesh, and total generation, and report median/P95 without imposing a hardware-dependent absolute millisecond threshold.

#### Scenario: Single-solid output with posts

- **WHEN** a valid `box-normal` request enables corner posts
- **THEN** the final B-Rep MUST be a valid single solid with non-zero volume
- **AND** mesh, STEP export, and STL export MUST all produce non-empty output

#### Scenario: Fast maximum-grid generation

- **WHEN** a valid `box-normal` request uses `x=40`, `y=35`, and any valid height
- **THEN** generation MUST NOT create one B-Rep cell per grid position
- **AND** the Worker MUST complete through the fixed prototype/post assembly path while preserving latest-wins cancellation and native-shape cleanup

#### Scenario: Fixed operation-count benchmark

- **WHEN** the benchmark runs 2 × 2, 3 × 3, and 40 × 35 requests with posts enabled and disabled
- **THEN** the test-visible body, clone, translation, and fuse operation counts MUST remain constant for each posts mode
- **AND** the benchmark MUST report median/P95 results and MUST NOT create one B-Rep cell per grid position

### Requirement: box-normal typed checkbox contract

The contract MUST define `BoxNormalParameterKey` as `x | y | height | cornerPosts` and include it in the model parameter key/error types. The numeric catalog schema MUST contain only `x`, `y`, and `height`; `cornerPosts` MUST be rendered by a custom checkbox control. `rawFromParameters` MUST serialize the boolean as exactly `true` or `false`, and `parseRawParameters` MUST accept exactly those two strings, reject missing/other values, and report an issue on `cornerPosts`. The checkbox MUST set `aria-invalid` and `aria-describedby` when that issue exists.

#### Scenario: Checkbox raw/typed conversion

- **WHEN** a user checks or unchecks the custom corner-post checkbox
- **THEN** the raw workspace value MUST be exactly `true` or `false`
- **AND** the validated Worker parameter MUST be a typed boolean
- **AND** any other raw value MUST invalidate the snapshot without sending `model.generate`

### Requirement: box-normal catalog, controls, bounds, and filenames

The system MUST expose `box-normal` through the model catalog and `/cad/box-normal` route with X/Y integer sliders, a height integer slider/text input, and a `cornerPosts` checkbox defaulting to checked. The model definition MUST report centered X/Y bounds and a Z minimum of 0. With posts enabled, the maximum Z bound MUST be `height + 7`; with posts disabled, it MUST be `height`. STEP and STL filenames MUST be deterministic using the pattern `box-normal-{x}x{y}-h{height}-{posts|plain}` with the corresponding extension.

#### Scenario: Controls expose the confirmed ranges

- **WHEN** a user views the `box-normal` parameter panel
- **THEN** X MUST expose a 2–40 integer slider
- **AND** Y MUST expose a 2–35 integer slider
- **AND** height MUST expose integer values from 10–500 mm through slider/text controls
- **AND** the corner-post checkbox MUST be checked by default

#### Scenario: Deterministic export metadata

- **WHEN** `x=2`, `y=2`, `height=10`, and `cornerPosts=true` are exported
- **THEN** the STEP filename MUST be `box-normal-2x2-h10-posts.step`
- **AND** the STL filename MUST be `box-normal-2x2-h10-posts.stl`
