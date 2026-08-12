## 1. Regression Coverage

- [x] 1.1 Add a rectangular, feature-enabled Hybrid integration case with half-cell boundaries and all perimeter transitions.
- [x] 1.2 Add observable timing/quality comparison coverage using the existing OpenGrid builder benchmark hooks without asserting brittle timing constants.

## 2. Spatial Hybrid Assembly

- [x] 2.1 Implement a spatial piece/region fuse tree with same-center grouping, largest-span partitioning, shared boolean progress accounting, cancellation checks, and native-resource cleanup.
- [x] 2.2 Route Hybrid upper perimeter surfaces, perimeter bridge pieces, transition wedges, and integrated half-cell extensions through the spatial assembler; keep the dense lower mixed surface on its measured row/cell-balanced path.
- [x] 2.3 Keep Full, Lite, Heavy, prototype-template, Worker protocol, and feature-cut paths on their existing behavior-preserving routes.

## 3. Verification

- [x] 3.1 Run Hybrid integration, OpenGrid regression, type, and formatting checks.
- [x] 3.2 Run focused 3×3, 5×5, and rectangular Hybrid timing/quality comparisons; defer the opt-in 10×10/17×17 release matrix until a longer benchmark run is requested.
