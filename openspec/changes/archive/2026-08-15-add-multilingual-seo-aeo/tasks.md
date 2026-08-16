## 1. Locale and translation foundation

- [x] 1.1 Add behavior tests for supported locale parsing, locale-prefixed paths, named interpolation, and missing translation detection.
- [x] 1.2 Implement the typed `zh-Hant`/`en` locale module, namespace message catalogs, translator, and completeness validation.
- [x] 1.3 Add tests and route helpers for preserving model slugs, query strings, and system-context parameters when switching locales.
- [x] 1.4 Add the shared locale/model route registry and locale-aware URL helpers without changing existing model IDs or OpenGrid identifiers.

## 2. Localized static routes and discoverability

- [x] 2.1 Add failing route-level tests for both locale page trees, legacy-route redirects, document language, self-canonical URLs, reciprocal `hreflang`, and language-switch links.
- [x] 2.2 Move the home, model selection, documentation, and CAD entry pages under the locale route tree and pass locale data through the shared Astro layout.
- [x] 2.3 Implement unprefixed compatibility redirect pages that retain model slugs and query parameters and do not perform browser-language auto-redirects; document the production host requirement for permanent HTTP redirects.
- [x] 2.4 Add locale-aware canonical, alternate-language metadata, configured public-origin handling, sitemap generation, and production-origin documentation.
- [x] 2.5 Add visible localized model summaries and documentation sections covering model purpose, parameters, units, export formats, and client capability requirements.

## 3. Model catalog and Svelte UI localization

- [x] 3.1 Add behavior tests for localized model names, descriptions, preview alt text, parameter labels, units, directions, and system-context labels.
- [x] 3.2 Replace user-facing model catalog and parameter schema strings with stable translation keys or copy descriptors, and make display logic use semantic field keys instead of translated text.
- [x] 3.3 Migrate the Astro layout/pages and shared CAD controls to resolve all visible and accessible copy from the active locale.
- [x] 3.4 Migrate every model-specific Svelte panel, calculator, viewport state, restore control, export action, and accessibility label to the active locale.
- [x] 3.5 Pass locale through the client-only CAD workspace and verify that locale switching preserves model routes, query parameters, and validated component persistence.

## 4. Locale-neutral CAD diagnostics

- [x] 4.1 Add failing unit and contract tests for descriptor-based validation issues, progress messages, Worker errors, interpolation parameters, and unknown-diagnostic fallback.
- [x] 4.2 Refactor CAD validation and raw-parameter parsing results to return stable message identifiers and JSON-safe parameters instead of localized sentences.
- [x] 4.3 Update the versioned CAD error contract, validators, Worker error mapping, runtime error creation, and tests to carry safe descriptors without raw internal exception text.
- [x] 4.4 Localize progress stages, boolean operation details, validation feedback, error titles, retry messages, browser capability messages, and error-toast accessibility text.
- [x] 4.5 Verify that Worker commands, generated geometry, export filenames, revision metadata, and persisted parameter payloads are identical across locales.

## 5. Regression coverage and delivery gates

- [x] 5.1 Update existing unit and E2E tests to assert locale-independent behavior where appropriate and localized user-visible behavior where required.
- [x] 5.2 Add representative English and Traditional Chinese E2E coverage for home, model selection, documentation, CAD fallback, CAD controls, diagnostics, and language switching.
- [x] 5.3 Add a build/metadata test that validates all localized public routes are generated, sitemap URLs are canonical, and no required translation key is missing.
- [x] 5.4 Run formatting, type checking, unit tests, production build, and relevant Playwright suites; fix failures without changing the specified locale-neutral contracts.
- [x] 5.5 Review the final diff for untranslated user-facing strings, accidental OpenGrid/model ID changes, unrelated files, and completed OpenSpec task coverage.

The final regression gate passes with the pre-existing
`tests/worker/opengrid-stackable-box.integration.test.ts` geometry suite excluded;
that suite has six CAD-kernel/reference failures unrelated to this change and is
recorded as a delivery caveat.
