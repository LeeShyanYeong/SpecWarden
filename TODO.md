# TODO

Persistent task list for this project. One block per task; track state in the
block, not a separate file.

---

## [ ] Generalise the example-specific scaffolding (de-couple from `StickyNotes`)

**State:** open · **Found:** 2026-06-20 · **Context:** see [docs/example-app.md](docs/example-app.md)

The sticky-notes feature is an example, but a few framework/scaffolding files name it
by hand instead of discovering it. These should be generalised so swapping in a new
feature (or renaming the API project) doesn't quietly break a lane. Most of the
framework is already generic (globs `src/backend`/`src/frontend`, routes by tag, finds
the first solution) — this task is only the spots that still hardcode `StickyNotes`.

- [ ] **#1 (highest) — `scripts/stage-compile.sh`** hardcodes
      `api_dir="src/backend/StickyNotes.Api"` for SPA bundling. If the API project is
      renamed/replaced, bundling silently no-ops and `@e2e`/`@component` lose their
      served frontend. → Discover the ASP.NET Core **Web SDK** project under
      `src/backend` (the one whose `.csproj` uses `Microsoft.NET.Sdk.Web`) instead of
      naming it.
- [ ] **#2 — `.gitignore`** ignores `src/backend/StickyNotes.Api/wwwroot/` by exact
      path. → Replace with a depth-agnostic `**/wwwroot/` (or derive from #1) so a
      renamed API still ignores its generated SPA bundle.
- [ ] **#7 (cosmetic) — `azure-pipelines.yml`** stage display names reference stale tag
      names (`@backend specs`, `@frontend + @story specs`). Actual routing tags are
      `@api` / `@component` / `@e2e`. → Update the display strings to match (labels only;
      no behaviour change).

**Expected-to-replace (NOT bugs — these are the example itself):** the `StickyNotes`
solution/projects, the Angular `board`/`sticky-note` components, `specs/sticky-notes.feature`,
`stories/sticky-notes.md`, and the example step definitions/DSL. Delete or replace these
when you start your own feature; they are inventoried in
[docs/example-app.md](docs/example-app.md).

---

## [ ] Consolidated test report across the pipeline (unit → acceptance)

**State:** open · **Found:** 2026-06-20 · **Context:** guard lanes in [AGENTS.md](AGENTS.md), `scripts/pipeline.sh`, `azure-pipelines.yml`

Each guard lane reports its own results in its own format, so there is no single place to see the
health of a change end to end. Produce **one consolidated test report** that aggregates every lane
the pipeline runs, ordered by altitude:

- [ ] **Unit** — backend C# (`dotnet test src/backend`, TRX) + frontend Angular (`ng test`, karma/jUnit).
- [ ] **Architecture** — `tests/architecture/` (`ARCH-n` / SPEC-1 facts, TRX).
- [ ] **Acceptance `@api`** — Reqnroll (`scripts/stage-cucumber.sh`, TRX).
- [ ] **Acceptance `@component` / `@e2e`** — Playwright-BDD (its JSON/HTML reporter).
- [ ] **Aggregate** — merge each lane's machine-readable output into one report: total + per-lane
      pass/fail counts, drill-down, and links to artifacts. The build fails if any lane is red.
- [ ] Wire it as a final stage in `scripts/pipeline.sh` + `azure-pipelines.yml` so it runs locally
      and in CI, and publish it as a build artifact.

Spec it first with `spec-task` (it is observable behaviour, not boilerplate), then implement.

---

## [ ] UI/UX spec level that references a design source (Figma, …)

**State:** open · **Found:** 2026-06-20 · **Context:** `spec-task`; `@component` lane in [skills/atdd-task/SKILL.md](skills/atdd-task/SKILL.md)

`@component` scenarios verify client-side UX, but nothing ties them to a design source of truth, so
"what the user sees" is asserted from prose alone. Add a way for a UI spec to **reference a Figma
frame (or other UI/UX design)** so the design becomes the cited source for component-level scenarios.

- [ ] Choose the reference mechanism: a `# Design:` header comment in `specs/<feature>.feature`
      carrying a Figma URL / frame id — mirroring the `# Architecture decisions` header block, kept
      as a non-Gherkin comment so no runner has to parse it.
- [ ] Extend `spec-task` to capture the design link when speccing `@component`/`@e2e` UX, and to
      derive concrete, assertable `Then` steps from the referenced frame (states, copy, layout).
- [ ] Decide enforcement depth: advisory link only vs. a visual-regression check against the design
      (likely out of scope for the first cut — note as a follow-up).
- [ ] Keep it tool-neutral: Figma is the example, but the header should accept any design URL.

Spec the capability with `spec-task` before building it.

---

_Start your first feature with `spec-task` (or `brainstorm-task` for a large idea)._
