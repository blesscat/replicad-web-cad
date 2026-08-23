## 1. Center-remover geometry

- [x] 1.1 Extend the generated OpenGrid Snap center-remover cutter with one centered vertical nominal Ø5.0 mm cylinder spanning the existing full cutter overrun, reusing the shared locating-hole radius.
- [x] 1.2 Preserve the existing lower 8 × 8 mm opening, upper 4 × 8 mm stepped profile, ledge material, optional-feature exclusivity, and fixed-dimension behavior after valid non-hole XY scaling.

## 2. Geometry quality coverage

- [x] 2.1 Add quality probes that verify the centered Ø5.0 mm passage through the full Snap Z envelope, its fixed center and diameter, and remaining ledge material outside the passage.
- [x] 2.2 Verify that disabling `centerRemoverHole` leaves the central body unchanged and that Half/Quarter fixed assets remain unaffected.

## 3. Integration tests and validation

- [x] 3.1 Extend OpenGrid Snap B-Rep integration coverage for Standard and Directional Full/Lite center-remover and combined-feature cases, including positive outer offsets.
- [x] 3.2 Verify a coaxial nominal Ø5 mm positioning pillar with `offset=0` passes through the new passage, while the fixed passage contract does not claim support for pillar diameter offsets.
- [x] 3.3 Run targeted Snap tests, project type/check validation, and the relevant full test suite; record the exact results before review.

Validation record:

- `pnpm exec vitest run tests/worker/opengrid-snap-builder.integration.test.ts -t "applies the two optional body features independently|passes a fixed nominal positioning pillar"` — 6 passed.
- `pnpm exec vitest run tests/worker/opengrid-snap-builder.integration.test.ts tests/unit/opengrid-snap-profile.test.ts` — 53 passed.
- `pnpm exec vitest run tests/worker/opengrid-snap-footprint-matrix.test.ts` — 1 passed.
- `pnpm exec tsc --noEmit` — passed.
- `pnpm exec prettier --check src/cad-kernel/components/opengrid-snap/builder.ts src/cad-kernel/components/opengrid-snap/quality.ts tests/worker/opengrid-snap-builder.integration.test.ts tests/worker/opengrid-snap-footprint-matrix.test.ts` — passed.
- `git diff --check` — passed.
- `openspec validate opengrid-snap-center-pillar-hole --type change --strict --no-interactive` — valid.
