## Context

`opengrid-stackable-box` already has a stable 28 mm footprint contract, a fixed bottom assembly, an integrated top rail/bottom guide, optional bottom-hole modes, and a printable base-plate mode. Its current normalized snapshot has no side-opening fields.

The stackable-cylinder opening work establishes the public interaction contract that users expect: four cardinal directions, three controls per direction, a zero-depth disabled state, degree-based side-wall angle, grouped disclosure controls, typed persistence, and deterministic export identity. That contract is useful for the box, but the cylinder's circular profile, radial coordinates, corner arcs, and revolved/circular cutter are not appropriate for a rectangular shell.

The existing box builder creates the shell and stacking geometry in Worker-only CAD code, then applies bottom holes and the base-plate transform. The new feature must therefore extend the typed parameter path and add a box-native cut while preserving the current no-opening result byte-for-byte at the parameter/filename level and within existing geometry tolerances.

## Goals / Non-Goals

### Goals

- Mirror the cylinder opening interface and normalized field names for all four box sides.
- Keep the box's existing model ID, route, footprint calculator, bottom modes, stacking interface, hole modes, and export lifecycle.
- Add one independently configurable centered opening per `+X`, `-X`, `+Y`, and `-Y` wall.
- Use a straight-edged rectangular/trapezoidal prismatic notch whose dimensions are derived from depth, flat-bottom length, and angle.
- Preserve the active floor, bottom guide, sockets, ordinary holes, corner bridges, and enough uncut rail/interface geometry for the box to remain stackable.
- Normalize legacy persisted box snapshots to the disabled-opening defaults.
- Validate enabled openings before commit and include enabled opening settings in deterministic filenames.

### Non-Goals

- Do not copy the cylinder's 2.5 mm rounded transitions, circular cross-section, radial angle math, revolved profile, or cylinder B-Rep cutter.
- Do not add opening offset, radius, arc, radial-angle, or per-side shape controls.
- Do not change the 28 mm/0.5-cell sizing contract or add another box model or route.
- Do not redesign the existing bottom-hole profiles, stacking rail, bottom guide, or base-plate mode.

## Decisions

### 1. Reuse the cylinder's public opening contract, not its geometry

Add the same twelve flat keys in the same canonical parameter order:

```text
openingPlusXDepth       openingPlusXBottomLength       openingPlusXAngle
openingMinusXDepth      openingMinusXBottomLength      openingMinusXAngle
openingPlusYDepth       openingPlusYBottomLength       openingPlusYAngle
openingMinusYDepth      openingMinusYBottomLength      openingMinusYAngle
```

The defaults are `(0, 1, 90)` for every direction. Depth and bottom length are integer millimetres with a 1 mm step; angle is an integer degree from 1 through 90. A zero depth is the only disabled state and makes the other two values geometrically inert for that direction.

The parameter contract, raw-key registry, catalog schema, degree unit, persistence normalizer, restore path, and panel use these fields directly rather than introducing a nested object or a box-specific naming scheme. The box builder receives typed values and remains independent from the cylinder builder.

### 2. Keep the panel layout and interaction semantics identical

The box panel adds the same outer disclosure `四個方向開口設定` and the same child order used by the cylinder:

| UI label | Direction | Fields |
| --- | --- | --- |
| 前方 | `-Y` | depth, bottom length, angle |
| 後方 | `+Y` | depth, bottom length, angle |
| 左方 | `-X` | depth, bottom length, angle |
| 右方 | `+X` | depth, bottom length, angle |

The outer disclosure starts collapsed; once opened, the front group starts expanded and the remaining groups start collapsed. Angle sliders render right-to-left while their numeric values remain the normal 1–90 degree values. Existing bottom-hole controls, mode radios, and the X/Y calculator remain in the panel.

The depth range is calculated from the existing clear-height parameter. In final model coordinates, the upper-rim datum is `activeFloorTopZ + height`, where `activeFloorTopZ` is 5 mm in normal mode and 3 mm in base-plate mode. Thus the maximum safe depth is `height`, subject to the same global cap and geometry-fit checks in both modes. The bottom-length range is calculated per side from that side's straight rectangular run, the rounded-corner reserve, and the minimum corner/neighbor bridge. Enabled ranges are shown live; invalid values are rejected rather than silently clamped.

### 3. Cut a centered, box-native prismatic notch

Build the existing shell, rail, bottom guide, sockets, and ordinary bottom holes using their current paths. Apply the base-plate transform so the geometry is in its final coordinate system, then apply each enabled side opening as a local prismatic cutter.

For each side, place the opening at the center of the side's straight run:

- `+X` and `-X` use the X wall normal and Y as the tangent axis.
- `+Y` and `-Y` use the Y wall normal and X as the tangent axis.

