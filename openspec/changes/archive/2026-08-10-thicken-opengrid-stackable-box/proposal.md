## Why

Physical prints show that the current OpenGrid stackable box has fragile 1 mm walls and floor. The old perimeter and rectangular seam cuts leave thin unsupported underside features, making the outer edge difficult to print. The box still needs to stack and slide with another box, so the original 28 mm grid-seam clearance must remain in a stronger, printable form while the reference-style top rail and fixed complementary bottom profile are rebuilt for the thicker shell.

## What Changes

- **BREAKING** Replace the current 1 mm floor and 1 mm side wall with a 5 mm bottom and 2 mm side wall.
- **BREAKING** Replace the old thin guide construction with a reference-style independent stepped top rail fused into the thick side rim, plus a fixed complementary bottom relief/support profile.
- Retain one open V-shaped bottom sliding groove along every internal 28 mm grid seam. Each groove is 1.6 mm wide at the bed-facing opening, 0.8 mm deep, and has two 45° side faces; there is no horizontal suspended ceiling inside the groove. Use the reference-style fixed bottom sequence of a 2 mm 45° outer lead-in, a 1.6 mm vertical support segment at a 2 mm inset, and a 0.8 mm bed-facing foot chamfer. The upper rail uses the complementary 2 mm inner 45° lead-in, 1.6 mm vertical segment, 0.8 mm 45° transition, 1 mm vertical segment, and 2 mm 45° return to the side wall; keep all fixed rail/profile features within the requested external envelope.
- Change the four-corner Snap mounting holes to a two-stage bore: Ø5.05 mm through the outside/lower 3 mm of the floor, followed by Ø7.05 mm through the inside/upper 2 mm.
- Use the integrated side-rim and bottom 45° transitions to lead the upper box onto the lower box while preserving same-part stacking and continuous sliding.
- Preserve the 28 mm/half-cell footprint contract, height parameter semantics, Snap mounting sockets, optional full bottom-hole grid, Worker lifecycle, preview, STEP, and STL export behavior.
- Add explicit mating clearance and geometry checks for sliding, lateral guidance, bottom support, and printability of representative 1×1 and multi-cell boxes.
- Update the stackable-box specification and tests to require the fused reference-style top rail and fixed complementary bottom relief while retaining explicit internal grid-seam V grooves, 45° faces, support, and integrated thick-rim acceptance criteria.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `opengrid-stackable-box`: Change the floor/wall thickness and the box-to-box stacking interface while retaining continuous sliding, Snap mounting, bottom-hole modes, and exportability.

## Impact

- Affected contract and geometry code: `src/cad-contract/units/opengrid-stackable-box.ts` and `src/cad-kernel/components/opengrid-stackable-box/builder.ts`.
- Affected interface-quality assertions, B-Rep integration tests, unit tests, and the canonical OpenSpec capability at `openspec/specs/opengrid-stackable-box/spec.md`.
- Existing generated stackable-box meshes may change shape; the route, parameter payload, filenames, and Worker protocol remain stable.
