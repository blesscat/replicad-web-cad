## Why

The OpenGrid pillar currently exposes an arbitrary total length and a checkbox that optionally adds a base connection. That model cannot represent the two intended assembly parts: a fixed standard pillar and a fixed thin-shell pillar, both using the same smaller shaft and the existing flange. The recent Stackable Box and Stackable Cylinder special-hole correction also needs to be aligned with the new Ø4.5 mm shaft.

## What Changes

- **BREAKING** Replace the pillar's `length` and `baseConnection` parameter contract and checkbox with one required `mode` radio value: `standard` or `thin-shell`.
- Make both modes generate a centered Ø4.5 mm body, an existing-style 0.5 mm upper chamfer, and a flat Ø7 mm × 0.8 mm lower flange with a sharp shoulder.
- Fix the total length by mode: 9 mm for `standard` and 5 mm for `thin-shell`; remove the manual total-length control.
- Normalize legacy pillar persistence to the new standard mode when the old `{ length, baseConnection }` snapshot cannot express the new modes, while preserving the existing `opengrid-pillar` model ID, build key, route, catalog identity, and OpenGrid display naming.
- Update deterministic pillar exports to distinguish the fixed modes while retaining STEP/STL lifecycle behavior.
- Change the shared test shaft diameter to Ø4.5 mm and derive the special shaft opening as Ø4.55 mm. Keep the shared Ø7 mm × 0.8 mm flange, Ø7.05 mm retaining opening, and ordinary Ø5.05 mm box grid holes unchanged.
- Apply the Ø4.55 mm special lower/outside bore to the Stackable Box corner sockets and Stackable Cylinder stepped bottom holes, including their quality fixtures, tests, and normative requirements.

## Capabilities

### New Capabilities

None. This is a compatibility update to existing OpenGrid components and their shared assembly interface.

### Modified Capabilities

- `opengrid-pillar-generator`: replace the arbitrary-length/checkbox contract with fixed standard and thin-shell modes and the new Ø4.5 mm / Ø7 mm × 0.8 mm geometry.
- `opengrid-stackable-box`: update special socket lower bores and compatibility behavior from Ø4.05 mm to Ø4.55 mm while retaining Ø7.05 mm retaining seats and ordinary Ø5.05 mm holes.
- `opengrid-stackable-cylinder`: update stepped bottom-hole lower sections from Ø4.05 mm to Ø4.55 mm while retaining the existing floor depths and Ø7.05 mm upper sections.
- `opengrid-grid-contract`: revise the shared feature-dimension requirement so the changed special shaft interface is distinct from the unchanged ordinary grid opening.
- `component-parameter-persistence`: migrate persisted pillar snapshots to the new mode-only schema and fixed defaults.
- `cad-workspace`: update pillar initialization, validation, generation, and route integration for the mode-only snapshot.
- `home-model-selection`: update the direct pillar-navigation fallback snapshot to the new standard mode.
- `stl-export`: update deterministic pillar STEP/STL filenames for the two fixed modes.

## Impact

- Affected pillar contract, builder, quality gate, catalog metadata, panel controls, persistence normalization, runtime validation, worker messages, exports, and focused unit/Worker/E2E tests.
- Affected shared locating/assembly dimensions and the Stackable Box/Cylinder geometry and quality checks that consume them.
- Existing model IDs, route slugs, OpenGrid naming, ordinary Ø5.05 mm grid holes, Ø7.05 mm retaining geometry, and the Ø7 mm × 0.8 mm flange interface remain intentionally preserved except where the special lower bore is explicitly changed to Ø4.55 mm.
