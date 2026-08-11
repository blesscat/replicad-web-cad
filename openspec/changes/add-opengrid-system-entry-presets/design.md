## Context

The existing catalog has one `ModelDefinition` and one preview image per stable model id. The CAD workspace reads a model-id-scoped parameter store on mount, while the preview E2E workflow clears storage and visits `/cad/<modelId>?preview=thumbnail`. The new system entries need to reuse those definitions and Worker routes while adding context to only the entry, preset, persistence, and static presentation layers.

## Goals / Non-Goals

**Goals:**

- Make Desktop and Wall entry links resolve deterministic effective parameter snapshots.
- Keep scoped persistence isolated while preserving direct legacy routes.
- Represent duplicated chooser entries without duplicating CAD model definitions.
- Generate and verify one static preview asset per visible entry, including context-specific assets.
- Keep the Worker protocol, builders, model ids, route slugs, exports, and CAD geometry contracts unchanged.

**Non-Goals:**

- Adding a new OpenGrid component or changing any CAD builder.
- Encoding system context into Worker messages, model revisions, export filenames, or stable model ids.
- Capturing user-customized previews from the model chooser.

## Decisions

### Entry context is catalog metadata, not a model identity

Add an optional `systemContext` field to the catalog entry shape used by the visible chooser. The canonical `modelDefinitions` list remains unique by model id and continues to drive route resolution, persistence validation, and Worker dispatch. `groupModelDefinitions()` derives context-aware selection entries by cloning metadata around the canonical definitions.

This keeps `getModelDefinition(modelId)` and direct routes stable. A separate model id or duplicate definition was rejected because it would require unnecessary Worker/kernel identities and would make existing saved data and exports ambiguous.

### One context resolver owns preset and route decisions

Create a small system-entry-context module with the `desktop`/`wall` union, query parsing, context-aware path construction, and validated preset resolution. The parameter store and workspace controller consume this resolver rather than each embedding query-specific conditionals. Presets are cloned before use so nested OpenGrid flags and custom-position arrays cannot be mutated by a panel.

### Versioned persistence has explicit legacy and scoped buckets

Upgrade the browser payload to a version with explicit `legacy`, `desktop`, and `wall` model maps. Version-1 model-id entries are migrated into `legacy` only. A scoped read never falls through to `legacy`; a context-free read uses `legacy`. All entries still pass the existing model definition validator before hydration and serialization.

The store API accepts an optional system context, preserving existing callers through the omitted-context form. This makes the isolation observable without changing the storage key or Worker lifecycle.

### Catalog entries own preview asset metadata

Context-aware visible entries receive preview paths such as `/model-previews/opengrid-snap-desktop.png`; context-free entries retain existing paths. The capture test derives its target list from the same catalog grouping used by `/models`, appends `preview=thumbnail` while preserving `system`, and clears storage for each target. This makes the output set self-describing and prevents a system preset from being accidentally captured under a legacy filename.

### The chooser renders nested subgroups

The model family remains `opengrid` or `hsw`, but the OpenGrid family exposes `Desktop System` and `Wall Related` subgroup metadata. The Astro page renders the subgroup when present and uses the entry's context-aware link and preview metadata. HSW keeps the existing flat family rendering.

## Risks / Trade-offs

- [Risk] Existing tests and consumers assume every visible model id is unique. → [Mitigation] Add a stable entry key/context data attribute for UI tests, keep `modelDefinitions` unique, and update preview/catalog tests to assert entry identity rather than only model id.
- [Risk] Versioned localStorage contains malformed or old payloads. → [Mitigation] Treat unknown versions and invalid scoped records as absent, migrate only validated version-1 values to the explicit legacy bucket, and keep storage failures non-fatal.
- [Risk] Context-specific PNGs can become stale when presets change. → [Mitigation] The capture/verify workflow derives routes and output paths from catalog metadata and is run as the asset regeneration gate.
- [Risk] Duplicate bottom-plate assets may be byte-identical even though their entry identity differs. → [Mitigation] Keep separate metadata paths and verification targets; identity is entry-scoped, not based on pixel comparison.

## Migration Plan

1. Add the resolver, catalog entry metadata, scoped store, and route initialization behavior.
2. Add behavior-focused unit/E2E tests and update the preview capture target matrix.
3. Run the capture command to create the new static assets and run verification.
4. If rollback is required, remove the context-aware chooser links and use the legacy route; versioned storage ignores scoped buckets without affecting the legacy map.
