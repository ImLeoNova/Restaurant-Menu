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

# Default to docker, use sudo if needed
DOCKER_CMD="docker"
if ! docker info >/dev/null 2>&1; then
  if sudo -n docker info >/dev/null 2>&1; then
    DOCKER_CMD="sudo docker"
  else
    echo "Cannot access Docker daemon (permission denied) and passwordless sudo is unavailable." >&2
    echo "Log the deploy user out/in after installing Docker, or grant NOPASSWD sudo." >&2
    exit 1
  fi
fi

if ! $DOCKER_CMD compose version >/dev/null 2>&1; then
  echo "Docker Compose plugin is not available." >&2
  exit 1
fi

$DOCKER_CMD compose -f Backend/docker-compose.yaml down --remove-orphans || true
$DOCKER_CMD compose -f Backend/docker-compose.yaml up -d --build

echo "Waiting for containers to stabilize..."
sleep 5

echo "Deployment status:"
$DOCKER_CMD compose -f Backend/docker-compose.yaml ps

# Check if any containers exited unexpectedly
UNHEALTHY=$($DOCKER_CMD compose -f Backend/docker-compose.yaml ps --format json 2>/dev/null \
  | grep -c '"State":"exited"' || echo 0)

if [ "$UNHEALTHY" -gt 0 ]; then
  echo "One or more containers exited unexpectedly. Check logs with:" >&2
  echo "  docker compose -f Backend/docker-compose.yaml logs" >&2
  exit 1
fi

echo "Checking if S3 image migration is needed..."
MIGRATION_NEEDED=$($DOCKER_CMD compose -f Backend/docker-compose.yaml exec -T backend python -c "
import sys
sys.path.insert(0, '.')
from core.database import execute_query
try:
    row = execute_query(\"SELECT COUNT(*) AS total FROM categories WHERE image IS NOT NULL AND image != '' AND image NOT LIKE 'images/%'\", fetchone=True)
    count = int(row.get('total') or 0) if row else 0
    print(count)
except Exception as e:
    print('0')
" || echo "0")

if [ "$MIGRATION_NEEDED" -gt 0 ]; then
  echo "Unmigrated images found ($MIGRATION_NEEDED records). Running migration..."
  
  cat > Backend/docker-compose.migrate.yml <<EOF
services:
  backend:
    volumes:
      - ./products:/app/products:ro
      - ./categories:/app/categories:ro
EOF

  if $DOCKER_CMD compose -f Backend/docker-compose.yaml -f Backend/docker-compose.migrate.yml exec -T backend python scripts/migrate_images_to_s3.py up; then
    echo "Migration completed successfully."
  else
    echo "Migration failed. Check logs above." >&2
  fi

  rm -f Backend/docker-compose.migrate.yml
  
  echo "Restarting backend without migration volumes..."
  $DOCKER_CMD compose -f Backend/docker-compose.yaml up -d --force-recreate backend
  sleep 3
else
  echo "No unmigrated images found. Skipping migration."
fi

echo "Deployment completed successfully."