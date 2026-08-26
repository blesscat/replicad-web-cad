## Purpose

Make every localized public page independently crawlable, correctly associated with
its language variant, and useful to search and answer engines beyond the client-only
CAD controls.

## Requirements

### Requirement: Locale-specific search metadata

Each localized static page SHALL emit a title, description when applicable, a
self-referencing canonical URL, and the correct document language. A localized page
MUST NOT canonicalize to a different-language variant solely because that variant is
the default locale.

#### Scenario: Search metadata is rendered for the English chooser

- **WHEN** a crawler requests `/en/models`
- **THEN** the response SHALL contain English visible content, an English document
  language, an English title and description, and a canonical URL for `/en/models`

#### Scenario: Search metadata is rendered for the Traditional Chinese chooser

- **WHEN** a crawler requests `/zh-Hant/models`
- **THEN** the response SHALL contain Traditional Chinese visible content and a
  canonical URL for `/zh-Hant/models`

### Requirement: Language variants are discoverable and associated

Each localized page SHALL expose reciprocal `hreflang` links for all supported
language variants of the same page, and the language switch SHALL use crawlable
links. The generated sitemap SHALL include the canonical localized public URLs.

#### Scenario: Google can discover both chooser variants

- **WHEN** a crawler inspects either localized model chooser page
- **THEN** it SHALL find links identifying both the `zh-Hant` and `en` equivalents
  and the sitemap SHALL list both canonical URLs

### Requirement: Public model information is present in static HTML

The model selection, documentation, and CAD entry pages SHALL expose crawlable
static content describing model purpose, supported parameters or constraints, units,
and available export formats. This content SHALL remain meaningful without loading
the client-only interactive workspace.

#### Scenario: Crawler requests a CAD entry page without executing the workspace

- **WHEN** JavaScript is unavailable while requesting a localized CAD entry page
- **THEN** the response SHALL still contain the localized model name, purpose or
  capability summary, requirements for interactive preview, and a navigable link
  back to model selection

#### Scenario: Localized documentation answers a model capability question

- **WHEN** a user or answer engine reads the localized documentation page
- **THEN** it SHALL find structured headings and visible text describing supported
  model families, parameters, units, and STEP/STL export behavior

### Requirement: Legacy routes do not create duplicate indexable pages

Unprefixed legacy routes SHALL be excluded from the sitemap and SHALL resolve to
their `/zh-Hant/` equivalents. A production host that supports HTTP redirect rules
SHALL issue a permanent redirect (308 or the host's equivalent) while preserving the
query string. The static artifact SHALL provide a noindex, canonical, meta-refresh,
and JavaScript compatibility fallback for hosts without request-level redirects. The
JavaScript fallback SHALL preserve the query string; the static meta-refresh and
anchor fallback MAY target only the stable path because a static document cannot
inspect the request query. The site SHALL NOT automatically redirect a crawler or
user between supported locales based only on a guessed browser language.

#### Scenario: Legacy model route redirects to the default locale

- **WHEN** a crawler requests `/models`
- **THEN** a production host SHALL return a permanent redirect to `/zh-Hant/models`
  and the localized target SHALL be the indexable canonical page; a static host
  without request-level redirect support SHALL serve the noindex compatibility
  fallback, which navigates to the same target

#### Scenario: English page remains directly accessible

- **WHEN** a user or crawler requests `/en/models` regardless of browser language
- **THEN** the site SHALL serve the English page directly without redirecting to
  `/zh-Hant/models`

### Requirement: Localized Desk quick-start content remains crawlable and meaningful without visuals

The localized Docs pages MUST expose the Desk System Quick Start as crawlable
HTML content, including its ordered workflow, component roles, locating choice,
minimum checklist, Desk-context links, and visual captions or alternative text.
The content MUST remain meaningful when JavaScript is disabled or visual assets
are unavailable.

#### Scenario: Search or answer crawlers read the Traditional Chinese guide

- **WHEN** a crawler requests `/zh-Hant/docs/` without executing client-side CAD
  code
- **THEN** the response MUST contain the localized Desk quick-start heading,
  ordered workflow text, checklist, and links to the applicable Desk CAD routes

#### Scenario: Search or answer crawlers read the English guide

- **WHEN** a crawler requests `/en/docs/` without executing client-side CAD code
- **THEN** the response MUST contain the corresponding English content and the
  same navigable Desk component links

#### Scenario: Documentation remains understandable without an image

- **WHEN** a visual asset is missing or blocked
- **THEN** the static HTML MUST still expose equivalent localized instructions
  through visible text, captions, or alternative text

### Requirement: Localized About pages are indexable public pages

The localized About pages MUST emit a localized title and description, a
self-referencing canonical URL, reciprocal `hreflang` links, and entries in
the generated sitemap. The unprefixed `/about/` compatibility route MUST not
become a second indexable page and MUST resolve to the default locale using the
existing legacy-route behavior.

#### Scenario: About metadata is localized

- **WHEN** a crawler requests `/en/about/` or `/zh-Hant/about/`
- **THEN** the response MUST contain the matching document language, localized
  visible content, localized title and description, canonical URL, and both
  supported locale alternates

#### Scenario: About sitemap coverage is canonical

- **WHEN** the generated sitemap is inspected
- **THEN** it MUST include `/en/about/` and `/zh-Hant/about/`
- **AND** it MUST not include the unprefixed `/about/` compatibility route

### Requirement: Product and documentation links remain crawlable

The updated homepage and Docs hub MUST expose ordinary crawlable links between
the product Hero, system guides, model selection, About, and applicable CAD
routes. These links MUST remain present in server-rendered HTML without
executing the interactive CAD workspace.

#### Scenario: Crawler can follow the product entry flow

- **WHEN** a crawler requests a localized homepage or Docs page without
  executing JavaScript
- **THEN** it MUST find links to the localized model chooser, Docs or system
  guidance, About page, and current model routes where the page describes them
