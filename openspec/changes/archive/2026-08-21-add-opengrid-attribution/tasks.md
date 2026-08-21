## 1. Attribution contract and localized copy

- [x] 1.1 Add model-scoped attribution metadata for the existing `opengrid` and `opengrid-snap` IDs, including the pinned source URLs/revision and separate CC BY-NC-SA 4.0 and CC BY 4.0 license links; preserve all existing IDs and routes.
- [x] 1.2 Add Traditional Chinese and English translation keys for the notice heading, source/credit labels, license labels, Snap modification statement, and accessibility text; verify the catalog remains complete.

## 2. Generator page and provenance

- [x] 2.1 Render an accessible static attribution notice in the localized CAD generator page for only `opengrid` and `opengrid-snap`, including the source, credits, license links, and Snap Half/Quarter modification wording.
- [x] 2.2 Update the OpenGrid Snap asset README with the pinned upstream source, license distinction, and provenance of `snap-half`/`snap-quarter` while preserving the existing permission review note and leaving CAD files unchanged.

## 3. Verification

- [x] 3.1 Add behavior-focused coverage for both locales, both in-scope model pages, the license/source links, the Snap modification statement, and the absence of the notice from another OpenGrid-compatible page.
- [x] 3.2 Run the focused attribution tests plus the project type check, unit tests, formatting check, and production build; record the exact validation results before review.
