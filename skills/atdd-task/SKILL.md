---
name: atdd-task
description: >-
  Use when implementing Gherkin scenarios from a .feature file test-first at
  the acceptance level. Triggers on: "ATDD this", "implement the feature",
  "make the scenario pass", "implement the steps", "drive this from the spec".
  Loops one failing scenario -> implement step definitions -> green -> next
  scenario. Acceptance-level only; for unit-level use tdd-task instead.
version: 1.1.0
---

# ATDD Task

Make one Gherkin scenario pass at a time by implementing its step definitions,
driving from the already-deployed service. Scope is **acceptance level**: one
scenario per loop, calling the running system over HTTP — no mocking internals.

## Inputs

- The `.feature` file (or a named scenario within it) to implement.
- A running deployment to test against. The base URL is read from the
  `API_BASE_URL` environment variable (see Base URL below).

## Scenario tags and runner selection

Only implement scenarios that are tagged `@api`. These are the scenarios Reqnroll
is responsible for — the REST contract. Scenarios without `@api` belong to a
different runner (Playwright for `@e2e` / `@component`) and are out of scope here.
A single story file may mix levels; implement only its `@api` scenarios here.

| Tag | Runner | Skill |
|---|---|---|
| `@api` | Reqnroll (`tests/acceptance/reqnroll/`) | this skill |
| `@e2e` / `@component` | Playwright (`tests/acceptance/playwright/`) | future skill |
| `@nfr` / `@performance` | load tool (k6, NBomber, etc.) | future skill |

If a scenario has no tag, ask the user which runner owns it before implementing.

## Base URL

Step definitions must never hardcode a URL. Always read from the environment:

```csharp
private readonly string _baseUrl =
    Environment.GetEnvironmentVariable("API_BASE_URL") ?? "http://localhost:8080";
```

The pipeline and local scripts set `API_BASE_URL` for the target environment.
The fallback `http://localhost:8080` is only for developer convenience — it
must never be the only way to point tests at a different host.

## The loop

Repeat for each `@api` scenario until all targeted scenarios are green:

1. **RED — confirm the scenario fails.** Run `dotnet test tests/acceptance/reqnroll/`
   and confirm the target scenario is `Pending` or `Failed`. If it already
   passes, pick the next one.
2. **Implement the step definitions** in
   `tests/acceptance/reqnroll/StepDefinitions/` using `HttpClient`. Write only
   enough to satisfy the steps of this one scenario — no speculative helpers.
3. **GREEN — re-run** and confirm the scenario passes. All previously green
   scenarios must stay green.
4. **REFACTOR — clean up under green.** Remove duplication (shared `HttpClient`
   setup, response helpers). Re-run after each change; it must stay green.
5. **Next scenario:** pick the next pending `@api` scenario and return to step 1.

## Steps

1. List all pending `@api` scenarios from the feature file as a checklist.
   Order: happy-path first, edge cases, `@failure` scenarios last.
2. Run the **loop** above, one scenario per cycle.
3. When all targeted scenarios are green, run the full pipeline
   (`bash scripts/pipeline.sh`) and confirm all stages pass.
4. Report: scenarios implemented, any deliberately skipped and why.

## Project layout

| What | Where |
|---|---|
| Feature files (SSOT) | `specs/*.feature` |
| Generated folder seen by Reqnroll (synced from `specs/`) | `tests/acceptance/reqnroll/Features/` |
| Step definitions | `tests/acceptance/reqnroll/StepDefinitions/` |
| Run Reqnroll tests | `dotnet test tests/acceptance/reqnroll/` |
| Run full pipeline | `bash scripts/pipeline.sh` |
| Base URL env var | `API_BASE_URL` (fallback: `http://localhost:8080`) |

## Step definition conventions (C# / Reqnroll)

- One `[Binding]` class per feature file, named `<Feature>Steps.cs`.
- Read `API_BASE_URL` once in the constructor; never inline a URL string.
- Inject `HttpClient` via the constructor (Reqnroll supports DI).
- Use `ScenarioContext` only to pass data between steps in the same scenario.
- Step method names describe intent, not HTTP mechanics
  (`GivenTheApiIsRunning`, not `SendGetRequest`).
- Keep assertions in `[Then]` steps; keep HTTP calls in `[When]` steps.

## Notes

- Never mock the HTTP layer — these tests verify the deployed container.
- If the API is not running, the `[Given]` background step will fail with a
  connection error. Start it with `bash scripts/stage-deploy.sh` first.
- Step definitions are shared across scenarios in the same feature; extract
  common setup (base URL, `HttpClient`) to the constructor, not per-step.
- For unit-level behaviour use `tdd-task`. For writing new specs use
  `spec-task`. This skill only implements steps for existing `.feature` files.
