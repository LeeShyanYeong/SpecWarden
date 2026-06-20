#!/usr/bin/env bash
set -euo pipefail

PIPELINE_MODE="${PIPELINE_MODE:-local}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

DOTNET_TEST_ARGS="--no-build --configuration Release"
if [ "$PIPELINE_MODE" = "azure" ]; then
  DOTNET_TEST_ARGS="$DOTNET_TEST_ARGS --logger trx --results-directory ${AGENT_TEMPDIRECTORY:-/tmp}"
fi

# Backend: run unit tests from the first .NET solution under src/backend/, if any.
solution=""
if [ -d src/backend ]; then
  solution="$(find src/backend -maxdepth 2 \( -name '*.slnx' -o -name '*.sln' \) | head -1)"
fi
if [ -n "$solution" ]; then
  echo "[test] Running backend unit tests ($solution)..."
  # shellcheck disable=SC2086
  dotnet test "$solution" $DOTNET_TEST_ARGS
  echo "[test] Backend tests passed."
else
  echo "[test] No .NET solution under src/backend/ — skipping backend tests."
fi

# Frontend: run Angular unit tests, if present.
if [ -d "src/frontend" ]; then
  echo "[test] Running frontend unit tests..."
  # Use the locally-installed Angular CLI (devDependency) rather than a global `ng`.
  ( cd src/frontend && npx ng test --watch=false )
  echo "[test] Frontend tests passed."
else
  echo "[test] src/frontend/ not found — skipping Angular tests."
fi
