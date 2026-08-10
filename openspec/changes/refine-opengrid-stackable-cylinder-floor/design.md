## Context

`opengrid-stackable-cylinder` currently builds a revolved XZ shell profile and then cuts the center and outer cardinal holes as stepped cylinders. Its fixed geometry constants live in `src/cad-contract/units/opengrid-stackable-cylinder.ts`; the Worker-only builder and its quality report live under the matching `opengrid-stackable-cylinder` CAD-kernel directory.

The existing profile uses a 5 mm center floor, a 0.6 mm internal floor fillet, a nominally zero-clearance bottom protrusion, and a 3 mm plus 2 mm hole stack. The change must preserve the stable OpenGrid identity, typed diameter/height parameters, top rim behavior, export lifecycle, and the existing reference-inspired outer lower profile while changing the printable bottom interface.

## Goals / Non-Goals

**Goals:**

- Build a 3 mm central flat floor followed by a sharp internal 45-degree ramp that is parallel to the external lower 45-degree transition and offset by the 2 mm shell thickness in its normal direction.
- Keep the straight inner wall at 2 mm radial thickness and retain the top inner 2 mm, 45-degree guide chamfer.
- Use a `Ø5.05 mm × 2 mm` lower hole section and a `Ø7.05 mm × 1 mm` inner hole section for the center and permitted outer holes.
- Apply a fixed 0.2 mm radial mating clearance by making the bottom protrusion 0.2 mm smaller than the 2 mm cavity radius, without reducing the main wall thickness.
- Keep only the outermost four cardinal holes on the 14 mm grid, but require the largest hole section and its 2 mm margin to remain on the central flat floor as well as satisfying the 2 mm outer-edge clearance.
- Extend the geometry quality report and behavior-focused tests to cover the new ramp, floor, hole, clearance, and equal-diameter mating contracts.

**Non-Goals:**

- Do not change the `opengrid-stackable-cylinder` modelId, buildKey, route, parameter keys, slider ranges, persistence identity, or export filename identity.
- Do not tilt the full internal wall; only the lower floor-to-wall transition is 45 degrees.
- Do not add a thickened stacking ring, permanent posts, a lower filler layer, or a new user-configurable clearance control.
- Do not guarantee stacking between different outer diameters.
- Do not change the top outer rim from its square 90-degree profile or alter the existing model catalog and lifecycle architecture.

## Decisions

### 1. Derive the inner ramp as a true normal offset

Let `R = diameter / 2`, `W = 2`, and `B = 2.6`. The retained external main transition runs from `(R-W, B)` to `(R, B+W)`, so it is a 45-degree line from `Z=2.6` to `Z=4.6`. The internal ramp is the parallel line offset toward the cavity by `W` along its normal, not a line selected by independently moving its endpoints.

For the fixed dimensions, the internal ramp meets the straight inner wall at `Z = B + W*sqrt(2)`, approximately `5.43 mm`, and meets the central `Z=3` floor at the corresponding radial coordinate. This preserves a 2 mm normal shell thickness on the sloped section. The 3 mm value therefore describes the central flat, hole-bearing floor; the annular ramp region is intentionally thicker.

An alternative of using a 2 mm radial and 2 mm vertical coordinate shift was rejected because two 45-degree faces with that offset would be only about 1.70 mm apart normal to the faces. Enlarging the cavity was also rejected because it would reduce the straight wall below 2 mm.

### 2. Keep the mating cavity and protrusion separate from the outer transition

The top cavity radius remains `R-W`. The mating bottom protrusion radius becomes `R-W-stackFitClearance`, where the fixed `stackFitClearance` is `0.2 mm`. The lower foot keeps its 0.8 mm bevel and vertical landing at `Z=2.6` at this smaller protrusion radius. A short radial shoulder connects that protrusion to the retained external main transition at radius `R-W`; the main transition still spans exactly 2 mm radially and vertically and ends at `Z=4.6`.

