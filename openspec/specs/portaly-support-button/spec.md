## Purpose

讓使用者能從 Shape Shortcut 的主要頁面，以清楚、低摩擦且不需要網站自行處理付款資料的方式支持 CAD 工具後續開發。

## Requirements

### Requirement: Shared support entry

The system MUST provide a clearly labeled `支持這個專案` support trigger on the right side of the shared site navigation so users can discover the external donation choices from the homepage, documentation page, and every valid model-specific CAD page. Activating the trigger MUST open a support-choice dialog rather than navigate directly to a provider. The dialog MUST show every configured valid Portaly or Ko-fi destination to users in every supported locale and MUST NOT select a provider based on locale. The support trigger MUST NOT require CAD runtime initialization. On narrow viewports, the navigation MAY adapt the placement while keeping the control discoverable and usable.

#### Scenario: Support link is available across site pages

- **WHEN** a user opens the homepage, documentation page, or a valid model-specific CAD page
- **THEN** the shared navigation MUST display an actionable support trigger labeled `支持這個專案`
- **AND** activating the trigger MUST open a dialog containing each configured valid support option
- **AND** the page MUST remain usable when the CAD Worker is unavailable or has not initialized

#### Scenario: Support choices are available in every locale

- **WHEN** a user opens any supported locale of a page with both valid provider URLs configured
- **THEN** the support-choice dialog MUST show both Portaly and Ko-fi options
- **AND** the provider selection MUST NOT be determined by the current locale

#### Scenario: Support link preserves the current workspace

- **WHEN** a user activates the support trigger while viewing a CAD workspace
- **THEN** the dialog MUST allow the user to select either configured provider
- **AND** selecting a provider MUST open that provider's support page in a separate browsing context
- **AND** the current CAD page and its current route MUST remain open

### Requirement: Safe external payment boundary

The system MUST delegate payment, electronic invoice collection where provided, payout, and supporter personal data handling to the selected external provider. The website MUST NOT collect card details, store payment credentials, call provider payment APIs, or require a backend, database, webhook, or payment SDK for the support flow.

#### Scenario: Payment is completed on Portaly

- **WHEN** a user selects Portaly or Ko-fi from the support-choice dialog
- **THEN** the user MUST complete the single-support payment on the selected provider-hosted page
- **AND** the website MUST not render an in-site payment form or request card details

#### Scenario: External link is secured

- **WHEN** a user selects an external support option
- **THEN** the selected provider page MUST open in a separate browsing context
- **AND** the external link MUST use `target="_blank"` and `rel="noopener noreferrer"`
- **AND** returning from either provider MUST not be treated as a CAD model, export, or authentication state transition

### Requirement: Non-blocking support configuration

The system MUST treat the Portaly and Ko-fi URLs as replaceable public configuration. Each configured URL is valid only when it is a non-empty absolute `https:` URL. If one URL is unset or invalid at build/configuration time, the site MUST continue to render and the valid provider option MUST remain available. If both URLs are unset or invalid, the site MUST continue to render without exposing a misleading support trigger or dead payment link.

#### Scenario: Support URL is configured

- **WHEN** valid Portaly and Ko-fi URLs are configured
- **THEN** the support trigger MUST be rendered
- **AND** the support-choice dialog MUST show both provider options to every supported locale
- **AND** each option MUST be available without a separate login to Shape Shortcut

#### Scenario: Support URL is unavailable

- **WHEN** exactly one configured support URL is absent or fails HTTPS validation
- **THEN** the support trigger MUST remain available
- **AND** the dialog MUST show only the provider with a valid URL
- **AND** no empty or invalid external link may be rendered

#### Scenario: No support URL is available

- **WHEN** both support URLs are absent or fail configuration validation
- **THEN** the site MUST remain loadable
- **AND** the support trigger and dialog MUST not be rendered
- **AND** CAD route navigation, model generation, preview, STEP export, and STL export MUST remain unaffected

### Requirement: Single-support payment scope

Each configured external support destination MUST provide a one-time support flow with suggested fixed amounts and an optional custom amount. The first release MUST NOT expose monthly or other recurring support, membership, supporter-only rewards, or in-site payment controls.

#### Scenario: Support options use a one-time flow

- **WHEN** a user selects a configured support provider
- **THEN** the provider page MUST offer one-time support with the agreed suggested amounts and an optional custom amount
- **AND** it MUST NOT offer monthly or recurring support as part of this integration

### Requirement: Accessible responsive support control

The support trigger and support-choice dialog MUST remain understandable and operable on desktop and mobile layouts, including keyboard navigation and accessible naming for the trigger, dialog, close control, and provider choices. Its visual treatment MAY use a coffee-themed accent but MUST remain consistent with the site's existing navigation contrast and focus behavior.

#### Scenario: Keyboard user activates support

- **WHEN** a keyboard user navigates through the shared navigation
- **THEN** the support trigger MUST be reachable in a predictable order
- **AND** it MUST expose an accessible name that describes supporting the project
- **AND** the dialog MUST expose an accessible name, move focus into the dialog, provide a reachable close control, and restore focus to the trigger when closed

#### Scenario: Keyboard user selects a provider

- **WHEN** a keyboard user operates the support-choice dialog
- **THEN** each configured provider choice MUST be reachable and have an accessible name describing the destination
- **AND** each provider choice MUST have a visible focus state

#### Scenario: Narrow viewport displays support entry

- **WHEN** the site is rendered at a narrow mobile viewport
- **THEN** the support trigger and dialog MUST remain usable without horizontal overflow
- **AND** the labels for both provider choices MUST remain understandable without relying only on an icon

### Requirement: Contextual support entry in project identity surfaces

When at least one valid support URL is configured, the localized homepage maker introduction and About page MUST expose a clearly labeled contextual support trigger such as `支持 Shape Shortcut`. The contextual trigger MUST open the same support-choice dialog and provider destinations as the shared navigation support entry. When no support URL is valid, the project identity surfaces MUST remain usable without rendering a dead support trigger.

#### Scenario: Maker surface links to Portaly support

- **WHEN** at least one valid support URL is configured and a user opens the homepage or About page
- **THEN** the contextual maker/support section MUST show an actionable support trigger
- **AND** activating it MUST open the support-choice dialog with every configured valid provider option
- **AND** selecting a provider MUST use `target="_blank"` and `rel="noopener noreferrer"`
- **AND** the current page or CAD workspace MUST remain open

#### Scenario: Missing support configuration does not break About

- **WHEN** both support URLs are absent or invalid
- **THEN** the homepage and About page MUST remain renderable
- **AND** GitHub, email, and About navigation actions MUST remain available
- **AND** no empty or invalid support trigger or provider link may be rendered
