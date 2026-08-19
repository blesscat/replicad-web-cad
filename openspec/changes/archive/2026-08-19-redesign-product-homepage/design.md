## Context

See `proposal.md` for the motivation and user-facing scope. The current
localized homepage is a single panel rendered by Astro, while the static model
chooser and Desk System documentation already provide the canonical model
entries, localized routes, preview PNGs, and quick-start SVGs needed for a
promotional surface.

The homepage must remain an Astro-only page. It cannot import or mount the
Svelte CAD workspace, start a Worker, load the OpenCascade WASM asset, or
duplicate the model chooser. Existing OpenGrid model IDs, route slugs, and
`system=desk`/`system=wall` query contracts are compatibility boundaries.

## Goals / Non-Goals

**Goals:**

- Make the OpenGrid Desk System the clearest first-use story.
- Give visitors a visible path from the product promise to a Desk-context CAD
  route, the full model chooser, and the quick-start documentation.
- Reuse deterministic static previews and localized documentation diagrams so
  the page demonstrates the product without CAD initialization.
- Keep the page readable, keyboard-accessible, localized, responsive, and
  compatible with the existing dark-mode token system.
- Keep the implementation data-light and compatible with static Astro output.

**Non-Goals:**

- Adding a new CAD component, model ID, build key, route, API, or persistence
  behavior.
- Replacing or redesigning the `/models` chooser or CAD workspace.
- Embedding an interactive 3D viewport or generating new CAD geometry on the
  homepage.
- Adding slicer instructions, G-code/3MF export, account features, analytics,
  or a backend service.

## Decisions

### Use a use-case-led homepage rather than a catalog-led homepage

The hero and first content section will promote the Desk System outcome and its
`Board → Snap → one locating method → Grid Box/Round Box` workflow. The full
catalog remains behind `/models`, where the existing chooser owns model names,
previews, parameter summaries, and edit links.

**Alternative considered:** render the existing model cards on `/`. This would
duplicate chooser responsibilities, weaken the primary story, and conflict
with the static homepage/model-selection boundary.

### Use existing static visuals as a composed proof of capability

The hero will use the existing Desk-context model preview PNGs, and the workflow
section will use the localized `desk-system-flow` SVG. Wall and HSW promotion
will use their existing static preview images. Images will be ordinary static
`img` elements with localized alternative text; no client-side rendering is
needed.

**Alternative considered:** add a client-only CAD viewport to make the hero
interactive. That would increase first-load cost and violate the requirement
that the homepage not start the CAD runtime.

### Keep route construction in the existing localization helpers

Homepage CTAs will use the same localized route helpers as the rest of the site:
the primary CTA targets the existing OpenGrid Board route with Desk context, the
secondary CTA targets the localized model chooser, and the documentation CTA
targets the localized docs route. No route strings or model IDs will be
duplicated in locale-specific markup.

**Alternative considered:** hard-code `/zh-Hant/` and `/en/` URLs in the page.
That would risk breaking locale switching, canonical route behavior, and query
preservation.

### Store copy in the existing message catalog

The homepage will add localized message keys for the hero, capability strip,
Desk workflow, secondary system promotion, and final CTA. The page title and
description will be updated through the same catalog so the visible copy and
SEO metadata stay aligned in both supported locales.

**Alternative considered:** put marketing copy directly in Astro. That would
make the page inconsistent with the existing i18n architecture and make the
English variant easy to miss.

### Use semantic sections with a small, stable test surface

The page will expose named sections and CTA labels through semantic headings,
links, and a few stable `data-testid` hooks for the hero, Desk workflow, and
secondary exploration. Tests will assert observable content, target URLs,
static behavior, and responsive layout rather than implementation strings.

## Risks / Trade-offs

- **[Risk]** Desk System emphasis could make the product appear narrower than
  the full catalog. → **Mitigation:** retain a prominent localized `/models`
  CTA and a secondary HSW/Wall exploration section.
- **[Risk]** Existing preview assets may be unavailable or fail to load. →
  **Mitigation:** retain meaningful alt text, visible captions, and a textual
  workflow so the page remains understandable without images.
- **[Risk]** Longer localized headings may wrap differently on mobile. →
  **Mitigation:** use responsive grid/flex layouts, bounded text measure, and
  mobile-first CTA stacking; cover narrow viewport behavior in E2E tests.
- **[Risk]** Marketing copy can drift from supported model routes. →
  **Mitigation:** build CTA hrefs through the existing catalog/localization
  helpers and mention only the currently documented Desk, Wall, and HSW paths.

## Migration Plan

Replace the localized homepage markup and message keys in one change while
leaving the model chooser, docs route, CAD routes, and static assets backward
compatible. Validate both locale homepages and the existing model/docs flows;
rollback is a normal revert of the homepage/message/test commit because no
runtime data or route migration is involved.
