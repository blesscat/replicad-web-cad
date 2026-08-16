## Context

The existing `cad-workspace` capability mixes shared Worker/generation lifecycle
rules with route and control requirements for many independent components. The
component specs already own the corresponding geometry and parameter contracts,
but the workspace file still contains the integration behavior. See
`proposal.md` for the motivation. This change is documentation-only and must not
rename any model, route, build key, persistence key, asset, or Worker directory.

## Goals / Non-Goals

**Goals:**

- Establish one normative spec owner for each observable behavior.
- Keep generic lifecycle requirements in `cad-workspace`.
- Place component route/control/validation/preview/export integration beside the
  matching component contract.
- Preserve the exact moved scenarios, identifiers, and traceability links.
- Make a future component addition follow the same ownership matrix.

**Non-Goals:**

- No TypeScript, UI, Worker, CAD-kernel, test, or package changes.
- No model catalog redesign and no runtime validation changes.
- No renaming of existing OpenGrid identifiers; all existing OpenGrid paths and
  directories remain lowercase `opengrid-<component-slug>` where applicable.

## Decisions

### 1. Move complete requirement blocks, not individual sentences

Each migrated requirement is copied from `cad-workspace` with all of its
scenarios intact, then removed from the source. This avoids silently dropping
acceptance criteria and makes the resulting diff reviewable. The new delta specs
use `ADDED` requirements because the target component documents gain ownership;
the `cad-workspace` delta records the old blocks as `REMOVED` with migrations.

### 2. Use the existing capability paths

The ownership map is:

| Behavior | Normative owner |
| --- | --- |
| browser/Worker boundary, generations, candidate commit, viewport, export gates, progress, recovery | `cad-workspace` |
| baseline catalog registration, route locking, box/grid controls, baseline validation ranges | `cad-component-catalog` |
| HSW route and integration | `hsw-cell` |
| OpenGrid board route, controls, persistence, lifecycle | `opengrid-generator` |
| Snap route, controls, lifecycle | `opengrid-snap` |
| board half-cell controls | `opengrid-half-cell` |
| divider route and lifecycle | `opengrid-divider-generator` |
| pillar route and lifecycle | `opengrid-pillar-generator` |
| stackable-box route and lifecycle | `opengrid-stackable-box` |
| stackable-cylinder route and lifecycle | `opengrid-stackable-cylinder` |
| Open Shelf route and lifecycle | `opengrid-open-shelf` |
| Desk/Wall context initialization, reset, labels | `opengrid-system-entry-context` |
| shared locating-seat wording | `opengrid-locating-assembly-interface` |
| honeycomb render warning | `cad-render-performance-warning` |

Existing component specs are extended in place; no new OpenGrid model capability
is invented. The only new path is cross-component and therefore does not receive
an `opengrid-` model ID or directory.

### 3. Keep cross-cutting behavior separate from both workspace and geometry

The locating-seat description is shared by stackable products, so it moves to the
existing locating/assembly interface capability rather than being duplicated in
two product specs. The honeycomb warning is presentation behavior spanning three
products, so it gets a small dedicated capability instead of becoming a generic
CAD lifecycle rule.

### 4. Reconcile extracted integration text with canonical component contracts

Some older workspace wording described stale parameter shapes. The moved Snap
integration now uses the canonical `footprint=full|half|quarter` contract and its
fixed Half/Quarter assets; the moved Pillar integration now uses the canonical
shared `offset` and keeps the model centered instead of translating it. These are
documentation corrections to the already-existing component contracts, not new
runtime behavior or compatibility migrations.

### 5. Treat archive synchronization as a documentation merge

After implementation, compare every delta with its main spec, verify that removed
blocks are absent and added blocks are present exactly once, then archive the
change. The archive contains the proposal/design/spec deltas/tasks for historical
traceability; no generated runtime artifact is involved.

## Risks / Trade-offs

- **[Risk]** A requirement is copied to the wrong component or duplicated. →
  Use the ownership matrix and an automated heading/count check before review.
- **[Risk]** A future change edits `cad-workspace` for a component-only rule. →
  Keep the new normative-owner requirement and require the component spec in the
  change proposal.
- **[Risk]** Large documentation diff hides an accidental wording change. →
  Move complete blocks, run `git diff --check`, and compare requirement/scenario
  headings before and after.
- **[Risk]** OpenSpec archive tooling does not infer a manual removal. →
  Perform the sync agent-side, verify each delta against the main spec, and stop
  before archive if any block is missing or duplicated.

## Migration Plan

1. Validate the proposal, all delta specs, and the ownership matrix.
2. Apply the documentation move and run heading/count checks plus strict OpenSpec
   validation.
3. Run the independent compliance review; resolve any missing or duplicate
   requirement ownership.
4. Sync the verified deltas into the main specs and archive the completed change.
5. Publish the documentation-only branch as a draft PR targeting `main`.

Rollback is a Git revert of the documentation commit; runtime behavior and stored
identifiers are unaffected.
