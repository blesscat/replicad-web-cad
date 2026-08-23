## Context

The existing `opengrid-snap` contract owns the Snap profile/variant, footprint,
XY offset, optional body cutters, magnet feature, persistence, Worker assembly,
quality gate, and exports. Its system context currently provides Desk and Wall
presets, while the panel itself does not switch the persistence scope. The
supplied `openConnect_head.step` is one source B-Rep head in millimetres. The
supplied STL contains the Snap plus a placed head and is useful for measuring
the intended pose, but it is not suitable as the production source asset.

## Goals / Non-Goals

**Goals:**

- Add OpenConnect as a backward-compatible boolean in the existing Snap
  snapshot, defaulting to `false` for legacy snapshots.
- Support all four profile/variant combinations: Standard Lite, Standard Full,
  Directional Lite, and Directional Full.
- Make the Snap panel's Desk/Wall radio choose independent saved parameter
  scopes and presets without putting system context into the Worker snapshot.
- Keep the Wall footprint fixed to `full`, keep its offset adjustable with a
  default of zero, and compose an unscaled OpenConnect head after the adjusted
  Snap interface is known.
- Preserve the current generation, stale-preview, quality, and export gates.

**Non-Goals:**

- No new model ID, route, catalog component, or separate OpenConnect model.
- No use of the supplied STL as a runtime mesh or replacement of the existing
  Snap reference assets.
- No scaling, remodeling, or boolean cutting of the OpenConnect source head.
- No system-specific Worker rejection rule or new `system` field in the
  normalized CAD contract.
- No change to the existing Half/Quarter fixed assets beyond rejecting
  `openConnect=true` for those footprints.

## Decisions

### Keep system selection outside the CAD snapshot

The normalized Snap snapshot will add only `openConnect: boolean`; the selected
Desk/Wall radio remains UI and persistence state. This reuses the existing
system-scoped parameter store, keeps Worker requests compatible with the same
`modelId`, and avoids making every downstream geometry/export consumer aware of
UI storage context. Legacy snapshots normalize the missing flag to `false`.

The radio will initialize from a supported route context. A context-free route
will retain the current model-default/legacy behavior until the user explicitly
selects Desk or Wall. Switching scopes loads the saved scoped snapshot or its
system preset and leaves the inactive scope untouched. When a Wall-scoped Snap
snapshot is loaded, the store normalizes the presentation-enforced Full
footprint and hidden hole flags without rejecting the scope or adding a
system-specific validation rule.

Alternative considered: adding `system` to `OpenGridSnapParameters`. Rejected
because the user-defined system is a default/persistence scope, not geometric
input, and because it would unnecessarily expand the Worker and export
contract.

### Treat OpenConnect as an optional full-footprint composition

`openConnect=true` is valid only for `footprint=full`. The UI exposes it in Wall
scope and keeps it unavailable in Desk scope, while the contract enforces the
geometric full-footprint prerequisite without attempting to infer the UI
system. All profile/variant combinations share the same OpenConnect option;
the selected Snap reference remains the source of profile-specific geometry.

Alternative considered: Directional-only support. Rejected because Standard
Lite and Standard Full are explicitly required as well.

### Apply offset before placing the source-sized head

The builder will transform the complete selected Snap assembly in XY according
to the existing offset rules, apply Snap-local cutters using their existing
fixed dimensions, transform the canonical interface point through the same
profile envelope transform, and then add the unchanged STEP head at that
anchor. The head is not part of the offset scale transform. Wall presets use
offset zero but continue to expose the same adjustable offset control.

This ordering preserves the requested source dimensions while allowing the
interface position to follow the adjusted Snap. It also keeps optional Snap
cutters from changing the head's B-Rep.

### Use the STEP head as a separate composed solid

The repository will own the supplied STEP head under the existing
`opengrid-snap` asset directory. The Worker will import/cache/release it like
other source-backed references, clone it for each build, apply the measured
placement transform, and compose it with the selected Snap result without
rebuilding the head from the STL. Quality checks will validate both the base
Snap topology and the added head, run the existing profile/offset/feature/magnet
checks against the Snap solids extracted from the composite, and validate the
composite bounds, interface placement, B-Rep, and mesh.

Alternative considered: fuse the head into the Snap or use the STL directly.
Fusing can erase the source interface and make profile/offset diagnosis harder;
using the STL would introduce reference-only surfaces and lose the source B-Rep
contract. A separate composed solid preserves both source fidelity and
exportability.

### Make composite geometry visible in metadata and quality checks

OpenConnect-enabled bounds, expected topology, and export filenames will be
derived from the selected Snap plus the placed head. Disabled OpenConnect keeps
the existing filename format. Enabled exports receive an explicit OpenConnect
token so enabled and disabled configurations cannot collide. Candidate quality
failure follows the existing discard/stale/export-disabled lifecycle.

## Risks / Trade-offs

- **Interface anchor differs by profile or variant** → derive the anchor from
  the selected reference's documented interface and add profile/variant matrix
  probes in Worker integration tests.
- **Offset causes the Snap and fixed-size head interface to separate** → apply
  the final Snap transform before placement, keep the head unscaled, and make
  interface alignment a required quality check for every valid offset.
- **A head source is accidentally cut or duplicated** → keep the head in a
  separate composed solid, apply Snap cutters before composition, and validate
  source bounds and solid presence.
- **Persisted snapshots lack the new field** → normalize missing
  `openConnect` to `false` and test old scoped snapshots.
- **Existing quality assumes one or nine solids** → extend quality assertions to
  validate the base topology plus the OpenConnect solid rather than replacing
  existing profile-specific checks.
- **Preview bounds or filenames omit the head** → use the same composite shape
  for bounds, mesh, viewport, and both export paths, and cover filename
  distinction in contract tests.

## Migration Plan

1. Add the repository-owned STEP asset and loader/cache disposal path.
2. Extend the contract, defaults, normalization, persistence scopes, panel, and
   translations with `openConnect=false`.
3. Implement the post-offset head placement/composition and composite quality
   and export metadata.
4. Add unit, Worker, and E2E coverage for the radio scopes, the four
   profile/variant combinations, offset ordering, invalid partial footprints,
   and legacy snapshots.
5. Existing saved Snap snapshots remain valid and behave exactly as before
   because missing OpenConnect normalizes to disabled. Rolling back the feature
   removes the new option and asset; existing snapshots remain readable through
   the normalization path.

## Open Questions

None. The exploration resolved system scoping, profile/variant support,
wall-offset behavior, source-size preservation, and composition order.
