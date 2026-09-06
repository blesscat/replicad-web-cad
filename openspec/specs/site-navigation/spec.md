# site-navigation Specification

## Purpose

Defines the observable behavior of the shared floating navigation capsule:
it stays pinned while scrolling, collapses to a compact form that folds
its secondary links once the page leaves the top, and keeps every
remaining control fully usable in both states for all themes and locales.

## Requirements

### Requirement: Navigation stays pinned while scrolling

The shared navigation capsule SHALL remain pinned to the top of the
viewport while the page is scrolled past its resting position.

#### Scenario: Scrolled to the bottom of a long page

- **WHEN** the user scrolls a long page far from the top
- **THEN** the navigation capsule MUST still be pinned at the top of the
  viewport
- **AND** every control the current form presents (brand link, theme
  toggle, locale switch, support trigger) MUST remain visible and
  clickable

### Requirement: Navigation collapses to a compact form when scrolled past the top

The navigation capsule SHALL present an expanded form while the page rests
near the top, and a compact form once the page is scrolled beyond a small
threshold. The compact form MUST reduce the viewport space the capsule
occupies (its bottom edge MUST sit higher than in the expanded form).
Returning near the top MUST restore the expanded form.

#### Scenario: Page at the top shows the expanded capsule

- **WHEN** the page is at or near the top (scroll position within the
  threshold)
- **THEN** the navigation capsule MUST be in its expanded form

#### Scenario: Scrolling past the threshold collapses the capsule

- **WHEN** the user scrolls the page beyond the threshold
- **THEN** the navigation capsule MUST switch to the compact form
- **AND** the capsule's bottom edge MUST sit measurably higher in the
  viewport than the expanded form's bottom edge

#### Scenario: Scrolling back to the top expands the capsule

- **WHEN** the user scrolls back near the top of the page
- **THEN** the navigation capsule MUST return to the expanded form

#### Scenario: Landing on an in-page anchor keeps the capsule compact

- **WHEN** the page is loaded or jumped to an anchor far from the top
- **THEN** the navigation capsule MUST present the compact form without
  requiring further scrolling

### Requirement: Compact form folds secondary navigation links

In the compact form the capsule SHALL fold the secondary navigation links
(docs, models, about). The brand link, theme toggle, locale switch, and
support trigger SHALL remain visible and operable, and the folded links
SHALL return when the page scrolls back near the top.

#### Scenario: Navigation links fold while scrolled

- **WHEN** the capsule is in its compact form
- **THEN** the docs, models, and about links MUST NOT be visible or
  focusable
- **AND** the brand link, theme toggle, locale switch, and support
  trigger MUST remain visible and operable

#### Scenario: Folded links return near the top

- **WHEN** the page scrolls back near the top and the capsule expands
- **THEN** the docs, models, and about links MUST be visible and
  focusable again

### Requirement: Navigation state switches never move page content

Switching between the expanded and compact forms SHALL only change the
navigation capsule itself: page content below moves solely as the
consequence of the capsule's own height change. Switching themes while
scrolled MUST NOT change the capsule's size or state.

#### Scenario: Theme switches never shift layout

- **WHEN** the user switches between light and dark themes at any scroll
  position
- **THEN** the capsule's form (expanded or compact) and size MUST NOT
  change
- **AND** its pinned offset MUST only differ by the theme's static design
  offset (the dark capsule floats lower in both forms)

### Requirement: Compact form preserves interactive target sizes

In the compact form, the capsule SHALL reduce only its own chrome
(padding, folded links, pinned offset). Every remaining interactive
control (brand link, theme toggle, locale switch, support trigger) SHALL
retain the same rendered size and hit area as in the expanded form.

#### Scenario: Theme toggle size is unchanged between states

- **WHEN** the capsule switches between expanded and compact forms
- **THEN** the theme toggle's rendered size MUST be identical in both
  states
- **AND** every navigation link, whenever rendered, MUST keep the same
  text size

### Requirement: Collapse behavior is identical across themes and locales

The scroll-collapse behavior SHALL be the same in light and dark themes and
on every localized route. Both themes MUST switch states at the same
thresholds; the compact pinned offset MAY differ between themes (the dark
theme keeps the capsule floating below the top edge in both states).

#### Scenario: Dark mode collapses at the same scroll threshold

- **WHEN** the user scrolls past the threshold in dark mode
- **THEN** the capsule MUST switch to the compact form exactly as in light
  mode
- **AND** switching themes while scrolled MUST NOT change which form
  (expanded or compact) is presented

### Requirement: Reduced-motion users switch states without animation

For users with reduced motion enabled, the capsule SHALL switch between
expanded and compact forms without an animated transition. The state
switching itself MUST still happen.

#### Scenario: Collapse under reduced motion

- **WHEN** reduced motion is enabled and the user scrolls past the
  threshold
- **THEN** the capsule MUST switch to the compact form
- **AND** the switch MUST NOT be animated
