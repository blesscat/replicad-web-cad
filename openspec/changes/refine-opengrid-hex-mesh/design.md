## Context

The existing honeycomb builders already generate complete regular-hexagonal cutter prisms and apply them after the normal box/cylinder interfaces are built. The visual mismatch comes from treating horizontal and vertical bounding-box gaps as the honeycomb pitch. A regular hex mesh instead places nearest neighbors across shared-edge normals, leaving broad isolated solid gaps when that basis is wrong. The latest `main` also adds Open Shelf, which now needs the same opt-in material-saving profile. See the proposal and delta specs for the required Hex Mesh behavior.

## Goals / Non-Goals

**Goals:**

- Produce a dense staggered pattern whose neighboring hex openings leave a continuous printable rib network.
- Ensure the default 20 mm-height box and cylinder profiles show multiple staggered side-wall rows instead of a single oversized row.
- Fill eligible floor regions with a finer Hex Mesh while preserving every existing mounting, drainage, and interface hole.
- Keep the existing subtractive workflow so the outer envelope, openings, bottom holes, stack guides, and quality probes remain owned by the existing builders.
- Preserve bounded cutter counts, generation cancellation, measured Boolean progress, and explicit native-shape cleanup.
- Apply the same pitch derivation to planar box panels, cylindrical wall panels, and a smaller floor-specific lattice.
- Extend the opt-in mode to Open Shelf without changing its six geometric controls, front opening, inclination, locating interface, or disabled geometry.

**Non-Goals:**

- Do not implement the separate vertical-groove Ribbed style.
- Do not add user-configurable cell size, rib thickness, or pattern density controls.
- Do not change normal-mode geometry, public model IDs, routes, or existing interface dimensions.

## Decisions

### Derive the lattice from the printable rib, not the OpenGrid pitch

Match the point-up regular hex orientation in the visual reference. First derive the nearest-neighbor distance across parallel edges:

`neighborPitch = √3 × cellRadius + ribThickness`

Keep the exported side-lattice fields for compatibility and represent each triangular center lattice as staggered horizontal rows:

`anchorPitch = neighborPitch`

`rowPitch = √3 / 2 × neighborPitch`

Rows are offset by half `anchorPitch`. A cell therefore has horizontal neighbors at `anchorPitch` and diagonal neighbors at `(anchorPitch / 2, rowPitch)`; both are exactly `neighborPitch` apart and leave the configured nominal rib normal to their shared edges. Open Shelf candidate bounds use the point-up hex width `√3 × cellRadius` horizontally and height `2 × cellRadius` vertically, so those cutters remain complete cells. Box-floor, cylinder-floor, and container side-wall candidates may cross a protected boundary and are clipped there to continue the visible pattern without cutting the protected material. The legacy 14 mm OpenGrid half-pitch remains the mounting/grid contract, but it is not the Hex Mesh cell pitch.

Use a 3.1 mm side-cell radius with the existing 1.25 mm printable rib. Keep a rib-width lower bridge above the cylinder transition and reserve the cylinder's full top-inner-chamfer height. This keeps complete cells and protected frames while fitting at least two staggered rows in the default 20 mm-height side-wall bands.

Use a separate 2.6 mm floor-cell radius with the same pitch derivation and printable rib. The finer floor pattern is independent of side-wall sizing and remains subject to the existing perimeter, seam, socket, mating-feature, and hole keep-outs. Floor-feature keep-outs reserve one printable rib beyond the protected feature instead of reusing the broader side-opening clearance, so safe floor cells are not discarded into visually empty patches.

### Keep the subtractive shell workflow

The builders continue to start from the validated normal geometry and cut one or more bounded compound batches per side-wall group and floor group. A dense set of complete hexagonal cutters naturally leaves the connected ribs as the retained material, while avoiding a separate fused lattice that could disturb the existing curved or stepped interfaces. Side and floor groups use separate measured Boolean scopes so a failed or dense wall Boolean cannot invalidate a protected floor group.

### Keep-outs are local to the functional feature

An enabled box or cylinder side opening reserves only its actual tangent/height envelope plus the configured feature clearance. Side cells that cross the protected perimeter or opening boundary are clipped to that boundary rather than rejected wholesale. The rest of that face remains eligible for mesh cells. Frames, corners, rims, lower transitions, circular edges, holes, sockets, seams, and mating features retain their existing conservative protected regions.

