# AGENTS.md

Instructions for AI coding agents working in this repository.

## Project overview

A sample workflow project demonstrating how to structure agent instructions and reusable skills.
The backend is **ASP.NET Core (.NET, C#)** and the frontend is an **Angular** app. See the
architecture standards in `arch-check` for the binding rules.

## Commands

Backend (run from `src/backend/`):

| Task    | Command              |
| ------- | -------------------- |
| Restore | `dotnet restore`     |
| Build   | `dotnet build`       |
| Test    | `dotnet test`        |
| Format  | `dotnet format`      |

Frontend (run from `src/frontend/`):

| Task    | Command              |
| ------- | -------------------- |
| Install | `npm ci`             |
| Build   | `ng build`           |
| Test    | `ng test`            |
| Lint    | `ng lint`            |

Run **format/lint** and **test** for the stack you touched before every commit.

Guard lanes:

| Task                       | Command                                                        |
| -------------------------- | ------------------------------------------------------------- |
| Architecture standards       | `dotnet test tests/architecture/`                           |
| Acceptance (@api)            | `scripts/stage-cucumber.sh`                                 |
| Acceptance (@e2e/@component) | `cd tests/acceptance/playwright && npm ci && npm test`      |
| Full local pipeline          | `scripts/pipeline.sh`                                       |

## Project structure

```
src/
  backend/    ASP.NET Core solution (C#) — API + services
  frontend/   Angular workspace (TypeScript)
stories/      User stories (written by user-story-task) — planning artifacts, NOT
              runner-guarded. Narrative + acceptance criteria (intent only);
              decomposed by brainstorm-task, specified by spec-task (which owns
              specification by example).
specs/        Feature files — declarative SSOT (written by spec-task). One story
              per vertical slice; each scenario routed by its level tag:
              @api → Reqnroll, @e2e + @component → Playwright.
tests/
  architecture/ ArchUnit lane (xUnit + ArchUnitNET) — the architecture standards
                from arch-check as executable, build-breaking tests (ARCH-n ⇄ [Fact]).
  acceptance/
    reqnroll/   Reqnroll runner for @api scenarios (the REST contract) — Features/
                is generated from specs/.
    playwright/ Playwright-BDD runner for @e2e (live-UI smoke) + @component
                (stubbed-UI / UX) scenarios — features/ is generated from specs/ via
                sync-specs.mjs; bddgen codegens the tests. Per scenario the level tag
                binds a protocol driver (dsl/), live or stubbed.
skills/       Reusable agent skills (see Skills below)
TODO.md       Persistent task list (one block per task)
```

Each SSOT artifact is **runner-guarded**: a runner consumes it on every build and
CI fails on red. A vertical slice is **one story** whose scenarios are routed per
level to the runner strongest for it: `@api` → Reqnroll (REST contract), `@e2e` →
Playwright (live-UI smoke), `@component` → Playwright (stubbed-UI / UX). Structure →
the architecture lane. See the stage scripts in `scripts/` and `azure-pipelines.yml`
for how each lane is wired as a pipeline blocker.

## Skills

| Skill          | File                                                          | Use when…                                          |
| -------------- | ------------------------------------------------------------ | -------------------------------------------------- |
| `user-story-task` | [skills/user-story-task/SKILL.md](skills/user-story-task/SKILL.md) | Capturing a raw need as a user story (`stories/<name>.md`) before speccing. |
| `brainstorm-task` | [skills/brainstorm-task/SKILL.md](skills/brainstorm-task/SKILL.md) | Splitting a too-large idea into one stub feature per feature. |
| `spec-task`    | [skills/spec-task/SKILL.md](skills/spec-task/SKILL.md)        | Turning a raw idea into a specification by example. |
| `code-review`  | [skills/code-review/SKILL.md](skills/code-review/SKILL.md)    | Reviewing a diff or PR before it merges.           |
| `tdd-task`     | [skills/tdd-task/SKILL.md](skills/tdd-task/SKILL.md)          | Implementing a unit of code test-first (red-green-refactor). |
| `atdd-task`    | [skills/atdd-task/SKILL.md](skills/atdd-task/SKILL.md)        | Implementing Gherkin scenarios from a `.feature` file (acceptance-level red-green-refactor). |
| `arch-check`   | [skills/arch-check/SKILL.md](skills/arch-check/SKILL.md)      | Confirming code meets the architecture standards.  |
| `bootstrap`    | [skills/bootstrap/SKILL.md](skills/bootstrap/SKILL.md)        | Setting up a fresh clone or fixing missing/wrong-version system deps. |

## Implementation policy

These rules apply to **all code that implements behaviour**. They do **not** apply to
boilerplate/scaffolding, project setup/tooling, generated files, or throwaway spikes.

- **Test-first.** Write such code via `tdd-task` (red-green-refactor). No production code
  without a failing unit test driving it.
- **Architecture standards.** Every change must satisfy the standards in `arch-check`
  (e.g. executables ship a container definition). A failing standard is a merge blocker.
- **At review.** `code-review` checks both of the above before merge.

## Coding conventions

Follow each language's idiomatic style:

- **C# (.NET):** Types, methods, properties, and file names in `PascalCase`; locals and
  parameters in `camelCase`; interfaces prefixed `I`. Prefer `var` only when the type is obvious.
- **TypeScript (Angular):** Functions and variables in `camelCase`; types, classes, and
  components in `PascalCase`; file and folder names in `lowercase-kebab-case`. Prefer `const`
  over `let`; never use `var`.
- **Both:** Each unit does one thing; keep files focused (~300 lines). Follow the clean-code
  standard ARCH-4 in `arch-check`.
- Commits: imperative mood, one logical change per commit (e.g. `Add input validation to user route`).

## Do NOT

- Commit `.env` files or any secrets.
- Edit generated/build output — `node_modules/`, Angular `dist/`, or .NET `bin/` and `obj/`.
- Push directly to `main`; open a PR instead.
- Add tool-specific syntax inside `skills/` — keep skills plain Markdown.
