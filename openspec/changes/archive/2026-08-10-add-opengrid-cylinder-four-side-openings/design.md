## Context

The existing `opengrid-stackable-cylinder` is an independently validated OpenGrid component. Its parameter contract is defined in `src/cad-contract/units/opengrid-stackable-cylinder.ts`, its custom controls live in `OpenGridStackableCylinderComponentPanel.svelte`, and its Worker-only B-Rep builder creates a revolved cylindrical shell before cutting the stepped bottom holes. The builder already has three bottom profiles, a printable bottom protrusion, a top inner guide chamfer, and quality probes for the floor, holes, and same-diameter stacking interface.

The new feature adds four access openings to the top side wall without changing the existing model identity or bottom interface. Each cardinal direction must be editable independently, so the parameter flow, persistence, UI, geometry, quality checks, and export identity all need to agree on the same twelve values.

## Goals / Non-Goals

**Goals:**

- Add independent `+X`, `-X`, `+Y`, and `-Y` opening controls to the existing cylinder component.
- Model each opening as a top-open U/V-shaped notch with a flat bottom, two exact 2.5 mm rounded transition arcs at the lower edge, and matching upper-edge transitions; it must not become a circular hole.
- Use depth, flat-bottom length, and side-wall angle as the only user-facing shape controls; keep the corner radius fixed at 2.5 mm and derive the side run and upper width.
- Preserve the existing wall, hole layout, bottom modes, printable lower profile, and same-diameter stacking behavior.
- Reject degenerate, overlapping, floor-cutting, or otherwise invalid opening combinations before committing a Worker result.
- Keep legacy persisted parameters and no-opening export names compatible.

**Non-Goals:**

- Do not create a new component, route, model ID, or build key.
- Do not add independent opening rotation, arbitrary placement, top-width, radius, or side-slope controls.
- Do not change the existing bottom-hole diameters, 14 mm grid calculation, hole switch, or stacking clearance.
- Do not promise stacking compatibility between different outer diameters.
- Do not approximate the opening boundary with manually generated mesh triangles.

## Decisions

### Keep the existing component identity and use flat typed fields

The normalized cylinder parameters will keep the existing scalar and boolean fields and add twelve flat numeric keys, three per cardinal direction. Flat keys match the current `ModelParameterKey`, `RawParameters`, `ParameterField`, local-storage persistence, and restore-button flow with the smallest compatibility surface. The catalog and validation layer will own the canonical defaults and ranges; the UI will only submit strings that the existing typed validation normalizes.

The new fields are:

```text
openingPlusXDepth       openingPlusXBottomLength       openingPlusXAngle
openingMinusXDepth      openingMinusXBottomLength      openingMinusXAngle
openingPlusYDepth       openingPlusYBottomLength       openingPlusYAngle
openingMinusYDepth      openingMinusYBottomLength      openingMinusYAngle
```

All opening depths default to zero so an old persisted snapshot or a fresh cylinder retains the current geometry. A positive depth enables that direction. The default angle can be 90 degrees; disabled-direction length and angle values remain normalized defaults and do not affect geometry.

### Define the profile as a U/V-shaped top-open notch

For one direction, use a local tangent coordinate `u` and vertical coordinate `z`:

```text
top edge       ╲                 ╱
                ╲               ╱
                 ╲             ╱
                  ╰───────────╯  flat bottom length L
                         ↑
                         D  depth from top to flat bottom
```

The flat bottom is centered on the opening direction. Each lower side transition starts tangent to the flat bottom, follows a fixed-radius `R = 2.5 mm` arc, and enters a straight side. A matching upper arc leaves that side and becomes tangent to the horizontal top edge, so the top entrance is not sharp. The user-facing side-wall angle `θ` is measured from the flat bottom: `90°` produces vertical sides and a ㄩ-like profile, while `45°` produces outward-sloping sides and a V-like profile. The angle controls the slope, not the radius. Along the closed profile traversal, the corresponding upper turn is `π - θ` (`180° - θ`), not `2π - θ`; the physical side slope remains `θ`. With `D` as the vertical rise, the builder derives:

```text
corner radius R = 2.5 mm
corner horizontal run = R * sin(θ)
corner vertical rise = R * (1 - cos(θ))
straight-side height = D - 2 * corner vertical rise
straight-side horizontal run = straight-side height / tan(θ)
upper half-run = 2 * corner horizontal run + straight-side horizontal run
upper opening width = L + 2 * upper half-run
```

The exact implementation must guard the 1–90 degree range, reject a depth that cannot contain both fixed 2.5 mm transitions or leaves no positive-length straight side between them, and reject a derived width that cannot fit the cylinder. Therefore, the default 90° profile with depth exactly 5 mm is invalid and must show a field error before Worker generation. This construction keeps the bottom length, depth, and corner radius fixed while the angle changes the side slope and upper opening width.

### Build one exact B-Rep cutter and rotate it to the four directions

The builder will create a canonical closed U/V-notch cutter from a 2D Sketcher profile using one flat line, two lower and two upper exact fixed-radius transition-arc edges, and two straight side edges. The upper arcs are tangent to the horizontal top entrance, then the cutter extends slightly beyond the top and through the complete wall/chamfer radial span so the notch is genuinely open without a sharp upper edge or a thin inner-chamfer lip. It will be placed at one cardinal radial direction and transformed by 90-degree Z rotations for the other directions.

