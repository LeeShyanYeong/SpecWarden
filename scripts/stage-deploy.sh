#!/usr/bin/env bash
set -euo pipefail

PIPELINE_MODE="${PIPELINE_MODE:-local}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Discover service Dockerfiles under src/. A bare template has none — nothing to deploy.
mapfile -t DOCKERFILES < <(find src -maxdepth 3 -name Dockerfile 2>/dev/null | sort)
if [ "${#DOCKERFILES[@]}" -eq 0 ]; then
  echo "[deploy] No Dockerfile under src/ — nothing to deploy, skipping."
  exit 0
fi

if [ "$PIPELINE_MODE" = "azure" ]; then
  # TODO: implement when an Azure (or other) deployment target is chosen — push the
  # built images to a registry and update the running service. See git history for a
  # worked example, or fill in with: build -> registry login -> push -> app update.
  echo "[deploy] Azure deploy not implemented for this template — skipping."
  exit 0
fi

# Use podman if available, fall back to docker.
CONTAINER_CLI="$(command -v podman || command -v docker || true)"
if [ -z "$CONTAINER_CLI" ]; then
  echo "[deploy] ERROR: neither podman nor docker found on PATH."
  exit 1
fi
echo "[deploy] Using container runtime: $CONTAINER_CLI"

stop_container_if_running() {
  local name="$1"
  if "$CONTAINER_CLI" ps -a --format '{{.Names}}' | grep -q "^${name}$"; then
    echo "[deploy] Stopping existing container '$name'..."
    "$CONTAINER_CLI" stop "$name" >/dev/null
    "$CONTAINER_CLI" rm   "$name" >/dev/null
  fi
}

# Build and run each discovered service. Host ports are assigned sequentially from
# 8080; the container port is assumed to be 8080 (adjust per service as needed).
port=8080
for dockerfile in "${DOCKERFILES[@]}"; do
  context="$(dirname "$dockerfile")"
  name="$(basename "$context" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9' '-' | sed 's/-*$//')"
  image="${name}:local"

  echo "[deploy] Building $image from $context..."
  "$CONTAINER_CLI" build -t "$image" -f "$dockerfile" "$context"

  stop_container_if_running "$name"
  echo "[deploy] Starting '$name' at http://localhost:$port ..."
  "$CONTAINER_CLI" run -d -p "${port}:8080" --name "$name" "$image"
  port=$((port + 1))
done

echo "[deploy] Local deploy complete."
