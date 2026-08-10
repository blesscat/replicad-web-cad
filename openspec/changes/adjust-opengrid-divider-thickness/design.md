## Context

The existing divider contract has an exact five-field snapshot (`left`, `right`, `up`, `down`, `height`) and the CAD builder creates two constant-width 5 mm wall boxes before applying the existing side and top fillets. The model catalog, workspace parser, and browser parameter store all derive their accepted fields from that contract, so the thickness change must cross the contract, geometry, UI, persistence, and quality boundaries together. See `proposal.md` and the delta specs for the user-visible behavior.

## Goals / Non-Goals

**Goals:**

- Add one integer `wallThickness` control with values 1, 2, 3, 4, and 5 mm, defaulting to 2 mm, without adding a detailed derived-geometry summary to the panel.
- Preserve a 5 mm base support footprint at `Z=0` while producing the selected thinner upper wall.
- Build a symmetric nominal 45-degree planar chamfer transition, stable for every supported thickness value and suitable for upside-down printing.
- Round the short end edges of the 45-degree transition with a bounded fixed radius so the transition's side corners are softened without adding another user control.
- Preserve the existing directional arm semantics, central-junction anchoring, peg placement, Worker lifecycle, model IDs, and export behavior.
- Keep all generated profiles as valid single solids and add cross-section evidence for the new geometry.

**Non-Goals:**

- Adding a user-adjustable transition radius or a new base-height control.
- Changing the official `opengrid` or `opengrid-stackable-box` geometry, parameter schemas, or compatibility claims.
- Changing the divider's 14 mm full-grid / 7 mm half-grid layout or the Ø5 × 3 mm locating peg algorithm.
- Replacing the existing top-rounding design with a new user-facing control.

## Decisions

### 1. Add a typed wall-thickness field without changing component identity

Add `wallThickness` to `OpenGridDividerParameters` and the divider parameter-key list. The accepted values are integer millimetres from 1 through 5, with `2` in `defaultParameters`. Keep `modelId`, `buildKey`, route, Worker command version, and catalog directory unchanged; this is an update to the existing `opengrid-divider` capability, not a new component.

The catalog schema, raw-input parser, model validation, Worker normalization, filename helpers, and test fixtures will all consume the same contract field. This avoids a UI-only thickness value that can be lost at the Worker boundary.

### 2. Build a reusable profiled arm from a 2D width/Z profile

Replace the constant-width wall-box assumption with a canonical arm profile that has:

```text
upper wall:       selected wallThickness (1–5 mm)
transition:       planar chamfer, nominal 45 degrees
base at Z=0:      5 mm plan width
```

The profile is symmetric about the arm centerline. For `wallThickness=5`, the profile remains a constant 5 mm wall and skips the transition. For thinner walls, each side moves inward by half of the base-to-wall width difference while rising by the same amount, producing a nominal 45-degree chamfer. Reserve the configured 0.1 mm geometry-safety ledge at the bottom of the 5 mm support before starting the chamfer; this keeps the Ø5 mm locating peg fusion robust while leaving the visible transition planar. If the requested height is too short to fit the full chamfer, cap the vertical rise at `height - 2 * geometrySafetyMargin` so both the bottom ledge and a non-zero upper wall remain available; this is the only case where the effective slope is shallower than 45 degrees.

Construct horizontal and vertical arms from the same canonical cross-section, then join them at the existing central anchor. Keep the current center calculation and peg placement in raw coordinates so asymmetric arm lengths do not shift the junction. Apply the profile-level rounding before fusing each peg into its owning arm, and fuse the peg-bearing arms only after those local booleans; any remaining edge fillets must be selected by geometric role rather than by fragile face or edge indexes.

### 3. Bound every fillet by its local profile

The current nominal 2.5 mm side radius is valid for the 5 mm base but cannot be applied unchanged to a 1 mm upper wall. Compute stable side and top radii from the local wall thickness, retaining the nominal value when it fits and reducing it when necessary. The bottom wall edge and peg edges remain excluded from these operations; the main base-to-wall transition remains a planar chamfer, while only its short end edges receive the separate bounded transition fillet.

The builder must treat a failed fillet, self-intersection, or non-single-solid result as a generation error and clean up all intermediate shapes. It must never return a partial candidate. Geometry fixtures will cover all five thickness values, including the minimum 1 mm case.

### 4. Make bounds and filenames thickness-aware

`rawPlanBoundsFor`, `boundsForOpenGridDivider`, preview dimensions, and quality expectations must use the 5 mm base envelope at the bottom and the selected upper profile. The Z bounds remain `-3` through the requested wall height because the existing locating pegs are unchanged.

