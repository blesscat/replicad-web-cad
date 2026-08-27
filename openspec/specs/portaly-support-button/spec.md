## Purpose

讓使用者能從 Shape Shortcut 的主要頁面，以清楚、低摩擦且不需要網站自行處理付款資料的方式支持 CAD 工具後續開發。

## Requirements

### Requirement: Shared support entry

The system MUST provide a clearly labeled `支持這個專案` support link on the right side of the shared site navigation so users can discover the Portaly support flow from the homepage, documentation page, and every valid model-specific CAD page. The link MUST use the configured public Portaly support URL and MUST NOT require CAD runtime initialization. On narrow viewports, the navigation MAY adapt the placement while keeping the control discoverable and usable.

#### Scenario: Support link is available across site pages

- **WHEN** a user opens the homepage, documentation page, or a valid model-specific CAD page
- **THEN** the shared navigation MUST display an actionable support link labeled `支持這個專案`
- **AND** the link MUST point to the configured Portaly support URL
- **AND** the page MUST remain usable when the CAD Worker is unavailable or has not initialized

#### Scenario: Support link preserves the current workspace

- **WHEN** a user activates the support link while viewing a CAD workspace
- **THEN** the Portaly support page MUST open in a separate browsing context
- **AND** the current CAD page and its current route MUST remain open

### Requirement: Safe external payment boundary

The system MUST delegate payment, electronic invoice collection, payout, and supporter personal data handling to Portaly. The website MUST NOT collect card details, store payment credentials, call Portaly payment APIs, or require a backend, database, webhook, or payment SDK for the support flow.

#### Scenario: Payment is completed on Portaly

- **WHEN** a user follows the support link
- **THEN** the user MUST complete the single-support payment on the Portaly-hosted page
- **AND** the website MUST not render an in-site payment form or request card details

#### Scenario: External link is secured

- **WHEN** the support link opens a new browsing context
- **THEN** the link MUST use `target="_blank"` and `rel="noopener noreferrer"`
- **AND** returning from Portaly MUST not be treated as a CAD model, export, or authentication state transition

### Requirement: Non-blocking support configuration

The system MUST treat the Portaly URL as replaceable public configuration. A configured URL is valid only when it is a non-empty absolute `https:` URL; the final Portaly destination MAY be supplied after the initial implementation. If the URL is unset or invalid at build/configuration time, the site MUST continue to render and CAD workflows MUST continue to work; the UI MUST not expose a misleading dead payment link.

#### Scenario: Support URL is configured

- **WHEN** a valid Portaly support URL is configured
- **THEN** the support link MUST be rendered with that URL
- **AND** the link MUST be available without a separate login to Shape Shortcut

#### Scenario: Support URL is unavailable

- **WHEN** the Portaly support URL is absent or fails configuration validation
- **THEN** the site MUST remain loadable
- **AND** CAD route navigation, model generation, preview, STEP export, and STL export MUST remain unaffected
- **AND** the UI MUST not render a clickable link that points to an empty or invalid destination

### Requirement: Single-support payment scope

The Portaly support destination MUST provide a one-time support flow with suggested fixed amounts and an optional custom amount. The first release MUST NOT expose monthly or other recurring support, membership, supporter-only rewards, or in-site payment controls.

#### Scenario: Support options use a one-time flow

- **WHEN** the Portaly support page is configured for release
- **THEN** it MUST offer one-time support with the agreed suggested amounts and an optional custom amount
- **AND** it MUST NOT offer monthly or recurring support as part of this integration

### Requirement: Accessible responsive support control

The support entry MUST remain understandable and operable on desktop and mobile layouts, including keyboard navigation and accessible link naming. Its visual treatment MAY use a coffee-themed accent but MUST remain consistent with the site's existing navigation contrast and focus behavior.

#### Scenario: Keyboard user activates support

- **WHEN** a keyboard user navigates through the shared navigation
- **THEN** the support link MUST be reachable in a predictable order
- **AND** it MUST expose an accessible name that describes supporting the project
- **AND** it MUST have a visible focus state

#### Scenario: Narrow viewport displays support entry

- **WHEN** the site is rendered at a narrow mobile viewport
- **THEN** the support link MUST remain visible or reachable without horizontal overflow
- **AND** its label `支持這個專案` MUST remain understandable without relying only on an icon

### Requirement: Contextual support entry in project identity surfaces

When a valid Portaly support URL is configured, the localized homepage maker
introduction and About page MUST expose a clearly labeled contextual support
entry such as `支持 Shape Shortcut`. The contextual entry MUST use the same
external support destination and secure new-context link behavior as the shared
navigation support entry. When the support URL is absent or invalid, the
project identity surfaces MUST remain usable without rendering a dead link.

#### Scenario: Maker surface links to Portaly support

- **WHEN** a valid Portaly support URL is configured and a user opens the
  homepage or About page
- **THEN** the contextual maker/support section MUST show an actionable support
  link to that URL
- **AND** the link MUST use `target="_blank"` and
  `rel="noopener noreferrer"`
- **AND** the current page or CAD workspace MUST remain open

#### Scenario: Missing support configuration does not break About

- **WHEN** the Portaly support URL is absent or invalid
- **THEN** the homepage and About page MUST remain renderable
- **AND** GitHub, email, and About navigation actions MUST remain available
- **AND** no empty or invalid support link may be rendered
