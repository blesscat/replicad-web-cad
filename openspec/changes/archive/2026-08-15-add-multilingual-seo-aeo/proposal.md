## Why

Shape Shortcut currently presents a mostly Traditional Chinese experience, with
user-facing copy embedded across Astro pages, Svelte component panels, the model
catalog, validation, progress reporting, and CAD Worker errors. This prevents a
consistent English experience and makes the static site difficult to discover in
the appropriate language. The project now needs a shareable multilingual surface
that preserves CAD behavior while making its public model and documentation
content crawlable and understandable to search and answer engines.

## What Changes

- Add explicit `zh-Hant` and `en` locale routes for the public site and CAD pages,
  with locale-aware navigation and language switching.
- Add a typed, namespace-based translation catalog for Astro pages, model catalog
  labels, component panels, accessibility text, viewport states, and documents.
- Keep model IDs, route slugs, parameter enum values, localStorage keys, export
  filenames, and CAD protocol values locale-neutral; preserve all existing
  OpenGrid IDs and naming conventions.
- Replace user-facing validation, progress, and Worker error strings in the
  main-thread/Worker contract with stable message identifiers and interpolation
  parameters, then render them in the active locale. **BREAKING**: the versioned
  Worker error event contract changes.
- Preserve component parameter persistence and system-context query parameters
  when switching locales.
- Add locale-specific titles, descriptions, canonical URLs, reciprocal `hreflang`
  links, sitemap coverage, and compatibility redirects from the current
  unprefixed URLs. Production hosting will issue the permanent HTTP redirect;
  the static artifact will retain a noindex/meta/JavaScript fallback for local
  and hosts that do not provide redirect rules.
- Add crawlable static model summaries and documentation content that expose model
  purpose, parameters, units, and export formats outside the client-only CAD UI.
- Add translation-completeness, localized route, runtime-message, persistence,
  and SEO metadata tests.

## Capabilities

### New Capabilities

- `multilingual-site`: Locale-aware routes, translation resources, language
  switching, and localized website/CAD UI for Traditional Chinese and English.
- `localized-cad-diagnostics`: Locale-neutral validation, progress, and Worker
  diagnostics rendered through the active UI locale.
- `search-discoverability`: Locale-specific metadata, canonical/hreflang behavior,
  sitemap coverage, redirects, and crawlable model/documentation summaries.

### Modified Capabilities

- None.

## Impact

- Astro pages, layout, route helpers, static generation, and site metadata.
- Svelte CAD workspace, shared controls, viewport states, component panels, and
  accessibility labels.
- `features/cad/model-catalog`, validation/progress modules, `cad-contract`,
  Worker message validation, and Worker runtime error mapping.
- Existing E2E and unit tests, plus new locale and metadata fixtures.
- Existing model IDs and OpenGrid component directories remain unchanged; no new
  OpenGrid component is introduced.
