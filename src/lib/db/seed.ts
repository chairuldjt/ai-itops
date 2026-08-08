/**
 * Seed the initial admin user + password account.
 *
 * Run:  pnpm db:seed
 *
 * Env:
 *   DATABASE_URL
 *   SEED_ADMIN_EMAIL
 *   SEED_ADMIN_PASSWORD
 *   SEED_ADMIN_NAME
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { users, accounts } from "./schema";
import { createId } from "../id";
import { hashPassword } from "better-auth/crypto";

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "change-me-admin-123";
  const name = process.env.SEED_ADMIN_NAME ?? "Administrator";

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  // Refuse to create a production admin with a well-known weak password.
  if (process.env.NODE_ENV === "production") {
    const weak = ["admin123", "change-me-admin-123", "password", "password123"];
    if (weak.includes(password) || password.length < 12) {
      console.error(
        "Refusing to seed admin in production with a weak/known password. " +
          "Set SEED_ADMIN_PASSWORD to a strong unique value.",
      );
      process.exit(1);
    }
  }

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    console.log(`Admin user ${email} already exists, skipping.`);
    process.exit(0);
  }

  const userId = createId("user");
  const accountId = createId("acct");
  const passwordHash = await hashPassword(password);

  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      id: userId,
      name,
      email,
      emailVerified: true,
      role: "admin",
      banned: false,
      creditBalance: 1_000_000_000n, // $1000 seed balance
    });
    await tx.insert(accounts).values({
      id: accountId,
      accountId: userId,
      providerId: "credential",
      userId,
      password: passwordHash,
    });
  });

  console.log(`✓ Admin user created: ${email}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
