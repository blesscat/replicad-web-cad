## Context

The current localized Docs route is a single static Astro article whose model
overview is stored as one long paragraph. The model catalog already owns the
stable OpenGrid model IDs, display-name keys, previews, and CAD route
conventions, while `localizedCadPathFor` already preserves locale and Desk
context. The implementation must add structured guidance without creating a
second model catalog or initializing the CAD Worker on the Docs page.

## Goals / Non-Goals

**Goals:**

- Make the Desk System workflow the first, scannable section of both supported
  Docs locales.
- Keep the component order, locator choice, checklist, and CAD links in one
  typed documentation data map backed by existing model IDs.
- Add static, accessible SVG diagrams and reuse existing Desk preview PNGs when
  an individual model image is useful.
- Preserve the current parameter, units, export, browser, and architecture
  reference sections after the quick start.

**Non-Goals:**

- Do not change CAD builders, Worker protocols, model parameters, persistence,
  exports, or model catalog identities.
- Do not add slicer profiles, orientation advice, material advice, or print
  troubleshooting to the first-use guide.
- Do not make Wall System or hidden catalog entries part of the primary Desk
  flow.

## Decisions

### Use a documentation-specific workflow map with catalog-backed routes

Create a small `src/features/docs/desk-system-guide.ts` module containing the
ordered Desk roles and their stable model IDs. Resolve localized labels and
links from the existing model catalog and `localizedCadPathFor(locale, id,
'desk')` rather than duplicating route slugs in the Astro template. The map
will encode the physical relationship (Board, Snap, one locator, container),
which is a documentation concern and cannot be safely inferred from arbitrary
CAD parameter schemas.

Alternative considered: hard-code a list of anchors directly in
`index.astro`. Rejected because route or model-label drift would be harder to
detect and because the same ordered data is needed by tests.

### Keep localized prose in the existing message catalogs

Add grouped `docs.deskQuickStart.*` keys to `src/i18n/catalog.ts` for
Traditional Chinese and English. The Astro page will render headings,
instructions, checklist labels, captions, alt text, and scope notes through the
existing `translate` helper. Technical model IDs and route query values remain
locale-neutral.

Alternative considered: a separate Markdown or JSON translation file. Rejected
because the project already validates catalog parity and uses the catalog for
all public page metadata and model copy.

### Render static diagrams and accessible text together

Add three static assets under `public/docs/desk-system/`: a numbered flow
diagram, a Board/Snap placement diagram, and a two-option locating comparison.
The diagrams may use shared technical labels, but the page supplies localized
`alt` text and visible captions plus an equivalent ordered text list. Existing
`public/model-previews/*-desk.png` files remain the source for individual model
previews instead of generating new CAD screenshots in the Docs build.

Alternative considered: render diagrams as a client-side Svelte/CAD scene.
Rejected because it would weaken crawlability, add Worker cost to Docs, and
make the first-use explanation unavailable with JavaScript disabled.

### Preserve the current article as an advanced reference section

Refactor the Docs template into a quick-start section followed by the existing
models, parameters, units, exports, browser, and architecture sections. The
existing model overview copy will be corrected or moved behind the primary
Desk guide rather than being removed from the page's crawlable content.

## Risks / Trade-offs

- **[Risk]** The documentation map can drift from the catalog if a model is
  renamed or removed. → **Mitigation:** resolve labels and localized CAD paths
  through catalog helpers and add unit coverage for the exact ordered IDs and
  Desk query links.
- **[Risk]** Text embedded inside a shared SVG is not automatically localized.
  → **Mitigation:** keep the normative instructions in HTML, provide localized
  captions and alt text, and treat SVG labels as visual reinforcement only.
- **[Risk]** A large quick-start section could push advanced information too far
  down the page. → **Mitigation:** use short numbered steps, compact checklist
  cards, and existing previews only where they clarify a component.
- **[Risk]** A broken static asset could remove the visual aid. → **Mitigation:**
  add descriptive `title`/`desc` metadata to SVGs and test that HTML text and
  alternatives remain sufficient when images fail.

## Migration Plan

1. Add the documentation map, localized messages, and static SVG assets.
2. Replace the Docs article body with the quick-start structure while retaining
   the existing reference sections and locale metadata.
3. Run type checks, unit tests, formatting, production build, and targeted Docs
   E2E assertions for both locales.
4. Archive this OpenSpec change after synchronizing its new capability and
   discoverability delta into the main specs. No data or runtime migration is
   required, and rollback is a file-level revert of the Docs/assets change.
