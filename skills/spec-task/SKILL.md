---
name: spec-task
description: >-
  Use when turning a raw idea into a specification by example, before any
  planning or coding. Triggers on: "spec this out", "brainstorm a feature",
  "write the requirements", "what should this do?". Brainstorms with the user
  and persists a Cucumber-compatible spec to specs/<feature>.feature — it does
  NOT write code (use atdd-task / tdd-task).
version: 1.1.0
---

# Spec Task

Turn a raw idea into a **specification by example** — concrete, testable scenarios for both
functional and non-functional requirements — and persist it to `specs/<feature>.feature`.

The output is a valid **Gherkin feature file**: Cucumber (or any BDD runner) will parse it
immediately. Unimplemented step definitions cause the build to fail, giving you a free
"spec not yet built" enforcement gate.

This is the speccing stage of the pipeline: `user-story-task` (optional) → `brainstorm-task` (large
ideas only) → `spec-task` → implementation (`atdd-task` for acceptance scenarios, `tdd-task` for the
units beneath). Capture *what* and *why* here; leave *how* and *steps* to the implementation skills.

## Inputs

- The idea to specify (a feature, change, or problem described in plain language).

## Steps

1. **Size gate — one feature, or many?** Restate the idea as one sentence: *"As a `<actor>`, I want
   `<capability>` so that `<value>`."* If it fits one actor + one capability, continue. If it is
   really several features (multiple actors, or capabilities that could ship independently), **stop
   and hand off to `brainstorm-task`** to decompose it into stub feature files — do not spec the
   first one arbitrarily. Resume this skill per stub once the stubs exist.
   - **Resuming on a stub?** If `specs/<feature>.feature` already exists with `# Status: Stub`, read
     its header comments as the seed idea, then in step 6 **replace** the placeholder
     `@unspecified` scenario with real scenarios and flip the header to `# Status: Draft`. The
     finished file must contain **no** `@unspecified` scenario and must **not** say `# Status: Stub`
     — the **SPEC-1** guard (`tests/architecture/SpecHygieneStandards.cs`) fails the build until both
     are gone.
2. **Brainstorm by asking, not assuming.** Ask focused questions until you can write testable
   examples. Cover at least: actors/personas, the trigger, the happy path, edge cases, failure
   modes, and what is explicitly **out of scope**. Stop asking once the scenarios are unambiguous.
3. **Write functional scenarios, tagged by level.** Use standard Gherkin `Given / When / Then / And`
   steps. Include the happy path, important edge cases, and at least one failure scenario (tag those
   `@failure`). Tag **every** scenario with the one level it is honestly verifiable at — this routes
   it to the runner that owns that level:

   | Level tag | Runner | For behaviour that… |
   |---|---|---|
   | `@api` | Reqnroll | is a REST/contract concern — speak HTTP |
   | `@component` | Playwright (stubbed UI) | is client-side UX — speak the page, backend stubbed |
   | `@e2e` | Playwright (live UI) | proves the seam — a thin full-stack smoke |

   A behaviour is only verifiable where its logic actually runs (e.g. arithmetic correctness belongs
   at `@api`, not against a stub). Each level uses its own honest vocabulary; keep steps declarative.
4. **Write non-functional requirements as scenarios.** For each relevant quality attribute
   (performance, security, reliability, usability…), write:
   - an **EARS** statement in a `#` comment above the scenario — *"When `<trigger>`, the `<system>`
     shall `<response>`."*, and
   - a Gherkin scenario tagged `@nfr @<attribute>` with a measurable `Then` step (a real number or
     observable condition). Skip attributes that don't apply; never invent targets — log unknowns
     as open questions. `@nfr` scenarios can be excluded from the standard test run and wired to
     custom steps later.
5. **Capture gaps.** Record *Out of scope* items and *Open questions* as `#` comments in the file
   header. These are not Gherkin and will not be parsed by the runner.
6. **Persist** to `specs/<feature>.feature` (`lowercase-kebab-case` filename), creating the
   `specs/` folder if needed, in this exact format:

```gherkin
# Status: Draft | Author: <name> | Created: <YYYY-MM-DD>
#
# Out of scope:
#   - <thing this spec deliberately does not cover>
#
# Open questions:
#   - <unresolved question or assumption to confirm>

Feature: <feature title>
  As a <actor>
  I want <capability>
  So that <value>

  # One vertical slice; each scenario carries the single level it is verified at.
  # Use only the levels that apply — many slices need just one or two.

  @api
  Scenario: <happy-path REST contract>
    When <request>
    Then <expected response>

  @component
  Scenario: <client-side UX behaviour, backend stubbed>
    Given <the page is open>
    When <user action>
    Then <what the user sees>

  @e2e
  Scenario: <thin full-stack smoke>
    Given <the page is open>
    When <user action>
    Then <result produced by the real backend>

  @api @failure
  Scenario: <failure name>
    When <action>
    Then <error outcome>

  # EARS: When <trigger>, the <system> shall <response>.
  @nfr @<attribute>
  Scenario: <NFR name>
    Given <environment>
    When <stimulus>
    Then <response with measurable target>
```

7. **Report** the spec path and a one-line summary. Offer `atdd-task` as the next step. Do not
   implement here.

## Notes

- Spec only — no code. Splitting a large idea into separate features is `brainstorm-task`'s job.
  This skill writes scenarios for exactly one feature.
- Never author a `@unspecified` scenario or a `# Status: Stub` header yourself — that stub device
  belongs to `brainstorm-task`. A spec this skill produces is always `# Status: Draft` with real,
  bound scenarios; the **SPEC-1** architecture guard enforces this.
- `atdd-task` reads `specs/<feature>.feature` to implement its `@api` scenarios.
- Examples must be concrete and testable. "Fast", "secure", "scalable" are not requirements until
  they have a number or an observable condition.
- One feature per file under `specs/`, mirroring how `TODO.md` holds one block per task.
- A `Background:` block can hold preconditions shared by all scenarios — but only when every
  scenario in the file runs on the **same** runner. When a story spans levels (`@api` plus
  `@e2e`/`@component`), the runners differ, so give each scenario its own `Given` rather than a
  file-wide `Background` the other runner can't bind.
- `@nfr` scenarios are valid Gherkin but typically wired to separate performance/security step
  definitions or excluded via tag filters (`--tags "not @nfr"`) during standard CI runs.
