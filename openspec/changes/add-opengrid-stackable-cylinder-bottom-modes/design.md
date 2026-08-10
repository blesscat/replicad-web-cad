## Context

`opengrid-stackable-cylinder` currently has one normalized `{ diameter, height }` snapshot and one Worker revolved profile: the 3 mm central flat floor with a sharp internal 45-degree ramp. That profile is useful for printability, but the original component contract used a 5 mm floor and a rounded inner floor transition. The new change must preserve the current profile as an opt-in thin-bottom mode while making the original-style profile the default.

The mode affects the shell profile, hole depths, hole-layout safety boundary, quality probes, user controls, persistence, and export identity. A single `bottomHolesEnabled` flag additionally controls whether every floor hole is generated; it is not an individual hole selector. The stable model ID, route, Worker ownership, diameter/height ranges, and same-diameter stacking contract remain shared.

## Goals / Non-Goals

**Goals:**

- Add typed, persisted `thinBottomMode: boolean` and `bottomPlateMode: boolean` parameters, both defaulting to `false`.
- Add a typed, persisted `bottomHolesEnabled: boolean` parameter with a default of `true`; it MUST enable or disable all bottom holes as one group.
- Build the default mode with the original 5 mm center floor and inner 0.6 mm floor fillet.
- Use `Ø5.05 mm × 4 mm` followed by `Ø7.05 mm × 1 mm` in the default mode.
- Preserve the current thin mode with a 3 mm central flat, parallel 45-degree internal ramp, no filler/fillet, and `Ø5.05 mm × 2 mm` followed by `Ø7.05 mm × 1 mm`.
- Keep the current 2 mm wall, top guide, 0.2 mm radial mating clearance, lower printable profile, same-diameter non-interference checks, and mode-specific safe hole layout.
- Keep old persisted `{ diameter, height }` values valid by normalizing missing mode and hole fields to `false` and `true` respectively.
- Distinguish thin-mode, bottom-plate, and no-hole STEP/STL filenames from default-mode exports.

**Non-Goals:**

- Do not add a second model ID, route, catalog component, or separate Worker builder.
- Do not expose floor thickness, hole diameters, hole depths, or stacking clearance as free numeric controls.
- Do not make the thin mode use a 5 mm hole-bearing floor; its 3 mm center floor and 2+1 mm hole profile remain intentional.
- Do not promise cross-diameter stacking or change existing OpenGrid components.
- Do not change the supported diameter/height ranges or slider step.

## Decisions

### 1. Persist a boolean mode flag rather than creating a second model

The catalog keeps `modelId=opengrid-stackable-cylinder` and adds `thinBottomMode`, `bottomPlateMode`, and `bottomHolesEnabled` to its exact typed parameter snapshot. The panel exposes one mutually exclusive three-option radio group for default, thin-bottom, and bottom-plate modes plus one checkbox for all bottom holes; it MUST NOT expose center-hole or outer-hole individual toggles. This matches the existing boolean parameter handling used by OpenGrid stackable-box while making the three cylinder profiles visibly exclusive. A second model ID would duplicate route, persistence, Worker, export, and test infrastructure and would make same-diameter compatibility less obvious.

The validator accepts legacy `{ diameter, height }` snapshots by treating absent `thinBottomMode` and `bottomPlateMode` as `false` and absent `bottomHolesEnabled` as `true`; older four-key mode snapshots also normalize `bottomPlateMode=false`. New normalized snapshots always contain all three explicit booleans. The raw workspace parser and persistence hydrator apply the same defaults before normal validation and reject both mode flags being true.

### 2. Keep the three shell profiles as explicit analytic branches

The shared builder derives diameter-dependent radii once, then selects one of three fixed profile definitions:

| Mode | Center floor | Inner transition | Inner floor fillet | Hole sections |
| --- | ---: | --- | ---: | --- |
| Default | 5 mm | original vertical cavity start | 0.6 mm | Ø5.05 × 4 mm, then Ø7.05 × 1 mm |
| Thin | 3 mm | parallel 45° ramp, 2 mm normal offset | none | Ø5.05 × 2 mm, then Ø7.05 × 1 mm |
| Bottom plate | 3 mm | default-style vertical inner wall with 0.6 mm floor fillet; lower foot clipped | 0.6 mm | Ø5.05 × 2 mm, then Ø7.05 × 1 mm |

The default and thin branches retain the common 2 mm straight wall, top inner 2 mm/45° guide, clearance-reduced bottom protrusion, 0.8 mm lower foot bevel, 2.6 mm vertical landing, and direct outer 2 mm/45° transition. The bottom-plate branch keeps a 3 mm floor but uses the default-style vertical inner wall and 0.6 mm floor fillet, then starts at a flat `R-2.2` bottom face and transitions directly at 45° to the outer wall, omitting only the foot bevel and vertical landing. Explicit profile data is preferred over mutating the current constants because the quality report must know which dimensions to validate for each mode.

