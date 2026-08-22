## Why

The localized homepage's final call-to-action renders near-white text on a white
surface when the browser prefers dark mode, making the link appear blank even
though it remains interactive. The shared dark-mode contract already requires
readable links and buttons, so the homepage CTA needs a theme-safe foreground and
hover treatment now that the redesigned homepage is on `main`.

## What Changes

- Use a stable semantic foreground/background pair for the homepage final CTA so
  its label remains readable in both light and dark color schemes.
- Keep the inherited anchor baseline in the base cascade so explicit semantic
  text utilities can control link foregrounds as intended.
- Keep the CTA's existing localized `/models` destination, keyboard focus state,
  layout, and visible copy unchanged.
- Keep the CTA hover state on a light surface with a contrasting foreground in
  both themes.
- Add behavior-focused dark-mode regression coverage for the final homepage CTA
  and preserve the existing light-mode homepage coverage.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `system-dark-mode`: require the static homepage's final CTA label and hover
  state to retain sufficient contrast when dark mode is active.

## Impact

- Affected presentation: `src/pages/[locale]/index.astro` and the anchor
  cascade in `src/styles/global.css`; no new theme tokens are required.
- Affected verification: homepage and dark-mode E2E coverage.
- Affected OpenSpec artifacts: the `system-dark-mode` delta spec and its synced
  main spec.
- No new OpenGrid component, model ID, build key, route slug, catalog entry,
  dependency, or runtime behavior is introduced; all existing IDs and routes are
  intentionally preserved.
