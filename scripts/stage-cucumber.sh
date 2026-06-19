#!/usr/bin/env bash
set -euo pipefail

PIPELINE_MODE="${PIPELINE_MODE:-local}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

ACCEPTANCE_PROJECT=tests/acceptance/reqnroll/
FEATURES_DIR=tests/acceptance/reqnroll/Features

echo "[cucumber] Syncing feature files with @api scenarios from specs/ into Reqnroll Features/..."
cd "$REPO_ROOT"

# Tag-based routing: this lane owns the @api level — the REST contract. A story
# file may also carry @e2e/@component scenarios (Playwright's job, see
# tests/acceptance/playwright/sync-specs.mjs); we copy the whole file but run
# only its @api scenarios via the Category=api filter below, so Reqnroll is never
# asked to bind the browser-level steps it has no definitions for.
# Clear both the synced .feature files and any stale generated code-behind, so a
# renamed/removed spec can't leave an orphaned *.feature.cs (Reqnroll warns on it).
find "$FEATURES_DIR" -maxdepth 1 \( -name '*.feature' -o -name '*.feature.cs' \) -delete
synced=0
for feature in specs/*.feature; do
  [ -f "$feature" ] || continue   # no specs yet — glob unexpanded
  if grep -q '@api' "$feature"; then
    cp --remove-destination "$feature" "$FEATURES_DIR/"
    synced=$((synced + 1))
  fi
done
echo "[cucumber] Synced $synced feature file(s) with @api scenarios."

echo "[cucumber] Running acceptance tests..."

# Run only the @api scenarios in the synced files (Category=api). This excludes
# both the browser-level scenarios (no C# bindings) and any @performance NFRs.
DOTNET_TEST_ARGS="--configuration Release --filter Category=api"
if [ "$PIPELINE_MODE" = "azure" ]; then
  DOTNET_TEST_ARGS="$DOTNET_TEST_ARGS --logger trx --results-directory ${AGENT_TEMPDIRECTORY:-/tmp}"
fi

# shellcheck disable=SC2086
dotnet test $ACCEPTANCE_PROJECT $DOTNET_TEST_ARGS
