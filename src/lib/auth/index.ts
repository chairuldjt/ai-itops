import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { emailOTP } from "better-auth/plugins/email-otp";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { getAppBaseUrl } from "@/lib/site";
import {
  sendOtpEmail,
  sendResetPasswordEmail,
  OTP_EXPIRES_IN_SECONDS,
  RESET_TOKEN_EXPIRES_IN_SECONDS,
} from "@/lib/email/auth-emails";

// FIX #4: Throw in production if secret is missing instead of using weak fallback.
const FALLBACK_SECRET = "dev-only-fallback-secret-please-override";
// Well-known placeholders that must never run in production (session forgery).
const KNOWN_WEAK_SECRETS = new Set([
  FALLBACK_SECRET,
  "change-me-to-a-long-random-secret-at-least-32-chars",
]);
// `next build` evaluates this module with NODE_ENV=production while collecting
// page data, so a runtime-only guard must not fire there. Enforce at runtime
// (next start / pm2), not at build time.
const IS_BUILD_PHASE = process.env.NEXT_PHASE === "phase-production-build";
if (process.env.NODE_ENV === "production" && !IS_BUILD_PHASE) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || KNOWN_WEAK_SECRETS.has(secret) || secret.length < 32) {
    throw new Error(
      "BETTER_AUTH_SECRET must be a unique random value of at least 32 characters in production. " +
        "Generate one with `openssl rand -base64 48`, set BETTER_AUTH_SECRET in .env, then restart. Refusing to start.",
    );
  }
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
    // Accounts must verify their email (OTP) before they can sign in.
    requireEmailVerification: true,
    minPasswordLength: 8,
    // Professional reset flow: email a confirmation link, then let the user
    // set a new password on /reset-password.
    sendResetPassword: async ({ user, url, token }) => {
      await sendResetPasswordEmail({ user, url, token });
    },
    resetPasswordTokenExpiresIn: RESET_TOKEN_EXPIRES_IN_SECONDS,
    // A reset password is a takeover-sensitive event: end all other sessions.
    revokeSessionsOnPasswordReset: true,
  },

  emailVerification: {
    // After the OTP is verified, sign the user straight in (registration flow:
    // sign up -> verify code -> land in the console).
    autoSignInAfterVerification: true,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },

  plugins: [
    emailOTP({
      async sendVerificationOTP(data) {
        await sendOtpEmail(data);
      },
      otpLength: 6,
      expiresIn: OTP_EXPIRES_IN_SECONDS,
      // Fire the OTP email automatically as part of sign-up.
      sendVerificationOnSignUp: true,
      // Only the email owner should be able to read the stored code.
      storeOTP: "hashed",
      // 3 wrong codes invalidate the OTP (rate limiting is built in).
      allowedAttempts: 3,
    }),
    admin({
      defaultRole: "user",
      adminRole: "admin",
    }),
  ],
});

export type AuthSession = typeof auth.$Infer.Session;
export type AuthUser = typeof auth.$Infer.Session.user;
