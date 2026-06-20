# Contributing to SpecWarden

Thanks for contributing. SpecWarden is spec-driven: the spec is the contract and the
guards enforce it, so contributions flow through the same workflow whether they come from
a person or an AI agent. Please read this alongside [AGENTS.md](AGENTS.md) (the canonical,
cross-agent instructions) and the [docs](docs/).

## Setup

```bash
scripts/bootstrap.sh     # install .NET, Node, and a container runtime (see skills/bootstrap)
scripts/pipeline.sh      # confirm a clean checkout is green before you change anything
```

## The workflow

Every change to **behaviour** follows the spec-first loop (full detail in
[docs/workflow.md](docs/workflow.md)):

1. **Capture intent** — a user story in `stories/<name>.md` (`user-story-task`).
2. **Decompose if large** — one stub `.feature` per feature (`brainstorm-task`).
3. **Specify** — real, level-tagged scenarios in `specs/<name>.feature` (`spec-task`).
   Tag every scenario with its level: `@api`, `@component`, or `@e2e`.
4. **Implement test-first** — drive scenarios green with `atdd-task`, and the units
   beneath them with `tdd-task` (red → green → refactor).
5. **Check structure** — `arch-check` against the ARCH-* standards.
6. **Review** — `code-review` before opening a PR.

## Rules of the road

- **Spec before code.** No new behaviour without a scenario in `specs/` driving it. A
  spec stub (`@unspecified` / `# Status: Stub`) **fails** CI (SPEC-1) until it is filled in.
- **Test-first.** No production behaviour without a failing test. This does *not* apply to
  boilerplate, scaffolding, generated files, or throwaway spikes.
- **Architecture standards are merge blockers.** Every change must satisfy `arch-check`
  (e.g. executables ship a `Dockerfile`, backend targets `net10.0`). See
  [tests/architecture/](tests/architecture/).
- **Keep skills plain Markdown.** No tool-specific syntax inside `skills/`.
- **Don't push to the default branch.** Open a PR.

## Before every commit

Run **format/lint** and **test** for the stack you touched, plus the guards:

```bash
# Backend (from src/backend/)
dotnet format && dotnet test

# Frontend (from src/frontend/)
ng lint && ng test

# Guards
dotnet test tests/architecture/                        # architecture standards
scripts/pipeline.sh                                    # the full local pipeline
```

## Commits & PRs

- **Commits:** imperative mood, one logical change per commit
  (e.g. `Add input validation to board route`).
- **Conventions:** follow the coding conventions in [AGENTS.md](AGENTS.md) — C# `PascalCase`
  types / `camelCase` locals; TypeScript `camelCase` values / `PascalCase` types /
  `kebab-case` files; each unit does one thing; keep files focused (~300 lines).
- **Do NOT** commit `.env` files or secrets, or edit generated output
  (`node_modules/`, Angular `dist/`, .NET `bin/`/`obj/`, the API's bundled `wwwroot/`).
- Open a PR against the default branch; CI runs every guard lane as a blocker.

## License

By contributing, you agree your contributions are licensed under the project's
[MIT License](LICENSE).
