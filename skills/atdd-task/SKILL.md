---
name: atdd-task
description: >-
  Use when implementing Gherkin scenarios from a .feature file test-first at the
  acceptance level, across every level tag. Triggers on: "ATDD this", "implement
  the feature", "make the scenario pass", "implement the steps", "drive this from
  the spec". Loops one failing scenario -> implement its step definitions in the
  runner its level tag selects (@api -> Reqnroll, @component/@e2e -> Playwright) ->
  green -> next. Acceptance-level only; for unit-level use tdd-task instead.
version: 2.0.0
---

# ATDD Task

Make one Gherkin scenario pass at a time by implementing its step definitions,
**routing each scenario to the runner its level tag selects**, and driving from the
running system. Scope is **acceptance level**: one scenario per loop, exercised the
way that level is honestly verifiable — over HTTP for `@api`, through the browser
for `@component`/`@e2e`. Never mock the app's internals; the only thing ever stubbed
is the *backend boundary* of a `@component` scenario.

A single `.feature` file usually mixes levels. This skill implements **all** of a
story's implementable levels (`@api`, `@component`, `@e2e`), each in its own runner.

## Inputs

- The `.feature` file (or a named scenario within it) to implement.
- A running target appropriate to the levels present:
  - `@api`, `@e2e` — the deployed backend at `API_BASE_URL`.
  - `@component`, `@e2e` — the served frontend at `FRONTEND_BASE_URL`.

  `@component` stubs the backend, so it needs the frontend served but not a live API.

## Scenario tags and runner selection

Route every scenario by its single level tag. Implement `@api`, `@component`, and
`@e2e`; leave `@nfr`/`@performance` to their own (future) lane.

| Tag | Runner | Mode | Speaks |
|---|---|---|---|
| `@api` | Reqnroll (`tests/acceptance/reqnroll/`) | live backend | HTTP / the REST contract |
| `@component` | Playwright (`tests/acceptance/playwright/`) | **backend stubbed** | the page, in isolation |
| `@e2e` | Playwright (`tests/acceptance/playwright/`) | live backend | the page, full-stack |
| `@nfr` / `@performance` | load tool (k6, NBomber, …) | — | future skill |

If a scenario has no level tag, ask the user which runner owns it before implementing.

## Runner targets (never hardcode a URL)

Read every base URL from the environment; the pipeline and scripts set them per target.

- **Reqnroll (`@api`)** — `API_BASE_URL` (fallback `http://localhost:8080`):
  ```csharp
  Environment.GetEnvironmentVariable("API_BASE_URL") ?? "http://localhost:8080";
  ```
- **Playwright (`@component`/`@e2e`)** — `FRONTEND_BASE_URL` (fallback
  `http://localhost:4200`) for the page, plus `API_BASE_URL` for the real backend in
  `@e2e`. `playwright.config.ts` already reads these — never inline a URL in a step.

## The loop

List the pending scenarios (all implementable levels) and work them one at a time. A
sensible order is `@api` (the contract) → `@component` (the UX, stubbed) → `@e2e`
(the full-stack smoke), since `@e2e` leans on both being right.

For each scenario, route by its tag and run **red → green → refactor**:

1. **RED — confirm it fails** in its runner:
   - `@api`: `dotnet test tests/acceptance/reqnroll/ --filter Category=api`
     (or `bash scripts/stage-cucumber.sh`) — the scenario is `Pending`/`Failed`.
   - `@component`/`@e2e`: from `tests/acceptance/playwright/`, `npm run list`
     (sync + bddgen + list). An **unbound step fails generation** — that is RED. Once
     steps bind, `npm test` runs it; a missing behaviour fails execution — also RED.
2. **Write the step definitions** in the level's runner — only enough for this scenario:
   - `@api`: a `[Binding]` class in `tests/acceptance/reqnroll/StepDefinitions/`,
     `HttpClient` over `API_BASE_URL`. **Anchor every step regex with `^…$`** — an
     unanchored pattern is parsed as a Cucumber Expression (where `()` means
     *optional text*, not a capture group) and silently fails to match.
   - `@component`/`@e2e`: bind steps in `steps/` to a **protocol driver** added in
     `dsl/fixtures.ts` — steps speak the DSL, never raw Playwright. The driver runs
     the real app; for `@component` it **stubs the backend at the network boundary**
     (`page.route('**/api/**', …)`), for `@e2e` it lets calls hit the live API. The
     scenario's level tag selects which driver/mode runs.
