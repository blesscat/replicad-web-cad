## Why

The current stackable-box implementation uses the earlier thick-shell profile, but the supplied `public/box-2-2-3.step` reference defines a different upper rail, sliding block, and cell-boundary bottom guide. The model also needs height to describe usable internal space while keeping a fixed, printable 5 mm lower assembly so the reference interface and the previously defined 28 mm/14 mm grid and hole layout can coexist.

## What Changes

- **BREAKING** Change `height` from the external Z height to the clear internal box height measured above the fixed bottom assembly and below the upper inner-rim datum.
- **BREAKING** Replace the current 2 mm wall and 5 mm-floor interpretation with the reference-style 1.2 mm main wall, 1.2 mm interior floor, and a fixed 5.0 mm total lower assembly.
- Replace the upper interface with the reference profile: 1.75 mm 45° inner lead-in, 1.2 mm vertical sliding block, 0.8 mm 45° transition, 1.8 mm vertical segment, and 2.0 mm 45° return to the side wall.
- Replace the bottom interface with a 0.8 mm bed-facing 45° foot, 1.8 mm vertical guide, and 1.2 mm 45° transition into the supported floor, preserving 45° angles while fitting the fixed 5 mm lower height.
- Ensure the guide and internal-seam relief geometry ends at the underside of the supported floor, never cuts into the box interior, and leaves no unsupported overhanging lip.
- Preserve the 28 mm OpenGrid pitch, half-cell footprints, 0.15 mm external clearance, centered placement, 14 mm hole grid, and the existing Ø5.05 mm/3 mm plus Ø7.05 mm/2 mm socket profile and positions.
- Preserve same-part stacking, lateral capture, continuous sliding, bridge support, Snap behavior, full-hole mode, Worker behavior, preview, STEP, and STL export contracts apart from the documented external-height derivation.
- Add measured profile, height-datum, printability, mating, and export regression coverage and update user-facing geometry descriptions.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `opengrid-stackable-box`: Change the height datum and replace the upper/lower stacking profiles with the reference-aligned, printable interface while retaining the existing OpenGrid footprint and hole contracts.

## Impact

- Affected geometry and contract code: `src/cad-contract/units/opengrid-stackable-box.ts` and `src/cad-kernel/components/opengrid-stackable-box/`.
- Affected interface-quality gates, Worker/B-Rep tests, e2e coverage, model catalog, panel copy, README, and error mapping.
- Uses `public/box-2-2-3.step` as the dimensional reference; the external footprint and hole coordinates remain generated from the existing 28 mm and 14 mm OpenGrid rules.
- Previously exported stackable-box solids will not be geometrically compatible with the new interface, while parameter payloads and model identity remain stable.
