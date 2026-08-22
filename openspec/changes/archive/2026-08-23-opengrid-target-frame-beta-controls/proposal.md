## Why

The physical target-frame checkbox currently exposes controls that are
incompatible with fitted single-board generation, including print planning and
the nominal board chamfer controls. The frame is also always centered and
cannot represent a one-sided physical extension, so users need a clearly
scoped beta mode for configuring the frame independently from the OpenGrid
host geometry.

## What Changes

- Move the physical target-frame checkbox to the first OpenGrid control and
  label it as Beta.
- When the checkbox is enabled, show the target-size grid calculator, a new
  outer-frame corner-shape control, and four independently selectable frame
  directions (top, right, bottom, left).
- Use `none`, `chamfer` (倒角), and `fillet` (圓角) as the persisted outer-frame
  corner-shape values; keep this separate from the nominal board chamfer.
- Hide print planning and nominal board chamfer controls while target-frame
  fitting is enabled; keep existing connector and screw controls available.
- Allocate each axis remainder to its selected frame sides: both opposite
  sides split the remainder equally, one selected side receives the full
  remainder, and no selected side leaves that axis at its nominal size.
- Preserve connector holes on nominal board sides even when the corresponding
  physical frame side is absent; the physical frame must not create new grid
  hosts or connector locations.
- Preserve the existing `opengrid` model id and add backward-compatible
  defaults for the new persisted frame fields.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `opengrid-generator`: define directional target-frame geometry, independent
  outer-frame corner shapes, and the resulting connector and envelope rules.
- `opengrid-half-cell`: define the beta control flow, persisted frame fields,
  visibility rules, and directional remainder allocation in the OpenGrid panel.

## Impact

- OpenGrid normalized parameters, persistence hydration, validation, bounds,
  file identity, and Worker geometry/quality checks.
- OpenGrid Svelte controls and Chinese/English catalog labels.
- Unit, browser, and native Worker integration tests.
- Main OpenSpec requirements for the OpenGrid generator and half-cell panel;
  no new component, route, build key, or model id is introduced.
