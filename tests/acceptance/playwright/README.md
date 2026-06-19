# Playwright-BDD acceptance lane

The browser behaviour runner for the `@e2e` and `@component` scenarios in `specs/`.
SSOT `.feature` files are synced in, `playwright-bdd` (`bddgen`) generates runnable
Playwright specs, and `playwright test` executes them.

This lane owns the two **browser** levels of a story; the `@api` level (the REST
contract) is owned by the Reqnroll lane instead.

| Level | Mode | What it proves | Backend |
|---|---|---|---|
| `@e2e` | live UI | the page is wired to the real backend (smoke) | real |
| `@component` | stubbed UI | the user experience in isolation | stubbed, answered locally |

## How the guard chain works

1. `sync-specs.mjs` copies `specs/*.feature` tagged `@e2e` or `@component` into
   `features/` (gitignored — generated).
2. `bddgen` reads `playwright.config.ts` and generates `.features-gen/*.spec.js`,
   binding every Gherkin step to a definition in `steps/`. An unbound step fails
   generation — the equivalent of a Reqnroll pending step.
3. `playwright test` runs the generated specs against the app.

A story file may also contain `@api` scenarios (HTTP vocabulary for Reqnroll). The
tag filter (`not @nfr and not @api`) excludes them here.

## Adding a feature

1. Write scenarios in `specs/<feature>.feature`, tagging each `@e2e` or
   `@component` (see AGENTS.md for the routing).
2. In `dsl/fixtures.ts`, extend the Playwright `test` with a **protocol driver**
   fixture — a small object that speaks the page in the DSL the steps use (live
   backend for `@e2e`, stubbed for `@component`), selected by the scenario's level
   tag.
3. Bind the Gherkin steps in `steps/` to driver calls — steps speak the DSL, never
   raw Playwright.

## Commands

```bash
npm ci          # install (CI: reproducible)
npm run gen     # sync specs + bddgen (verifies all steps bind)
npm run list    # gen + list discovered tests, no browser needed
npm test        # gen + run (needs browsers + a running app)
```

Browsers: `npx playwright install --with-deps chromium` before the first run.

## Environment

| Var                 | Default                   | Used by                          |
| ------------------- | ------------------------- | -------------------------------- |
| `FRONTEND_BASE_URL` | `http://localhost:4200`   | page under test                  |
| `API_BASE_URL`      | `http://localhost:8080`   | the real backend in `@e2e`       |
| `BDD_TAGS`          | `not @nfr and not @api`   | which scenarios `bddgen` emits   |