This makes the 0.2 mm allowance an actual printable mating clearance instead of only a quality-probe constant, while keeping the nominal cylindrical wall at 2 mm. The shoulder is a structural stop, not a stacking ring or filler layer.

### 3. Calculate outer holes from both radial boundaries

The center hole is always generated. For outer-hole selection, use the largest hole radius `rH = 7.05/2`, grid pitch `P=14`, outer clearance `E=2`, and flat-floor clearance `F=2`. Let `rFlat` be the radius where the internal ramp begins at the `Z=3` central floor. Select the largest non-negative index satisfying:

```text
n = max(0, floor(min((R - E - rH) / P,
                     (rFlat - F - rH) / P)))
```

When `n >= 1`, generate exactly `(±14n, 0)` and `(0, ±14n)`. When `n=0`, generate no outer holes. This retains the “outermost four only” behavior and prevents a stepped hole from opening onto the internal ramp. With the fixed profile, the additional flat-floor margin makes the first outer layer available at approximately `D=48 mm`, while the existing outer-edge-only threshold would be approximately `D=40 mm`.

### 4. Keep hole cutting axial and quality checks nominal

The hole cutters remain axial cylinders with a small construction overrun to avoid coincident boolean faces. Their measured contract remains exact: the lower section spans nominal `Z=0..2`, the upper section spans nominal `Z=2..3`, and the planar shoulder is at `Z=2`. The quality report must inspect the resulting cylindrical faces rather than rely on cutter dimensions alone.

The internal floor corner is now a direct ramp-to-wall transition, so the existing torus/fillet assertion is replaced with an inner-ramp face and no-internal-fillet assertion. The quality path must also verify the ramp angle, the derived flat-floor radius, the normal offset from the external ramp, the two clearances, one-solid validity, bounds, and equal-diameter non-interference.

### 5. Preserve the existing lifecycle and stable identity

No new route, catalog identity, persistence key, Worker protocol, or export naming scheme is needed. Existing saved `diameter` and `height` snapshots remain valid; only the generated geometry and its diagnostic expectations change. Failed candidates continue to leave the last valid committed model visible through the current Worker lifecycle.

## Risks / Trade-offs

- **[Sharp ramp transitions can be sensitive to OpenCascade booleans]** → Keep the profile ordered and non-self-intersecting, use the existing generation-stage cleanup, and add minimum/maximum diameter B-Rep tests.
- **[The 0.2 mm fit allowance may be too tight or loose for a particular printer]** → Keep it as a documented fixed CAD constant, verify the exact equal-diameter intersection is empty, and leave printer-specific hole compensation outside this change.
- **[Outer holes near the ramp could change opening shape]** → Apply the flat-floor clearance guard before creating the four-hole layer and test the threshold just below, at, and above the first safe diameter.
- **[Changing the inner floor removes an existing torus face used by diagnostics]** → Replace face-count expectations with behavioral ramp/floor measurements; do not retain a decorative fillet solely to satisfy old tests.
- **[The geometry is a breaking export-shape change]** → Keep the stable model identity and parameters, document the changed STEP/STL shape, and run regression tests before committing a new preview.

## Migration Plan

1. Update the fixed cylinder configuration and typed outer-hole calculation.
2. Replace the revolved shell profile and stepped-hole depths, then update the quality report and diagnostics.
3. Update unit, Worker integration, runtime, and E2E coverage for thresholds, profile measurements, exports, and same-diameter mating.
4. Run formatting, type checking, focused geometry tests, full relevant tests, and strict OpenSpec validation.

No persisted-parameter migration is required. If geometry validation fails during rollout, the existing lifecycle keeps the last valid revision; code rollback restores the previous generated shape and hole contract.

## Open Questions

None for the agreed defaults: the mating clearance is 0.2 mm radial, the side-hole flat-floor margin is 2 mm, the internal transition has no filler/fillet, and the 3 mm floor value is the central minimum floor thickness.
