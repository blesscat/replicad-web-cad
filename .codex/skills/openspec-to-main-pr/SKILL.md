---
name: openspec-to-main-pr
description: Continue a completed OpenSpec exploration all the way through proposal generation, implementation, independent compliance review, commit, push, and a pull request targeting main. Use when the user says an openspec-explore discussion is complete and wants the full propose → apply-review → create-pr workflow run in one pass.
---

# OpenSpec to Main PR

Run the complete delivery workflow after the user has finished exploring an idea with
`openspec-explore`. Keep the phases ordered and do not open a PR until the OpenSpec
artifacts, implementation tasks, compliance review, and validation are complete.

The final operation creates a pull request **from the working branch into `main`**. It
does not merge the pull request or push directly to `main`.

## Operating rules

- Treat the completed `openspec-explore` conversation as the source of intent. Do not
  restart exploration unless the requirements are still materially unclear.
- Run the existing skills in this order:
  1. `$openspec-propose`
  2. `$openspec-apply-review` (which includes `$openspec-apply-change`)
  3. `create-pr` targeting `main`
- Continue through all non-blocked phases without asking the user to manually invoke
  the next skill.
- Preserve unrelated user changes. Never use `git add -A` when the worktree contains
  changes whose ownership or scope is unclear.
- Stop and report the blocker when a required artifact, implementation task, review,
  test, GitHub authentication, remote, or branch scope cannot be safely resolved.
- Do not archive the OpenSpec change as part of this workflow unless the user asks for
  archiving separately.

## 1. Establish the change and preflight

Use the requirement and decisions already established in the exploration conversation.
Derive a concise kebab-case change name when one was not supplied.

Before writing or implementing anything:

1. Inspect the repository state with `git status -sb` and identify the current branch.
2. Run `openspec list --json` to discover active changes. If the project uses a named
   OpenSpec store, run `openspec store list --json` first and carry the selected
   `--store` value through every applicable OpenSpec command.
3. Read the resolved OpenSpec project context from `openspec/config.yaml` or
   `config.yml` when present. Treat it as constraints, not text to copy into artifacts.
4. If a matching active change already exists, inspect its status and artifacts before
   creating anything. Do not create a duplicate change or overwrite an existing one.
   Continue with that change only when its intent clearly matches the completed
   exploration; otherwise stop and ask which change to use.
5. If there is no usable requirement or change name in the conversation, ask for the
   missing description before proceeding.

The exploration phase must be over before implementation starts. If the user is still
brainstorming, remain in `$openspec-explore` instead of running this workflow.

## 2. Generate the OpenSpec proposal

Invoke `$openspec-propose` with the change name and the consolidated exploration
outcome. Let that skill use the CLI's schema and artifact instructions; do not invent
artifact paths or skip required artifacts.

Require the proposal phase to:

- create every artifact transitively required for apply, not just `tasks.md`;
- read each dependency artifact before creating the next artifact;
- honor the project's context and artifact-specific rules without copying them into
  the output; and
- verify the resulting `openspec status --change "<name>"` before implementation.

If the active change already has some artifacts from exploration, have
`openspec-propose` complete the missing required artifacts without duplicating or
discarding existing work.

Do not continue while the proposal is incomplete, the change is ambiguous, or the
OpenSpec CLI reports a blocked required artifact.

## 3. Implement and independently review

Invoke `$openspec-apply-review` for the same change name. This must run the normal
`$openspec-apply-change` implementation flow first and then dispatch a read-only
compliance reviewer.

Require the apply/review phase to:

- read all `contextFiles` returned by `openspec instructions apply --change
  "<name>" --json`;
- implement every pending task and mark each completed task in the tasks artifact;
- run the most relevant project tests, checks, or build commands;
- confirm the apply state is `all_done` (or that all tasks are complete) before review;
- give the reviewer the OpenSpec context files, changed-file/diff scope, completed task
  summary, and verification results;
- keep the reviewer read-only; and
- verify and fix valid findings in the primary worktree, then rerun targeted checks and
  the compliance review when a material behavior change was made.

Do not create a PR when the reviewer reports a blocking or unresolved compliance issue.
Do not replace the required independent review with a local-only review if subagent
support is unavailable; report that the workflow is blocked.

Before publishing, capture:

- the final OpenSpec apply status;
- the reviewer verdict and any residual risks;
- the changed-file scope; and
- the exact validation commands and results.

## 4. Commit, push, and create the PR to `main`

Only enter this phase after apply is complete, review has no blocking findings, and
validation has passed or any non-blocking limitation is explicitly understood.

Use the GitHub publish workflow from `$yeet` when available for branch, commit, push,
and PR safety rules. The PR target is always `main`, even when the repository's default
branch differs.

1. Recheck `git status -sb`, `git diff --stat`, and the intended changed-file list.
2. If currently on `main` (or another default branch), create a focused working branch
   using the repository's publish convention, such as `agent/<description>`. If already
   on a focused feature branch, keep it.
3. Stage only files belonging to this OpenSpec change. If unrelated changes are mixed
   in and cannot be separated safely, stop and ask the user to identify the scope.
4. Run relevant checks again if implementation or review fixes changed files after the
   earlier validation.
5. Commit with a terse description of the change.
6. Push the current branch with tracking to `origin`.
7. Invoke the available `create-pr` action/tool with:
   - base/target branch: `main`;
   - head/source branch: the pushed current branch;
   - repository: the repository resolved from `origin`;
   - title: a concise summary of the complete diff; and
   - body: what changed, why, user/developer impact, OpenSpec change name, review
     verdict, and validation results.

If a dedicated `create-pr` action is not available, use the GitHub connector's
`github_create_pull_request` with the same repository, `head`, `base: "main"`, title,
body, and draft setting. If the connector cannot resolve the repository or branch,
fall back to `gh pr create` after confirming `gh auth status`. Follow the existing
publish policy and create a draft PR unless the user explicitly asks for a ready-for-
review PR.

Never claim success until the PR creation response includes a URL or an equivalent
stable PR identifier. Do not merge it, resolve reviews, or modify `main` directly.

## Completion report

Report the full outcome in one concise handoff:

- OpenSpec change name and final artifact/apply status;
- implementation and compliance-review verdict;
- validation commands and results;
- branch, commit, and PR URL/number; and
- any residual risk or follow-up needed before merge.

If the workflow stops, report the last completed phase, exact blocker, and the smallest
next action needed to resume. Do not present a partial run as a completed PR workflow.