### 3. Use mode-specific hole-layout safety boundaries

The default 5 mm floor has no internal sloped region that can be reached by the outer holes, so it retains the original outer-edge calculation for the 14 mm cardinal layer. The thin mode retains the combined outer-edge and flat-floor/ramp clearance calculation already implemented; it continues to skip the first unsafe layer and starts the four-hole layer at the current safe threshold. The bottom-plate mode has no internal sloped region, so it uses the same outer-edge calculation as default and produces the same hole count for the same diameter.

All modes use the largest `Ø7.05 mm` section for clearance when `bottomHolesEnabled=true`. The center and outer holes are generated as one group; when the flag is false, no bottom hole cutters or hole faces are created. Only thin mode uses the flat-floor/ramp safety boundary; default and bottom-plate use the outer-edge boundary. This preserves the original default and thin appearances while adding the separately selectable clipped base without silently moving holes off-grid.

### 4. Share the current stacking interface across all profiles

The 0.2 mm radial clearance is kept as a common contract: the default/thin bottom protrusion and bottom-plate mating face remain `R - 2.2` against the top cavity radius `R - 2`. The top rim remains shared; only the lower outer printable profile branches. Quality validation builds a mode-aware profile report and runs the same equal-diameter mating fixture for all three modes.

### 5. Make export identity include mode and hole state only when needed

Default-mode filenames with holes enabled retain the established `opengrid-stackable-cylinder-d{diameter}-h{height}` identity for compatibility. Thin-mode filenames append `-thin`; bottom-plate filenames append `-bottom-plate`; any no-hole export appends `-no-holes` after the mode suffix when present. This keeps existing normal exports recognizable while preventing distinct profiles or no-hole exports from overwriting a normal export with the same dimensions.

### 6. Keep mode-specific quality gates behavior-focused

The quality report includes the selected mode, the all-holes flag, measured floor and hole sections, profile face counts/heights, fillet/ramp checks, all applicable hole clearances when enabled, the common wall and mating checks, and actual bounds. When holes are disabled, the report requires zero hole records and skips hole-profile/clearance checks. The builder rejects a candidate when the selected branch's expected profile does not match. Tests construct all three modes with holes enabled and disabled at minimum, default, threshold, and maximum diameters and verify persistence fallback, exports, and UI switching.

## Risks / Trade-offs

- **[A legacy snapshot has no mode or hole field]** → Normalize missing fields to `thinBottomMode=false`, `bottomPlateMode=false`, and `bottomHolesEnabled=true` before validation and test that malformed values are rejected without replacing the last valid snapshot.
- **[The three profiles have different valid hole depth or lower-profile contracts]** → Keep mode selection explicit in the builder and report; never infer mode from geometry or raw UI text.
- **[Normal, thin, and no-hole exports can collide if filenames ignore state]** → Retain the old default filename and append `-thin` and/or `-no-holes` only when needed.
- **[Restoring the inner fillet can reintroduce B-Rep tolerance problems]** → Use the original analytic fillet construction, add mode-specific face-count/height probes, and test minimum and maximum diameters.
- **[Users may switch mode or hole state while a Worker generation is pending]** → Treat all three booleans as part of the typed generation snapshot so existing latest-wins, stale-generation, commit/discard, and export gates handle them automatically.
- **[The default outer-hole threshold differs from thin mode]** → Document and test the mode-specific boundary; use the largest hole section and the appropriate floor/ramp boundary in each branch.

## Migration Plan

1. Extend the cylinder contract, defaults, raw parser, persistence normalization, catalog schema, and panel with `thinBottomMode=false`, `bottomPlateMode=false`, and `bottomHolesEnabled=true`.
2. Refactor the builder profile and hole cutter to select the default, thin, or bottom-plate branch and gate the whole hole group, then update mode-aware quality diagnostics and errors.
3. Update normal, thin, bottom-plate, and no-hole filenames, documentation, unit/Worker/runtime/persistence/E2E coverage, and same-diameter fixtures.
4. Run focused tests, full affected tests, formatting, type checking, build, and strict OpenSpec validation.
5. Roll back by removing the mode field and branch; legacy `{ diameter, height }` snapshots and the stable model identity remain compatible with the default branch.

## Open Questions

None for the agreed mode behavior. The default branch intentionally keeps the current 0.2 mm stacking clearance even though the older profile used a nominal `R - 2` protrusion; this preserves the validated common stacking interface while restoring the original floor appearance and new 4+1 mm hole proportions.
