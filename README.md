# AgentWorkFlow

Sample `AGENTS.md` and `SKILL.md` following the [agents.md](https://agents.md) convention.

```
AGENTS.md                    ← agent instructions + skills index
skills/code-review/SKILL.md  ← sample reusable skill
```

## Single source of truth, runner-guarded

Specs and standards are the SSOT, and each is **guarded** by a runner wired into
CI — a document only counts when an always-run executable consumes it and the
build fails on red. There are three lanes:

| SSOT artifact                       | Guards     | Runner                              |
| ----------------------------------- | ---------- | ----------------------------------- |
| `specs/*.feature` (`@api`)          | behaviour  | Reqnroll (`tests/acceptance/reqnroll`) |
| `specs/*.feature` (`@e2e`, `@component`) | behaviour  | Playwright-BDD (`tests/acceptance/playwright`) |
| `skills/arch-check` ARCH-1..4       | structure  | ArchUnitNET (`tests/architecture`)  |

A vertical slice is **one story file**; each scenario is routed by its level tag
(`@api` → Reqnroll, `@e2e` / `@component` → Playwright) and synced into the owning
runner's generated folder at build time. Each level speaks its own vocabulary, bound
by that runner's step definitions (the "protocol driver"). Run everything locally with
`scripts/pipeline.sh`; see `AGENTS.md` for per-lane commands.
