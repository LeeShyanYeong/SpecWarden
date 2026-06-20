---
name: brainstorm-task
description: >-
  Use when a raw idea is too large for one feature and needs splitting before
  speccing. Triggers on: "this is a big idea", "break this into features",
  "what features does this need?", or when spec-task's size gate hands off here.
  Decomposes the idea into one stub .feature file per feature — it does NOT write
  scenarios (use spec-task).
version: 1.0.0
---

# Brainstorm Task

Split a too-large idea into its constituent features, and persist each as a **stub Gherkin feature
file** under `specs/`. The output is one `.feature` per feature — not a markdown list, not an index.
Each stub is self-guarding: the architecture lane's **SPEC-1** guard
(`tests/architecture/SpecHygieneStandards.cs`) fails the build while any spec is a stub, so the
backlog can never silently drift — and no stub can reach a green build until `spec-task` fills it in.

This is the optional decomposition stage of the pipeline, reached only for large ideas:
`user-story-task` → `brainstorm-task` → `spec-task` (×N). Decide *how many features* here; leave
*what each one does* to `spec-task`.

## Inputs

- A large idea — one that spans multiple actors or capabilities that could ship independently —
  given **either** as inline text **or** as a path to a story file (`stories/<name>.md` from
  `user-story-task`). Often handed off from `spec-task`'s size gate.

## Steps

1. **Confirm it's actually large.** If the idea is one actor + one capability, **stop and go
   straight to `spec-task`** — do not create a single stub for a small idea. Only continue when the
   idea genuinely holds two or more independently shippable features.
2. **Decompose by asking, not assuming.** Ask focused questions until the seams are clear. A feature
   is its own stub when it has a distinct actor *or* a capability that could ship on its own. Watch
   for false splits (two views of one capability) and false merges (one stub doing two jobs).
3. **Name each feature** in `lowercase-kebab-case`, one cohesive capability each. Capture for each:
   the seed sentence, its siblings, and why it was carved out this way.
4. **Write one stub per feature** to `specs/<feature>.feature` (creating `specs/` if needed), using
   the next-free filename, in this exact format:

```gherkin
# Status: Stub | Story: <name> | Source: stories/<name>.md | Author: <name> | Created: <YYYY-MM-DD>
#
# Carved out of "<parent idea or story title>" on <YYYY-MM-DD>.
# Siblings: <other feature names from this brainstorm>.
# Seed: As a <actor>, I want <capability> so that <value>.
# Not yet specified — run spec-task to fill in scenarios.

Feature: <feature title>

  @unspecified
  Scenario: specification pending
    Given this feature has not been specified
    Then the build should flag it as unspecified
```

5. **Report** the stub paths created and a one-line summary of the split. Offer `spec-task` on the
   first stub as the next step. Do not write real scenarios or plan steps here.

## Notes

- Decomposition only — no scenarios and no code. Scenarios are `spec-task`'s job.
- **Story / Source fields are file-mode only.** When the input is a story file from
  `user-story-task`, stamp `# Story: <name> | Source: stories/<name>.md` onto every stub so the epic
  is queryable with `grep "# Story: <name>" specs/`. When the input is plain inline text, omit both
  fields — that is the existing behavior, unchanged.
- One stub per feature, mirroring "one feature per file" in `spec-task` and "one block per task" in
  `TODO.md`. There is no separate index file: `grep "# Status: Stub" specs/` is the backlog.
- A stub carries no level tag, so neither acceptance lane runs it; the architecture lane's **SPEC-1**
  guard (`tests/architecture/SpecHygieneStandards.cs`) is what fails the build on a stub — on both
  the `@unspecified` scenario and the `# Status: Stub` header. `spec-task` clears both when it writes
  real scenarios and flips `# Status: Stub` → `# Status: Draft`.
- Status lifecycle across the pipeline: `Stub` (here) → `Draft` (`spec-task`) → `Ready` (spec
  reviewed). Read it from the `# Status:` header; never track state in a separate `.md`.
