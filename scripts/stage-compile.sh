#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Backend: build the first .NET solution found under src/backend/, if any.
solution=""
if [ -d src/backend ]; then
  solution="$(find src/backend -maxdepth 2 \( -name '*.slnx' -o -name '*.sln' \) | head -1)"
fi
if [ -n "$solution" ]; then
  echo "[compile] Building backend ($solution)..."
  dotnet build "$solution" --configuration Release
  echo "[compile] Backend build succeeded."
else
  echo "[compile] No .NET solution under src/backend/ — skipping backend build."
fi

# Frontend: build the Angular workspace, if present.
if [ -d "src/frontend" ]; then
  echo "[compile] Building frontend..."
  # Use the locally-installed Angular CLI (devDependency) rather than a global `ng`.
  ( cd src/frontend && npm ci && npx ng build --configuration production )
  echo "[compile] Frontend build succeeded."
else
  echo "[compile] src/frontend/ not found — skipping Angular build."
fi
