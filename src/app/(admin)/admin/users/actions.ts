"use server";

import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { users, sessions, creditTransactions } from "@/lib/db/schema";
import { allocateTopUp, topUpLedgerAmounts } from "@/lib/gateway/billing";
import { requireAdmin } from "@/lib/auth/session";
import { createId } from "@/lib/id";

const Schema = z.object({
  userId: z.string().min(1),
  // FIX #24: .finite() prevents Infinity from reaching BigInt().
  amountUsd: z.number().positive().finite(),
  note: z.string().max(500).optional(),
});

export async function adminTopUp(input: z.infer<typeof Schema>) {
  const admin = await requireAdmin();
  const parsed = Schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.flatten().fieldErrors };
  }
  const amount = BigInt(Math.round(parsed.data.amountUsd * 1_000_000));
  const result = await db.transaction(async (tx) => {
    const [locked] = await tx.execute<{ outstanding_balance: string }>(
      sql`select outstanding_balance from "user" where id = ${parsed.data.userId} for update`,
    );
    if (!locked) throw new Error("User not found");
    const allocation = allocateTopUp(amount, BigInt(locked.outstanding_balance));
    const [updated] = await tx.update(users).set({
      creditBalance: sql`${users.creditBalance} + ${allocation.credit}::bigint`,
      outstandingBalance: sql`${users.outstandingBalance} - ${allocation.debtPayment}::bigint`,
      updatedAt: new Date(),
    }).where(eq(users.id, parsed.data.userId)).returning({ creditBalance: users.creditBalance });

    const ledger = topUpLedgerAmounts(amount, BigInt(locked.outstanding_balance));
    if (ledger.topUp !== 0n) {
      await tx.insert(creditTransactions).values({
        id: createId("ctx"),
        userId: parsed.data.userId,
        type: "topup",
        amount: ledger.topUp,
        balanceAfter: updated.creditBalance,
        note: ledger.debtOffset > 0n
          ? `${parsed.data.note ?? "Manual top-up by admin"}; ${ledger.debtOffset} micro-USD offset outstanding balance`
          : parsed.data.note ?? "Manual top-up by admin",
        performedByUserId: admin.user.id,
      });
    }

    return updated;
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/billing");
  return { ok: true, newBalance: Number(result.creditBalance) / 1_000_000 };
}

/* -------------------------------------------------------------------------- */
/*                                  BAN / UNBAN                               */
/* -------------------------------------------------------------------------- */

const BanSchema = z.object({
  userId: z.string().min(1),
  banned: z.boolean(),
  banReason: z.string().max(500).optional(),
});

export async function setUserBanned(input: z.infer<typeof BanSchema>) {
  await requireAdmin();
  const parsed = BanSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.flatten().fieldErrors };
  }
  await db
    .update(users)
    .set({
      banned: parsed.data.banned,
      banReason: parsed.data.banned ? parsed.data.banReason ?? null : null,
      banExpires: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, parsed.data.userId));

  // A ban must take effect on the web surface immediately: better-auth only
  // checks `banned` at session creation, so existing sessions would otherwise
  // keep working (and renewing) indefinitely. Revoke them all on ban.
  if (parsed.data.banned) {
    await db.delete(sessions).where(eq(sessions.userId, parsed.data.userId));
  }

  revalidatePath("/admin/users");
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/*                                    ROLE                                    */
/* -------------------------------------------------------------------------- */

const RoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["user", "admin"]),
});

export async function setUserRole(input: z.infer<typeof RoleSchema>) {
  const admin = await requireAdmin();
  const parsed = RoleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.flatten().fieldErrors };
  }
  if (parsed.data.userId === admin.user.id) {
    return { ok: false, error: { role: ["You cannot change your own role."] } };
  }
  await db
    .update(users)
    .set({ role: parsed.data.role, updatedAt: new Date() })
    .where(eq(users.id, parsed.data.userId));
  revalidatePath("/admin/users");
  return { ok: true };
}