The four cutters will be applied independently to the existing revolved shell, with generation-current checks and temporary-shape cleanup between cuts, matching the current sequential stepped-hole pattern. Independent cuts make per-direction diagnostics clear and avoid hiding overlapping inputs inside a fused compound. The final candidate will continue through the existing holes and quality pipeline only after all enabled cuts finish.

### Validate derived geometry before and after boolean operations

Contract validation will reject malformed scalar input and side-wall angle values outside the usable 1–90 degree range. Derived validation will calculate each enabled opening's lower Z, both fixed-radius transition rises, upper width, and radial/tangential footprint. It will reject openings that cannot contain both fixed 2.5 mm transitions, reach into the active floor or lower stacking profile, cannot fit inside the requested diameter, or overlap a neighboring cardinal opening enough to remove the required structural bridge.

The builder quality report will retain existing B-Rep, solid-count, bounds, hole, floor, and mating probes and add opening-specific checks for direction, flat-bottom depth/length, arc-derived dimensions, top opening, floor preservation, and adjacent-direction separation. Tests should verify behavior and measured geometry rather than internal face or triangle ordering.

### Group the controls by direction in the existing custom panel

The cylinder panel will place the four direction groups inside one collapsed disclosure labelled `四個方向開口設定`. After it is expanded, the groups will use user-facing labels `前方`, `後方`, `左方`, and `右方`; these map to internal `-Y`, `+Y`, `-X`, and `+X` respectively. The `前方` group is expanded by default and the other three direction groups are collapsed by default. Each group contains the three range/text controls in the order depth, flat-bottom length, and side-wall angle. The angle field uses a degree unit, so the shared parameter-field unit type must support `°` (or an equivalent localized degree label). Its slider renders in reverse visual direction without reversing the stored numeric value or the geometric interpretation that 90° is vertical and 45° is V-like. Existing mode radios, the shared bottom-hole checkbox, restore behavior, and error rendering remain in place.

The raw-parameter conversion and parameter-key registry must include all twelve fields. Legacy snapshots missing these fields will be filled with the no-opening defaults before validation; snapshots with an invalid new field will show a field-specific error and will not reach the Worker.

### Preserve deterministic export identity

The filename builder will keep the current model/diameter/height and existing mode/hole suffixes. If all four opening depths are zero, the current filename remains unchanged. If any opening is enabled, a canonical serialization of all twelve normalized opening values will be converted to a compact deterministic fingerprint and appended to both STEP and STL names. This avoids long filenames while ensuring every geometry-affecting setting changes the export identity.

## Risks / Trade-offs

- **[Near-horizontal side angles]** Small angles can derive very large side runs and upper widths. → Restrict enabled angles to 1–90 degrees, perform derived finite/range checks, and reject profiles that do not fit.
- **[Adjacent openings merge]** Four independently sized openings can consume the material bridge between cardinal directions. → Validate derived footprints before cutting and confirm the final B-Rep with neighboring-direction probes.
- **[Floor or stacking damage]** A deep opening can reach the active floor, bottom protrusion, or lower bevel, especially across the three bottom modes. → Compute the active profile's floor boundary and add explicit floor/stacking preservation quality checks.
- **[Boolean failures at the top chamfer]** A cutter that stops at the nominal outer surface may leave a lip or create a fragile coincident face. → Extend the cutter beyond the top and radial wall bounds and keep a small modeling epsilon consistent with existing cuts.
- **[Preview cost]** Up to four additional boolean cuts and more curved edges can increase Worker time and mesh size. → Keep the canonical cutter simple, check stale generations between cuts, retain existing mesh limits, and benchmark a four-opening case.
- **[Persisted legacy data]** Existing local-storage snapshots do not contain the twelve fields. → Normalize missing fields to no-opening defaults; preserve old export names when no opening is enabled.
- **[Ambiguous direction display]** A user may interpret front/back/left/right differently from CAD axes. → Keep the internal mapping explicit: front=`-Y`, back=`+Y`, left=`-X`, right=`+X`, and keep the preview orientation gizmo as the source of truth.

## Migration Plan

1. Extend the contract, catalog defaults, raw-parameter registry, and storage normalizer with no-opening defaults.
2. Add the four grouped controls and validation messages while keeping existing modes and hole controls unchanged.
3. Add the canonical B-Rep cutter, four-direction transforms, derived safety validation, and quality probes.
4. Add focused unit, Worker integration, and browser E2E coverage, then verify legacy no-opening bounds and filenames remain unchanged.
5. Existing persisted parameters migrate forward automatically. If a deployment must roll back to code that does not know the new fields, its component snapshot must be cleared or the rollback normalizer must discard the twelve opening keys; no external data migration is required.

## Open Questions

- The product requirements do not specify preferred non-zero default dimensions for an enabled opening; this design intentionally defaults all depths to zero to preserve the current component output.
- The bottom-length slider and text input use a 1 mm minimum and default in every direction, and a live integer maximum derived from the opening's own outer-width limit and both neighboring opening bridges. A zero-depth direction remains geometrically disabled, so its 1 mm length does not create an opening. The depth slider and text input use the selected cylinder height minus the active floor thickness as their live upper bound (also capped by the global configuration maximum); the exact floor boundary is accepted and deeper values remain invalid.
