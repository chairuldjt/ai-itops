import { sendEmail } from "@/lib/email";
import {
  otpEmailHtml,
  otpEmailText,
  resetPasswordEmailHtml,
  resetPasswordEmailText,
} from "@/lib/email/templates";

/** OTP lifetime used across auth emails (must match the auth config). */
export const OTP_EXPIRES_IN_SECONDS = 300; // 5 minutes
export const RESET_TOKEN_EXPIRES_IN_SECONDS = 3600; // 1 hour

/**
 * Send a one-time passcode email (registration, sign-in, email verification).
 * Called by better-auth's emailOTP plugin (`sendVerificationOTP`).
 */
export async function sendOtpEmail(data: {
  email: string;
  otp: string;
  type: "sign-in" | "email-verification" | "forget-password" | "change-email";
}): Promise<void> {
  const purpose =
    data.type === "sign-in"
      ? "sign-in"
      : data.type === "forget-password" || data.type === "change-email"
        ? "email-verification"
        : "sign-up";

  const subject =
    data.type === "sign-in"
      ? "Your AI Gateway sign-in code"
      : data.type === "forget-password"
        ? "Your AI Gateway password reset code"
        : "Verify your AI Gateway account";

  await sendEmail({
    to: data.email,
    subject,
    html: otpEmailHtml({
      otp: data.otp,
      expiresInMinutes: Math.round(OTP_EXPIRES_IN_SECONDS / 60),
      purpose,
    }),
    text: otpEmailText({
      otp: data.otp,
      expiresInMinutes: Math.round(OTP_EXPIRES_IN_SECONDS / 60),
    }),
  });
}

/**
 * Send the password-reset confirmation link.
 * Called by better-auth's core (`emailAndPassword.sendResetPassword`).
 *
 * `data.url` points at `${BETTER_AUTH_URL}/api/auth/reset-password/:token`
 * which validates the token and redirects to our own `/reset-password` page.
 */
export async function sendResetPasswordEmail(data: {
  user: { name?: string | null; email: string };
  url: string;
  token: string;
}): Promise<void> {
  await sendEmail({
    to: data.user.email,
    subject: "Reset your AI Gateway password",
    html: resetPasswordEmailHtml({
      userName: data.user.name || "",
      resetUrl: data.url,
      expiresInMinutes: Math.round(RESET_TOKEN_EXPIRES_IN_SECONDS / 60),
    }),
    text: resetPasswordEmailText({
      userName: data.user.name || "",
      resetUrl: data.url,
      expiresInMinutes: Math.round(RESET_TOKEN_EXPIRES_IN_SECONDS / 60),
    }),
  });
}