Floor cells use the same smaller floor-specific radius. Existing mounting and drainage holes keep their normalized profiles without changing hole count, diameter, location, or through-path. Box-floor cutters cover the whole safe pattern and are clipped at the outer frame, required stacking-seam support, and an exact circular keep-out extending 2 mm beyond each hole's maximum opening radius; intersecting cells are not discarded wholesale. Cylinder-floor cutters use the same treatment at the protected circular frame and exact 2 mm hole rings, with the mask bounded by the flat-floor and peripheral stacking-interface limits. Open Shelf floors continue to use complete protected cells. Box, cylinder, and Open Shelf floor cutters pass through each eligible active floor, including the Desk thin-floor box and cylinder profiles, while leaving the peripheral stacking boundary and floor transitions intact. A floor remains solid only when no safe opening area remains.

### Cylinder panels use the same local pattern in tangent space

Cylinder wall cells are created as local planar hex prisms and rotated around Z according to their tangent center. The circumference is treated as periodic: each row uses the largest whole cell count that retains at least the configured pitch, distributes the small remainder evenly, staggers alternate rows by half that periodic pitch, and wraps the final neighbor back to the first. Opening keep-outs clip intersecting local polygons at the protected boundary. This preserves a circular outer boundary without polygonalizing the container or leaving an artificial tangent-layout seam.

Each cylinder side prism starts inward of the curved inner wall by the sagitta required at the side cell's maximum tangent extent, plus the normal cutter margin. A straight radial extrusion based only on nominal wall thickness can otherwise leave a thin uncut crescent at the lateral portions of a hex opening. The compensated prism still ends only beyond the existing outer radius and does not change the container envelope.

### Open Shelf cutters stay local to each panel

Open Shelf side walls, internal X dividers, and backboard use the 3.1 mm side lattice in their local vertical planes. Bottom, inclined shelves, and the top panel use the finer 2.6 mm floor lattice in each panel's own plane. Inclined cutters are constructed locally, rotated by the common shelf angle, and translated onto the panel; the cabinet itself remains in the existing world coordinate system.

Every panel keeps complete cells inside perimeter frames. Side/divider and backboard candidates reserve continuous bands where shelves meet them. Bottom candidates reserve the four locating-peg circles and divider contacts. Shelf/top candidates reserve side, front, rear, and divider bridges. Cutters are applied only after the existing fused, rounded, bounds-clipped solid is complete, so disabled mode follows the unchanged build path.

Open Shelf wall-family and plate-family cutter groups use separate bounded compound batches. Each batch checks generation currency, reports its Boolean work through the existing reporter, yields at a safe boundary, and deletes every native cutter/compound and replaced result on both success and failure.

### Verification is behavioral

Tests assert the derived spacing relationship, observable cutter separation, positive cell coverage, clipped box-floor, cylinder-floor, and container-side contact at protected boundaries, intact 2 mm circular hole rings, lower volume with unchanged bounds, preserved holes/openings/pegs/panel bridges, and valid exportable solids. Tests do not inspect source text or require a particular helper implementation.

## Risks / Trade-offs

- [Risk] Dense cutter batches can increase Boolean cost → retain bounded compound batches per panel group, measured scopes, and bounded complete-cell generation; use the existing benchmark hooks for larger profiles.
- [Risk] A curved wall can reduce the effective tangent gap when a circumference is not an exact pitch multiple → round the periodic column count down and distribute the remainder, so every wrapped neighbor gap stays at least the configured pitch.
- [Risk] Small or feature-dense panels may have no complete cells → return the unchanged panel and keep generation valid as an explicit no-cell fallback.
- [Risk] Opening keep-outs may leave a locally solid patch → reserve only the opening envelope and boundary bridges so the surrounding wall still reads as a continuous Hex Mesh.

## Migration Plan

1. Add the Hex Mesh pitch and local opening-keepout behavior tests.
2. Change the shared lattice configuration and run focused unit tests to establish the expected spacing.
3. Run box and cylinder geometry tests, then the relevant Worker, export, type, formatting, and OpenSpec checks.
4. Keep `honeycombMode=false` behavior and filenames unchanged; rollback is limited to the honeycomb stage if the new pattern fails quality validation.
5. Verify both Desk thin-floor container presets expose through Hex Mesh openings without changing their original holes or protected lower boundaries.

## Open Questions

None. The requested scope is the Hex Mesh style only.
