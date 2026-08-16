## 1. Documentation data and localization

- [x] 1.1 Add an ordered Desk System guide data map that references the existing `opengrid`, `opengrid-snap`, `opengrid-pillar`, `opengrid-stackable-box`, and `opengrid-stackable-cylinder` model IDs and derives locale-aware Desk CAD links through the existing route helpers.
- [x] 1.2 Add matching `zh-Hant` and `en` `docs.deskQuickStart.*` messages for headings, workflow steps, locator alternatives, checklist labels, captions, alt text, and scope boundaries; keep the built-in-seat wording explicit that no separate Locating Post is needed.
- [x] 1.3 Update the Docs metadata and reference copy so the page description and advanced sections remain accurate after the Desk quick start becomes the primary content.

## 2. Static visual documentation

- [x] 2.1 Promote the reviewed flow draft into a static Desk workflow SVG under `public/docs/desk-system/`, preserving the Board → Snap → one locator → container relationship and optional screw-hole note.
- [x] 2.2 Add static Board/Snap placement and mutually exclusive locating-option SVG diagrams under `public/docs/desk-system/`, each with SVG title/description metadata and no CAD Worker dependency.
- [x] 2.3 Verify that the existing Desk model preview assets are reused only for the applicable OpenGrid component cards and that no new model ID, build key, or preview identity is introduced.

## 3. Docs page implementation

- [x] 3.1 Refactor `src/pages/[locale]/docs/index.astro` into a structured Desk System Quick Start section rendered before the existing models, parameters, units, exports, browser, and architecture references.
- [x] 3.2 Render the numbered workflow, minimum print checklist, Grid Box-first example, Round Box secondary example, and the two mutually exclusive locating strategies with localized text and Desk-context CAD links.
- [x] 3.3 Render all static diagrams with localized captions/alt text and equivalent visible HTML instructions; keep slicer and detailed print-setting guidance outside the primary quick-start path.

## 4. Verification and regression coverage

- [x] 4.1 Add unit coverage for workflow ordering, exact model IDs, Desk query links, locale message parity, and the explicit built-in-seat/no-extra-Post rule.
- [x] 4.2 Add Docs E2E coverage for `/zh-Hant/docs/` and `/en/docs/`, including the primary heading order, checklist links, image alternatives, and successful rendering without CAD Worker initialization.
- [x] 4.3 Run formatting, type checking, unit tests, production build, and targeted Docs E2E tests; resolve any regressions while preserving the existing CAD and export contracts. Browser execution was blocked by the environment's local-network approval, so the built static HTML assertions were used as the verification fallback.
