#!/usr/bin/env node

/**
 * Usage & schema diagnostic — answers "why is the dashboard all zeros?" and
 * "is the production schema out of sync?".
 *
 * Read-only. Run on the server from the app directory:
 *
 *   node scripts/check-usage.mjs
 *   DATABASE_URL=postgres://... node scripts/check-usage.mjs   # explicit URL
 */

import "dotenv/config";
import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set (no .env in the current directory?)");
  process.exit(1);
}

const target = new URL(DATABASE_URL);
console.log(`\n🔎 Diagnosing ${target.hostname}:${target.port || 5432}${target.pathname}\n`);

const sql = postgres(DATABASE_URL, { max: 1, connect_timeout: 10 });

try {
  // ── 1. usage_log: is anything being logged at all? ──────────────
  const [totals] = await sql`
    select count(*) as rows,
           min(created_at) as first_at,
           max(created_at) as last_at,
           count(*) filter (where created_at is null) as null_created_at
    from usage_log`;
  console.log(`usage_log rows: ${totals.rows}`);
  console.log(`  first: ${totals.first_at ?? "-"}   last: ${totals.last_at ?? "-"}`);
  if (Number(totals.null_created_at) > 0) {
    console.log(`  ⚠️  ${totals.null_created_at} rows have NULL created_at (they are invisible to date-ranged dashboards)`);
  }
  if (Number(totals.rows) === 0) {
    console.log("  → No usage has ever been logged: requests either never passed the");
    console.log("    billing preflight (auth/model/validation failures) or never happened.");
  }

  // ── 2. By user + status (who generated what, and when) ──────────
  const byUser = await sql`
    select u.email, l.user_id, l.status, count(*) as n,
           sum(l.prompt_tokens) as prompt_tokens,
           sum(l.completion_tokens) as completion_tokens,
           now() - max(l.created_at) as last_activity_ago
    from usage_log l join "user" u on u.id = l.user_id
    group by u.email, l.user_id, l.status
    order by max(l.created_at) desc limit 20`;
  console.log("\nusage by user/status:");
  if (byUser.length === 0) console.log("  (none)");
  for (const r of byUser) {
    console.log(`  ${r.email} [${r.status}] n=${r.n} prompt=${r.prompt_tokens} completion=${r.completion_tokens} last=${r.last_activity_ago} ago`);
  }

  // ── 3. Recent rows ───────────────────────────────────────────────
  const recent = await sql`
    select created_at, user_id, model_public_id, status, http_status,
           prompt_tokens, completion_tokens, cost_micro_usd,
           left(coalesce(error_message, ''), 80) as error
    from usage_log order by created_at desc limit 10`;
  console.log("\nlast 10 usage rows:");
  if (recent.length === 0) console.log("  (none)");
  for (const r of recent) {
    console.log(`  ${r.created_at}  ${r.model_public_id}  ${r.status}/${r.http_status}  p=${r.prompt_tokens} c=${r.completion_tokens} cost=${r.cost_micro_usd}µUSD${r.error ? `  err=${r.error}` : ""}`);
  }

  // ── 4. Dashboard-equivalent computation (default 30d range) ─────
  const usersList = await sql`select id, email from "user" order by created_at limit 20`;
  console.log("\ndashboard view per user (last 30 days):");
  for (const u of usersList) {
    const [s] = await sql`
      select count(*) as requests,
             coalesce(sum(prompt_tokens + completion_tokens), 0) as tokens,
             coalesce(sum(case when status = 'ok' then 1 else 0 end), 0) as successful
      from usage_log
      where user_id = ${u.id} and created_at >= now() - interval '30 days'`;
    console.log(`  ${u.email}: requests=${s.requests} tokens=${s.tokens} successful=${s.successful}`);
  }

  // ── 5. Open reservations (held money) ────────────────────────────
  const [open] = await sql`
    select count(*) as n, coalesce(sum(reserved_micro_usd), 0) as held
    from billing_reservation where finalized_at is null`;
  console.log(`\nopen billing reservations: ${open.n} (holding ${open.held} µUSD)`);

  // ── 6. Schema integrity vs what the app expects ─────────────────
  const EXPECTED = {
    user: ["id", "name", "email", "email_verified", "image", "role", "banned", "ban_reason", "ban_expires", "credit_balance", "outstanding_balance", "created_at", "updated_at"],
    api_key: ["id", "user_id", "name", "key_hash", "key_prefix", "rpm_limit", "allowed_models", "monthly_budget", "monthly_spent", "month_started_at", "enabled", "expires_at", "last_used_at", "created_at", "updated_at"],
    usage_log: ["id", "user_id", "api_key_id", "model_id", "model_public_id", "api_format", "endpoint", "streamed", "prompt_tokens", "completion_tokens", "total_tokens", "cost_micro_usd", "status", "http_status", "error_message", "latency_ms", "client_ip", "created_at"],
    billing_reservation: ["id", "user_id", "api_key_id", "reserved_micro_usd", "actual_micro_usd", "charged_micro_usd", "outstanding_micro_usd", "billing_month", "expires_at", "usage_log_id", "finalized_at", "created_at"],
    model: ["id", "public_id", "upstream_id", "type", "description", "provider", "pricing", "capabilities", "image_policy", "canned_response_text", "strip_instruction", "enabled", "sort_order", "tags", "created_at", "updated_at"],
  };
  console.log("\nschema integrity (expected columns vs live DB):");
  let drift = false;
  for (const [table, expected] of Object.entries(EXPECTED)) {
    const rows = await sql`
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = ${table}`;
    if (rows.length === 0) {
      console.log(`  ❌ table "${table}" DOES NOT EXIST`);
      drift = true;
      continue;
    }
    const actual = new Set(rows.map((r) => r.column_name));
    const missing = expected.filter((c) => !actual.has(c));
    if (missing.length > 0) {
      console.log(`  ❌ "${table}" missing columns: ${missing.join(", ")}`);
      drift = true;
    } else {
      console.log(`  ✅ "${table}" (${expected.length}/${expected.length} expected columns present)`);
    }
  }
  if (!drift) {
    console.log("  → Schema matches the app. `drizzle-kit push` in deploy.sh keeps it in");
    console.log("    sync on every deploy, so column drift is not the dashboard's problem.");
  }

  console.log("\nDone.\n");
} catch (err) {
  console.error("❌ Diagnostic failed:", err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
