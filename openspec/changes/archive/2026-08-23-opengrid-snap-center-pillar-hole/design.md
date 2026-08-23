## Context

The Snap builder already creates the optional center-remover cutter as two fused boxes: a lower 8 × 8 mm opening and a variant-specific upper 4 × 8 mm opening. Optional cutters are applied to the transformed Body, while their documented dimensions remain fixed. The shared locating geometry defines a nominal 5.0 mm diameter, and the positioning pillar uses that diameter when `offset=0`.

## Goals / Non-Goals

**Goals:**

- Add a single centered circular passage to the existing stepped center-remover cutter.
- Keep the passage vertical, full-height, nominal Ø5.0 mm, and tied to the shared locating diameter.
- Preserve existing Snap profiles, variant Z stations, assembly transforms, optional-feature exclusivity, and export contracts.
- Verify the passage and the surrounding stepped ledge through B-Rep integration and quality tests.

**Non-Goals:**

- No new Snap parameter, UI control, persistence field, or filename format.
- No change to the fixed Half/Quarter assets or the separate Snap Remover tool asset.
- No support for positioning-pillar diameter offsets other than the nominal `offset=0` geometry.

## Decisions

1. **Fuse the circle into the generated center-remover cutter.**

   The builder will create a cylinder centered at `(0, 0)` whose radius is the existing shared nominal locating radius and whose Z span covers the same extended range as the stepped cutter. It will be fused with the lower and upper boxes before the Body cut. This preserves the existing lower opening and ledge while widening only the center of the upper opening enough for the pillar.

   Editing a canonical STEP asset was rejected because the feature is generated for multiple profile/variant combinations and is already modeled as an optional runtime cutter.

2. **Reuse the shared nominal locating diameter.**

   The circular cutter will derive its radius from the Snap profile's shared locating-hole radius, which is sourced from the OpenGrid locating assembly's nominal Ø5.0 mm. This avoids introducing a second diameter constant that could drift from the existing corner holes and positioning pillar.

   A configurable or clearance-expanded diameter was rejected: the requested contract is fixed Ø5.0 mm, and positive pillar offsets intentionally remain outside this compatibility guarantee.

3. **Keep the existing feature lifecycle.**

   The new cylinder remains inside the current `centerRemoverHole` branch, after non-hole XY scaling and before the final Body quality gate. With the flag disabled, no circle is cut; Half and Quarter continue using their fixed assets without optional cuts.

4. **Test geometry at the shared compatibility boundary.**

   Integration coverage will inspect the central solid for zero material inside the nominal pillar passage across Full/Lite and Standard/Directional combinations, confirm the lower opening and upper ledge remain, and exercise positive outer offsets to prove the fixed passage does not scale. The existing quality gate will also require the passage and a coaxial zero-offset pillar fit to remain valid.

## Risks / Trade-offs

- **[Nominal fit has no designed radial clearance]** → Keep the contract explicitly limited to the nominal Ø5.0 mm, `offset=0` pillar and validate exact central passage geometry; do not silently enlarge it.
- **[Boolean fuse or cut can create invalid topology at the step]** → Extend the cylinder through the same overrun Z range as the existing cutter, fuse it before the Body cut, and run the existing B-Rep, mesh, topology, and quality gates for every profile/variant.
- **[The new passage could remove too much ledge material]** → Add a dedicated ledge/material probe outside the Ø5 mm passage and retain the existing 8 × 8 / 4 × 8 stepped-profile checks.

## Migration Plan

No data migration is required. Existing snapshots and exports remain valid when `centerRemoverHole=false`; when the existing flag is enabled, the next generated revision includes the central passage. Rolling back the change restores the previous cutter implementation and leaves persisted parameters unchanged.
