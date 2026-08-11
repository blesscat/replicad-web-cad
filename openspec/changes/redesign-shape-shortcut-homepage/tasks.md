## 1. Define the introduction-first acceptance tests

- [ ] 1.1 Rewrite the homepage E2E expectations for a Shape Shortcut product Hero, product positioning copy and generic `/models`／`/docs/` links.
- [ ] 1.2 Add observable assertions for the core capability sections, workflow explanation, current-scope copy and any static brand visual region.
- [ ] 1.3 Assert that `/` has no model cards, catalog preview images, use-case shortcuts, parameter controls, `開始生成`／`編輯` CTAs or model-specific `/cad/<modelId>` links.
- [ ] 1.4 Preserve regression assertions that `/models` remains the static catalog-driven chooser and that its existing model-specific links still work.
- [ ] 1.5 Verify accessible headings, link names, image alternative text, metadata and narrow-screen layout without inspecting source text or implementation details.

## 2. Implement the introduction-first homepage

- [ ] 2.1 Remove homepage imports and rendering logic that derive OpenGrid cards, previews, use-case anchors or model-specific CAD paths from the catalog.
- [ ] 2.2 Build a branded Hero that explains what Shape Shortcut is and exposes a prominent generic link to `/models` plus an optional `/docs/` link.
- [ ] 2.3 Add static product-introduction sections for browser-based CAD, parameterized control, preview／export value and the non-interactive product workflow.
- [ ] 2.4 Add a concise current-scope section that mentions practical models and the current OpenGrid／HSW focus without rendering a model chooser or build action.
- [ ] 2.5 Keep the page responsive, keyboard-operable and statically rendered; use only a non-interactive brand visual or neutral showcase region if a visual is needed.
- [ ] 2.6 Update homepage title, description and visible copy so the page communicates product introduction rather than model generation.

## 3. Verify route boundaries and quality

- [ ] 3.1 Confirm `/models` remains the only catalog-driven model-selection entry and that its OpenGrid／HSW order, previews, fallback behavior and edit routes are unchanged.
- [ ] 3.2 Confirm `/`, `/models` and `/docs/` do not initialize CAD Worker、OpenCascade WASM、WebGL renderer or Svelte CAD workspace.
- [ ] 3.3 Run targeted homepage and model-selection E2E tests, then `pnpm check`, relevant unit tests, `pnpm format:check` and the production build.
- [ ] 3.4 Validate the revised OpenSpec change and confirm all task checkboxes and affected artifact requirements are aligned before implementation is considered complete.
