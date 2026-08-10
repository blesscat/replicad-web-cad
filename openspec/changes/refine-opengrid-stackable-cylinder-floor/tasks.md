## 1. Contract and derived geometry constants

- [x] 1.1 Update the fixed `opengrid-stackable-cylinder` geometry constants for a 3 mm central floor, `Ø5.05 × 2 mm` plus `Ø7.05 × 1 mm` hole sections, a 2 mm flat-floor clearance, and the agreed 0.2 mm radial stacking fit while preserving the existing typed diameter/height snapshot.
- [x] 1.2 Add shared derived-radius helpers for the central flat-floor boundary, the parallel 45-degree inner ramp, and the clearance-reduced mating protrusion so contract code and Worker quality checks use the same formulas.
- [x] 1.3 Replace the outer-hole index calculation with the combined outer-edge and flat-floor safety calculation, retaining center-only behavior at `n=0` and exactly four outermost cardinal holes at `n>=1`.

## 2. Cylinder shell and hole implementation

- [x] 2.1 Replace the revolved shell profile's 5 mm floor and internal fillet with a 3 mm central floor and a sharp inner 45-degree ramp that is a 2 mm normal offset from the retained external 45-degree transition.
- [x] 2.2 Implement the clearance-reduced bottom protrusion and its short structural shoulder while retaining the 0.8 mm lower foot bevel, `Z=2.6` vertical landing, 2 mm external transition, square top rim, and 2 mm top inner chamfer.
- [x] 2.3 Update all center and permitted outer hole cuts to the nominal `Ø5.05 mm` lower section from `Z=0..2` and `Ø7.05 mm` upper section from `Z=2..3`, keeping the planar step and construction overrun isolated from measured quality values.
- [x] 2.4 Update the interface quality report to measure the new central floor, internal ramp angle and offset, straight wall, hole profile, flat-floor boundary, protrusion clearance, and absence of internal/external filler or fillet faces.
- [x] 2.5 Update geometry rejection paths and diagnostics so invalid ramp, floor, hole, clearance, or equal-diameter interface results cannot replace the last valid model.

## 3. Behavior-focused regression coverage

- [x] 3.1 Update unit tests for the fixed configuration, derived flat-floor radius, 2+1 mm stepped hole depths, and outer-hole thresholds at diameters 20, 39, 40, 47, 48, 56, and 300 mm.
- [x] 3.2 Add Worker integration assertions for the 3 mm central floor, the parallel 45-degree inner ramp, 2 mm normal ramp thickness, 2 mm straight wall, and the removed internal fillet/filler.
- [x] 3.3 Update Worker hole-layout and clearance tests to verify every generated outer hole stays at least 2 mm from both the outer edge and the internal ramp, while the center hole remains valid at the minimum diameter.
- [x] 3.4 Update same-diameter mating tests to verify the 0.2 mm radial clearance produces guided, non-interfering solids and that the top/bottom reference-inspired profile remains present.
- [x] 3.5 Preserve and re-run existing route, persistence, runtime lifecycle, deterministic export filename, STEP, STL, and different-diameter behavior tests without changing the stable model identity.

## 4. Documentation and diagnostics

- [x] 4.1 Update user-facing and developer-facing cylinder documentation to describe the 3 mm central floor, the 45-degree inner ramp, the 2+1 mm hole stack, the flat-floor side-hole guard, and the fixed 0.2 mm stacking clearance.
- [x] 4.2 Update any geometry-quality error messages, report types, or test fixtures whose names still require a 5 mm floor, 3+2 mm holes, or an internal bottom fillet.

## 5. Verification and handoff

- [x] 5.1 Run focused unit and Worker geometry tests, including minimum/maximum diameter and first-safe side-hole threshold cases; fix any B-Rep or tolerance failures.
- [x] 5.2 Run formatting, type checking, build, relevant runtime/E2E tests, and the full affected test suites.
- [x] 5.3 Run `openspec validate refine-opengrid-stackable-cylinder-floor --strict`, review the final diff for unrelated changes, and report the generated geometry and export verification results.