Extend deterministic filenames with a thickness token, for example `...-t2-h20.step` and `...-t2-h20.stl`, so two otherwise identical divider snapshots cannot overwrite one another. All catalog, Worker, export, and test helpers must call the same filename functions.

### 5. Migrate old browser snapshots at the store boundary

When the browser store reads an existing divider record with the legacy five fields, add `wallThickness: 2` before catalog validation. New records remain fully typed and validated by the model definition. A malformed record or an invalid thickness follows the existing default fallback and does not reach the Worker. No storage-version bump is needed because this is a field-level compatibility migration handled by the existing version-1 payload.

### 6. Keep the UI as a model-catalog projection

Add a `range-text` field for `wallThickness` to the divider catalog definition, with min 1, max 5, step 1, and default 2. The Svelte panel should expose the typed controls only; it should not render the detailed grid, shape, dimensions, transition, locating-peg, or total-height summary. The model chooser may retain only a concise identity description without duplicating validation rules.

### 7. Test the contract and geometry at separate layers

- Contract tests cover accepted values, rejection of fractional/out-of-range thickness, defaults, dimensions, and filenames.
- Workspace/catalog tests cover the new field, raw-input parsing, labels, and the absence of the removed technical summary.
- Persistence tests cover legacy default migration, typed round-tripping, and invalid-record fallback.
- CAD integration tests probe cross-sections at the bottom support, 45-degree transition, and upper wall for thicknesses 1, 2, 3, 4, and 5 mm; they also assert one solid, B-Rep validity, finite mesh, top rounding, unchanged peg behavior, and distinct export names.
- E2E tests verify the 1–5 mm control and a 2 mm preview/export path.

### 8. Round the transition's short end edges with a bounded fixed radius

The two short profile edges at each arm end where the 45-degree chamfer meets the end face will participate in the same local fillet operation as the existing side and top edges. The nominal radius is `transitionFilletRadius=0.4` mm. For each selected profile, cap it to the smaller of half the selected upper wall thickness and half the actual transition rise; skip it when the selected thickness is 5 mm and no transition edge exists. Classify these edges from endpoint coordinates (constant arm-axis coordinate, changing transverse and Z coordinates) so horizontal and vertical arms use the same geometry role without relying on edge indexes. Include the transition radius in the no-op fillet guard so very short profiles still receive the transition rounding when top and vertical side radii collapse to zero.

### Alternatives considered

- **Change the existing `wallWidth` directly to the selected thickness:** rejected because it removes the requested 5 mm base support and changes the bottom attachment geometry.
- **Use a rounded transition:** rejected for this revision because a planar 45-degree chamfer is easier to print upside down and avoids a curved overhang.
- **Expose transition geometry as another control:** rejected for this change; the fixed geometry-safety ledge and nominal 45-degree rule keep the parameter surface small and the generated parts predictable.
- **Invalidate every legacy snapshot:** rejected because adding the default 2 mm field at hydration preserves existing user settings without changing the storage version.

## Risks / Trade-offs

- **OpenCascade fillets may fail at 1 mm or at near-5 mm thickness differences** → limit effective radii to stable local dimensions, probe every supported thickness, and convert failures into diagnostic generation errors.
- **Transition-end fillets may fail when the chamfer becomes shallow or the height is minimal** → cap the fixed 0.4 mm nominal radius by the local wall thickness and actual transition rise, and verify cylindrical transition faces across both arm orientations and the minimum-height matrix.
- **The minimum height may not fit a full 45-degree chamfer for the thinnest wall** → reserve the bottom geometry-safety ledge, cap the rise at `height - 2 * geometrySafetyMargin`, keep the selected upper wall non-zero, and test the actual cross-section rather than assuming the nominal angle.
- **The exact parameter object gains a required field** → update every contract consumer in one change and add legacy hydration before validation.
- **Changing filenames can affect download assertions and cached artifacts** → update all filename fixtures and ensure the old model IDs/routes remain unchanged.
- **Profiled arm assembly may be slower or more memory-intensive than boxes** → reuse one canonical profile per orientation, yield at existing safe boundaries, and preserve current cleanup/ownership patterns.

## Migration Plan

1. Extend the divider contract, catalog schema, raw-input parser, and default values; add the persistence hydration fallback for legacy snapshots.
2. Add the profiled arm builder, stable transition/fillet selection, thickness-aware bounds, quality checks, and filenames.
3. Update the panel, chooser copy, Worker fixtures, and all affected unit/integration/e2e tests.
4. Run the divider contract and CAD integration matrix for thicknesses 1–5 mm, then run the broader repository validation suite.
5. Existing stored divider entries without `wallThickness` hydrate as 2 mm and are rewritten in the new typed shape after a valid update. A rollback to the previous application version is safe for old entries; entries written with the new field will fall back to the old application's defaults because the old validator does not understand the extra field.
