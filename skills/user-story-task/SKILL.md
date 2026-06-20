---
name: user-story-task
description: >-
  Use when capturing a raw need as a user story before any speccing or
  decomposition. Triggers on: "write a user story", "capture this as a story",
  "create a story file", "start a story". Persists stories/<name>.md (narrative +
  acceptance criteria) — it does NOT do specification by example / Gherkin (use
  spec-task) or split into features (use brainstorm-task).
version: 1.0.0
---

# User Story Task

Turn a raw need into a **user story** captured as `stories/<name>.md`: a
narrative, the rules (acceptance criteria) it must satisfy, and the open
questions. This is a **planning artifact** — not runner-guarded, not Gherkin, no
code. It is the seed that `brainstorm-task` decomposes (an epic → many features)
or `spec-task` specifies directly (a single feature).

This is the front of the pipeline:
`user-story-task` → `brainstorm-task` (epics only) → `spec-task` (×N) →
implementation (`atdd-task` / `tdd-task`).

## Boundary with `spec-task` (important — do not duplicate the SSOT)

This story captures **intent only** — narrative and acceptance criteria.
**Specification by example is `spec-task`'s exclusive job**: it turns these rules
into formal, level-tagged **Gherkin** scenarios in `specs/<feature>.feature`, and
**those `.feature` files are the runner-guarded single source of truth**. Do
**not** enumerate concrete examples or Gherkin (`@tags`, `Given/When/Then` step
syntax) here — that would create a second, drifting copy of the truth. Capture
*what* and *why*; leave the testable examples to `spec-task`.

## Inputs

- The need/idea in plain language (a feature request, a problem, a goal).

## Steps

**Guiding principle: interrogate, don't transcribe.** Do not write the story from
the user's first description. Grill the idea first — ask pointed questions in
focused rounds, challenge every vague or untestable answer, and surface hidden
assumptions. Never invent an answer to move on; if something is unknown, log it
as an open question. Only persist (step 5) once the answers hold up.

1. **Interrogate the idea.** Ask until each dimension below is concrete. Push
   back on hand-wavy answers ("users", "fast", "easy", "etc.") and ask for the
   specific actor, number, or case. Prefer one focused round at a time over a
   single wall of questions:
   - **Actor** — *who* exactly, and why them and not an adjacent role? Reject the
     generic "user."
   - **Value** — what changes for them if this ships? If you removed the story,
     what breaks? Challenge a "so that" that just restates the capability.
   - **Trigger & frequency** — what starts this, how often, how many at a time?
   - **Happy path** — the single most common successful flow, end to end.
   - **Edge cases & failure modes** — empty/zero/max inputs, conflicts,
     permissions, what happens when it goes wrong, and what the user should see.
   - **Boundaries** — what is explicitly *out of scope* for this story?
   - **Constraints / quality attributes** — performance, security, data, scale,
     compliance the story must respect (kept as constraints, not NFR scenarios).
   - **Done-ness** — how will we *observe* this is complete? If a rule can't be
     observed, it isn't a rule yet.
   Stop interrogating only when you could hand the answers to `spec-task` and it
   could write unambiguous scenarios without guessing.
2. **Frame the narrative.** From the answers, restate it as *"As a `<role>`, I
   want `<capability>` so that `<value>`."* If you still cannot name a concrete
   role, capability, and value, you are not done interrogating — return to step 1.
3. **Write the rules (acceptance criteria).** List the observable outcomes that
   must hold for the story to be done, as bullets. Each must be testable in
   principle. These are plain statements, **not** Gherkin steps.
4. **Capture gaps.** Record *Out of scope* items and *Open questions* /
   assumptions to confirm — including everything the interrogation left unresolved.
5. **Size hint.** Note whether this looks like **one feature** (→ recommend
   `spec-task` next) or an **epic** spanning several independently-shippable
   features (→ recommend `brainstorm-task` next). Do not decompose here.
6. **Persist** to `stories/<name>.md` (`lowercase-kebab-case` filename),
   creating `stories/` if needed, in this exact format:

```markdown
# Story: <title>

**Status:** Draft · **Author:** <name> · **Created:** <YYYY-MM-DD>

## Narrative

As a <role>, I want <capability>, so that <value>.

## Context

<the problem this solves / why it matters>

## Rules (acceptance criteria)

- <observable outcome that must hold>

## Out of scope

- <thing this story deliberately does not cover>

## Open questions

- <unresolved question or assumption to confirm>
```

7. **Report** the story path and a one-line summary, then recommend the next
   step: `brainstorm-task <path>` for an epic, or `spec-task` for one feature.
   Do not decompose, spec, or implement here.

## Notes

- Story only — no Gherkin scenarios (`spec-task`'s job), no feature
  decomposition (`brainstorm-task`'s job), no code.
- **Interrogate, don't transcribe.** A first description is a starting point, not
  the story. Grill it (step 1) until the actor, value, edges, and done-ness are
  concrete — a thin or assumed story just pushes the ambiguity downstream to
  `spec-task`. When in doubt, ask one more question rather than guess.
- **Not runner-guarded.** The SSOT is the `.feature` files under `specs/`; this
  file stays under `stories/` as planning input. Never let this story harden into
  the test of record — `spec-task` owns specification by example and the
  executable contract.
- `brainstorm-task` reads `stories/<name>.md` as its story-file input and stamps
  `# Story:` / `# Source:` onto each feature stub it creates, so the whole epic
  is queryable with `grep "# Story: <name>" specs/`.
- One story per file under `stories/`, mirroring one feature per file under
  `specs/` and one block per task in `TODO.md`.
