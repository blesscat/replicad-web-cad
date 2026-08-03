---
name: codex-review
description: Review diffs, branches, or PRs for security, correctness, tests, and maintainability.
---

# Codex Review Skill

## Purpose
Stabilize the review process so Codex checks changes in a consistent way every time.

## When to use
- PR review
- branch review
- uncommitted diff review
- when you want a quick code review pass first

## Main steps
1. Read the diff scope first
2. Identify changed files and risk areas
3. Check:
   - security
   - correctness
   - error handling
   - tests
   - maintainability
4. If the diff is too large, recommend splitting it
5. Keep the output categorized so it is easy to scan

## Suggested output format
- Summary
- Critical Issues
- Suggestions
- Questions

## Review focus
- Did it break existing behavior?
- Are tests missing?
- Any hard-coded secrets or sensitive data?
- Any unnecessary complexity?
- Any violation of project conventions?

## Style requirements
- Use concrete file or function names when describing issues
- Do not say only “there may be a problem”
- Offer a fix direction, not just criticism

## Extensibility
If you later want multiple review layers, split this into:
- security review
- test review
- architecture review
- performance review
