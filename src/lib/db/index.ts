import "dotenv/config";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Lazy-initialized postgres client + drizzle DB.
 *
 * We don't throw at module load time if DATABASE_URL is missing — the gateway
 * route handlers are statically analyzed by Next.js at build time, and would
 * otherwise crash the build. The error is raised when `db` is first accessed.
 */
let _client: postgres.Sql | null = null;
let _db: PostgresJsDatabase<typeof schema> | null = null;

function getConnectionUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return url;
}

export function getClient(): postgres.Sql {
  if (!_client) {
    _client = postgres(getConnectionUrl(), {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return _client;
}

export function getDb(): PostgresJsDatabase<typeof schema> {
  if (!_db) {
    _db = drizzle(getClient(), { schema });
  }
  return _db;
}

// Default export used throughout the app.
// Proxied so that `db.select()` etc. trigger lazy init only at call time.
export const db: PostgresJsDatabase<typeof schema> = new Proxy(
  {} as PostgresJsDatabase<typeof schema>,
  {
    get(_target, prop, receiver) {
      const real = getDb();
      const value = (real as unknown as Record<PropertyKey, unknown>)[prop];
      if (typeof value === "function") {
        return (value as (...args: unknown[]) => unknown).bind(real);
      }
      return Reflect.get(real, prop, receiver);
    },
  },
);

export const client: postgres.Sql = new Proxy({} as postgres.Sql, {
  get(_target, prop, receiver) {
    const real = getClient();
    const value = (real as unknown as Record<PropertyKey, unknown>)[prop];
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(real);
    }
    return Reflect.get(real, prop, receiver);
  },
});
