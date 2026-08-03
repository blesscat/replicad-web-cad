---
name: openspec-apply-review
description: Use when implementing an OpenSpec change where completion requires independent compliance review against proposal, specs, design, tasks, or acceptance criteria.
compatibility: Requires openspec CLI and subagent support.
---

# OpenSpec Apply Review

Implement an OpenSpec change, then require a read-only subagent to review whether the completed behavior matches the OpenSpec artifacts before claiming final completion.

## Input

Accept the same optional change name as `openspec-apply-change`.

## Workflow

1. **Apply first**
   - Use the `openspec-apply-change` skill with the same change argument.
   - Let that skill select the change, read context files, implement tasks, verify as appropriate, and mark completed tasks.
   - If apply pauses, is blocked, or leaves pending tasks, stop and report the apply status. Do not dispatch review yet.

2. **Confirm completion**
   - Run:
     ```bash
     openspec instructions apply --change "<name>" --json
     ```
   - Proceed only when the returned state is `all_done` or progress shows all tasks complete.
   - Capture review scope with `git status --short` and `git diff --name-only`.

3. **Dispatch a compliance reviewer**
   - Spawn one read-only subagent after implementation is complete.
   - Give the reviewer the change name, `contextFiles` from the CLI output, completed task summary, changed files or diff scope, and verification already run.
   - The reviewer must inspect the OpenSpec artifacts and implementation, but must not edit files.

   Reviewer prompt:

   ```text
   Review the completed OpenSpec change: <name>.

   Context:
   - You are not alone in the codebase.
   - Do not edit files. Return findings only.
   - Read these OpenSpec context files: <contextFiles>.
   - Inspect this changed-file or diff scope: <changedFiles>.

   Review lens:
   Does the implemented behavior satisfy the proposal, specs, design, tasks, and acceptance criteria?

   Return:
   - Verdict: compliant / non-compliant / needs-discussion
   - Findings ordered by severity, with file/line evidence and the artifact requirement violated
   - Missing or weak tests
   - Verification gaps

   If there are no substantive issues, say that clearly and list residual risks.
   ```

4. **Integrate review**
   - Verify reviewer findings locally; do not accept them blindly.
   - For valid compliance issues, fix them in the primary agent using normal project guardrails, then run targeted verification.
   - If fixes materially change behavior, rerun the compliance review or explain why it is not needed.
   - If no blocking findings remain, report apply status, reviewer verdict, and verification results.

## Guardrails

- Do not spawn review before all apply tasks are complete.
- Keep the reviewer read-only; the primary agent owns judgment, edits, and verification.
- Do not claim the change is ready to archive until review has no blocking compliance findings, or remaining findings are explicitly reported with rationale.
- If reviewer feedback conflicts with OpenSpec artifacts, the artifacts win.
- If OpenSpec artifacts are ambiguous, pause and ask before changing behavior.
- Preserve unrelated user changes.
- If subagents are unavailable, report that this skill's review step cannot be satisfied; do not silently replace it with local-only review.