3. **Drive the production code** via **`tdd-task`** (unit-level red-green-refactor),
   building only what this scenario needs. `tdd-task` applies **`arch-check`** during
   refactor, so each unit lands test-first and compliant:
   - `@api` → backend C# units (`dotnet test` under `src/backend/`).
   - `@component`/`@e2e` → frontend Angular units (`ng test` under `src/frontend/`),
     with logic in services/stores, not components (ARCH-4). Scaffolding a missing
     `src/frontend` Angular workspace (ARCH-3) is exempt boilerplate; its behaviour
     is not — TDD it.

   Skip this step only when the behaviour already exists.
4. **GREEN — re-run** the scenario's runner; it passes. All previously green scenarios
   (every level) stay green.
5. **REFACTOR — clean up under green.** Remove duplication (shared `HttpClient` setup;
   shared driver/fixtures). Re-run after each change; it must stay green.
6. **Next scenario** — return to step 1.

## Steps

1. List every pending scenario in the file as a checklist, grouped by level
   (`@api`, `@component`, `@e2e`); note any `@nfr` as out of scope here.
2. Ensure the targets are up: deploy the backend (`bash scripts/stage-deploy.sh`) for
   `@api`/`@e2e`; serve the frontend (`ng serve`, or a `webServer` entry in
   `playwright.config.ts`) for `@component`/`@e2e`.
3. Run the **loop**, one scenario per cycle, in the order above.
4. When all targeted scenarios are green, run the full pipeline
   (`bash scripts/pipeline.sh`) and confirm every stage passes.
5. Report: scenarios implemented per level, any deliberately skipped and why.

## Project layout

| What | Where |
|---|---|
| Feature files (SSOT) | `specs/*.feature` |
| Reqnroll features (synced from `specs/`) | `tests/acceptance/reqnroll/Features/` |
| Reqnroll step definitions (C#) | `tests/acceptance/reqnroll/StepDefinitions/` |
| Run `@api` | `dotnet test tests/acceptance/reqnroll/ --filter Category=api` |
| Playwright features (synced from `specs/`) | `tests/acceptance/playwright/features/` |
| Playwright step definitions (TS) | `tests/acceptance/playwright/steps/` |
| Playwright protocol drivers / fixtures | `tests/acceptance/playwright/dsl/` |
| Run `@component`/`@e2e` | `npm run gen` then `npm test` (in the Playwright lane) |
| Run full pipeline | `bash scripts/pipeline.sh` |
| Base URLs (env) | `API_BASE_URL` (8080), `FRONTEND_BASE_URL` (4200) |

## Step definition conventions

### C# / Reqnroll (`@api`)

- One `[Binding]` class per feature file, named `<Feature>Steps.cs`.
- Read `API_BASE_URL` once in the constructor; never inline a URL string.
- Anchor every step regex with `^…$` (forces regex, not Cucumber Expression).
- Use `ScenarioContext` (or per-scenario instance fields) only to pass data between
  steps in the same scenario.
- HTTP calls in `[When]`, assertions in `[Then]`; method names state intent
  (`GivenTheBoardHasNotes`, not `SendGetRequest`).

### TypeScript / Playwright (`@component`, `@e2e`)

- Bind steps with the `Given/When/Then` exported from `dsl/fixtures.ts` (`createBdd`).
- Steps call the **protocol driver**, never raw `page.*` — keep all Playwright in `dsl/`.
- One driver per level: `@component` stubs the backend boundary (`page.route`), `@e2e`
  uses the live backend; the scenario's level tag selects which driver/mode runs.
- Read `FRONTEND_BASE_URL`/`API_BASE_URL` from the environment (the config already does).

## Notes

- Never mock the app's internals. `@api` hits the real container; `@e2e` drives the
  real app against the real backend; `@component` runs the real app but answers the
  *backend boundary* locally — that is the only thing ever stubbed.
- An unbound Playwright step fails `bddgen` — the analog of a Reqnroll pending step —
  so wiring is guarded before any browser runs.
- For unit-level behaviour use `tdd-task`; for writing new specs use `spec-task`. This
  skill only implements steps for existing `.feature` files.
