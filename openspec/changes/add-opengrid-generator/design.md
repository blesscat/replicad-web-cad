## Context

The previous implementation treated OpenGrid as a repeated 28 mm solid square with a 16 mm opening. The official generator instead builds a profiled tile from edge rails and corner nodes, applies side-specific connector cutouts, places screws on the internal tile-intersection lattice, and constructs Heavy as opposing profiled layers. The old product code, quality gate, benchmark, and UI schema therefore cannot be incrementally trusted.

The official reference is pinned to:

`AndyLevesque/QuackWorks/openGrid/openGrid.scad@61231295ea08c302eff32051769113c48cbda255`

The source header credits DavidD's OpenGrid design and states CC-BY-NC-SA for the OpenSCAD code and CC-BY for derived/generated parts. Keep attribution in the repository and perform license review before publishing.

## Goals / Non-Goals

**Goals:**

- Rebuild the geometry from the official source profile, not from the old benchmark profile.
- Preserve official Full, Lite, and Heavy interface behavior at a 28 mm pitch.
- Provide official screw mounting modes and generic screw dimensions, with a clear internal-intersection custom matrix.
- Provide official connector cutouts with independent side controls and official chamfer behavior.
- Rebuild benchmark and quality evidence around the selected `cell-balanced` production assembly strategy.
- Prove official solid-geometry parity with pinned OpenSCAD reference fixtures before release sign-off.
- Preserve the existing Worker, candidate, preview, persistence, export, and route lifecycle.

**Non-Goals:**

- Running OpenSCAD in the browser or adding a runtime dependency on the official generator.
- Supporting the official generator's stacking, fill-space, adhesive-base, or arbitrary tile-shape modes in this change.
- Promising byte-identical STL bytes across different CAD tessellators. Compatibility is established by the pinned source's solid geometry, profile probes, envelope/volume tolerances, representative Z-section occupancy, and reference fixtures.
- Keeping old incompatible OpenGrid persisted snapshots or the old 10×10 failure rule.

## Decisions

### 1. Treat the pinned official source as the profile contract

Extract the source constants into a repository-owned OpenGrid profile module, with source comments and a pinned commit:

- tile pitch 28;
- Full thickness 6.8, Lite thickness 4, Heavy thickness 13.8;
- Heavy gap 0.2;
- outside extrusion 0.8;
- inner top chamfer 0.4;
- middle chamfer 1;
- top capture inset 2.4;
- corner square thickness 2.6;
- intersection distance 4.2;
- inner tile size 25;
- connector primary radius 2.6, dimple radius 2.7, separation 2.5, height 2.4; and
- official screw defaults 4.1/7.2/1/true/90°.

The source's mesh-driving resolutions are part of the compatibility boundary:
official screw cutters use the enclosing OpenGrid `$fn=30`, while connector
profiles use `$fn=50` for their circular pieces. The Replicad cutter helpers
must preserve those polygonal profiles rather than silently replacing them
with ideal circular cutters.

The profile builder will use Replicad sketches/faces and booleans to reproduce the source's edge-rail, corner-node, chamfer, connector, and screw geometry. A flat plate or invented 16 mm opening is not an acceptable fallback.

### 2. Use an official semantic parameter model

The domain contract will replace the old schema:

- Screw positions are `{ row, column }` on the `(rows-1) × (columns-1)` internal intersection lattice. World coordinates follow the source's top-to-bottom custom string order and 28 mm spacing.
- Screw dimensions are generic official fields. `official-default` is a named preset; `custom` uses the normalized numeric fields. There are no hardcoded M3/M4/M5 counterbore semantics in the official compatibility contract.
- Connector control is an enable flag plus four side flags. Positions are internal seams along each eligible board edge, and the cutter is the official non-circular profile.
- Chamfer control is a mode plus four outer-corner flags.

The UI may offer convenience presets later, but every generated result is determined by the normalized official dimensions and positions.

### 3. Build and validate one canonical official tile, then assemble

The builder will first produce a canonical profiled tile at the origin. Product strategies may repeat/fuse canonical tiles or build a whole-board profile, but all strategies must consume the same canonical tile and cutter helpers. Full/Lite use their source profile; Heavy composes the source's opposing layers and middle projected layer.

