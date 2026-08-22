## Context

The localized CAD route already receives a stable `modelId`, renders a static
summary before the client-only workspace, and resolves all visible copy through
the translation catalog. The model catalog contains the existing `opengrid`
and `opengrid-snap` IDs, while fixed Half and Quarter STEP downloads are part of
the Snap model contract. The proposal and delta specs define the user-visible
attribution requirements.

## Goals / Non-Goals

**Goals:**

- Keep attribution data centralized and tied only to the two in-scope model IDs.
- Render an accessible, static notice in the localized generator page so it is
  available before JavaScript, CAD Worker startup, or export actions.
- Keep legal names, source revision, license destinations, and modification
  wording translatable without changing stable URLs or CAD identifiers.
- Record the provenance of the repository-local Snap assets and the modified
  Half/Quarter variants.

**Non-Goals:**

- Do not alter CAD geometry, Worker commands, export serialization, or STEP/STL
  file bytes.
- Do not add attribution to other OpenGrid-compatible components, the global
  navigation, or an unrelated documentation page.
- Do not embed license text into downloaded CAD files or create a new archive
  format.
- Do not decide or grant commercial redistribution rights beyond documenting
  the upstream notices and linking to the authoritative license text.

## Decisions

### Use model-scoped metadata plus the existing translation catalog

Add a small attribution metadata map for `opengrid` and `opengrid-snap` that
contains only stable external facts: the pinned source URL/revision, source-code
license URL, derived-parts license URL, and translation keys for credits and
model-specific wording. A reusable static Astro notice consumes that metadata
and the current locale.

This keeps source URLs and scope rules in one place while ensuring every
user-visible sentence follows the existing locale completeness rules. It also
avoids putting raw legal copy into model geometry definitions or duplicating the
same links in multiple pages.

### Place the notice between the static fallback and the client-only workspace

Render the notice after the static fallback card and before the client-only
workspace. This keeps it close to the eventual download controls while making
it remain visible after the CAD runtime hides the loading fallback. It is also
available without JavaScript and does not require changes to the Svelte
workspace or export runtime. A stable test identifier and semantic heading will
make the notice discoverable to assistive technology and page-level tests.

### Preserve the upstream distinction between source code and derived parts

The notice will link separately to CC BY-NC-SA 4.0 for the upstream source code
and CC BY 4.0 for derived/generated parts, matching the pinned upstream source
notice. Snap Half and Quarter will be explicitly described as modified
derivatives of the original Snap design. The application will not present this
notice as a relicense of the application or as a blanket license for unrelated
components.

### Prefer page attribution over CAD-file mutation

The user-facing page is the stable place to provide attribution for both
interactive exports and fixed downloads. Embedding comments or metadata in
STEP/STL files would vary by exporter, could change file bytes, and would not
cover the interactive generator consistently. The download URLs and bytes
therefore remain unchanged.

## Risks / Trade-offs

- **[Upstream wording ambiguity]** The pinned Snap source contains an
  abbreviation inconsistency in its source-license wording → preserve the
  upstream source link and distinguish source-code versus derived-parts
  licensing in the notice; do not make broader legal claims than the source
  provides.
- **[Local asset provenance]** The repository-local reference STEP files were
  supplied during development and their external publishing permission is not
  independently established → document the supplied-source provenance and keep
  the existing permission review note in the asset README.
- **[Notice drift]** A future model could accidentally reuse the notice → make
  the metadata lookup return entries only for `opengrid` and `opengrid-snap`, and
  test a representative unrelated OpenGrid-compatible route.

## Migration Plan

No data or runtime migration is required. Deploy the static page, translation,
metadata, provenance, and test changes together. Rollback removes the notice and
provenance edits without affecting model IDs, generated geometry, or download
contracts.
