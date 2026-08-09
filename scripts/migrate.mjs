#!/usr/bin/env node

/**
 * Apply generated SQL migrations (drizzle/0000..N) to the database.
 *
 * Uses drizzle-orm's migrator (records applied migrations in
 * `__drizzle_migrations`), so it is idempotent and safe to run on every
 * container start. This is the production migration strategy; `drizzle-kit
 * push` remains a dev-only convenience.
 *
 * Usage:  node scripts/migrate.mjs
 * Env:    DATABASE_URL must be set
 */

import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set");
  process.exit(1);
}

const client = postgres(DATABASE_URL, { max: 1, connect_timeout: 10 });
const db = drizzle(client);

try {
  console.log("🗄️  Applying migrations from ./drizzle ...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("✅ Migrations up to date");
} catch (err) {
  console.error("❌ Migration failed:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
