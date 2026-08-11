## Why

The current OpenGrid stackable box is built around a fixed 5 mm lower assembly and a stepped top rail for box-to-box sliding. Some prints need a lighter, flat-bottom container instead, with a thinner wall, simpler rim, and the same footprint, opening, and bottom-hole workflows.

## What Changes

- Add a new `薄殼模式` profile to the existing `opengrid-stackable-box` model through a new `thinShellMode` mode flag; keep the existing model ID, route, and default mode unchanged.
- Make the thin-shell profile non-stackable: remove the lower stacking guide and internal seam-relief interface, and replace the stepped top rail with a continuous 1.6 mm sloped top opening whose outer edge is high and inner edge is low, without a horizontal rim plane.
- Generate a 2 mm flat bottom with an inner-bottom R2 mm fillet, a 1.6 mm straight side shell, and a fixed 1.5 mm chamfer on the outside bottom perimeter.
- Use a two-stage special corner socket with an outside/lower Ø5.05 mm section for 1 mm and an inside/upper Ø7.05 mm retaining seat for 1 mm.
- Preserve the existing X/Y OpenGrid footprint contract, clear-height semantics, four independent side-opening controls, corner-hole switch, full bottom-hole grid switch, preview lifecycle, and STEP/STL export workflows for all existing modes.
- Keep the new thin-shell mode independent from the existing base-plate mode, with deterministic mode-specific export metadata and geometry-quality validation.

## Capabilities

### New Capabilities

- None. This is an additional profile of the existing model.

### Modified Capabilities

- `opengrid-stackable-box`: Add the thin-shell parameter mode, its flat-bottom and chamfered-rim geometry contract, its 1+1 mm stepped corner socket profile, and its non-stackable behavior while preserving existing opening and hole modes.

## Impact

- Affected parameter contract, validation, derived bounds, mode normalization, and export naming in `src/cad-contract/units/opengrid-stackable-box.ts` and related workspace/catalog code.
- Affected thin-shell geometry construction, opening cutters, bottom-hole cutters, and mode-specific quality gates under `src/cad-kernel/components/opengrid-stackable-box/`.
- Affected stackable-box component panel, persistence normalization, unit tests, Worker B-Rep tests, and end-to-end mode coverage.
- Existing `opengrid-stackable-box` model identity and existing default/base-plate behavior remain intentionally preserved; only the new profile is non-stackable and uses the new geometry.
