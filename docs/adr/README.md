# Architecture Decision Records (ADR)

Each ADR captures one architecturally-significant decision: its **context**, the **decision**,
and the **consequences**. ADRs are **narrative** — the *why* behind a constraint.

A decision only becomes binding when it lands in a guarded layer (each ADR names this in its
**Enforcement** field):

- an `ARCH-n` standard with a `[Fact]` test in `tests/architecture/` (see `../../skills/arch-check`), or
- a pipeline script / config stage (e.g. `scripts/stage-deploy.sh`), or
- a `specs/<feature>.feature` header reference (feature-specific).

An ADR marked **Enforcement: Advisory** is a decision nothing guards yet — a candidate to promote.

Start a new ADR by copying [ADR-000-template.md](ADR-000-template.md). Number sequentially; never
renumber or delete an accepted ADR — supersede it with a new one.

| ADR | Decision | Status | Enforcement |
|---|---|---|---|
| [ADR-001](ADR-001-container-runtime.md) | Use Podman as the container runtime | Accepted | Script — `scripts/stage-deploy.sh` + `scripts/bootstrap.sh` (relates to ARCH-1) |
| [ADR-002](ADR-002-single-deployable-unit.md) | Bundle the Angular SPA into the API as a single deployable unit | Accepted | Script — `scripts/stage-compile.sh` + `Program.cs` / `Dockerfile` (relates to ARCH-1) |
