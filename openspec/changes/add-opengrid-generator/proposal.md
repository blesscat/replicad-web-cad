## Why

The first implementation used the 28 mm pitch as a proxy for the complete OpenGrid geometry. That produced a square plate with 16 mm openings, four screw slots per cell, and cylindrical edge holes. Those choices do not match the official OpenGrid tile profile or the official generator's placement rules, so the result cannot be used as an OpenGrid-compatible board.

This change must be rebuilt around the official OpenGrid generator source and must prove interface compatibility before the product route is enabled.

## What Changes

- Replace the current OpenGrid-like geometry with a Replicad implementation derived from the official OpenGrid OpenSCAD profile pinned to commit `61231295ea08c302eff32051769113c48cbda255`.
- Match the official 28 mm tile pitch, Full/Lite profiles, later Heavy double-sided construction, outer corner chamfers, inner capture profile, and board envelope.
- Replace the four-slot-per-cell screw model with the official screw mounting modes: none, corners, everywhere, by-row-and-column, and custom positions on the internal tile-intersection lattice.
- Replace fixed M3/M4/M5 cutter assumptions with the official configurable screw dimensions: screw diameter, head diameter, head inset, countersunk toggle, and countersunk angle. The UI may provide a named official-default preset, but the normalized dimensions remain authoritative.
- Replace cylindrical small/large connector holes with the official edge connector cutout profile and independent top/right/bottom/left side controls.
- Add official chamfer mode and per-corner controls required to reproduce the reference generator defaults.
- Rebuild the benchmark against the official profile before selecting the production assembly strategy. The old benchmark results and the old 16 mm quality gate are invalid and must not be reused. The current product implementation uses `cell-balanced` for Full, Lite, and Heavy; the release matrix remains the final release gate.
- Add an opt-in official-reference gate that renders the pinned SCAD with OpenSCAD and compares the Replicad candidate's envelope, solid volume, and representative Z-section occupancy for Full/Lite/Heavy feature combinations. The production builder must remain independently executable in Replicad; OpenSCAD is a developer-only reference tool.
- Include an existing-component-style prototype candidate that saves one feature-free 1×1 STEP template per variant, fuses translated copies, and performs configurable holes/chamfers as post-processing; keep it as an explicit benchmark candidate rather than a product fallback unless a future release benchmark proves it suitable.
- Preserve the existing catalog, Worker, latest-wins, persistence, preview, STEP, STL, and route behavior for the other models.

## Capabilities

### New Capabilities

- `opengrid-generator`: Defines the official-profile OpenGrid parameters, geometry, compatibility checks, lifecycle, UI, persistence, and exports.

### Modified Capabilities

- `home-model-selection`: Keep OpenGrid in the chooser, but describe its official Full/Lite/Heavy profile and controls accurately.
- `cad-workspace`: Replace the old OpenGrid cell-opening and four-slot controls with official profile, screw-lattice, connector-side, and chamfer controls.
- `component-parameter-persistence`: Persist the new normalized official-profile snapshot and reject the old incompatible snapshot shape.

## Reference and Compatibility Boundary

The authoritative implementation reference is the official-linked OpenSCAD source:

`https://github.com/AndyLevesque/QuackWorks/blob/61231295ea08c302eff32051769113c48cbda255/openGrid/openGrid.scad`

The source credits DavidD's OpenGrid design and BlackjackDuck's OpenSCAD implementation. The source header specifies CC-BY-NC-SA for the code and CC-BY for derived/generated parts; the repository implementation must retain attribution and complete a license review before publication.

Compatibility means the generated board is the same solid geometry as the pinned official generator within an explicit comparison tolerance, not merely the 28 mm pitch. Reference fixtures must verify profile dimensions, screw/connector locations, variant thickness, Heavy construction, envelope, solid volume, representative Z-sections, and exportability against the pinned source. Byte-for-byte STL equality is intentionally not the gate because OpenSCAD and Open Cascade use different mesh tessellators; the implementation must nevertheless reproduce the official `$fn=30` screw and `$fn=50` connector profiles before comparison.

## Impact

- Affected areas remain `src/cad-contract`, the model catalog, OpenGrid UI, `src/cad-kernel`, the CAD Worker, benchmark code, and tests.
- The Worker protocol remains version 1; only the typed OpenGrid parameter payload changes.
- No OpenSCAD runtime or external CAD asset is added. The official profile is reimplemented in Replicad, with the pinned source and attribution recorded in the design artifact.
- Existing generated OpenGrid artifacts from the earlier implementation are incompatible and must not be treated as migration-compatible persisted values.
