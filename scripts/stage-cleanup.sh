#!/usr/bin/env bash
set -euo pipefail

CONTAINER_CLI="$(command -v podman || command -v docker || true)"
if [ -z "$CONTAINER_CLI" ]; then
  echo "[cleanup] No container runtime found — nothing to clean."
  exit 0
fi

# TODO: In future, discover project-owned containers by scanning scripts/ for
#       IMAGE_TAG_LOCAL / CONTAINER_NAME definitions, so only project containers
#       are removed rather than all containers on the machine.

mapfile -t containers < <("$CONTAINER_CLI" ps -a --format '{{.Names}}' 2>/dev/null || true)

if [ ${#containers[@]} -eq 0 ]; then
  echo "[cleanup] No containers found — nothing to clean."
  exit 0
fi

echo "[cleanup] Stopping and removing ${#containers[@]} container(s)..."
for name in "${containers[@]}"; do
  echo "[cleanup]   - $name"
  "$CONTAINER_CLI" stop "$name" >/dev/null 2>&1 || true
  "$CONTAINER_CLI" rm   "$name" >/dev/null 2>&1 || true
done
echo "[cleanup] Done."