The benchmark also includes a `prototype-template` path matching the existing
saved-template components: it persists one feature-free 1×1 STEP prototype for
each Full/Lite/Heavy variant, loads and caches that prototype in the Worker,
clones/translates it for the requested grid, fuses the grid, and applies the
request's screws, connectors, and chamfers as final post-processing. Feature
positions are intentionally not baked into the saved prototype. This path is
an explicit benchmark candidate only; it is not a product fallback. The product
builder dispatches `cell-balanced` for Full, Lite, and Heavy.

An opt-in official-reference fixture harness renders the pinned SCAD with a
developer-installed OpenSCAD, exports the corresponding binary STL, and
compares the Replicad candidate's bounds, solid volume, and representative
Z-section occupancy. It covers feature-free 1×1, feature-free 2×2, default
2×2, screw-only 2×2, connector-only 2×2, and chamfer-only 2×2 fixtures for all
three variants. The harness is a release gate and diagnostic tool; OpenSCAD is
not loaded by the browser or Worker.

The quality gate will use profile probes rather than only bounds and a center hole. It will check the 25 mm inner clear region, rail/capture cross-sections, corner behavior, connector envelope/direction, screw intersection positions, and Heavy gap/layers. This prevents a geometrically valid but OpenGrid-incompatible plate from passing.

### 4. Re-benchmark before selecting production strategy

The old `row-block-v1` decision is revoked. Benchmark the official profile with the existing candidate strategies (whole-profile, row-block, cell-balanced, and prototype-template) or a revised set if the official tile requires it. Record one non-pending strategy only after the new profile passes all representative quality/export fixtures. The product builder must dispatch only the selected strategy and must not silently retry another one.

The initial prototype experiment does not change that product decision: Full
2×2 passed and was faster, Full 5×5 passed with similar total time because
post-processing dominated, while Full 10×10 with all screws, connectors, and
everywhere chamfers exceeded the 240-second exploratory timeout. Until a
batched or partitioned post-processing design is proven, `cell-balanced` is the
selected product strategy and `prototype-template` remains an opt-in benchmark
candidate. Final release sign-off still depends on the complete representative
matrix and export gates.

### 5. Make the official source boundary visible in the UI and artifacts

The OpenGrid panel will name controls after official concepts: board variant, chamfers, connector sides, screw mounting mode, screw dimensions, row/column intervals, and internal screw intersections. It will not show the old "16 mm opening", four slots per cell, or small/large connector terminology.

### 6. Reset persistence compatibility for the incompatible schema

The persisted OpenGrid entry will be validated against the new typed schema. Old entries that contain `m3-through`, `m4-counterbore`, `m5-counterbore`, four-slot positions, or `small`/`large` connectors are invalid and fall back to the official defaults. Existing non-OpenGrid model entries remain backward-compatible.

## Risks / Trade-offs

- **[Replicad profile differs subtly from OpenSCAD]** → Pin the source, add profile cross-section/probe tests, inspect reference fixtures, and do not call the output compatible until the gate passes.
- **[Profile assembly may be slower than the old plate]** → Benchmark whole-profile, row-block, and cell-balanced assembly after the profile is correct; optimize only after quality evidence.
- **[Heavy booleans are expensive]** → Build and reuse canonical profiled layers, batch cuts, yield at safe boundaries, and track native ownership.
- **[Official screw custom positions are an intersection matrix, not a cell matrix]** → Label the UI accordingly and validate `(rows-1) × (columns-1)` coordinates.
- **[Official source license applies to derived implementation]** → Retain source URL, commit, credits, and license notes in code/docs; complete a repository license review before release.

## Migration Plan

1. Replace the OpenSpec contract and reset implementation tasks around the pinned official source.
2. Replace the domain types/profile and invalidate old OpenGrid persistence snapshots.
3. Rebuild canonical tile, connector, screw, chamfer, Heavy, quality, and benchmark geometry.
4. Adapt catalog, Worker, UI, persistence, exports, and tests to the new typed snapshot.
5. Run the official-profile release matrix and record strategy evidence.
6. Dispatch independent OpenSpec compliance review. Only then consider the normal merge/publish decision.

## Open Questions

None for the compatibility boundary. Stacking, fill-space, adhesive base, and arbitrary tile shapes remain separate future changes. Convenience screw presets may be added later, but must compile to the official generic screw dimensions.
