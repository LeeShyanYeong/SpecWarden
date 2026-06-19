---
name: code-review
description: >-
  Use when reviewing a code change — a diff, a pull request, or staged work —
  to find bugs, security issues, and style problems before it merges.
  Triggers on: "review this PR", "check my diff", "is this safe to merge?".
version: 1.0.0
---

# Code Review

## Inputs

- The diff or PR to review (diff, PR URL, or current working-tree changes).
- Base branch to compare against (default: `main`).

## Steps

1. **Get the diff.** Fetch the full diff with enough surrounding context to understand each change.
2. **Check correctness.** Look for logic bugs, off-by-ones, unhandled nulls, and edge cases.
3. **Check security.** Look for injection risks, hardcoded secrets, missing auth checks, and unescaped output.
4. **Check error handling.** Errors should surface useful messages; resources must be released on all paths.
5. **Check tests.** New behavior should have coverage; bug fixes should include a regression test.
   Per the implementation policy, behaviour code is expected to be test-first (`tdd-task`).
6. **Check architecture.** Run `arch-check` against the change; any failing standard is a Blocker.
7. **Check style.** Follows `AGENTS.md` conventions; no copy-paste duplication; names describe intent.

Classify each finding:
- **Blocker** — must fix before merge (bug, security hole, data loss).
- **Should-fix** — important but not blocking (missing test, unclear error).
- **Nit** — optional style/readability suggestion.

## Output

```
## Code review: <subject>

**Summary:** <1–2 sentences + merge recommendation>

### Blockers
- <file:line> — <issue> — <suggested fix>

### Should-fix
- <file:line> — <issue> — <suggested fix>

### Nits
- <file:line> — <issue>

**Verdict:** Approve / Approve with changes / Request changes
```

Write `_None._` for any section with no findings — so the reader knows it was checked.
