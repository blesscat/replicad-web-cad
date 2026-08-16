## Context

The proposal and capability specifications define the required behavior. The
current application is a static Astro site with locale-free routes, an Astro shell,
and a client-only Svelte CAD workspace. User-facing copy is distributed across
pages, the model catalog, component panels, viewport/progress UI, validation code,
and the versioned main-thread/Worker contract. The existing parameter store and all
model identifiers are intentionally shared across contexts and must remain
backward-compatible.

## Goals / Non-Goals

**Goals:**

- Generate equivalent Traditional Chinese and English static routes with a single
  locale source of truth.
- Make all visible and accessible copy resolve from typed locale resources.
- Keep CAD domain values, persistence, file naming, and model identity independent
  of language.
- Move diagnostic rendering to the main-thread UI while keeping Worker and contract
  code locale-neutral.
- Give each localized public page crawlable content and deterministic metadata.

**Non-Goals:**

- No additional language beyond `zh-Hant` and `en` in this change.
- No translation of model IDs, OpenGrid IDs, CAD parameter enum values, or export
  filenames.
- No browser-language auto-detection, account-level language preference, or server
  side personalization.
- No conversion of the client-only CAD viewport into server-rendered WebGL.
- No new CAD component or change to OpenGrid geometry, assets, or naming.

## Decisions

### 1. Use a dynamic locale route segment and a shared page implementation

Localized pages will be generated below `src/pages/[locale]/` for the home page,
model chooser, documentation, and CAD model routes. Static paths will enumerate the
two supported locales and the existing model catalog. Existing unprefixed pages will
become compatibility redirect pages to the Traditional Chinese equivalents. Because
the project emits a static artifact without an Astro adapter, production hosting
must configure permanent HTTP redirects for these paths; the generated pages retain
noindex, canonical, meta-refresh, and JavaScript fallbacks for local preview and
hosts without a redirect rule. The JavaScript fallback preserves the current query
string; the static meta-refresh and no-JavaScript anchor can only target the stable
path because a static document cannot read the request query.

This keeps page structure and behavior in one implementation while making locale a
required input to Astro rendering. Duplicating page files under `src/pages/en/` and
`src/pages/zh-Hant/` was rejected because it would allow markup and metadata to
diverge. Query parameters such as `system=desk` remain untouched by the locale
helper and language switch, but are excluded from canonical and `hreflang` URLs
because they represent workspace state rather than indexable page variants.

### 2. Use a local typed translation catalog instead of a runtime i18n dependency

`src/i18n/` will contain a locale type, a flat or namespace-keyed message catalog,
and a small formatter for named interpolation values. The English catalog will be
checked against the Traditional Chinese key set at compile time and by a runtime
completeness test. Components receive the resolved locale explicitly so client-only
Svelte rendering has no hydration-time browser-language branch.

A third-party i18n library was rejected for this prototype because it would add
runtime and bundle complexity without a current need for plural rules or remote
translation loading. Message values remain authored resources, not generated at
runtime.

### 3. Separate model semantics from localized model copy

`ModelDefinition` and `ParameterField` will retain stable model and parameter
semantics while their user-facing fields become translation keys or typed copy
descriptors. A locale-aware catalog helper will resolve display names,
descriptions, preview alt text, parameter labels, axes, units, and system-context
labels.

Behavioral decisions must use stable field/model keys rather than comparing a
translated label. This removes the current coupling where display formatting can
depend on Traditional Chinese text. Existing OpenGrid definitions and directories
remain unchanged and continue to satisfy the project naming convention.

### 4. Introduce locale-neutral diagnostic descriptors at the contract boundary

Validation issues and `CadError`/`operation.error` events will carry a stable
message identifier plus JSON-safe interpolation parameters. The contract protocol
version will be incremented because the error event shape changes. The Worker will
map internal kernel failures to stable error codes and safe descriptor parameters;
it will never import locale resources or expose raw kernel exception text as the
primary message.

The main-thread UI will translate descriptors for error titles, validation text,
retry messages, progress stages, boolean operations, units, and elapsed-time
descriptions. Unknown descriptors use a localized generic fallback and remain
observable in tests. The existing generation, revision, recoverability, and
correlation metadata remain unchanged.

### 5. Keep locale switching as a full-page, crawlable navigation

The layout will render language alternatives as ordinary links. The target path is
derived from the current locale route and retains the current model slug and query
string. A full navigation is acceptable because the existing component parameter
store restores values from the unchanged storage key, and it avoids introducing a
second client-side global locale store.

### 6. Generate metadata and a sitemap from the same route registry

The locale/model route registry will be reused for canonical links, reciprocal
`hreflang` links, localized language-switch links, and a generated sitemap endpoint.
Each localized page self-canonicalizes. The public origin will be read from a
`PUBLIC_SITE_URL`/Astro site configuration value, with a documented local-build
fallback for tests; production hosting must provide the real origin.

Legacy unprefixed routes are excluded from the sitemap. Production hosting redirects
them to the default locale while the static compatibility pages provide a noindex
fallback. No request-header or browser-language redirect is added.

### 7. Put answer-friendly model facts in static page content

The localized model chooser, documentation page, and CAD entry page will render
visible summaries from the same model copy catalog. Summaries will state purpose,
supported parameters/units, export formats, and the JavaScript/WebAssembly/WebGL
requirement for the interactive workspace. This gives crawlers and answer engines
useful content even when the client-only Svelte workspace is not executed.

Structured data is optional and, if added, will be generated only from visible
localized content. It will not be used as a substitute for page text.

## Risks / Trade-offs

- **[Risk]** Migrating copy from every panel and validation branch is broad and may
  leave mixed-language strings. → Use a translation-key inventory, compile/runtime
  completeness checks, and representative English E2E coverage.
- **[Risk]** The Worker contract version change can make stale client/Worker bundles
  incompatible. → Build and deploy the static application as one artifact, update
  contract validators and tests together, and keep the version bump explicit.
- **[Risk]** A missing production origin produces incorrect absolute canonical or
  sitemap URLs. → Require `PUBLIC_SITE_URL` for production builds and test the
  generated URLs with a deterministic local origin.
- **[Risk]** Full-page locale switching resets in-memory CAD state. → Preserve the
  current route/query and keep the existing validated localStorage payload and
  storage version unchanged; test a switch after editing parameters.
- **[Risk]** Long translated documentation increases duplicated maintenance. → Keep
  stable CAD facts in shared data and translate only the presentation copy; avoid
  duplicating model contracts or geometry logic.
- **[Risk]** Static redirect behavior differs between local preview and a production
  host. → Test the fallback navigation behavior in Playwright and document the host
  requirement for permanent redirects where the host controls HTTP status codes.

## Migration Plan

1. Add the locale and translation primitives, route registry, and failing behavior
   tests before migrating page copy.
2. Move Astro pages into the locale route tree and add compatibility redirects,
   metadata, language links, and sitemap generation.
3. Migrate catalog and Svelte copy, passing the locale into the client-only CAD
   workspace and its child panels.
4. Refactor validation/progress/Worker diagnostics to descriptors, bump and verify
   the contract, then migrate error and progress UI.
5. Add static model/documentation summaries and run the full unit, type, build, and
   E2E gates for both locales.

There is no user-data migration: the component parameter storage key, schema version,
model IDs, and stored parameter shapes remain unchanged. Rollback consists of
reverting the application and route changes; existing unprefixed URLs can be kept as
the default pages if a hosting environment cannot apply the planned redirects.
