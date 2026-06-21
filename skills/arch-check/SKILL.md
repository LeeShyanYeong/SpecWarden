---
name: arch-check
description: >-
  Use when implementing or reviewing non-boilerplate code, to confirm it
  satisfies the project's architecture standards. Triggers on: "does this follow
  our architecture?", "arch check", "are the standards met?", and as part of
  tdd-task (during refactor) and code-review. Holds the standing list of
  architecture rules and how to apply them.
version: 1.1.0
---

# Architecture Check

The canonical list of architecture standards every non-boilerplate change must
satisfy, plus how to apply and verify each one. This skill is **referenced** by
`tdd-task` (refactor step) and `code-review`, and is the source of truth when
those skills say "follows the architecture standards".

## Executable enforcement (the guard)

The mechanically-checkable parts of these standards are enforced as tests in
`tests/architecture/` (plain xUnit), run by `dotnet test` and the CI
`Architecture` stage (`scripts/stage-arch.sh`). A failing standard breaks the
build — the same guarantee the Reqnroll/Playwright lanes give for behaviour.

- The enforced standards each map to a `[Fact]`: ARCH-1/2/3 are filesystem /
  project-shape checks (`StructuralStandards.cs`), and the spec-lifecycle guard
  SPEC-1 (no spec left a stub) lives in `SpecHygieneStandards.cs`. These are plain
  filesystem and text checks — there is **no** assembly/dependency analysis today
  (no ArchUnitNET; if that's ever added, update this section and the README/docs).
- **ARCH-4 is not enforced by a test.** It is entirely judgment-based and stays a
  manual concern in the Steps below — there is no `[Fact]` for it.
- This file stays the **rationale and index** (the *why*); the test project is
  the **enforcement** (the *what*). When you add or change a *mechanically-checkable*
  standard, update both and add its `[Fact]`; judgment-only standards stay here only.
- Run it directly with `dotnet test tests/architecture/`.

## Where standards come from (ADRs)

The architecturally-significant decisions behind these standards are recorded as
**Architecture Decision Records** in `docs/adr/`: that folder is the *why* (rationale),
this file is the *what* (the standing rules), and `tests/architecture/` is the
*enforcement*. An ADR on its own binds nothing — a decision becomes a guarded constraint
only when it lands here as an `ARCH-n` standard with a matching `[Fact]`.

- When an ADR makes a **binding** decision about how production code must be shaped,
  promote it to a new `ARCH-n` standard (Rule + Check) and, **if it is mechanically
  checkable**, add its `[Fact]` — exactly as for any other enforced standard.
- Leave **infrastructure / tooling** ADRs (container runtime, CI image, …) in `docs/adr/`
  only; they are enforced by their scripts, not by an architecture standard.
- Cross-link the two: cite the ADR id in the standard's **Rationale** line, and name the
  standard in the ADR's **Enforcement** field. See [docs/adr/](../../docs/adr/).

## When it applies

Applies to **production code that implements behaviour**. Exempt (use judgement):

- Boilerplate and scaffolding (generated files, config, lockfiles).
- Project setup / tooling (CI config, build scripts, `dist/`, `node_modules/`).
- Throwaway spikes explicitly marked as such.

## Standards

Each rule has an **id**, the **rule**, and a **check** (how to confirm it holds).

### ARCH-1 — Executables are containerized

- **Rule:** Anything meant to be run as a standalone executable/service ships
  with a container definition (a `Dockerfile`, or a service entry in
  `docker-compose.yml`). It must build and run in the container, not only on a
  host with ad-hoc local setup.
- **Check:** The executable's directory has a `Dockerfile`; the image builds;
  the entrypoint starts the process. No undocumented host-only dependencies.
- **Rationale:** The runtime that builds and runs these containers is chosen in
  [ADR-001](../../docs/adr/ADR-001-container-runtime.md) (Podman, with a `docker` fallback).

### ARCH-2 — Backend is ASP.NET Core (.NET)

- **Rule:** Backend services are built on ASP.NET Core (**.NET 10**, current LTS) in C#.
  Don't introduce other backend runtimes for service code.
- **Check:** The backend is a .NET project (`*.csproj` / `*.sln`); it builds with
  `dotnet build` and its tests run with `dotnet test`.

### ARCH-3 — Frontend is Angular

- **Rule:** The web frontend is an Angular application (TypeScript). Don't
  introduce a second frontend framework for app UI.
- **Check:** The frontend is an Angular workspace (`angular.json`); it builds with
  `ng build` and its tests run with `ng test`.

### ARCH-4 — Clean-code discipline

- **Rule:** Production code follows clean-code practices: each unit has a single
  responsibility; no copy-paste duplication; collaborators are injected (DI), not
  hard-wired; names state intent; **no business logic in controllers (.NET) or
  components (Angular)** — keep it in services. (No mandated layered/Clean
  Architecture folder structure — discipline, not prescribed folders.)
- **Check:** At review — units are small and single-purpose, controllers/components
  delegate to services, dependencies arrive via constructor injection, and there
  is no obvious duplication.

<!--
Add new standards below as ARCH-5, ARCH-6, … Keep each one in the same shape:
a one-line Rule and a concrete, observable Check. The more checkable the Check,
the easier it later becomes a hook (see Notes). If the standard codifies an ADR
decision, add a **Rationale** line linking the ADR and set that ADR's Enforcement
field to this standard.
-->

## Steps

1. Run the executable guard first: `dotnet test tests/architecture/`. A red test
   is a definitive Fail for that `ARCH-n`.
2. Identify which standards apply to the change (skip exempt files above).
3. For each applicable standard, confirm its **Check** — relying on the test where
   one exists, and judging by hand where it does not (e.g. ARCH-4 duplication).
4. Report per standard: **Pass** / **Fail** / **N/A**, with the offending
   `file:line` for any Fail.
5. A Fail on any standard is a **Blocker** — the change isn't done until it
   passes or the exemption is justified in writing.

## Notes

- Keep rules concrete and observable; vague rules ("be clean") don't belong here.
- Standards with a mechanical Check (e.g. ARCH-1's "Dockerfile exists") are good
  candidates to promote into a `settings.json` hook later for hard enforcement.
- This is unit/component-level architecture hygiene, not a full design review.
