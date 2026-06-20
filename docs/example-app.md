# The example app: sticky notes

SpecWarden ships one worked feature so every lane has something real to guard and you can
read a full vertical slice end to end. It is a **freeform sticky-note board with server
persistence**: double-click the canvas to create a note, drag to reposition, edit text
(≤ 500 chars), delete, and **Save** to persist the whole board to a single shared global
board on the server; reopening the app loads it back.

> ⚠️ **This is an example, not the framework.** When you build your own product you delete
> the sticky-note slice and write your own. A handful of scaffolding files still name the
> example (`StickyNotes`) — those are listed in [§ What's hardcoded](#whats-hardcoded-to-the-example)
> and tracked in [TODO.md](../TODO.md) so they can be generalised.

## Read it as one slice

Follow the same feature through every layer:

| Layer            | Where                                                              |
| ---------------- | ----------------------------------------------------------------- |
| Story (intent)   | [`stories/sticky-notes.md`](../stories/sticky-notes.md)           |
| Spec (contract)  | [`specs/sticky-notes.feature`](../specs/sticky-notes.feature) — `@api`, `@component`, `@e2e` scenarios in one file |
| API (C#)         | `src/backend/StickyNotes.Api/` — `Program.cs` maps `GET`/`PUT /api/board`; `Domain/` holds `Board`, `Note`, `BoardService`, `BoardValidator`, `InMemoryBoardStore` |
| UI (Angular)     | `src/frontend/src/app/` — `board.*`, `sticky-note.*`, `board-store.ts`, `board-api.ts`, `note.ts` |
| `@api` guard     | `tests/acceptance/reqnroll/StepDefinitions/StickyNotesSteps.cs` (HTTP) |
| `@component`/`@e2e` guard | `tests/acceptance/playwright/dsl/fixtures.ts` (`BoardDriver`) + `steps/sticky-notes.steps.ts` |

The REST contract is intentionally tiny: `GET /api/board` returns `{ notes: [...] }` and
`PUT /api/board` replaces the whole board (last-write-wins), rejecting any note over 500
characters. One shared global board, no accounts — see the story's *Out of scope* for the
deliberate stepping-stone decisions.

## What's hardcoded to the example

Most of the framework is **generic by construction** and needs no edits when you swap
features — it discovers things rather than naming them:

- The architecture tests use the `Template.ArchitectureTests` namespace and find projects by
  globbing `src/backend` / `src/frontend`; `RepoRoot` walks up to `AGENTS.md`.
- `stage-compile.sh` builds the *first* `.slnx`/`.sln` it finds; `stage-deploy.sh` discovers
  service `Dockerfile`s under `src/`.
- The acceptance lanes route by **tag** over `specs/*.feature`, not by filename.
- Reqnroll step defs live in the generic `AcceptanceTests.StepDefinitions` namespace.

A few spots **do** name the example and would need changing when it is replaced or renamed.
The genericisable scaffolding items are tracked in [TODO.md](../TODO.md):

| # | Where                                                         | Hardcoded reference                                | Impact                                                                    |
| - | ------------------------------------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------- |
| 1 | `scripts/stage-compile.sh` (`api_dir="src/backend/StickyNotes.Api"`) | the API project path for SPA bundling      | **Highest** — SPA bundling silently no-ops if you rename/replace the API project, so `@e2e`/`@component` lose their served frontend. Should discover the Web SDK project instead. |
| 2 | `.gitignore` (`src/backend/StickyNotes.Api/wwwroot/`)         | the bundled-SPA output path                         | Low — a renamed API would commit its generated `wwwroot/` unless this is updated. Could be a depth-based `**/wwwroot/` ignore. |
| 3 | `tests/acceptance/reqnroll/StepDefinitions/StickyNotesSteps.cs` | example step definitions (`board`/`note` vocabulary) | Expected — replace with your feature's steps. The class name is example-specific; the namespace is generic. |
| 4 | `tests/acceptance/playwright/dsl/fixtures.ts` + `steps/sticky-notes.steps.ts` | `BoardDriver` + board steps             | Expected — replace with your feature's DSL + steps. |
| 5 | `src/backend/StickyNotes.slnx`, `StickyNotes.Api/`, `StickyNotes.Tests/`, `src/frontend/src/app/*` | the example implementation             | Expected — delete/replace wholesale when you start your own feature. |
| 6 | `specs/sticky-notes.feature`, `stories/sticky-notes.md`      | the example spec + story                            | Expected — your own slice replaces these. |
| 7 | `azure-pipelines.yml` stage display names ("@backend specs", "@frontend + @story specs") | stale tag names in labels only | Cosmetic — the **labels** say `@backend`/`@frontend`/`@story` but the actual routing tags are `@api`/`@component`/`@e2e`. Display text only; no behaviour. |

### Starting your own feature

1. `scripts/bootstrap.sh`, then confirm a clean clone is green (`scripts/pipeline.sh`).
2. Remove the example slice (rows 3–6 above) **or** keep it as a reference and add a new
   `specs/<your-feature>.feature` alongside it.
3. If you rename the API project, fix items #1 and #2 so SPA bundling and `.gitignore` still
   point at it (the cleanest fix is to make both discover the project instead of naming it —
   see [TODO.md](../TODO.md)).
4. Drive the new spec with `atdd-task` / `tdd-task`; the guards do the rest.
