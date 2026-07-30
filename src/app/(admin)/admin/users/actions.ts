"use server";

import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { users, creditTransactions } from "@/lib/db/schema";
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
  const txId = createId("ctx");

  const result = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(users)
      .set({
        creditBalance: sql`${users.creditBalance} + ${amount}::bigint`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, parsed.data.userId))
      .returning({ creditBalance: users.creditBalance });

    if (!updated) {
      throw new Error("User not found");
    }

    await tx.insert(creditTransactions).values({
      id: txId,
      userId: parsed.data.userId,
      type: "topup",
      amount,
      balanceAfter: updated.creditBalance,
      note: parsed.data.note ?? "Manual top-up by admin",
      performedByUserId: admin.user.id,
    });

    return updated;
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/billing");
  return { ok: true, newBalance: Number(result.creditBalance) / 1_000_000 };
}
