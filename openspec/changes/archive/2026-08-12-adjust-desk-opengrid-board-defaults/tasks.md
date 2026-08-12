## 1. Regression Tests First

- [x] 1.1 Extend the OpenGrid system-context unit coverage to require Desk board `rows=4`, `columns=4`, `chamfers=none`, and `screwMode=none`, while asserting Wall and context-free defaults remain unchanged.
- [x] 1.2 Add browser behavior coverage for the Desk initial controls, Desk whole restore, Desk field-level restore, context-free field restore, and persisted Desk snapshot precedence.
- [x] 1.3 Add browser coverage that the accessible screw-mode select appears before the screw-size-source select and keeps the row/column controls with the selected mode.

## 2. Desk Preset and Context-Aware Restore

- [x] 2.1 Update the existing Desk OpenGrid preset resolver to override only the requested chamfer and screw-hole modes in addition to the existing Desk grid, without changing global defaults.
- [x] 2.2 Thread the optional OpenGrid system context through the CAD workspace panel dispatcher to the OpenGrid component panel.
- [x] 2.3 Implement a named effective-default resolver in the OpenGrid panel using the active system preset or validated context-free defaults, and use it for changed indicators and field-level restore handlers.

## 3. OpenGrid Control Layout and Verification

- [x] 3.1 Move the complete screw-mode subsection before the screw-size-source subsection while preserving conditional controls and existing parameter updates.
- [x] 3.2 Run focused unit and browser tests, typecheck, formatting checks, and the relevant build/validation commands; resolve any regressions.
- [x] 3.3 Run OpenSpec validation and confirm all implementation tasks and acceptance scenarios are complete.
