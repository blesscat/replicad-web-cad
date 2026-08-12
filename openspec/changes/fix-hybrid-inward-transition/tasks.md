## 1. Behavior-first coverage

- [x] 1.1 Update the Hybrid integration probes to expect a full-pitch ramp on
  the Full-side of each perimeter boundary and to reject the old outward
  placement.
- [x] 1.2 Add corner diagonal and through-opening assertions for a 3 by 3
  Hybrid board, using shared OpenGrid configuration values.
- [x] 1.3 Run the focused Hybrid integration test and confirm it fails against
  the current outward quarter-pitch geometry.

## 2. Transition geometry

- [x] 2.1 Change the Hybrid transition span configuration to one full grid
  pitch and update the builder/quality probes accordingly.
- [x] 2.2 Shift each side wedge origin into the adjacent Full cell while
  retaining the Full-to-Heavy profile and tangential pitch extrusion.
- [x] 2.3 Shift spatial assembly centers with the moved transition pieces and
  add the inner-corner diagonal join.
- [x] 2.4 Update the Hybrid quality probes to inspect the inward transition and
  validate the Heavy-side boundary and opening behavior.

## 3. Regression and validation

- [x] 3.1 Run focused Hybrid geometry tests, including feature-enabled and
  rectangular boards, and resolve any topology or opening regressions.
- [x] 3.2 Run OpenGrid builder, Worker lifecycle, export, and existing Hybrid
  regression tests.
- [x] 3.3 Run formatting/type checks and strict OpenSpec validation; review the
  final diff for scope and resource cleanup.
