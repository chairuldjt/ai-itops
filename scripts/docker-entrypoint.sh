#!/bin/sh
# Container entrypoint: initialize the database, then start the server.
#
# - Applies SQL migrations from ./drizzle (idempotent, journaled in
#   __drizzle_migrations) on every start.
# - Seeds the admin user when SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD are set
#   (idempotent; skips silently if the user already exists). In production the
#   seed refuses weak passwords and the container will fail fast — by design.
# - Set RUN_DB_INIT=0 to skip DB init (e.g. when migrations are applied
#   out-of-band).
set -e

if [ "${RUN_DB_INIT:-1}" != "0" ]; then
  echo "[entrypoint] running database migrations..."
  node scripts/migrate.mjs

  if [ -n "${SEED_ADMIN_EMAIL:-}" ] && [ -n "${SEED_ADMIN_PASSWORD:-}" ]; then
    echo "[entrypoint] seeding admin user (idempotent)..."
    ./node_modules/.bin/tsx src/lib/db/seed.ts
  else
    echo "[entrypoint] SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD not set — skipping admin seed"
  fi
else
  echo "[entrypoint] RUN_DB_INIT=0 — skipping database initialization"
fi

exec node server.js
