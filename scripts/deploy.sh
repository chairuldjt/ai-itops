#!/usr/bin/env bash
#
# Deployment script for AI Gateway on Linux server with PM2.
#
# Prerequisites:
#   - Node.js 22+ installed
#   - pnpm installed (npm install -g pnpm)
#   - PM2 installed (npm install -g pm2)
#   - PostgreSQL 16+ running and accessible
#   - Git (for cloning the repo)
#
# Usage:
#   chmod +x scripts/deploy.sh
#   ./scripts/deploy.sh
#
# Environment:
#   Set variables in .env file before running this script.
#   See .env.example for all available options.
#

set -euo pipefail

APP_NAME="ai-gateway"
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$APP_DIR/logs"

echo "========================================"
echo "  AI Gateway — Deployment Script"
echo "========================================"
echo ""

# --------------------------------------------------
# 1. Check prerequisites
# --------------------------------------------------
echo "📋 Checking prerequisites..."

command -v node >/dev/null 2>&1 || { echo "❌ Node.js not found. Install: curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm not found. Install: npm install -g pnpm"; exit 1; }
command -v pm2 >/dev/null 2>&1 || { echo "❌ PM2 not found. Install: npm install -g pm2"; exit 1; }

echo "   ✅ Node.js $(node -v)"
echo "   ✅ pnpm $(pnpm -v)"
echo "   ✅ PM2 $(pm2 -v)"

# --------------------------------------------------
# 2. Check .env file
# --------------------------------------------------
echo ""
echo "📋 Checking environment..."

if [ ! -f "$APP_DIR/.env" ]; then
  echo "   ⚠️  .env file not found. Creating from .env.example..."
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  echo "   ⚠️  Please edit .env with your actual values before continuing."
  echo "   ⚠️  At minimum, set: DATABASE_URL, BETTER_AUTH_SECRET, NEXT_PUBLIC_APP_URL"
  echo ""
  echo "   Run: nano $APP_DIR/.env"
  echo "   Then re-run this script."
  exit 1
fi

echo "   ✅ .env file found"

# --------------------------------------------------
# 3. Install dependencies
# --------------------------------------------------
echo ""
echo "📦 Installing dependencies..."
cd "$APP_DIR"
pnpm install --frozen-lockfile
echo "   ✅ Dependencies installed"

# --------------------------------------------------
# 4. Initialize database
# --------------------------------------------------
echo ""
echo "🗄️  Initializing database..."
node scripts/init-db.mjs
echo "   ✅ Database ready"

# --------------------------------------------------
# 5. Build the application
# --------------------------------------------------
echo ""
echo "🔨 Building application..."
pnpm build

# Copy static assets for standalone output
echo "   Copying static assets..."
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
echo "   ✅ Build complete"

# --------------------------------------------------
# 6. Create logs directory
# --------------------------------------------------
mkdir -p "$LOG_DIR"

# --------------------------------------------------
# 7. Start / restart with PM2
# --------------------------------------------------
echo ""
echo "🚀 Starting with PM2..."

# Stop existing process if running
pm2 delete "$APP_NAME" 2>/dev/null || true

# Start with ecosystem config
pm2 start ecosystem.config.cjs

# Save PM2 process list (so it survives server reboot)
pm2 save

# Setup PM2 to start on boot (if not already done)
pm2 startup 2>/dev/null || true

echo ""
echo "========================================"
echo "  ✅ Deployment complete!"
echo "========================================"
echo ""

# Show port from .env
PORT=$(grep -E "^PORT=" "$APP_DIR/.env" | cut -d= -f2 || echo "9003")
echo "  App running on: http://localhost:${PORT}"
echo "  PM2 status:     pm2 status"
echo "  PM2 logs:       pm2 logs $APP_NAME"
echo "  PM2 restart:    pm2 restart $APP_NAME"
echo "  PM2 stop:       pm2 stop $APP_NAME"
echo ""
echo "  Useful commands:"
echo "    pm2 monit              # Real-time monitoring"
echo "    pm2 logs $APP_NAME     # View logs"
echo "    pm2 restart $APP_NAME  # Restart app"
echo ""
