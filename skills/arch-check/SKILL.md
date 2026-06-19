---
name: arch-check
description: >-
  Use when implementing or reviewing non-boilerplate code, to confirm it
  satisfies the project's architecture standards. Triggers on: "does this follow
  our architecture?", "arch check", "are the standards met?", and as part of
  tdd-task (during refactor) and code-review. Holds the standing list of
  architecture rules and how to apply them.
version: 1.0.0
---

# Architecture Check

The canonical list of architecture standards every non-boilerplate change must
satisfy, plus how to apply and verify each one. This skill is **referenced** by
`tdd-task` (refactor step) and `code-review`, and is the source of truth when
those skills say "follows the architecture standards".

## Executable enforcement (the guard)

The mechanically-checkable parts of these standards are enforced as tests in
`tests/architecture/` (xUnit + ArchUnitNET), run by `dotnet test` and the CI
`Architecture` stage (`scripts/stage-arch.sh`). A failing standard breaks the
build — the same guarantee the Reqnroll/Playwright lanes give for behaviour.

- Each `ARCH-n` below maps to a `[Fact]` named `ArchN_…`: ARCH-1/2/3 are
  filesystem / project-shape facts (`StructuralStandards.cs`); ARCH-4 is a set of
  dependency rules over the real backend assembly (`DependencyStandards.cs`).
- This file stays the **rationale and index** (the *why*); the test project is
  the **enforcement** (the *what*). When you add or change a standard, update both
  and keep the `ARCH-n ⇄ [Fact]` mapping 1:1.
- Run it directly with `dotnet test tests/architecture/`.
- The judgment-only parts of ARCH-4 (single responsibility, no duplication) are
  not mechanically checkable and remain a manual concern in the Steps below.

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
the easier it later becomes a hook (see Notes).
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
