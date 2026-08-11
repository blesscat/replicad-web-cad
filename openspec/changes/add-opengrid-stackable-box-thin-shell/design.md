## Context

The existing `opengrid-stackable-box` model has one parameter contract and two bottom profiles. Normal mode is a self-mating box with a fixed 5 mm lower assembly, an integrated bottom guide, and a stepped top rail. Base-plate mode clips away the lower guide but intentionally keeps the upper stepped rail. The parameter contract, opening cutter, bottom-hole switches, persistence normalization, catalog definition, and quality gates are split across the CAD contract, Worker-only builder, component panel, and tests.

The new profile is a third mode of the same model, not a new component. It is intentionally non-stackable and has this cross-section, using the existing project convention of fixed 45° chamfers unless a later requirement changes the angle:

```text
                 outer edge high
                       /  1.6 mm top chamfer
       1.6 mm wall   /
                     └── inner edge low
                         │
                         │  R2 inner floor fillet
              ┌──────────┘
              │  2 mm flat floor
              └──────────────────  Z=0 outside plane
                 \ 1.5 mm outside bottom chamfer
```

The existing OpenGrid footprint, half-cell layout, side-opening controls, corner-hole switch, and full bottom-hole grid are independent contracts and must continue to work with this profile.

## Goals / Non-Goals

**Goals:**

- Add a normalized `thinShellMode` profile flag while preserving the existing model ID, route, default parameters, normal mode, and base-plate mode.
- Generate a non-stackable thin shell with a 2 mm flat bottom, 1.6 mm main wall, R2 inner floor fillet, 1.5 mm outside bottom chamfer, and a continuous outer-high/inner-low 1.6 mm top opening chamfer that replaces the stepped rail without a horizontal rim plane.
- Keep the existing X/Y footprint and clear internal `height` semantics. In thin mode, the clear floor datum is the upper surface of the 2 mm floor, the lower inner rim datum is `2 mm + height`, and the outer high rim is `1.6 mm` above that datum.
- Reuse the existing cardinal opening contract and bottom-hole controls, with mode-specific floor and rim datums.
- Keep the four corner retaining sockets printable and measurable with an outside/lower Ø5.05 mm × 1 mm section and an inside/upper Ø7.05 mm × 1 mm seat.
- Validate the thin mode as its own single-solid shell profile without applying normal-mode self-stacking interface checks.

**Non-Goals:**

- Do not change the geometry or mating contract of normal mode.
- Do not change the existing base-plate mode into a thin shell or make either non-default mode claim box-to-box stacking.
- Do not add user controls for wall thickness, floor thickness, fillet radius, or chamfer sizes; these remain fixed profile constants.
- Do not change the 28 mm footprint, 14 mm hole-grid coordinates, half-cell acceptance, model identity, or Worker protocol.
- Do not load or use a Snap STEP body during normal runtime generation.

## Decisions

### 1. Add a profile flag instead of creating a second model

Add `thinShellMode: boolean` to the existing normalized stackable-box snapshot. `thinShellMode` and `basePlateMode` must be mutually exclusive; both false remains the current normal mode. Legacy snapshots that do not contain `thinShellMode` normalize it to `false`.

This preserves the existing route, catalog identity, parameter persistence, and export workflow while allowing the panel to present three mutually exclusive profiles. A separate model ID was rejected because the user requested an additional mode and existing X/Y, opening, and hole behavior should remain shared.

### 2. Resolve active vertical datums per profile

Keep the existing normal and base-plate datums unchanged. Thin mode derives:

```text
outside bottom plane                 Z = 0
flat floor upper surface             Z = 2.0
lower inner-rim datum                Z = 2.0 + height
outer high rim datum                 Z = 3.6 + height
```

The opening depth remains measured from the lower inner-rim datum to the flat sill, so the user-provided `height` remains clear internal height. The external bound uses the outer high rim datum. The 1.6 mm top chamfer is one continuous sloped surface inward and downward from the outer edge to the inner edge; it does not create a horizontal rim plane or an upper stacking rail.

### 3. Build the thin shell as a separate canonical profile

Add a mode-specific shell construction path rather than changing the shared normal-mode constants. The thin profile should be built from rounded rectangular sections or an equivalent box-native sketch so that it retains the existing centered footprint and corner radius while providing these fixed regions:

- a continuous flat outside bottom at Z=0;
- a 1.5 mm, 45° chamfer only around the outside bottom perimeter;
- a 1.6 mm straight wall away from the intentional transitions;
- a continuous 1.6 mm, 45° top opening chamfer whose outer edge is high and inner edge is low, with no horizontal rim plane;
- an R2 inner floor-to-wall fillet;
- a continuous flat interior floor whose nominal thickness is 2 mm.

