---
name: bootstrap
description: >-
  Use when setting up a fresh clone or resolving missing/wrong-version system
  dependencies. Triggers on: "set up the project", "install dependencies",
  "bootstrap", "can't build", "tool not found", or whenever a new runtime or
  CLI tool is introduced into the project.
version: 1.0.0
---

# Bootstrap

Detect and install all system tools and project packages needed to build,
test, and run this workspace. A single command gets a fresh clone to `pipeline.sh` green.

## Entry points

| Scenario                          | Action                            |
| --------------------------------- | --------------------------------- |
| Fresh clone / new contributor     | Run `scripts/bootstrap.sh`        |
| Existing clone, something broken  | Run `scripts/bootstrap.sh` (idempotent — safe to re-run) |
| New system tool added to project  | Update `scripts/bootstrap.sh` (see Maintenance below) |
| Version bump on existing tool     | Update `global.json` / `.nvmrc` + `DOTNET_MIN_MAJOR` / `NODE_MIN_MAJOR` in `bootstrap.sh` |

## What bootstrap.sh does

Installs system-level tools only. Project packages (`dotnet restore`, `npm ci`,
`playwright install`) are **not** here — they run in the compile stage
(`scripts/stage-compile.sh`) so they're always fresh and in sync with lock files.

| Tool        | Min version | Installed via                        | Pin file        |
| ----------- | ----------- | ------------------------------------ | --------------- |
| .NET SDK    | 10          | `dotnet-install.sh` → `~/.dotnet`   | `global.json`   |
| Node.js     | 22          | `nvm` → `~/.nvm`                     | `.nvmrc`        |
| Podman      | any         | `apt install podman` (Linux)         | —               |

Each check is idempotent: if the right version is already present, the step
is skipped immediately.

## Running it

```bash
bash scripts/bootstrap.sh
```

Then verify with:

```bash
bash scripts/pipeline.sh
```

## Maintenance — when to update bootstrap.sh

Update `scripts/bootstrap.sh` **whenever** a new system-level tool is
introduced (a new language runtime, a new globally-required CLI). The rule:

> If the tool is installed with `npm ci` / `dotnet restore` / `pip install -r`
> → no bootstrap change needed (the restore command picks it up automatically).
>
> If the tool has to be present on PATH **before** the project can build at all
> → add a `check_<tool>` / `_install_<tool>` pair to Phase 1.

### Checklist for adding a new system tool

1. Write `_install_<tool>()` — download and install to a user-local path (no sudo).
2. Write `check_<tool>()` — detect the right version and call `_install_<tool>` if not met.
3. Call `check_<tool>` in Phase 1.
4. Add the tool to the Phase 1 table in this SKILL.md.
5. If the tool has a version pin file (`.tool-version`, `pyproject.toml`, etc.), add it
   to the "Pin file" column and the version constants at the top of `bootstrap.sh`.
6. Run `bash scripts/bootstrap.sh` on a clean environment to verify.

## Shell profile note

System tools are installed user-locally. The script prints the export lines
to add to `~/.bashrc` / `~/.zshrc` so the tools survive a new shell session:

```bash
# .NET
export DOTNET_ROOT="${HOME}/.dotnet"
export PATH="${DOTNET_ROOT}:${DOTNET_ROOT}/tools:${PATH}"

# nvm / Node
export NVM_DIR="${HOME}/.nvm"
[ -s "${NVM_DIR}/nvm.sh" ] && . "${NVM_DIR}/nvm.sh"
```
