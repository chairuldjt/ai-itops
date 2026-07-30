#!/usr/bin/env node

/**
 * Database initialization script.
 *
 * 1. Connects to PostgreSQL (default `postgres` database)
 * 2. Creates the target database if it doesn't exist
 * 3. Pushes the schema (creates/updates tables)
 * 4. Seeds the admin user if not exists
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
const dbName = url.pathname.slice(1); // remove leading /
const adminUrl = new URL(DATABASE_URL);
adminUrl.pathname = "/postgres"; // connect to default db

console.log(`\n🔧 Database initialization`);
console.log(`   Host:     ${url.hostname}:${url.port || 5432}`);
console.log(`   Database: ${dbName}`);
console.log(`   User:     ${url.username}`);

// Step 1: Create database if not exists
console.log(`\n📦 Step 1/3: Checking database "${dbName}"...`);
const adminSql = postgres(adminUrl.toString(), {
  max: 1,
  connect_timeout: 10,
});

try {
  const result = await adminSql`
    SELECT 1 FROM pg_database WHERE datname = ${dbName}
  `;

  if (result.length === 0) {
    console.log(`   Creating database "${dbName}"...`);
    // Can't use parameterized query for CREATE DATABASE
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

// Step 2: Push schema
console.log(`\n📦 Step 2/3: Pushing schema...`);
try {
  execSync("npx drizzle-kit push --force", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL },
  });
  console.log(`   ✅ Schema pushed successfully`);
} catch (err) {
  console.error(`   ❌ Schema push failed:`, err.message);
  process.exit(1);
}

// Step 3: Seed admin user
console.log(`\n📦 Step 3/3: Seeding admin user...`);
try {
  execSync("npx tsx src/lib/db/seed.ts", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL },
  });
  console.log(`   ✅ Seed completed`);
} catch (err) {
  console.error(`   ❌ Seed failed:`, err.message);
  process.exit(1);
}

console.log(`\n✅ Database initialization complete!\n`);
process.exit(0);
