## Context

The redesigned localized homepage ends with a dark `nav` surface and a light
CTA. The CTA currently combines a theme-invariant white background with a
theme-dependent foreground inherited from the surrounding section; in dark mode
that foreground is also near-white, so the label is visually lost. The inherited
anchor baseline is also outside Tailwind's utility layer, so it currently masks
explicit `text-*` utilities on links. The existing theme already provides
semantic `nav` and `nav-foreground` tokens, and the CTA has no runtime state or
data dependency.

## Goals / Non-Goals

**Goals:**

- Keep the final homepage CTA readable in light and dark color schemes,
  including its hover state.
- Make explicit semantic text utilities effective on anchors without changing
  the default inherited color of links that do not provide one.
- Reuse the existing semantic theme tokens and preserve the CTA's route,
  localized label, focus behavior, and layout.
- Add a behavior-level regression test that observes computed colors and checks
  the user-visible contrast contract in dark mode.

**Non-Goals:**

- Changing the global meaning of `ink`, the dark-mode palette, or shared
  navigation styling.
- Redesigning the homepage, changing any model route, or adding a theme toggle.
- Adding a new dependency, component, model ID, or runtime behavior.

## Decisions

### Use the existing navigation foreground pair for the CTA

The final section already uses `bg-nav` with `text-nav-foreground`. The CTA will
use the inverse semantic pair: `bg-nav-foreground` with `text-nav`, and retain a
light `nav-foreground` hover surface. This keeps the button background light and
its text dark in both themes without coupling the CTA to the body `ink` token.

The global inherited-anchor rule will live in Tailwind's base layer. That keeps
unstyled links inheriting the body/section color while allowing an explicit
utility such as `text-nav` or `text-white` to take precedence on a link.

**Alternative considered:** changing the dark-mode value of `--color-ink`. That
would repair this one CTA by changing the foreground semantics for every page,
which risks regressions in body text, panels, fields, and existing links.

**Alternative considered:** hardcoding a dark text color on the CTA. That would
provide contrast but bypass the repository's semantic token system and make the
relationship to the surrounding `nav` surface less clear.

**Alternative considered:** adding an important modifier only to this CTA. That
would hide the cascade defect and leave other semantic link colors unreliable.

### Verify the rendered contract, not the class spelling

Homepage E2E coverage will emulate light and dark preferences, read the final
CTA's computed foreground/background colors, and calculate their contrast. It
will also verify the localized model-selection href and visible/focusable link
behavior. This tests the browser-visible result and remains valid if the token
implementation or utility class names change.

## Risks / Trade-offs

- **[Risk]** A future palette change could reduce contrast for either semantic
  token pair. → **Mitigation:** keep the computed contrast assertion in the
  dark-mode regression test and run the existing system appearance checks.
- **[Risk]** The two supported locales could diverge in route or CTA rendering.
  → **Mitigation:** exercise both localized homepages through the existing
  homepage test coverage.
- **[Risk]** A hover-only style could be missed by a static screenshot. →
  **Mitigation:** include the hover state in the observable test contract and
  inspect the computed hover colors through a real browser interaction.

## Migration Plan

Update the homepage utility classes and targeted E2E coverage, run formatting,
type checking, build, and relevant tests, then sync the `system-dark-mode` delta
into its main spec before archiving. Rollback is a normal revert of the focused
homepage/test/spec commit; no persisted data or route migration is involved.
