#!/usr/bin/env bash
set -euo pipefail

# Playwright lane — the browser behaviour runner for @e2e and @component specs.
# Same guard chain as the Reqnroll lane: SSOT specs/ are synced in, playwright-bdd
# generates runnable specs (bddgen), and the runner executes them.
#
# Wiring is verified (sync + bddgen) whenever specs exist. Full execution needs a
# running app, so it is gated on src/frontend existing — mirroring how
# stage-compile.sh / stage-test.sh skip an absent Angular app.
# On a bare template (no specs yet) the stage exits 0 silently.

PIPELINE_MODE="${PIPELINE_MODE:-local}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LANE="$REPO_ROOT/tests/acceptance/playwright"
cd "$LANE"

echo "[playwright] Installing lane dependencies..."
if [ -f package-lock.json ]; then npm ci; else npm install; fi

echo "[playwright] Syncing and code-generating specs..."
npm run gen            # sync specs/ -> features/, then codegen; fails on unbound steps

# Count synced feature files; nothing to do on a bare template.
feature_count=$(find "$LANE/features" -maxdepth 1 -name '*.feature' 2>/dev/null | wc -l)
if [ "$feature_count" -eq 0 ]; then
  echo "[playwright] No @e2e/@component specs yet — skipping (add specs to specs/ to activate)."
  exit 0
fi

echo "[playwright] Verifying step bindings (--list)..."
npx playwright test --list >/dev/null
echo "[playwright] Wiring OK — all steps bind."

if [ ! -d "$REPO_ROOT/src/frontend" ]; then
  echo "[playwright] src/frontend/ not found — skipping execution (no app to drive yet)."
  echo "[playwright] @e2e/@component specs go red the moment a frontend exists and is served."
  exit 0
fi

echo "[playwright] Installing browsers and running @e2e + @component specs..."
# CI installs OS-level browser dependencies too (requires root); locally we assume
# the developer already has them (npx playwright install-deps, run once with sudo).
if [ "$PIPELINE_MODE" = "azure" ]; then
  npx playwright install --with-deps chromium
else
  npx playwright install chromium
fi

# FRONTEND_BASE_URL / API_BASE_URL must point at the running app + API.
# (Serving the Angular app is the deploy stage's job once the frontend exists.)
if [ "$PIPELINE_MODE" = "azure" ]; then
  CI=1 npm test
else
  npm test
fi
echo "[playwright] @e2e + @component specs passed."
