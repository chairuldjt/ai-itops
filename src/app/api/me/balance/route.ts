import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/me/balance
 * Returns the caller's real credit balance (micro-USD) from the DB.
 * The better-auth session does not carry custom user fields, so the client
 * fetches the live balance here instead of relying on a hardcoded value.
 */
export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [row] = await db
    .select({
      creditBalance: users.creditBalance,
      outstandingBalance: users.outstandingBalance,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const creditMicro = row ? Number(row.creditBalance) : 0;
  const outstandingMicro = row ? Number(row.outstandingBalance) : 0;

  return NextResponse.json({
    creditMicroUsd: creditMicro,
    outstandingMicroUsd: outstandingMicro,
    creditUsd: creditMicro / 1_000_000,
  });
}
