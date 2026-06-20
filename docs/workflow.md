# Workflow

The single-agent path from a raw idea to merged code. SpecWarden's skills (`skills/`)
are plain-Markdown playbooks; each does one job and hands off to the next. The point of
the chain is that **the spec is written and frozen before any code is, so the agent
implements against a fixed contract instead of an ambiguous brief.**

## The loop

```
raw need
   │
   ▼
user-story-task ──► stories/<name>.md        (narrative + acceptance criteria; intent only)
   │
   ▼
[ too big? ] ──► brainstorm-task ──► specs/<name>.feature  (one STUB per feature)
   │  no                                   │ each stub: @unspecified + "# Status: Stub"
   ▼                                       ▼  (SPEC-1 keeps CI red until specced)
spec-task ──────────────────────────► specs/<name>.feature (real, level-tagged scenarios)
   │                                      "# Status: Draft"
   ▼
atdd-task  ──► acceptance scenarios pass   (drive @api/@component/@e2e red → green)
   │  └─ tdd-task for each unit underneath  (unit red → green → refactor)
   ▼
arch-check ──► structure guard stays green
   │
   ▼
code-review ──► safe to merge
```

## Stage by stage

| Stage | Skill              | Input → Output                                       | Guard touched           |
| ----- | ------------------ | ---------------------------------------------------- | ----------------------- |
| 1     | `user-story-task`  | a raw need → `stories/<name>.md`                     | none (planning artifact) |
| 2     | `brainstorm-task`  | a too-large idea → one **stub** `.feature` per feature | SPEC-1 (stubs keep CI red) |
| 3     | `spec-task`        | a story → `specs/<name>.feature` with real, tagged scenarios | the behaviour SSOT |
| 4     | `atdd-task`        | a `.feature` → passing acceptance scenarios          | Reqnroll / Playwright   |
| 4a    | `tdd-task`         | a unit of code, test-first (red → green → refactor)  | unit tests              |
| 5     | `arch-check`       | a change → confirmed against ARCH-* standards        | the structure guard     |
| 6     | `code-review`      | a diff/PR → reviewed for bugs, security, style       | (gate before merge)     |
| —     | `bootstrap`        | fresh clone / missing deps → working toolchain       | n/a                     |

## Why this order matters

- **`stories/` is intent, `specs/` is contract.** A story is prose a human signs off on;
  a spec is the executable form a runner enforces. Keeping them separate means the
  human-facing "why" and the machine-facing "what" can each be reviewed on their own terms.
- **Brainstorm produces failing stubs on purpose.** A stub with `@unspecified` and
  `# Status: Stub` has no level tag, so no acceptance lane runs it — and `SPEC-1` turns that
  into a red build. You physically cannot forget to spec a feature you decomposed.
- **Spec before code.** `atdd-task` and `tdd-task` only ever make a *failing* test pass.
  Because the spec is frozen first, "done" is defined by the contract, not by the agent's
  judgement — which is the whole defence against an agent confidently building the wrong thing.
- **Two test altitudes.** `atdd-task` drives behaviour from the `.feature` (acceptance level);
  `tdd-task` drives the units underneath (unit level). Use ATDD to make a scenario green and
  TDD for the logic each step needs.

## Implementation policy (enforced at review)

These apply to all code that implements behaviour (not boilerplate, scaffolding, generated
files, or throwaway spikes):

- **Test-first** — no production behaviour without a failing test driving it (`tdd-task`).
- **Architecture standards** — every change satisfies `arch-check`; a failing standard is a
  merge blocker.
- **At review** — `code-review` checks both before merge.

See [AGENTS.md](../AGENTS.md) for the canonical statement of this policy and the per-stack
command tables.
