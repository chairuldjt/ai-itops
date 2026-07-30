import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

// Fallback secret so the build & local dev don't crash. In production
// this MUST be overridden via BETTER_AUTH_SECRET.
const FALLBACK_SECRET = "dev-only-fallback-secret-please-override";

export const auth = betterAuth({
  appName: "AI Gateway",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET ?? FALLBACK_SECRET,

  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },

  plugins: [
    admin({
      defaultRole: "user",
      adminRole: "admin",
    }),
  ],
});

export type AuthSession = typeof auth.$Infer.Session;
export type AuthUser = typeof auth.$Infer.Session.user;
