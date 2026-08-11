## Why

The locating-interface centralization mapped the OpenGrid stepped-hole consumers to the shared assembly and shaft openings in the wrong axial orientation. As a result, Stackable Box special sockets and Stackable Cylinder stepped holes currently generate a Ø5.05 mm lower section followed by a Ø4.05 mm upper section, while the intended retaining interface is Ø4.05 mm below and Ø7.05 mm above. The ordinary Stackable Box full-grid hole remains correct at straight Ø5.05 mm and must be preserved.

## What Changes

- Correct the special stepped-hole profile for `opengrid-stackable-box` in normal, base-plate, and thin-shell modes to use Ø4.05 mm for the lower/outside section and Ø7.05 mm for the upper/interior retaining section, preserving the existing mode-specific depths and planar shoulder.
- Correct the equivalent stepped-hole profile for `opengrid-stackable-cylinder` across its default, thin-bottom, and bottom-plate modes.
- Keep ordinary Stackable Box full-grid holes as straight Ø5.05 mm through-holes, independent of the special corner-socket profile.
- Align geometry quality probes, validation gates, and behavior tests with the corrected profiles so tests cannot reintroduce the reversed mapping.
- Preserve the shared nominal Ø5 mm locating interface, stable model IDs, routes, parameter snapshots, exports, and the Snap/Divider/Pillar geometry contracts.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `opengrid-stackable-box`: Correct the two-stage special corner-socket diameter order while preserving ordinary full-grid holes and all public component contracts.
- `opengrid-stackable-cylinder`: Correct the two-stage bottom-hole diameter order for every supported floor mode.

## Impact

- Affected CAD contracts and builders under `src/cad-contract/units` and `src/cad-kernel/components` for Stackable Box and Stackable Cylinder.
- Affected geometry-quality measurement, validation, and integration/unit tests for stepped holes and ordinary full-grid holes.
- The generated special-hole B-Rep changes to the intended physical interface; stable routes, identifiers, parameter schemas, exports, and unaffected nominal Ø5 consumers remain unchanged.
