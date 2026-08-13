## 1. Behavior-first verification

- [x] 1.1 Update honeycomb contract tests to require the Hex Mesh center-pitch relationship and a printable rib gap derived from the shared configuration.
- [x] 1.2 Add behavior-focused coverage showing eligible box and cylinder panels produce multiple rows at default height, dense positive side and floor cell coverage, preserve a local mesh around an enabled side opening, and leave existing floor holes unchanged.
- [x] 1.3 Keep volume, envelope, hole/interface, export, and small-panel fallback regressions for both container types.
- [x] 1.4 Add Open Shelf contract/workspace tests for default-false legacy hydration and a typed toggle, plus geometry tests for smaller plate cells, material reduction, unchanged bounds, protected pegs/intersections, and exportable one-solid output.

## 2. Shared Hex Mesh lattice

- [x] 2.1 Derive horizontal and row center spacing from hex radius and rib thickness while preserving the existing side-lattice fields, using a smaller floor lattice, producing multiple default-height rows, and keeping candidate generation deterministic.
- [x] 2.2 Preserve complete-cell, frame, circular-boundary, hole, seam, socket, and opening keep-outs; make side-opening keep-outs local to the actual feature envelope.
- [x] 2.3 Verify cylindrical tangent placement uses the same Hex Mesh spacing and keeps seam/edge candidates safe.

## 3. Builder integration and lifecycle

- [x] 3.1 Apply dense Hex Mesh cutters to box side and eligible bottom panels without changing normal/base-plate/thin-shell interfaces or opening geometry.
- [x] 3.2 Apply dense Hex Mesh cutters to cylinder side and eligible bottom panels without changing the diameter, floor profiles, holes, or stacking interface.
- [x] 3.3 Keep side/floor Boolean scopes separate, retain generation-current checks, and clean every compound, cutter, temporary sketch, and replaced shape on success and failure.
- [x] 3.4 Apply protected side-lattice cutters to Open Shelf walls/dividers/backboard and finer plate-lattice cutters to its bottom/shelves/top while preserving the normal build path when disabled.

## 4. Validation and handoff

- [x] 4.1 Run the focused Hex Mesh unit suite and confirm the new behavior tests fail before implementation and pass after implementation.
- [x] 4.2 Run relevant Worker/integration/export regressions plus TypeScript and formatting checks.
- [x] 4.3 Run strict OpenSpec validation and review the final diff for unchanged public IDs, routes, disabled-mode geometry, and export identities.
- [x] 4.4 Rebase the feature branch onto the latest `origin/main` containing `opengrid-open-shelf` and restore the in-progress Hex Mesh work without conflict.

## 5. Visible-bottom and cylinder-wrap regressions

- [x] 5.1 Add behavior tests that require cylinder floor cells to reach both visible faces, distribute across every usable quadrant, and close each unobstructed side row without an artificial seam.
- [x] 5.2 Use floor-specific printable-rib keep-outs, through-cut eligible cylinder floors, and periodic circumferential side rows while preserving holes and peripheral interfaces.
- [x] 5.3 Re-run focused geometry, Worker/export, preview, type, format, build, strict OpenSpec, and independent compliance-review gates.

## 6. Desk thin-floor bottom mesh correction

- [x] 6.1 Add behavior tests proving the Desk thin-shell box and thin-bottom cylinder contain complete through-floor Hex Mesh openings.
- [x] 6.2 Enable protected floor cells for eligible thin-floor profiles while preserving every existing hole, floor transition, and lower interface boundary.
- [x] 6.3 Re-run focused geometry, Worker/export, preview, type, format, build, and strict OpenSpec gates before independent review and commit.

## 7. Full box-floor coverage with clipped cells

- [x] 7.1 Add behavior tests requiring the Desk box lattice to reach every protected floor edge with clipped cells and retain an exact 2 mm circular safety ring around existing holes.
- [x] 7.2 Generate and trim box-floor boundary cells at the outer frame, required seam supports, and hole safety rings instead of rejecting each intersecting hexagon wholesale.
- [x] 7.3 Confirm the denser floor remains one valid through-cut solid with unchanged holes, interfaces, bounds, and export behavior.

## 8. Full container-side coverage with clipped cells

- [x] 8.1 Add behavior tests requiring box and cylinder side lattices to reach their protected wall boundaries with clipped partial cells, retain side-opening bridges, and cut through the cylinder inner curve at each cell's lateral extent.
- [x] 8.2 Generate and trim side-wall boundary cells at perimeter frames, vertical bands, and active side-opening keep-outs instead of rejecting each intersecting hexagon wholesale; compensate cylinder cutter depth for the inner-wall sagitta across the cell width.
- [x] 8.3 Confirm the denser side mesh remains one valid solid with unchanged openings, interfaces, bounds, cancellation/progress behavior, and export output.

## 9. Full cylinder-floor coverage with clipped cells

- [x] 9.1 Add behavior tests requiring the cylinder floor lattice to reach its protected circular frame with clipped cells and retain an exact 2 mm circular safety ring around every enabled bottom hole.
- [x] 9.2 Generate and trim cylinder-floor boundary cells at the circular frame and hole safety rings instead of rejecting each intersecting hexagon wholesale, while retaining bounded Boolean progress, cancellation, and native-shape cleanup.
- [x] 9.3 Confirm the denser cylinder floor remains one valid through-cut solid with unchanged holes, lower stacking interface, bounds, and STEP/STL output.

## 10. Full Open Shelf coverage and inclined bottom wedge

- [x] 10.1 Add behavior-focused tests requiring clipped Hex Mesh cells at every Open Shelf panel family's protected boundaries and through the usable outer-side and divider regions of an inclined bottom wedge; confirm the new assertions fail before implementation while protected rails, bridges, and locating pegs remain covered.
- [x] 10.2 Generate Open Shelf boundary-overlapping candidates, clip them in each panel's local safe mask, trim bottom cells at exact locating-peg keep-outs, and include the non-degenerate bottom-wedge side masks while preserving bounded batches, cancellation, progress, cleanup, and disabled-mode geometry.
- [x] 10.3 Confirm the result remains one valid lower-volume solid with unchanged bounds, front opening, inclination, panel contacts, locating pegs, preview, and STEP/STL output; run focused geometry, Worker/export, type, format, build, strict OpenSpec, and independent compliance-review gates.
