import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Liveness/readiness probe for deploys and container healthchecks.
 *
 * - 200 `{status:"ok"}` when the DB answers within 3s.
 * - 503 `{status:"degraded"}` otherwise.
 *
 * Unauthenticated by design (no secrets or user data are exposed), and listed
 * in the proxy's PUBLIC_PATHS so it is reachable without a session cookie.
 */
export async function GET() {
  const started = Date.now();
  try {
    await Promise.race([
      db.execute(sql`SELECT 1`),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("health check DB timeout")), 3000),
      ),
    ]);
    return NextResponse.json({
      status: "ok",
      db: true,
      latencyMs: Date.now() - started,
    });
  } catch {
    return NextResponse.json(
      { status: "degraded", db: false },
      { status: 503 },
    );
  }
}
