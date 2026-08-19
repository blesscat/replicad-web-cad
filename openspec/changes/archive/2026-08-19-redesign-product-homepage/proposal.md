## Why

The current homepage explains the browser CAD implementation but does not show
the most compelling workflow that is available today: building an OpenGrid Desk
System from configurable components. A use-case-led homepage will give new
visitors a concrete outcome, demonstrate the current features with existing
static visuals, and route them into the correct Desk, model-selection, or
documentation entry point without loading the CAD runtime on the homepage.

## What Changes

- Replace the generic homepage feature panel with a localized promotional
  landing page centered on the OpenGrid Desk System workflow.
- Add a hero section with a concise value proposition, static CAD visuals, and
  primary/secondary calls to action for starting Desk System design or browsing
  all currently visible models.
- Add a compact capability strip covering browser-local modeling, live 3D
  preview, parameter adjustment, and precise STEP/STL export.
- Add a Desk System workflow section explaining
  `Board → Snap → one locating method → Grid Box/Round Box`, with a link to the
  existing quick-start documentation.
- Add restrained secondary promotion for the current Wall-related OpenGrid
  entry and HSW honeycomb entry without duplicating the full `/models` chooser.
- Keep the homepage static: it must not initialize the CAD Worker, WASM,
  WebGL viewport, or a full model-selection card grid.
- Update Traditional Chinese and English copy, accessible labels, and page
  metadata while preserving existing locale routes and model IDs.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `home-model-selection`: change the root localized homepage from a generic
  feature panel into a static, use-case-led product homepage while preserving
  `/models` as the canonical model chooser and preserving all existing model
  route identities.

## Impact

- Affected pages: `src/pages/[locale]/index.astro` and the localized message
  catalog used by the homepage.
- Affected shared presentation: only if the existing layout/tokens need small,
  reusable homepage-safe adjustments.
- Affected static assets: reuse the existing localized Desk System diagrams and
  model preview PNGs; no CAD generator or new component is introduced.
- Affected tests: homepage E2E assertions and any localized SEO/content tests
  that encode the current headline or CTA.
- Existing OpenGrid model IDs, build keys, route slugs, and CAD contracts remain
  unchanged intentionally; no new OpenGrid component is added.
