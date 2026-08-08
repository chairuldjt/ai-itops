import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { getAppBaseUrl } from "@/lib/site";

// FIX #4: Throw in production if secret is missing instead of using weak fallback.
const FALLBACK_SECRET = "dev-only-fallback-secret-please-override";
if (
  process.env.NODE_ENV === "production" &&
  !process.env.BETTER_AUTH_SECRET
) {
  throw new Error(
    "BETTER_AUTH_SECRET must be set in production. Refusing to start with fallback secret.",
  );
}

export const auth = betterAuth({
  appName: "AI Gateway",
  baseURL: process.env.BETTER_AUTH_URL ?? getAppBaseUrl(),
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
