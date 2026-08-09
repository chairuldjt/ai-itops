#!/usr/bin/env bash
#
# Deployment script for AI Gateway — one-command deploy.
#
# What it does:
#   1. git pull (fast-forward only)
#   2. pnpm install
#   3. Build
#   4. DB migrate + seed (idempotent)
#   5. pm2 restart (preserves pm2 id)
#
# Usage:
#   bash scripts/deploy.sh          # full deploy
#   bash scripts/deploy.sh --skip-build   # db-only update
#   bash scripts/deploy.sh --skip-db      # code-only update
#

set -euo pipefail

APP_NAME="ai-gateway"
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$APP_DIR/logs"

SKIP_BUILD=false
SKIP_DB=false
for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=true ;;
    --skip-db)    SKIP_DB=true ;;
  esac
done

echo "========================================"
echo "  AI Gateway — Deploy"
echo "========================================"
echo ""

# ── 1. Check prerequisites ────────────────────────────────────
echo "📋 Checking prerequisites..."

command -v node  >/dev/null 2>&1 || { echo "❌ Node.js not found";  exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm not found";     exit 1; }
command -v pm2  >/dev/null 2>&1 || { echo "❌ PM2 not found";      exit 1; }
command -v git  >/dev/null 2>&1 || { echo "❌ git not found";      exit 1; }

echo "   ✅ Node $(node -v)  pnpm $(pnpm -v)  PM2 $(pm2 -v 2>/dev/null || echo '?')"

# ── 2. Check .env ─────────────────────────────────────────────
if [ ! -f "$APP_DIR/.env" ]; then
  echo ""
  echo "❌ .env not found. Copy from .env.example and fill in values:"
  echo "   cp .env.example .env && nano .env"
  exit 1
fi
echo "   ✅ .env found"

# ── 2b. Validate BETTER_AUTH_SECRET (must be strong in production) ──
AUTH_SECRET=$(grep -E '^BETTER_AUTH_SECRET=' "$APP_DIR/.env" | head -n1 | cut -d= -f2- || true)
if [ -z "$AUTH_SECRET" ] || [ "${#AUTH_SECRET}" -lt 32 ] || [ "$AUTH_SECRET" = "change-me-to-a-long-random-secret-at-least-32-chars" ]; then
  echo ""
  echo "❌ BETTER_AUTH_SECRET is missing or too weak in .env."
  echo "   Production refuses to start with a weak/known secret (session-forgery risk)."
  echo ""
  echo "   Fix it with one command (replaces the current value):"
  echo "     sed -i \"s|^BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=\$(openssl rand -base64 48)|\" .env"
  echo ""
  echo "   ⚠️  Changing the secret signs out all existing sessions."
  exit 1
fi
echo "   ✅ BETTER_AUTH_SECRET looks strong"

cd "$APP_DIR"

# ── 3. Git pull ───────────────────────────────────────────────
echo ""
echo "📥 Pulling latest code..."
git pull --ff-only
echo "   ✅ On $(git rev-parse --short HEAD)"

# ── 4. Install dependencies ───────────────────────────────────
echo ""
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile 2>/dev/null || pnpm install
echo "   ✅ Dependencies installed"

# ── 5. Build ──────────────────────────────────────────────────
if [ "$SKIP_BUILD" = false ]; then
  echo ""
  echo "🔨 Building..."
  pnpm build
  # Copy static assets for standalone output
  cp -r .next/static .next/standalone/.next/static 2>/dev/null || true
  cp -r public .next/standalone/public 2>/dev/null || true
  echo "   ✅ Build complete"
else
  echo ""
  echo "⏭️  Skipping build (--skip-build)"
fi

# ── 5b. Ship .env into the standalone bundle ─────────────────
# The standalone server chdirs to .next/standalone, so Next's loadEnvConfig
# and dotenv both resolve .env from THERE — not from the repo root. Without
# this copy the app boots without DATABASE_URL/BETTER_AUTH_SECRET and every
# DB/auth route 500s even though the deploy "succeeded".
if [ -d "$APP_DIR/.next/standalone" ]; then
  install -m 600 "$APP_DIR/.env" "$APP_DIR/.next/standalone/.env"
  echo "   ✅ .env copied into standalone output"
fi

# ── 6. Database migrate + seed ────────────────────────────────
if [ "$SKIP_DB" = false ]; then
  echo ""
  echo "🗄️  Database setup..."
  node scripts/init-db.mjs
  echo "   ✅ Database ready"
else
  echo ""
  echo "⏭️  Skipping DB (--skip-db)"
fi

# ── 7. Logs directory ─────────────────────────────────────────
mkdir -p "$LOG_DIR"

# ── 8. PM2 restart (not delete+start — preserves pm2 id) ─────
echo ""
echo "🔄 Restarting PM2..."

if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  # --update-env: pick up changed env vars from ecosystem.config.cjs;
  # without it PM2 keeps the environment captured at first start.
  pm2 restart "$APP_NAME" --update-env
  echo "   ✅ Restarted (same pm2 id)"
else
  # First time — start from ecosystem config
  pm2 start ecosystem.config.cjs
  pm2 save
  pm2 startup 2>/dev/null || true
  echo "   ✅ Started (new pm2 id)"
fi

# ── 9. Post-restart health check ──────────────────────────────
PORT=$(grep -E "^PORT=" "$APP_DIR/.env" | cut -d= -f2 || echo "9003")
echo ""
echo "🩺 Health check on http://localhost:${PORT}/api/health ..."

if command -v curl >/dev/null 2>&1; then
  HEALTH_OK=false
  for _ in $(seq 1 15); do
    if curl -fsS --max-time 5 "http://localhost:${PORT}/api/health" >/dev/null 2>&1; then
      HEALTH_OK=true
      break
    fi
    sleep 2
  done
  if [ "$HEALTH_OK" = true ]; then
    echo "   ✅ App is healthy"
  else
    echo ""
    echo "❌ Health check FAILED — the app did not become healthy within ~30s."
    echo "   The deploy is NOT verified. Inspect logs:"
    echo "     pm2 logs $APP_NAME --lines 50"
    exit 1
  fi
else
  echo "   ⚠️  curl not found — skipping health check (verify manually)"
fi

echo ""
echo "========================================"
echo "  ✅ Deploy complete!"
echo "========================================"

echo ""
echo "  App:     http://localhost:${PORT}"
echo "  Status:  pm2 status"
echo "  Logs:    pm2 logs $APP_NAME --lines 50"
echo ""
