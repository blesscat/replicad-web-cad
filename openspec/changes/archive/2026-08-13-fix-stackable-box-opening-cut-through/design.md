## Context

The stackable-box builder creates each side opening as a local planar profile extruded through the selected Cartesian wall. The existing cutter uses a small overlap margin, but the positive `+X` and `+Y` wall origins are calculated from `wallThickness - margin`; this places the cutter start inside the wall instead of just inside the interior face. The negative directions already begin outside the exterior face, so only the positive directions retain a thin inner skin. See the proposal and delta spec for the user-visible contract.

## Goals / Non-Goals

**Goals:**

- Make positive and negative side-opening cutters cover the same complete wall-thickness interval with the existing overlap margin.
- Apply the correction to both normal/base-plate geometry and thin-shell geometry.
- Add behavior-focused B-Rep coverage that detects residual material across the full wall thickness, not just an interior probe that can skip the defect.
- Preserve opening profiles, requested depth/angle semantics, corner bridges, floor/interface keep-outs, cancellation/progress behavior, and export identity.

**Non-Goals:**

- Do not change the opening profile shape, transition radius, depth validation, bottom length, angle semantics, or footprint.
- Do not alter the negative-direction cutter geometry except where shared tests verify its existing behavior.
- Do not change normal, base-plate, or thin-shell geometry when all opening depths are zero.
- Do not introduce a new component, parameter, dependency, or public model identity.

## Decisions

### Use symmetric wall-overlap intervals

For a positive wall, place the cutter profile at `halfExtent - wallThickness - margin` and extrude `wallThickness + 2 × margin` along the positive normal. This starts one margin inside the interior face and ends one margin outside the exterior face. Keep the existing negative-side origin and distance because it already spans the equivalent interval.

The same rule applies to the thin-shell wall thickness. The normal-mode top-rail cutter already derives its positive-side origin from an inner inset plus the margin, so the correction is limited to the wall cutter origin; no rail or rim dimensions change.

### Verify material removal through the wall

Add integration assertions that intersect the generated shape with a narrow box covering the complete selected wall thickness and the central opening span above the sill. The assertion must be near zero for each direction and mode, while existing tests continue to verify the sill, side faces, bridges, bounds, interfaces, and valid solids. This tests observable geometry rather than source expressions or cutter implementation details.

### Preserve the existing subtractive workflow

Keep the current profile construction, extrusion directions, boolean sequencing, cleanup, and measured operation scopes. Extending the positive cutter inward is sufficient; increasing only the outside distance or weakening the quality probe would either leave the defect or hide it without changing the geometry.

## Risks / Trade-offs

- [Risk] Increasing cutter overlap could affect adjacent corner or interface material → keep the profile tangent span and existing bridge constraints unchanged, and assert corner bridges and floor/interface quality in the existing suite.
- [Risk] Thin-shell and base-plate profiles have different active wall/floor datums → use each mode's existing wall thickness and run mode-specific geometry tests.
- [Risk] Boolean tolerances may make an exact zero assertion brittle → use a small volume tolerance while making the probe span the full wall thickness so a 0.04 mm membrane is measurable.

## Migration Plan

1. Add the full-wall penetration regression cases.
2. Correct the positive wall origins in the shared side-opening cutter path.
3. Run focused box-opening tests plus type, format, and OpenSpec validation.
4. If a regression appears, revert only the positive-origin correction; no persisted data or public API migration is required.
