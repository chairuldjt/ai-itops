/**
 * Create a demo user + API key + 2 demo models so we can smoke-test the
 * gateway against the real 9router upstream.
 *
 * Run:  pnpm tsx src/lib/db/seed-demo.ts
 */
import "dotenv/config";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { users, accounts, models, apiKeys } from "./schema";
import { createId, generateApiKey } from "../id";
import { hashApiKey } from "../gateway/api-key";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  // Demo data (weak-password user + live demo API key) must never be created
  // in production unless explicitly requested.
  if (process.env.NODE_ENV === "production" && process.env.SEED_DEMO !== "1") {
    console.log("• Skipping demo seed in production (set SEED_DEMO=1 to override).");
    return;
  }

  // ---- Demo user (user@example.com / user123)
  const demoEmail = "user@example.com";
  let [user] = await db.select().from(users).where(eq(users.email, demoEmail)).limit(1);
  if (!user) {
    const userId = createId("user");
    const accountId = createId("acct");
    const passwordHash = await hash("user123", 12);
    await db.transaction(async (tx) => {
      await tx.insert(users).values({
        id: userId,
        name: "Demo User",
        email: demoEmail,
        emailVerified: true,
        role: "user",
        creditBalance: 10_000_000n, // $10.00
      });
      await tx.insert(accounts).values({
        id: accountId,
        accountId: userId,
        providerId: "credential",
        userId,
        password: passwordHash,
      });
    });
    [user] = await db.select().from(users).where(eq(users.email, demoEmail)).limit(1);
    console.log("✓ Demo user created: user@example.com / user123");
  } else {
    console.log("• Demo user already exists");
  }

  // ---- Demo API key (sk_live_demo...)
  const prefix = "sk_live_demo";
  const existingKey = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.keyPrefix, prefix))
    .limit(1);
  if (existingKey.length === 0) {
    const { key } = generateApiKey();
    const keyHash = hashApiKey(key);
    // Store the stable `sk_live_demo` prefix (not the random generated one) so
    // the existence check above matches on subsequent runs and we don't create
    // a new demo key on every deploy. The raw key stays random and is shown once.
    await db.insert(apiKeys).values({
      id: createId("key"),
      userId: user.id,
      name: "demo-key",
      keyHash,
      keyPrefix: prefix,
      enabled: true,
    });
    console.log(`✓ Demo API key created: ${key}`);
    console.log("  (copy this — it's only shown once)");
  } else {
    console.log("• Demo API key already exists (raw key shown only at first creation)");
  }

  // ---- Demo models (mapped to 9router's actual mimo models)
  const demoModels = [
    {
      publicId: "demo/mimo-v2.5",
      upstreamId: "mimo-v2.5",
      type: "chat" as const,
      provider: "mimo",
      description: "Demo non-vision chat model. Send an image → graceful reply.",
      pricing: { per1MInput: 0.15, per1MOutput: 0.6, per1MCached: 0.03 },
      capabilities: {
        supportsImageInput: false,
        supportsTools: true,
        supportsStreaming: true,
      },
      imagePolicy: "strip_and_instruct" as const,
      sortOrder: 10,
      tags: ["demo", "text"],
    },
    {
      publicId: "demo/mimo-v2.5-vision",
      upstreamId: "mimo/mimo-v2.5",
      type: "chat" as const,
      provider: "mimo",
      description: "Demo chat model with vision (upstream: mimo/mimo-v2.5).",
      pricing: { per1MInput: 2.5, per1MOutput: 10, per1MCached: 0.5 },
      capabilities: {
        supportsImageInput: true,
        supportsTools: true,
        supportsStreaming: true,
      },
      imagePolicy: "strip_and_instruct" as const,
      sortOrder: 20,
      tags: ["demo", "vision"],
    },
  ];

  for (const m of demoModels) {
    const rows = await db.select().from(models).where(eq(models.publicId, m.publicId)).limit(1);
    if (rows.length === 0) {
      await db.insert(models).values({
        id: createId("mdl"),
        publicId: m.publicId,
        upstreamId: m.upstreamId,
        type: m.type,
        provider: m.provider,
        description: m.description,
        pricing: m.pricing,
        capabilities: m.capabilities,
        imagePolicy: m.imagePolicy,
        enabled: true,
        sortOrder: m.sortOrder,
        tags: m.tags,
      });
      console.log(`✓ Model '${m.publicId}' → upstream '${m.upstreamId}'`);
    } else {
      console.log(`• Model '${m.publicId}' already exists`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
