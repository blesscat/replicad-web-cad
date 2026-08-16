## Why

The current Docs page is a high-level product summary, but it does not teach a
new user how to build the project's primary Desk System. A first-time user needs
to understand the physical dependency between the Board, Snap, locating method,
and container before reading model-specific parameters. The repository already
has Desk-context routes, Desk presets, and static model preview assets, so this
is the right time to turn the Docs page into an actionable, visual quick start.

## What Changes

- Add a localized `Desk System Quick Start` as the first and primary section of
  the public Docs page.
- Document the recommended physical flow as `Board → Snap → locating method →
  Grid Box/Round Box`.
- Explain the role of each part and provide a minimum print checklist.
- Explain the two locating strategies: a separate `Locating Post` or a box's
  `內建角座` option. The content MUST make the choice relationship explicit:
  selecting `內建角座` means that no separate `Locating Post` is installed.
- Add direct links to the Desk-context CAD routes for Board, Snap, Locating
  Post, Grid Box, and Round Box.
- Include visual documentation: a numbered assembly-flow diagram, a Board/Snap
  placement view, a locating-method comparison, and the existing Desk model
  preview assets where useful.
- Keep all images static, localized through captions/alt text, and accompanied by
  equivalent text so the guide remains useful without JavaScript or images.
- Use Grid Box as the canonical first-use example and introduce Round Box as a
  secondary example using the same workflow. Keep advanced Snap and container
  settings in a later reference section.
- State that the Board may simply rest on the desk. Screw-hole fastening may be
  mentioned as an optional mounting method, but it MUST NOT be presented as a
  prerequisite.
- Keep slicer instructions and print-setting recommendations out of this first
  version; the quick start covers system assembly and component relationships.
- Keep Wall System and non-primary/hidden catalog entries out of the primary
  quick-start path; mention them only in a secondary system or advanced section.
- Preserve all existing model IDs, build keys, route slugs, persistence keys,
  Worker contracts, CAD behavior, and export contracts.

## Capabilities

### New Capabilities

- `public-documentation`: Public, localized documentation structure and the Desk
  System visual quick-start experience.

### Modified Capabilities

- `search-discoverability`: Require the localized quick-start content and its
  explanatory visuals to remain crawlable, accessible, and meaningful without
  the client-only CAD workspace.

## Impact

- Astro Docs page under `src/pages/[locale]/docs/`.
- Localized copy and captions in `src/i18n/catalog.ts` or a dedicated localized
  documentation resource.
- A small documentation data map for the Desk workflow, using the existing model
  catalog to resolve names and localized CAD routes.
- New static documentation diagrams/assets under `public/docs/desk-system/`,
  plus reuse of existing Desk preview images under `public/model-previews/`.
- E2E and unit coverage for the ordered workflow, links, image alternatives,
  locale parity, and the absence of CAD Worker initialization on the Docs page.
- No application runtime, CAD-kernel, Worker, geometry, or export implementation
  changes are intended by this change.
