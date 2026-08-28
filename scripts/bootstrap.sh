#!/usr/bin/env bash
#
# One-command local setup.
#
#   pnpm bootstrap
#
# Copies env files if they are missing, starts Postgres/Redis/Mailpit, applies
# migrations, and seeds. Safe to re-run: existing env files are never
# overwritten, and the seed upserts.
set -euo pipefail

cd "$(dirname "$0")/.."

info()  { printf '\033[0;36m==>\033[0m %s\n' "$1"; }
warn()  { printf '\033[0;33m warn\033[0m %s\n' "$1"; }
fail()  { printf '\033[0;31merror\033[0m %s\n' "$1" >&2; exit 1; }

command -v pnpm >/dev/null || fail "pnpm is required: https://pnpm.io/installation"

if command -v docker >/dev/null && docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v podman-compose >/dev/null; then
  COMPOSE="podman-compose"
else
  fail "Docker Compose (or podman-compose) is required to run Postgres and Redis."
fi

copy_env() {
  local example="$1" target="$2"
  if [ -f "$target" ]; then
    info "$target already exists, leaving it alone"
  else
    cp "$example" "$target"
    info "created $target"
  fi
}

info "Copying env files"
copy_env apps/api/.env.example      apps/api/.env
copy_env apps/api/.env.test.example apps/api/.env.test
copy_env apps/web/.env.example      apps/web/.env.local

info "Installing dependencies"
pnpm install

info "Starting Postgres, Redis, and Mailpit"
$COMPOSE up -d

info "Waiting for Postgres to accept connections"
for _ in $(seq 1 30); do
  if $COMPOSE exec -T postgres pg_isready -U app_starter -d app_starter >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

info "Applying migrations"
pnpm --filter @app-starter/api exec prisma migrate deploy

info "Seeding demo data"
pnpm --filter @app-starter/api run prisma:seed

cat <<'DONE'

Setup complete.

  pnpm dev            start the API and web app
  http://localhost:3000   web
  http://localhost:3001   API
  http://localhost:8025   Mailpit (all outbound email lands here)

Sign in with the seeded accounts:

  owner@example.com  / Password123!   (also a global admin)
  member@example.com / Password123!
DONE
