---
name: tdd-task
description: >-
  Use when implementing a unit of code test-first via red-green-refactor.
  Triggers on: "TDD this", "write the test first", "drive this with tests",
  "do this test-first". Loops one failing unit test -> minimal pass -> refactor
  until the unit is done. Unit-level only; not for acceptance/spec-level tests.
version: 1.0.0
---

# TDD Task

Build one small unit of behaviour test-first, in tight red-green-refactor loops.
Scope is **unit level**: a single function, method, or class — not end-to-end or
spec/acceptance tests.

## Inputs

- The behaviour to implement, stated as a single testable unit (e.g. "parse a
  duration string into seconds"). If it's larger than one unit, split it into a
  list of units and TDD them one at a time.

## The loop

Repeat for each unit of behaviour until the input is fully covered:

1. **RED — write one failing test.** Add the smallest test that asserts the next
   missing behaviour. Name it for the behaviour, not the implementation.
2. **Run the test and confirm it fails** for the expected reason (assertion, not
   a typo or import error). A test that passes immediately, or fails for the
   wrong reason, isn't a valid red — fix it first.
3. **GREEN — make it pass with the least code.** Write only enough production
   code to satisfy the failing test. Don't add behaviour no test demands yet.
4. **Run the full test suite** for the stack (`dotnet test` for .NET, `ng test` for
   Angular — see Commands in `AGENTS.md`) and confirm everything is green.
5. **REFACTOR — clean up under green.** Remove duplication, improve names, and
   tidy structure in both test and production code. Re-run the suite after each
   change; it must stay green. Apply the `arch-check` standards here (e.g.
   containerize the executable) so the unit lands compliant, not retrofitted.
6. **Next unit:** pick the next missing behaviour and return to step 1.

## Steps

1. Restate the unit and list its behaviours/edge cases (happy path, boundaries,
   error cases) as a short checklist.
2. Run the **loop** above, taking one checklist item per red-green-refactor cycle.
3. When the checklist is empty, run the stack's lint/format and test commands once
   more (see Commands in `AGENTS.md`), then report: tests added, behaviours covered,
   and any item deliberately left out.

## Notes

- One assertion of intent per test where practical; one new failing test per
  cycle — don't write several reds at once.
- Test files mirror the unit under test and follow each stack's test layout
  (.NET test project alongside the solution; Angular `.spec.ts` next to the unit).
  Naming follows the per-language conventions in `AGENTS.md`.
- Never edit production code without a failing test driving the change. If you
  spot an unrelated bug, write a red for it first.
- Keep tests fast and isolated — no network, no shared mutable state between
  tests.
- Acceptance / spec-by-example coverage is out of scope here; capture those with
  `spec-task` and treat them as a separate ATDD layer.