In the tangent/Z profile, the cutter has a flat sill of `bottomLength` at `upperRimZ - depth` and two straight faces rising to the upper-rim datum. The upper span is derived from the requested angle; with the angle measured from the flat sill, 90 degrees has vertical sides and 45 degrees has outward-sloping sides. The cutter is extruded only across the selected wall thickness and a small outside/inside Boolean margin. It is not rotated around the origin, revolved, or built from circular arcs.

The upper-rim datum is deliberately below the independent stepped top rail. The cut is top-open to the box cavity at that datum while leaving the rail above and the corner interface lands outside the selected straight span available for stacking. A disabled direction skips the Boolean entirely, so the default snapshot follows the existing geometry path.

### 4. Bound openings by rectangular structure and the active floor

Before a Boolean is attempted, derive the tangent span and side-specific structural reserves from the actual final box footprint. Reject an enabled opening when its flat sill is non-positive, its derived upper span cannot fit the straight run, it reaches a rounded corner reserve, it overlaps a neighboring enabled span, or it leaves less than the configured minimum bridge thickness.

Use `activeFloorTopZ` as the hard lower bound. For normal mode this is the existing 5 mm floor datum; for base-plate mode it is the translated 3 mm plate/floor datum. An opening bottom may meet that datum but may not pass below it. Because sockets and bottom-hole cutters are applied before the side cuts, the quality gate must explicitly confirm that those features and the guide support remain intact after all operations.

### 5. Extend quality checks without weakening existing gates

The final candidate continues through the existing single-solid, watertight, bounds, stacking-interface, floor, socket, and bottom-hole checks. Add direction-aware probes for:

- absence of a cut on every zero-depth side;
- opening sill Z and tangent length for every enabled side;
- planar straight side faces and the requested angle;
- preserved floor, bottom guide, socket, hole, and corner-bridge material;
- no neighboring-opening merge and no Boolean self-intersection;
- valid normal and base-plate results in the final coordinate system.

An opening-quality failure returns a field/direction diagnostic, leaves the previous committed revision visible, and keeps STEP/STL export gated. The Worker retains its latest-wins/current-build checks around each additional Boolean.

### 6. Preserve no-opening exports and fingerprint enabled settings

The existing box filename identity remains unchanged when all four depths are zero, regardless of the inert bottom-length and angle values. If any depth is positive, append a canonical fingerprint of all twelve typed opening values in the parameter-key order above. This makes distinct enabled configurations distinguishable while keeping legacy no-opening files stable and independent of raw input formatting.

### 7. Test the contract at each boundary

Add behavior-focused coverage for:

- defaults, exact-key validation, ranges, degree unit, and legacy normalization;
- panel labels, direction mapping, disclosure defaults, field order, RTL angle control, and preservation of existing controls;
- one-sided, four-sided, mixed-angle, floor-boundary, half-cell, hole-enabled, normal-mode, and base-plate geometry;
- rejection of corner/neighbor merges, below-floor cuts, broken sockets/guides, invalid B-Rep, and stale candidates;
- deterministic filenames for disabled and enabled opening snapshots.

Geometry tests should inspect the generated shape and measured behavior, not source strings or implementation-specific cutter names.

## Risks / Trade-offs

- A half-cell side may have too little straight run for a positive opening after corner reserves. The UI should expose the live maximum and validation should reject only the enabled opening, preserving the valid closed box.
- A side Boolean can damage the top rail or corner transitions if its outside span is too large. The cutter is limited to the straight run and the quality gate must keep a structural bridge on both sides.
- Applying cuts after base-plate normalization simplifies floor checks but requires all probes to use final-mode coordinates. The shared `activeFloorTopZ`/`upperRimZ` calculation keeps normal and base-plate semantics aligned.
- Twelve additional values increase persistence and filename surface area. Flat typed keys match the existing cylinder interface and avoid a migration from nested records.
- Four independent cuts add Worker time. Current-build checks around each operation and rejecting invalid ranges before the Worker limit wasted Boolean work and stale-result risk.

## Migration Plan

1. Extend the box contract, catalog schema, raw parameter registry, default state, persistence normalizer, and degree-unit support with the twelve optional-in-source/required-in-normalized fields.
2. Add the shared-looking panel disclosure and field range calculation while keeping the existing box controls unchanged.
3. Add the box-native opening profile and apply it after the current box geometry reaches final normal/base-plate coordinates.
4. Extend quality probes, error mapping, export fingerprints, and tests for enabled openings and legacy no-opening snapshots.
5. Verify that a legacy snapshot normalizes to `(depth=0, bottomLength=1, angle=90)` in all four directions and that its geometry and filename identity remain unchanged.

There is no destructive data migration and no route/model rename. If the feature must be rolled back, the optional source fields can be ignored and the normalizer can continue emitting the disabled defaults; legacy snapshots remain valid.

## Open Questions

None. The opening interface is intentionally fixed to the cylinder's four-direction control contract, while the box geometry is explicitly straight-edged and rectangular.