Thin mode must skip `applyStackingProfile` and must not generate bottom guide feet, cell-seam reliefs, suspended perimeter guides, or the stepped top rail. This makes the outside bottom genuinely flat apart from the specified perimeter chamfer and makes the non-stackable behavior explicit.

### 4. Keep holes and openings shared but mode-aware

Apply the existing corner and ordinary-hole center functions after the thin shell is formed. The special thin-mode cutter is a planar two-stage bore: Ø5.05 mm from the outside through the first 1 mm, followed by Ø7.05 mm through the inside second 1 mm. The Ø7.05 mm section remains the retaining seat for the existing Ø5.8 mm flange, with the shaft exposure unchanged at approximately 3 mm below the outside plane. Ordinary full-grid holes remain straight Ø5.05 mm through-holes across the 2 mm floor and never receive the special retaining seat.

Adapt the shared side-opening derivation and cutter placement to the thin profile's active floor, lower inner-rim datum, outer high rim, wall thickness, and top chamfer. The four direction names, depth/flat-bottom-length/angle semantics, rounded transition profile, corner-bridge safety, and zero-depth behavior remain unchanged. The cutter must open through the thin wall and sloped top rim without leaving a residual lip at the selected side.

### 5. Use a thin-mode quality branch

Retain the existing normal-mode interface quality gate and base-plate branch. For thin mode, use a dedicated profile report or mode-aware report fields that verify:

- one valid watertight solid and the requested bounds;
- 2 mm floor thickness away from holes and the R2 transition;
- 1.6 mm straight-wall thickness away from the bottom/top chamfers;
- the outer bottom chamfer and outer-high/inner-low top chamfer;
- the R2 inner floor fillet and a continuous flat floor;
- the 1+1 mm special socket profile and ordinary-hole behavior;
- all enabled side-opening probes and corner bridges.

Thin mode must not run self-mating, bearing-land, bottom-guide, or grid-seam-relief assertions, because those structures are intentionally absent. Existing normal/base-plate quality requirements remain unchanged.

### 6. Preserve UI, persistence, and export compatibility

Render three radio choices in the stackable-box panel. Selecting thin mode sets `thinShellMode=true` and `basePlateMode=false`; selecting either existing mode clears `thinShellMode`. The thin description should state that it is a non-stackable 2 mm flat-bottom shell. Persistence hydration adds `thinShellMode=false` to old records.

Thin exports receive a deterministic `-thin-shell` mode suffix. Normal no-opening filenames remain byte-for-byte unchanged, and base-plate filenames retain their current suffix. Opening fingerprints continue to apply whenever a depth is positive.

## Risks / Trade-offs

- **[The R2 inner fillet can consume too much flat floor on half-cell footprints or approach a Ø7.05 mm socket.]** → Keep the existing half-cell cases in the acceptance matrix, probe floor material away from holes, and reject only geometries that cannot preserve the declared hole and floor contracts.
- **[A sloped top chamfer can leave a residual horizontal lip when an opening reaches the rim.]** → Build the thin cavity and sloped rim as one continuous loft boundary, extend and clip the thin-mode opening cutter across the full wall and sloped-rim envelope, then probe both the outer high edge and inner low edge plus the absence of horizontal rim planes.
- **[Adding a boolean mode flag can create invalid combinations.]** → Validate `thinShellMode` and `basePlateMode` as booleans, reject both true, normalize missing thin flags to false, and make the radio controls update both flags atomically from the user's perspective.
- **[Existing quality helpers assume the normal 5 mm bottom and stepped rail.]** → Keep normal/base helpers intact where possible and add explicit thin-mode probes instead of weakening the existing assertions globally.
- **[The new profile changes external height relative to the same clear-height input.]** → Derive and test the thin bounds from the 2 mm floor and outer high rim explicitly; preserve the clear internal height rather than silently changing the user-facing height meaning.

## Migration Plan

1. Extend the stackable-box contract, mode normalization, validation, active-datum derivation, and deterministic filenames.
2. Add the thin-shell builder branch and mode-aware hole/opening cutters while leaving normal and base-plate geometry paths intact.
3. Add thin-mode quality measurements and error mapping; keep normal self-mating checks scoped to normal mode.
4. Add the three-mode panel, persistence defaults, catalog metadata, and focused unit, Worker, and E2E coverage.
5. Run existing normal/base-plate regressions plus thin-mode geometry, hole, opening, bounds, and export tests.

Rollback is a parameter-level fallback: old snapshots continue to normalize `thinShellMode=false`, and removing or disabling thin-mode selection leaves existing normal/base-plate generation paths unchanged.

## Open Questions

The top chamfer and outside bottom chamfer are specified as fixed 45° chamfers by alignment with the project's existing profile convention. No additional user-facing angle is planned.
