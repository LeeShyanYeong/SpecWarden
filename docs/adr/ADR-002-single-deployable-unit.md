# ADR-002: Bundle the Angular SPA into the API as a single deployable unit

**Status:** Accepted  
**Date:** 2026-06-20

## Context

The product is an ASP.NET Core API plus an Angular SPA. Two shapes were available for
shipping and running them:

| | Two units (API + SPA host) | One unit (SPA bundled into the API) |
|---|---|---|
| Containers / processes | Two (API + a static host or `ng serve`) | One |
| Origins / ports | Two (e.g. API `:8080`, SPA `:4200`) | One (`:8080`) |
| Cross-origin (CORS) | Required between SPA and API | None — same origin |
| Acceptance test wiring | Must coordinate two origins | Single base URL for every lane |
| Deploy / ops surface | Two artifacts to build, version, run | One artifact |

This is a small reference project optimised for a single agent and a simple pipeline.
A second served origin would add CORS configuration, a second container in the deploy
stage, and a split between `@component`/`@e2e` base URLs — overhead with no benefit at
this size. Serving the SPA's static build from the API removes all of it.

## Decision

We will **ship the frontend and backend as one container on one port (8080)**: the
Angular production build is bundled into the API's `wwwroot/` at compile time and served
by the API.

- `scripts/stage-compile.sh` runs `ng build --configuration production` and copies
  `src/frontend/dist/frontend/browser/` into the API's `wwwroot/`.
- `src/backend/StickyNotes.Api/Program.cs` serves it via `UseDefaultFiles()` +
  `UseStaticFiles()`, with `MapFallbackToFile("index.html")` so client-side routes resolve.
- `dotnet publish` (Web SDK) bakes `wwwroot/` into the published image, so the single
  `Dockerfile` produces one image serving both the UI and `/api/*`.
- Acceptance lanes therefore default to a single origin (`http://localhost:8080`): both
  `@component` route-stubbing and `@e2e` live calls hit the same relative `/api/board` URL,
  rather than a separate `ng serve` on 4200.

Scope limit: this is the right trade-off while the app is one SPA + one API. A product
that needs the frontend on a CDN, independent frontend/backend release cadences, or
horizontal scaling of just one tier should revisit this and supersede it with a new ADR.

## Consequences

- **Easier:** one artifact to build, version, deploy, and run; no CORS; one base URL for
  every test lane; the `@e2e` smoke and `@component` stubs share relative API paths.
- **Harder / follow-ups:** frontend and backend can no longer be released independently —
  any UI change rebuilds and redeploys the whole image. The compile stage couples the two
  (`stage-compile.sh` must run the Angular build before `dotnet publish`). Renaming the API
  project means updating the `wwwroot/` bundle path in `stage-compile.sh` and the
  `src/backend/StickyNotes.Api/wwwroot/` `.gitignore` entry (tracked in `TODO.md`).

## Enforcement

**Script / config** — an infrastructure decision, guarded by the pipeline rather than an
architecture standard (the same posture as [ADR-001](ADR-001-container-runtime.md)):

- `scripts/stage-compile.sh` builds the SPA and copies it into the API's `wwwroot/`.
- `src/backend/StickyNotes.Api/Program.cs` serves the bundle (`UseStaticFiles` +
  `MapFallbackToFile`); `src/backend/StickyNotes.Api/Dockerfile` bakes it into the image.
- The acceptance lanes consume the result through a single origin (`http://localhost:8080`),
  so a regression that splits the two surfaces breaks the `@api`/`@e2e`/`@component` lanes.

Relates to **ARCH-1** (executables are containerized) in `skills/arch-check`: this decides
*what* that one container holds. If a build-breaking guard on single-origin serving is later
wanted, promote it to a new `ARCH-n` standard with a matching `[Fact]` and cross-link it here.
