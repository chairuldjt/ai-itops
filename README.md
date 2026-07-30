# AI Gateway

A unified AI gateway that sits in front of your **9router** (or any OpenAI-compatible upstream) and exposes **OpenAI + Anthropic compatible** APIs. Full control over models, pricing, capabilities, and user credits — your users only see one clean endpoint and one API key.

Inspired by [TokenRouter](https://tokenrouter.com).

## Features

### Gateway
- **Dual-protocol API**
  - `POST /v1/chat/completions` — OpenAI-compatible (stream & non-stream)
  - `GET  /v1/models` — model catalog
  - `POST /anthropic/v1/messages` — Anthropic-compatible (full request/response/stream translator)
- Works with **OpenAI SDK**, **Anthropic SDK**, **opencode**, **Claude Code**, **Cursor**, **Windsurf**, and any HTTP client

### Admin Control
- **Per-model management** — public ID mapping, type (`chat`/`image`/`tts`/`stt`/`embedding`/`rerank`), pricing, capabilities, tags
- **Graceful capability handling** — per-model image policy:
  - `strip_and_instruct` — silently remove image, inject human-like note
  - `canned_response` — gateway replies with friendly text, no upstream call
  - `reject_error` — return clear 4xx error
- Tools silently stripped for models that don't support them

### Credit & Usage
- Micro-USD balance per user (1e-6 precision)
- Manual top-up by admin (audit-logged `credit_transaction`)
- Per-API-key monthly budget + RPM limit
- Full usage log: tokens, cost, latency, status, IP, model

### UI & UX
- **Adaptive topbar** — navigation items change based on page context and user role (like TokenRouter)
- **Dark/light theme** — toggle with `next-themes`
- **Responsive** — mobile hamburger menu, collapsible sidebar
- **Accessible** — skip-to-content links, ARIA attributes, `prefers-reduced-motion` support
- **Framer Motion** animations with reduced-motion respect

### Auth & Security
- Better-Auth (email/password) with admin role plugin
- Role-based access: `user`, `admin`, `banned`
- SHA-256 API key hashing
- Middleware-based route protection

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| UI | React 19, shadcn/ui, Tailwind CSS v4, base-ui |
| Animation | Framer Motion |
| Database | PostgreSQL 16, Drizzle ORM |
| Auth | Better-Auth |
| Charts | Recharts |
| Process Manager | PM2 |

## Quickstart

```bash
# 1. Install
pnpm install

# 2. Copy env
cp .env.example .env
# Edit .env — set BETTER_AUTH_SECRET, DATABASE_URL, UPSTREAM_BASE_URL

# 3. Initialize database (auto-creates DB + schema + seed admin)
pnpm db:init

# 4. Dev server
pnpm dev              # http://localhost:9003
```

### Using with OpenAI SDK / opencode

```json
{
  "providers": {
    "aigateway": {
      "type": "openai",
      "baseURL": "http://localhost:9003/v1",
      "apiKey": "sk_live_..."
    }
  }
}
```

### Using with Claude Code

```bash
export ANTHROPIC_BASE_URL=http://localhost:9003/anthropic/v1
export ANTHROPIC_API_KEY=sk_live_...
claude
```

## Deployment

### Option A: Linux Server with PM2 (Recommended)

**Prerequisites:** Node.js 22+, pnpm, PM2, PostgreSQL 16+

```bash
# Clone & configure
git clone https://github.com/chairuldjt/ai-itops.git
cd ai-itops
cp .env.example .env
nano .env   # Set: DATABASE_URL, BETTER_AUTH_SECRET, NEXT_PUBLIC_APP_URL, PORT

# One-command deploy (auto-creates DB, migrates, seeds, builds, starts PM2)
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

Or step-by-step:

```bash
pnpm install
pnpm db:init          # Auto-create DB + push schema + seed admin
pnpm build
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup           # Auto-start on server reboot
```

**PM2 commands:**
```bash
pm2 status                  # Check status
pm2 logs ai-gateway         # View logs
pm2 restart ai-gateway      # Restart
pm2 monit                   # Real-time monitoring
```

### Option B: Docker

```bash
docker compose up -d --build
```

The `app` service is a standalone Next.js build. Postgres data is persisted in the `pgdata` volume.

## Project Structure

```
src/
  app/
    (public)/                         # Public pages with SiteTopBar + SiteFooter
      page.tsx                        # Landing page
      models/                         # Model catalog (search, filter, sort)
      pricing/                        # Pricing tiers + per-model table
      blog/                           # Blog (coming soon)
      contact-us/                     # Contact form
      release-notes/                  # Release timeline
    (auth)/login, signup              # Auth pages
    (dashboard)/dashboard             # User dashboard (sidebar + ConsoleTopBar)
    (admin)/admin                     # Admin panel (sidebar + ConsoleTopBar)
    console/                          # Advanced console UI
      dashboard/                      # Usage analytics + charts
      models/                         # Model browser
      chat/                           # Chat playground
      api-keys/                       # API key management
      usage/                          # Usage logs
      balance/                        # Billing & credits
      settings/                       # User settings
    docs/                             # MDX-powered documentation
    api/
      auth/[...all]                   # Better-Auth routes
      v1/chat/completions             # OpenAI gateway
      v1/models                       # Model list
      anthropic/v1/messages           # Anthropic gateway
  components/
    layout/
      site-topbar                     # Adaptive public topbar
      site-footer                     # Consistent footer
      dashboard-sidebar               # Sidebar for admin/dashboard
      layout-header                   # Dynamic breadcrumb header
      page-header                     # Reusable page header
    ui/                               # 35+ shadcn/ui components
    motion/                           # Framer Motion wrappers
    docs/                             # Documentation sidebar + TOC
  lib/
    auth/                             # Better-Auth config + client + session
    db/                               # Drizzle schema, client, seed
    gateway/
      api-key                         # SHA-256 key hashing + auth
      model-resolver                  # publicId → upstreamId
      capability-enforcer             # 3 image policies + tool stripping
      meter                           # Token cost calc + credit deduction
      upstream                        # 9router HTTP client
      openai                          # OpenAI helpers
      anthropic                       # Anthropic ↔ OpenAI translator
scripts/
  init-db.mjs                         # Auto-create DB + migrate + seed
  deploy.sh                           # Full deployment script
```

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm db:init` | Auto-create DB + push schema + seed admin |
| `pnpm db:push` | Push schema to DB (dev) |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Run migrations |
| `pnpm db:seed` | Seed admin user |
| `pnpm db:studio` | Drizzle Studio |
| `pnpm deploy` | Run full deployment script |

## Environment Variables

See `.env.example`. Key variables:

| Variable | Description | Default |
|---|---|---|
| `PORT` | App port | `9003` |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://postgres:postgres@localhost:5432/ai_gateway` |
| `BETTER_AUTH_SECRET` | Auth secret (min 32 chars) | — |
| `BETTER_AUTH_URL` | Auth base URL | `http://localhost:9003` |
| `NEXT_PUBLIC_APP_URL` | Public app URL | `http://localhost:9003` |
| `UPSTREAM_BASE_URL` | 9router upstream URL | `http://localhost:8080/v1` |
| `UPSTREAM_API_KEY` | 9router API key | — |
| `SEED_ADMIN_EMAIL` | Admin email | `admin@example.com` |
| `SEED_ADMIN_PASSWORD` | Admin password | `change-me-admin-123` |
| `SEED_ADMIN_NAME` | Admin display name | `Administrator` |

## License

Private — All rights reserved.
