## Context

The current stackable-box builder creates a rounded shell with a 1 mm floor and 1 mm main wall, then adds a thin top rail, cuts a 0.8 mm bottom groove, and cuts rectangular internal seam relief. The existing OpenSpec capability requires the resulting parts to stack and slide as identical boxes, while the new delta requires that interface to remain printable after the shell is thickened. The corrected design uses a reference-style stepped top rail fused into the thick rim, a fixed complementary bottom relief/support profile, and open V grooves at the internal grid seams. See the proposal and delta spec for the externally visible contract.

## Goals / Non-Goals

**Goals:**

- Make the main floor 5.0 mm and side wall 2.0 mm while preserving the requested external footprint, centered placement, base Z, and external height.
- Rebuild the reference-style independent stepped top rail as a fused rim feature, retain its fixed complementary bottom relief/support profile, and keep one open V groove along every internal 28 mm grid seam.
- Use supported 45° lead-ins and a positive bearing land so boxes can be lowered, captured, and slid without relying on a thin outer membrane.
- Keep Snap sockets, optional ordinary bottom-hole positions, Worker protocol, persistence shape, preview, STEP, and STL behavior stable.
- Add measurable cross-section and mating-fixture checks before a candidate is committed.

**Non-Goals:**

- Adding user-facing wall, floor, chamfer, or clearance controls.
- Changing the 28 mm grid, half-cell validation, footprint clearance, height input range, or export filenames.
- Changing the official `opengrid` board generator or the separate OpenGrid Snap model.
- Retaining geometric compatibility with previously exported stackable-box solids.

## Decisions

### 1. Keep external dimensions and use the requested structural baseline

Set the internal profile constants for the main wall to 2.0 mm and the floor to 5.0 mm. The outer prism continues to end at the requested `height`, so the interior cavity starts at Z=5.0 mm and the external height remains unchanged. This makes the change visible as a smaller interior height for the same height input, which preserves the existing height semantics and bounds contract.

Use the 2 mm wall as the structural connection for the reference-style stepped top rail. The rail is built as a rounded ring with fixed height, width, and chamfer transitions, overlaps the side wall for one-solid topology, and stays inside the external envelope. A rounded outer corner remains part of the shell; the complementary bottom relief/support profile and grid-seam V grooves remain open toward the print bed.

**Alternative rejected:** keeping a 1 mm shell and adding reinforcing ribs would leave the wall and floor failure mode in place and would add print artifacts without providing a continuous mating face.

### 2. Build one self-mating rim and grid-seam V-groove profile

Replace the old thin guide construction with a canonical stepped top rail and fixed bottom profile, then place an open V groove on each internal OpenGrid 28 mm grid seam:

- the upper rail is a reference-style stepped ring continuously fused to the 2 mm side wall. From the inner opening toward the side wall it uses a fixed 2 mm, 45° lead-in, 1.6 mm vertical segment, 0.8 mm, 45° transition, 1 mm vertical segment, and 2 mm, 45° return; the outer envelope remains unchanged and the outer stacking datum remains intact;
- the bottom uses the fixed reference sequence of a 2 mm outer 45° lead-in, a 1.6 mm vertical support segment at a 2 mm inset, and a 0.8 mm bed-facing foot chamfer as the complementary receiving profile for the top rail;
- each internal grid seam receives one straight V groove running across the footprint. Its bed-facing opening is 1.6 mm wide, its depth is 0.8 mm, and its two side faces are 45°; the opening is intentionally sized as twice the 0.8 mm transition depth;
- the V groove has no horizontal ceiling or suspended underside shelf. The outer bottom shell uses the fixed 2 mm outer 45° lead-in, 1.6 mm vertical support segment at a 2 mm inset, and 0.8 mm foot chamfer; flat regions that directly contact the print bed remain allowed;
- the two profiles use a nominal 0.25 mm lateral mating clearance, kept separate from the existing 0.15 mm footprint clearance;
- the bottom and upper outer 45° transitions use the same fixed 2 mm reference length, while the 0.8 mm foot and 1.6 mm vertical support segment provide the lower-box seating depth before sliding;
- all mating faces remain connected to the main solid, the stepped top rail remains fused rather than a disconnected solid, every seam groove remains open at the bed-facing bottom, and the outer perimeter remains supported without a continuous recessed ring.

The profile must include a small horizontal bearing land at the thick rim. A symmetric pair of chamfers with no land is rejected because it can bind during insertion or provide lateral guidance without a stable seated position. The rim and V-groove sections are tested through actual translated box intersections.

**Alternative rejected:** simply deleting the rail and applying a chamfer to a flat wall would not define a receiving face, so equal boxes could either collide at the same footprint or lose lateral capture.

### 3. Retain grid-seam grooves over a supported bottom

