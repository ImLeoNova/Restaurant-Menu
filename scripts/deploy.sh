#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f Backend/.env ]; then
  echo "Backend/.env was not found. Create it before deploying." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed on this server." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose plugin is not available." >&2
  exit 1
fi

docker compose -f Backend/docker-compose.yaml down --remove-orphans || true
docker compose -f Backend/docker-compose.yaml up -d --build

echo "Deployment completed."
docker compose -f Backend/docker-compose.yaml ps
