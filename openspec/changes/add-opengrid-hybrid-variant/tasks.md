## 1. Establish behavior with failing tests

- [x] 1.1 Extend the OpenGrid contract tests to require the four supported variants, including Hybrid validation, normalization, and a 13.8 mm maximum envelope.
- [x] 1.2 Add a Worker/CAD integration test for a 3x3 Hybrid board that distinguishes Heavy perimeter occupancy from the empty-above-Full interior, while also asserting one solid and valid cell openings.
- [x] 1.3 Add regression coverage for Hybrid half-cell boundaries, layered connector and screw cuts, export lifecycle, and preservation of existing Full, Lite, and Heavy behavior.

## 2. Extend the normalized OpenGrid contract

- [x] 2.1 Add Hybrid to the OpenGrid variant type, configuration metadata, runtime validator, and any shared layered-variant classification helpers without changing existing model ids or snapshot fields.
- [x] 2.2 Update profile, bounds, quality, and Worker-cache metadata so Hybrid reports the Heavy envelope while using the existing Full and Heavy profile dimensions and native-resource lifecycle.

## 3. Build the mixed Hybrid geometry

- [x] 3.1 Implement the one-cell-wide perimeter classifier and cell-balanced lower surface assembly: Heavy profile for perimeter cells and standard Full profile for interior cells.
- [x] 3.2 Implement the perimeter-only upper Heavy layer and middle bridge, including Heavy half-cell extension pieces, centered placement, fusion, cancellation, and cleanup for all supported board sizes.
- [x] 3.3 Apply layered chamfer, screw, and connector cutters to Hybrid at the same envelope levels as Heavy, and keep one-cell Hybrid prototype/template behavior explicitly Heavy-equivalent without using it as a multi-cell product fallback.
- [x] 3.4 Preserve the existing Full, Lite, and Heavy assembly paths and verify that product generation continues to select the cell-balanced strategy and rejects generation failures rather than silently falling back.
- [x] 3.5 Add a behavior-first Hybrid section test for the inward-facing sloped Heavy-to-Full transition, including perimeter corners and preserved through-cell openings.
- [x] 3.6 Implement and quality-gate the reusable Hybrid transition wedge without changing the existing Full, Lite, or Heavy profiles.

## 4. Update the OpenGrid workspace surface

- [x] 4.1 Add Hybrid to the catalog and panel controls with an explicit “13.8 mm max; Heavy perimeter / Full interior” description and derived dimensions that preserve all existing controls.
- [x] 4.2 Update OpenGrid documentation, route-facing copy, and user-visible tests so Hybrid is discoverable while the existing opengrid model id, preview, STEP, and STL controls remain unchanged.

## 5. Complete regression and benchmark matrices

- [x] 5.1 Update Worker, runtime, persistence, release, geometry, and optional external-reference test matrices to include Hybrid without requiring network access at runtime or inventing downloaded binary fixtures.
- [x] 5.2 Extend the environment-gated release benchmark to cover Full, Lite, Heavy, and Hybrid at the documented board sizes and preserve quality/export failure reporting.

## 6. Verify the complete change

- [x] 6.1 Run targeted contract, CAD-kernel, Worker, UI, and export tests first, then run formatting, typecheck, build, and the relevant full test suites; resolve failures without weakening behavior assertions.
- [x] 6.2 Run strict OpenSpec validation and confirm every requirement scenario is implemented and every task checkbox is complete before independent review.