Retain one V groove cut along every internal 28 mm grid seam as part of the product path, but remove the old continuous outer-perimeter ring and rectangular seam-relief ceiling. Start from a continuous 5 mm floor and apply the fixed 2 mm supported outer lead-in, 1.6 mm vertical support segment at a 2 mm inset, 0.8 mm bed-facing foot chamfer, seam V grooves, and requested hole cutters. Each V groove is 0.8 mm deep, leaving approximately 4.2 mm of material above its apex; its two 45° faces remain connected to the floor without producing a horizontal membrane. Half-cell-only footprints do not receive a partial seam.

The full bottom-hole grid remains a through-cut mode. Ordinary holes and Snap sockets are applied after the structural profile, using the updated floor thickness for cutter depth and retaining-seat inspection. The Snap shaft still extends approximately 3 mm below the external bottom, while its flange remains flush with the new interior floor.

The four corner Snap sockets use a two-stage bore through the 5 mm floor: the bed-facing/outside section is Ø5.05 mm for 3.0 mm, and the upper/interior section is Ø7.05 mm for 2.0 mm. The Ø5.8 mm flange sits inside the upper section and is retained by the 2 mm shoulder above the smaller bottom opening; no conical bottom chamfer is used for this socket profile.

**Alternative rejected:** retaining the old continuous perimeter groove and rectangular seam-relief cuts unchanged after increasing the floor to 5 mm would preserve the wrong outer-edge cut and a horizontal underside ceiling. The bottom interface is therefore rebuilt as explicit grid-seam V grooves with measured 45° faces, while the perimeter remains supported.

### 4. Validate fit as geometry, not only as bounds

Extend the existing interface-quality report and geometry gate with:

- a floor cross-section probe at an interior location measuring 5.0 mm;
- a main-wall cross-section probe measuring 2.0 mm away from intentional chamfers;
- profile probes confirming the fused top-rail volume, continuous 45° lead-ins, a bearing land, the fixed bottom relief/support volume, every grid-seam V-groove opening and transition, no outer-perimeter groove, and no unsupported bottom lip;
- direct cylindrical-face measurements confirming the corner Snap Ø5.05/3.0 mm and Ø7.05/2.0 mm bores, plus transition-band support measurements rejecting a sub-0.8 mm bottom membrane;
- lower/upper mating fixtures for 1×1 over 1×4 at continuous offsets;
- the existing 2×2-over-two-1×2 bridge case;
- no material intersection while seated, positive bearing/capture where expected, a near-seat clearance/collision check beyond the 0.25 mm lateral allowance, and lateral sliding across the allowed offsets;
- Snap socket, full-hole, watertight B-Rep, one-solid, mesh, STEP, and STL checks.

Use the same clearance constant in the builder and the test fixtures. Do not use the footprint's 0.15 mm clearance as a proxy for sliding clearance.

### 5. Keep the public contract stable

No new parameter is needed. `x`, `y`, `height`, and `fullBottomHoleGrid` remain the complete normalized snapshot. The model id, route, Worker message shape, persistence entry, revision lifecycle, export names, and external bounds remain unchanged. Only the generated solid and the geometry-specific quality evidence change.

## Risks / Trade-offs

- **[A 5 mm floor reduces interior clear height for the same requested height]** → Keep the external height and bounds semantics explicit in the spec and add a cavity-height regression assertion.
- **[A chamfer-only interface may bind or fail to capture]** → Require a positive bearing land, dedicated 0.25 mm mating clearance, cross-section probes, and translated mating fixtures.
- **[Open Cascade booleans may create invalid edges at the rim transitions]** → Build and inspect one canonical profile before repeated assembly, keep transitions away from coincident coplanar cuts, and retain one-solid/B-Rep validation.
- **[Thicker walls and floor reduce usable interior space]** → Preserve the requested outer footprint and document the intentional 5 mm floor/2 mm wall baseline; do not silently change grid dimensions.
- **[The 5 mm floor changes Snap seating geometry]** → Keep the existing nominal shaft diameter and positions, use the explicit Ø5.05/3.0 mm plus Ø7.05/2.0 mm two-stage socket profile, update cutter depth/inspection to the new floor, and rerun the supplied reference compatibility tests.

## Migration Plan

1. Update the internal configuration and canonical shell/rim profile helpers.
2. Replace the old thin rail construction, remove the continuous perimeter-groove and rectangular seam-relief operations, and rebuild the fused stepped rail plus grid-seam V grooves as part of the supported 5 mm floor/profile.
3. Reapply Snap and ordinary bottom holes, then update interface-quality probes and error mapping if needed.
4. Rewrite unit and B-Rep integration tests for thickness, printability, self-mating, sliding, bridge support, half-cell layouts, and exports.
5. Run targeted tests, full checks, and the relevant browser flow. Existing persisted parameter snapshots remain valid; regenerated solids intentionally use the new geometry.
