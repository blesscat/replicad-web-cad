## 1. Localized homepage structure

- [x] 1.1 Replace the localized homepage panel with semantic hero, capability, Desk System workflow, secondary exploration, and final CTA sections while keeping the page Astro-only and free of CAD runtime initialization.
- [x] 1.2 Compose the hero and promotional sections from existing static Desk, Wall, HSW, and localized workflow assets with meaningful alternative text and visible text fallbacks.
- [x] 1.3 Wire the primary Desk-context Board CTA, localized model chooser CTA, documentation CTA, Wall CTA, and HSW CTA through the existing locale/catalog route helpers without changing model IDs or query contracts.

## 2. Localization and presentation

- [x] 2.1 Add Traditional Chinese and English message keys for the new homepage copy, capability labels, workflow steps, image descriptions, calls to action, title, and meta description.
- [x] 2.2 Apply responsive and dark-mode-safe utility classes that preserve readable heading lengths, stacked mobile CTAs, keyboard focus states, and the existing visual token system.
- [x] 2.3 Verify that the change introduces no new OpenGrid component, stable ID, build key, route slug, or catalog entry and that all existing model identities remain unchanged.

## 3. Verification

- [x] 3.1 Update homepage E2E coverage to assert the localized promotional content, Desk-context CTA targets, model/docs links, static-page boundary, accessible visuals, and narrow viewport layout while preserving model-selection and docs coverage.
- [x] 3.2 Run formatting, TypeScript checks, unit/worker tests, production build, and the relevant Chromium/Firefox E2E suites; resolve any regressions before handoff. The full legacy worker suite still reports pre-existing OpenGrid failures unrelated to this homepage change; targeted checks are green.
