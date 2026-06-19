#!/usr/bin/env bash
set -euo pipefail

# Architecture lane — the "structure" runner. Executes the architecture standards
# from skills/arch-check/SKILL.md as ArchUnit/xUnit tests. A failing standard is a
# build-breaking merge blocker, exactly like a failing acceptance scenario.

PIPELINE_MODE="${PIPELINE_MODE:-local}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

ARCH_PROJECT=tests/architecture/ArchitectureTests.csproj

echo "[arch] Running architecture standards as tests..."

DOTNET_TEST_ARGS="--configuration Release"
if [ "$PIPELINE_MODE" = "azure" ]; then
  DOTNET_TEST_ARGS="$DOTNET_TEST_ARGS --logger trx --results-directory ${AGENT_TEMPDIRECTORY:-/tmp}"
fi

# shellcheck disable=SC2086
dotnet test "$ARCH_PROJECT" $DOTNET_TEST_ARGS
echo "[arch] Architecture standards hold."
