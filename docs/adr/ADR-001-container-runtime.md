# ADR-001: Use Podman as the container runtime

**Status:** Accepted  
**Date:** 2026-06-20

## Context

The pipeline deploy stage (`scripts/stage-deploy.sh`) builds and runs the backend API
as a container so the Cucumber acceptance tests can call it over HTTP. A container
runtime must be installed on every developer machine and CI agent.

Two viable options were evaluated:

| | Docker Engine | Podman |
|---|---|---|
| Daemon required | Yes (`dockerd`) | No (daemonless) |
| Rootless by default | No (requires group or rootless setup) | Yes |
| WSL2 setup | Docker Desktop (GUI installer) or manual daemon start | `apt install podman`, works immediately |
| Docker CLI compatibility | Native | Full (`podman` is CLI-compatible) |
| Bootstrap automation | Requires daemon management after install | None — runs after `apt install` |

The project runs on WSL2 in local development. Docker Engine on WSL2 requires either
Docker Desktop (a Windows GUI installer that cannot be scripted) or a manual `sudo
dockerd &` after each WSL session start (since systemd is not always enabled). Podman
requires neither.

## Decision

Use **Podman** as the primary container runtime.

- `scripts/stage-deploy.sh` resolves the CLI as `podman` first, falling back to `docker`
  so the pipeline works on machines that already have Docker.
- `scripts/bootstrap.sh` installs Podman via `apt` on Linux when no container runtime
  is found.

## Consequences

- Developers on Linux / WSL2 can run the full pipeline immediately after bootstrap with
  no manual daemon setup.
- Dockerfiles are unchanged — Podman builds standard OCI images from them.
- If a CI agent uses Docker (e.g. GitHub Actions default runners), the `docker` fallback
  in `stage-deploy.sh` covers it transparently.
- Any future `docker-compose` usage would need to switch to `podman compose` or
  `podman-compose` (a separate install).

## Enforcement

Infrastructure decision — enforced by scripts, not by an architecture standard:

- `scripts/stage-deploy.sh` resolves `podman` first, falling back to `docker`.
- `scripts/bootstrap.sh` installs Podman via `apt` when no runtime is found.

Relates to **ARCH-1** (executables are containerized) in `skills/arch-check`, which requires the
container definition this runtime builds and runs.
