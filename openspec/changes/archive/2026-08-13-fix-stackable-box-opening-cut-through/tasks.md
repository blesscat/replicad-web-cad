## 1. Regression coverage

- [x] 1.1 Add behavior-focused B-Rep tests that enable each `+X`, `-X`, `+Y`, and `-Y` opening and verify the central opening span is clear through the complete wall thickness in normal and thin-shell modes.
- [x] 1.2 Preserve assertions for the requested sill/profile geometry, corner bridges, floor and rim interfaces, unchanged bounds, and valid single-solid output while covering the positive-side defect.

## 2. Cutter correction

- [x] 2.1 Correct the normal/base-plate positive-side wall cutter origins so `+X` and `+Y` start one margin inside the interior wall face and extend beyond the exterior face.
- [x] 2.2 Apply the same complete-through-wall correction to the thin-shell positive-side wall cutters without changing opening dimensions, floor semantics, or the negative-side paths.

## 3. Validation and handoff

- [x] 3.1 Run the focused stackable-box opening integration tests and confirm the new full-wall penetration checks pass.
- [x] 3.2 Run TypeScript, formatting, strict OpenSpec validation, and relevant box geometry regressions; review the final diff for unchanged model IDs, routes, parameters, and exports.
