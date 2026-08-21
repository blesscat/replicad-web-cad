# Add OpenGrid and Snap Attribution

## Why

The project uses the OpenGrid board and Snap design as upstream-derived CAD
work, but the relevant attribution and license information is not currently
visible where users generate or download those models. Relying on source
comments or repository-only documentation makes the licensing context easy to
miss, especially for downloaded files.

This change adds a clear, localized notice to the existing generator pages for
the OpenGrid board and Snap family. It also records that `snap-half` and
`snap-quarter` are modifications of the upstream Snap design, so users can
distinguish the original design from the project’s derived variants.

## What Changes

- Add a bilingual attribution/license notice to the existing generator pages
  for `opengrid` and `opengrid-snap`, positioned in the generator/download
  context.
- Identify the upstream source, original designers/contributors, pinned source
  revision, and the applicable Creative Commons license links.
- State that `snap-half` and `snap-quarter` are modified derivatives of Snap,
  while preserving the existing download names, formats, and URLs.
- Distinguish the upstream source-code license from the license applicable to
  derived/generated parts; do not imply that this change grants additional
  commercial rights or relicenses the application.
- Add provenance notes for the Snap-derived assets in the repository’s asset
  documentation.
- Keep existing model IDs, localized routes, CAD geometry, export behavior,
  and downloaded file bytes unchanged. No license text needs to be embedded
  into STEP/STL files or added as a separate archive for this change.
- Limit the notice to the OpenGrid board and Snap family. Other OpenGrid-
  compatible components are out of scope.

## Capabilities

### New Capabilities

- `opengrid-attribution`: The OpenGrid board and Snap generator pages provide
  visible attribution, source, modification, and license information for the
  upstream design and the Snap-derived variants.

### Modified Capabilities

- `multilingual-site`: The attribution notice is available through the
  existing Traditional Chinese and English localization paths, without
  changing model IDs or route behavior.

## Impact

- Affected areas: the localized CAD generator page, localized string catalog,
  Snap asset provenance documentation, and page-level tests.
- No changes are expected in the CAD kernel, geometry generation, worker
  protocol, export pipeline, or fixed download artifacts.
- The proposal documents the upstream license and provenance; it does not
  resolve any separate legal question about distributing the upstream source
  implementation in a commercial product. The exact upstream notice and its
  license links should remain visible for that review.
