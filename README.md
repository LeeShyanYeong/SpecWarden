# SpecWarden

> A lightweight, single-agent, spec-driven development framework for .NET + Angular teams.

SpecWarden treats **Gherkin as the single source of truth**. You write specifications once, in plain `Given/When/Then` language, and they do double duty: they read like ordinary documentation, and they are continuously enforced against your codebase by automated guards. There is no separate "spec" and "implementation" to keep in sync by hand — the spec *is* the contract, and the contract is checked on every run.

## Why

AI coding agents have made writing code fast. They've also made it easy for an agent to confidently build the wrong thing, drift from the original intent over a long session, or silently violate architectural boundaries that no unit test would ever catch. The usual fix — adding more agents (a coordinator, several implementors, a verifier) — solves the drift problem but multiplies token spend, since every sub-agent re-sends and re-processes its own copy of the context.

SpecWarden takes the opposite approach:

- **One spec, human and machine readable.** A `.feature` file is the requirement doc *and* the test *and* the architectural boundary, so there's nothing to keep in sync.
- **One agent, tightly scoped.** Instead of orchestrating multiple agents to compensate for an ambiguous brief, the spec itself constrains what the agent can build, so a single agent with a smaller context window can do the job reliably.
- **Guards, not vibes.** Behavior is checked by a Gherkin test runner; architecture is checked by static architecture rules. The agent doesn't get to mark its own homework.

## How it works

Every requirement in SpecWarden lives as a **single source of truth (SSOT)** artifact, and every SSOT artifact is **runner-guarded**: an always-run executable consumes it on each build, and the build fails when reality drifts from the document. A document that no runner reads is just a wish — SpecWarden only counts artifacts a guard enforces.

There are two kinds of truth, and one guard for each:

| SSOT artifact            | Guards    | Runner                                                |
| ------------------------ | --------- | ----------------------------------------------------- |
| `specs/*.feature`        | behaviour | A Gherkin runner (Reqnroll or Playwright-BDD)         |
| `skills/arch-check` rules | structure | An architecture runner (xUnit; filesystem + text checks) |

A feature file is **one vertical slice**, and each scenario carries a **level tag** that routes it to the runner strongest for that level:

| Level tag    | Runner          | Checks                                              |
| ------------ | --------------- | --------------------------------------------------- |
| `@api`       | Reqnroll        | the REST contract, driven over HTTP                 |
| `@component` | Playwright-BDD  | UI behaviour / UX with the backend **stubbed**      |
| `@e2e`       | Playwright-BDD  | a thin live-system smoke against the **real** backend |

The same `.feature` file is synced into whichever runner owns each scenario at build time (`scripts/stage-cucumber.sh` for `@api`, `tests/acceptance/playwright/sync-specs.mjs` for `@component`/`@e2e`), so you never copy a requirement by hand. Structure is guarded the same way: the rules described in `skills/arch-check` exist as build-breaking `[Fact]` tests under `tests/architecture/`.

> **The guards are dormant until the matching code exists.** A bare clone is green: each architecture rule activates only once `src/backend` or `src/frontend` appears, and a half-finished spec stub *fails* CI until it is filled in. You are never forced to fight a guard for code you haven't written yet, but you can't merge a stub either.

For the full implementation — tag routing, the build pipeline, and how each guard is wired — see **[docs/](docs/)**.

## The agent workflow

SpecWarden ships a set of plain-Markdown **skills** (`skills/`) that walk one agent through a slice from idea to merged code. Each is a focused, vendor-neutral playbook:

| Skill              | Use when…                                                            |
| ------------------ | ------------------------------------------------------------------- |
| `user-story-task`  | capturing a raw need as a user story (`stories/<name>.md`)          |
| `brainstorm-task`  | a single idea is too big and needs splitting into one stub per feature |
| `spec-task`        | turning an idea into a specification by example (`specs/<name>.feature`) |
| `atdd-task`        | implementing a `.feature` test-first at the acceptance level        |
| `tdd-task`         | implementing a unit of code test-first (red → green → refactor)     |
| `arch-check`       | confirming a change satisfies the architecture standards            |
| `code-review`      | reviewing a diff or PR before it merges                             |
| `bootstrap`        | setting up a fresh clone or fixing missing/wrong-version system deps |

The typical path: **story → brainstorm (if large) → spec → atdd/tdd → arch-check → code-review.** See **[docs/workflow.md](docs/workflow.md)** for the end-to-end loop.

## Tech stack

- **Backend:** ASP.NET Core (.NET 10, C#) — REST API + domain services.
- **Frontend:** Angular (TypeScript) — bundled into the API so the two ship as one container on one port.
- **Behaviour guards:** Reqnroll (`@api`) and Playwright-BDD (`@component`, `@e2e`).
- **Structure guard:** xUnit (`tests/architecture/`) — ARCH-1/2/3 + the SPEC-1 stub guard as filesystem/text checks; ARCH-4 (clean-code) is enforced at review, not by a test.
- **CI:** `azure-pipelines.yml` runs each lane as a blocking stage; `scripts/pipeline.sh` runs the whole thing locally.

## Quickstart

```bash
# 1. Set up system dependencies (.NET, Node, container runtime). See skills/bootstrap.
scripts/bootstrap.sh

# 2. Run the full local pipeline: compile → unit test → architecture → deploy → acceptance.
scripts/pipeline.sh
```

Per-stack commands (see [AGENTS.md](AGENTS.md) for the full table):

```bash
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
  backend/    ASP.NET Core solution (C#) — API + domain services
  frontend/   Angular workspace (TypeScript)
stories/      User stories — narrative + acceptance criteria (intent only)
specs/        Feature files — the declarative SSOT; one story per vertical slice
tests/
  architecture/  Architecture lane (xUnit) — the arch-check standards as build-breaking tests
  acceptance/
    reqnroll/    Reqnroll runner for @api scenarios (the REST contract)
    playwright/  Playwright-BDD runner for @e2e (live smoke) + @component (stubbed UX)
skills/       Reusable, vendor-neutral agent skills (the workflow)
docs/         How the spec-driven architecture is implemented (start here to learn it)
scripts/      Pipeline stage scripts + bootstrap
TODO.md       Persistent task list
```

## The example app

This repository ships a **sticky-notes** reference feature — a freeform board of draggable notes with server persistence — so every lane has something real to guard and you can read a worked slice end to end (story → spec → API → Angular → all three test levels). It is an **example, not part of the framework**: when you start your own product you replace it. See **[docs/example-app.md](docs/example-app.md)** for a walkthrough and the list of places the example's name is wired into the scaffolding (tracked in [TODO.md](TODO.md) so they can be generalised).

## Documentation

- **[docs/](docs/)** — how the spec-driven architecture is implemented (architecture, workflow, the example app).
- **[AGENTS.md](AGENTS.md)** — instructions and commands for AI coding agents (the cross-agent source of truth).
- **[docs/adr/](docs/adr/)** — architecture decision records. These are **example decisions for this reference project**, kept deliberately simple. Revisit and replace them as your product's needs grow more complex.
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — the workflow and rules for contributing a change.

## License

[MIT](LICENSE).
