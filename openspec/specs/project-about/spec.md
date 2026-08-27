# Project About Specification

## Purpose

Provide a localized, static project-identity surface that introduces Shape
Shortcut by Blesscat, explains the maker's motivation, and gives users clear
ways to contact, follow, and support the prototype.

## Requirements

### Requirement: Localized About page

The system MUST provide static About pages at `/zh-Hant/about/` and
`/en/about/`. Each page MUST identify `Shape Shortcut by Blesscat`, show the
supplied maker portrait with meaningful alternative text, describe the maker as
an independent developer and 3D-printing enthusiast, explain the motivation
around organizing useful MakerWorld Customizer-inspired model variations in one
place, state that the project is in the Prototype stage, and expose links to
GitHub and the public email address `blesscat@gmail.com`.

#### Scenario: Traditional Chinese About page

- **WHEN** a user opens `/zh-Hant/about/`
- **THEN** the page MUST render the localized project identity, portrait,
  motivation, Prototype status, GitHub link, and a `mailto:blesscat@gmail.com`
  contact link without requiring JavaScript or a CAD Worker

#### Scenario: English About page

- **WHEN** a user opens `/en/about/`
- **THEN** the page MUST render the equivalent English project identity and
  contact information without falling back to Traditional Chinese content

### Requirement: Homepage maker introduction

The localized homepage MUST include a static maker introduction that uses the
same project identity and motivation as the About page, links to the full About
page, and exposes the GitHub and public email actions. The introduction MUST
not replace the product hero or the product's primary model-selection entry.

#### Scenario: Homepage exposes the maker surface

- **WHEN** a user opens either localized homepage
- **THEN** the page MUST show the maker introduction, a link to the matching
  localized About page, and the GitHub and email actions
- **AND** the homepage MUST remain free of CAD Worker, WebAssembly, and WebGL
  initialization
