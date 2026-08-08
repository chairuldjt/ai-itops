#!/usr/bin/env node

/**
 * Database initialization script — runs on every deploy.
 *
 * 1. Creates the target database if it doesn't exist
 * 2. Pushes schema (drizzle-kit push — safe, idempotent)
 * 3. Seeds admin user if not exists
 * 4. Seeds demo models if not exists
 *
 * Usage:  node scripts/init-db.mjs
 * Env:    DATABASE_URL must be set
 */

import "dotenv/config";
import postgres from "postgres";
import { execSync } from "node:child_process";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set");
  process.exit(1);
}

// Parse DATABASE_URL
const url = new URL(DATABASE_URL);
const dbName = url.pathname.slice(1);
const adminUrl = new URL(DATABASE_URL);
adminUrl.pathname = "/postgres";

console.log(`\n🔧 Database initialization`);
console.log(`   Host:     ${url.hostname}:${url.port || 5432}`);
console.log(`   Database: ${dbName}`);
console.log(`   User:     ${url.username}`);

// ── Step 1: Create database if not exists ──────────────────────
console.log(`\n📦 Step 1/4: Checking database "${dbName}"...`);
const adminSql = postgres(adminUrl.toString(), {
  max: 1,
  connect_timeout: 10,
});

try {
  const result = await adminSql`SELECT 1 FROM pg_database WHERE datname = ${dbName}`;
  if (result.length === 0) {
    console.log(`   Creating database "${dbName}"...`);
    await adminSql.unsafe(`CREATE DATABASE "${dbName}"`);
    console.log(`   ✅ Database "${dbName}" created`);
  } else {
    console.log(`   ✅ Database "${dbName}" already exists`);
  }
} catch (err) {
  console.error(`   ❌ Failed to check/create database:`, err.message);
  process.exit(1);
} finally {
  await adminSql.end();
}

// ── Step 2: Push schema (idempotent — safe to run repeatedly) ──
console.log(`\n📦 Step 2/4: Pushing schema...`);
try {
  execSync("npx drizzle-kit push --force", {
    stdio: "inherit",
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL },
  });
  console.log(`   ✅ Schema pushed`);
} catch (err) {
  console.error(`   ❌ Schema push failed:`, err.message);
  process.exit(1);
}

// ── Step 3: Seed admin user (skips if exists) ──────────────────
console.log(`\n📦 Step 3/4: Seeding admin user...`);
try {
  execSync("npx tsx src/lib/db/seed.ts", {
    stdio: "inherit",
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL },
  });
  console.log(`   ✅ Admin seed done`);
} catch (err) {
  console.error(`   ❌ Admin seed failed:`, err.message);
  process.exit(1);
}

// ── Step 4: Seed demo models (dev only unless SEED_DEMO=1) ─────
console.log(`\n📦 Step 4/4: Seeding demo models...`);
if (process.env.NODE_ENV === "production" && process.env.SEED_DEMO !== "1") {
  console.log(`   ⏭️  Skipped in production (set SEED_DEMO=1 to override)`);
} else {
  try {
    execSync("npx tsx src/lib/db/seed-demo.ts", {
      stdio: "inherit",
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL },
    });
    console.log(`   ✅ Demo models seed done`);
  } catch (err) {
    // Non-fatal — demo models are optional
    console.warn(`   ⚠️  Demo seed skipped:`, err.message);
  }
}

console.log(`\n✅ Database initialization complete!\n`);
process.exit(0);
