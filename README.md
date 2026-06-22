# SpecWarden

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-alpha-orange)
![Release](https://img.shields.io/github/v/release/LeeShyanYeong/SpecWarden?include_prereleases)

> **Most of today's spec-driven tools for AI agents keep the spec as Markdown and trust the model to re-read it every run. SpecWarden wires the spec to test runners, so a deterministic pass/fail gate decides when a slice is done, not the agent.** The agent can fail *incomplete*. It cannot finish *confidently wrong*.

That difference is the whole point. A Markdown spec has to be re-interpreted on every run, which leans on a premium model and gives you enforcement that drifts. A spec wired to a runner is checked like any other test: green or red, the same answer every time. A weak model can still fail to finish a slice here, but it cannot quietly pass a wrong implementation off as done.

**SpecWarden is a method first.** At its core is a set of plain-Markdown, stack-neutral [skills](skills/) that walk one agent from idea to merged code against a frozen spec. The repo also ships a working, fully green implementation of that method on **ASP.NET Core + Angular**, so you can run every idea instead of just reading about it. The skills are portable. The .NET and Angular code is the concrete example that grounds them.

Wiring specs to runners is not itself new. Executable specifications (Cucumber, SpecFlow/Reqnroll) have done it in BDD for years. What is new is bringing that discipline into the AI agent loop, where the current crop of spec-driven tools went the other way and left the spec as prose.

**Status:** alpha (`v0.1.0-alpha`). Usable and green via the full local pipeline (`scripts/pipeline.sh`); hosted CI is next. The reference implementation is fixed to .NET + Angular, and the sticky-notes example is still partly baked into the scaffolding. See [Scope & honest limits](#scope--honest-limits) and [The example app](#the-example-app).

## The problem

AI coding agents made writing code fast. They also made it easy to confidently build the wrong thing, drift from the original intent over a long session, or quietly cross an architectural boundary that no unit test would catch. The usual fix is to orchestrate several agents: a coordinator, some implementors, a verifier. That curbs drift, but it multiplies token spend, because every sub-agent re-sends and re-processes its own copy of the context.

SpecWarden takes the opposite bet:

- **One spec, readable by humans and machines.** A `.feature` file is both the requirement doc and the test, so there is nothing to keep in sync.
- **One agent, tightly scoped.** A frozen spec constrains what the agent may build, so a single agent with a smaller context window can do the job. No orchestra required.
- **Guards, not vibes.** A Gherkin runner checks behaviour; static architecture rules check structure. The agent does not get to mark its own homework.

## How it works (in one minute)

Every requirement lives as a **single source of truth (SSOT)** artifact, and every SSOT is **runner-guarded**: an always-run executable consumes it on each build, and the build fails when the code drifts from the document. A document that no runner reads is just a wish.

| SSOT artifact             | Guards    | Runner                                                   |
| ------------------------- | --------- | -------------------------------------------------------- |
| `specs/*.feature`         | behaviour | A Gherkin runner (Reqnroll or Playwright-BDD)            |
| `skills/arch-check` rules | structure | An architecture runner (xUnit; filesystem + text checks) |

A feature file is **one vertical slice**. Each scenario carries a **level tag** (`@api`, `@component`, `@e2e`) that routes it to the runner strongest for that level. A bare clone is green, yet a half-finished slice is red: the guards stay dormant until the matching code exists, and a spec stub fails the build until it is filled in.

> **The full model (tag routing, the protocol-driver seam, the dormant-until-present guards, and the CI pipeline) is documented once, canonically, in [docs/architecture.md](docs/architecture.md).** This README is a summary; that doc is the source of truth.

## The agent workflow

SpecWarden ships a set of plain-Markdown **skills** (`skills/`) that walk one agent through a slice from idea to merged code. Each is a focused, vendor-neutral playbook:

| Skill             | Use when…                                                                |
| ----------------- | ------------------------------------------------------------------------ |
| `user-story-task` | capturing a raw need as a user story (`stories/<name>.md`)               |
| `brainstorm-task` | a single idea is too big and needs splitting into one stub per feature   |
| `spec-task`       | turning an idea into a specification by example (`specs/<name>.feature`) |
| `atdd-task`       | implementing a `.feature` test-first at the acceptance level             |
| `tdd-task`        | implementing a unit of code test-first (red → green → refactor)          |
| `arch-check`      | confirming a change satisfies the architecture standards                 |
| `code-review`     | reviewing a diff or PR before it merges                                  |
| `bootstrap`       | setting up a fresh clone or fixing missing/wrong-version system deps     |

The typical path: **story → brainstorm (if large) → spec → atdd/tdd → arch-check → code-review.** See **[docs/workflow.md](docs/workflow.md)** for the end-to-end loop.

## Scope & honest limits

Alpha is the time to be clear about what the guards do and do not buy you:

- **The guard enforces spec↔code fidelity, not spec correctness.** The runner proves the code does what the `.feature` says. It cannot prove the `.feature` says the *right* thing. The agent still authors the scenarios (in `spec-task`), so a confidently-wrong spec will pass its own runner. The defence is human review of the spec, which is exactly why `stories/` (intent a human signs off on) stays separate from `specs/` (the executable contract).
- **It earns its weight on long, autonomous runs.** The loop (story → spec → ATDD/TDD → arch-check → review, across a multi-lane pipeline) pays off when an agent works long and unsupervised and drift is the real risk. For a one-line human change it is overhead. Reach for the full loop when the work is big enough to drift.
- **The reference stack is fixed.** The methodology is stack-neutral, but this implementation is .NET + Angular. Porting the guards elsewhere is straightforward in principle (a Gherkin runner plus a handful of filesystem and text checks), but it is not done yet.
- **The example is partly baked in.** A few scaffolding files still name the sticky-notes example. They are inventoried in [docs/example-app.md](docs/example-app.md) and tracked in [TODO.md](TODO.md).

## Tech stack

- **Backend:** ASP.NET Core (.NET 10, C#). REST API and domain services.
- **Frontend:** Angular (TypeScript), bundled into the API so the two ship as one container on one port.
- **Behaviour guards:** Reqnroll (`@api`) and Playwright-BDD (`@component`, `@e2e`).
- **Structure guard:** xUnit (`tests/architecture/`). ARCH-1/2/3 plus the SPEC-1 stub guard as filesystem/text checks; ARCH-4 (clean-code) is enforced at review, not by a test.
- **CI:** `azure-pipelines.yml` defines each lane as a blocking stage, and `scripts/pipeline.sh` runs the whole thing locally.

## Quickstart

```
# 1. Set up system dependencies (.NET, Node, container runtime). See skills/bootstrap.
scripts/bootstrap.sh

# 2. Run the full local pipeline: compile -> unit test -> architecture -> deploy -> acceptance.
scripts/pipeline.sh
```

Per-stack commands (see [AGENTS.md](AGENTS.md) for the full table):

```
# Backend (from src/backend/)
dotnet build && dotnet test && dotnet format

# Frontend (from src/frontend/)
npm ci && ng build && ng test && ng lint

# Guards
dotnet test tests/architecture/                                 # architecture standards
scripts/stage-cucumber.sh                                       # @api acceptance (Reqnroll)
cd tests/acceptance/playwright && npm ci && npm test            # @e2e / @component acceptance
```

## Project structure

```
src/
  backend/    ASP.NET Core solution (C#); API + domain services
  frontend/   Angular workspace (TypeScript)
stories/      User stories; narrative + acceptance criteria (intent only)
specs/        Feature files; the declarative SSOT, one story per vertical slice
tests/
  architecture/  Architecture lane (xUnit); arch-check standards as build-breaking tests
  acceptance/
    reqnroll/    Reqnroll runner for @api scenarios (the REST contract)
    playwright/  Playwright-BDD runner for @e2e (live smoke) + @component (stubbed UX)
skills/       Reusable, vendor-neutral agent skills (the workflow)
docs/         How the spec-driven architecture is implemented (start here to learn it)
scripts/      Pipeline stage scripts + bootstrap
TODO.md       Persistent task list
```

## The example app

This repository ships a **sticky-notes** reference feature, a freeform board of draggable notes with server persistence, so every lane has something real to guard and you can read a worked slice end to end (story → spec → API → Angular → all three test levels). It is an **example, not part of the framework**: when you start your own product you replace it. See **[docs/example-app.md](docs/example-app.md)** for a walkthrough and a list of the places the example's name is wired into the scaffolding (tracked in [TODO.md](TODO.md) so they can be generalised).

## Documentation

- **[docs/](docs/)**: how the spec-driven architecture is implemented (architecture, workflow, the example app).
- **[AGENTS.md](AGENTS.md)**: instructions and commands for AI coding agents (the cross-agent source of truth).
- **[docs/adr/](docs/adr/)**: architecture decision records. These are **example decisions for this reference project**, kept deliberately simple. Revisit and replace them as your product's needs grow more complex.
- **[CONTRIBUTING.md](CONTRIBUTING.md)**: the workflow and rules for contributing a change.

## License

[MIT](LICENSE).
