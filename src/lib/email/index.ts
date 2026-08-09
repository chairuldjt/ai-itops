import { Resend } from "resend";
import { getAppBaseUrl } from "@/lib/site";

/**
 * Email delivery via Resend.
 *
 * Env:
 *  - RESEND_API_KEY  — Resend API key. When unset (e.g. quick local dev),
 *                      emails are logged to the console instead of sent.
 *  - EMAIL_FROM      — Verified sender, e.g. "AI Gateway <noreply@yourdomain.com>".
 *                      Defaults to Resend's sandbox sender which can only mail
 *                      the account owner's inbox.
 */

const DEFAULT_FROM = "AI Gateway <onboarding@resend.dev>";

let client: Resend | null = null;

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new Resend(apiKey);
  return client;
}

export function getEmailFrom(): string {
  return process.env.EMAIL_FROM?.trim() || DEFAULT_FROM;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Send a transactional email.
 *
 * Never throws: delivery problems are logged and reported as `false` so auth
 * flows can degrade gracefully instead of returning a 500.
 */
export async function sendEmail(
  input: SendEmailInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const resend = getResend();

  if (!resend) {
    // Fail CLOSED outside development: emails contain one-time codes (OTP,
    // password-reset tokens). Pretending delivery succeeded would silently
    // lock users out — and logging the body to production logs would leak
    // those codes to anyone with log access.
    if (process.env.NODE_ENV !== "development") {
      console.error(
        "[email] RESEND_API_KEY is not configured — email NOT delivered " +
          "(refusing to log one-time codes in non-development environments).",
      );
      return {
        ok: false,
        error: "Email is not configured on this server. Contact support.",
      };
    }
    // Dev fallback: no API key configured -> print the email to the console.
    console.info(
      `[email] RESEND_API_KEY not set — email not delivered.\n` +
        `  to: ${input.to}\n  subject: ${input.subject}\n` +
        `  text:\n${input.text}\n`,
    );
    return { ok: true };
  }

  try {
    const { error } = await resend.emails.send({
      from: getEmailFrom(),
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    if (error) {
      console.error("[email] Resend delivery failed:", error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] Unexpected Resend error:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown email error",
    };
  }
}

/** App URL used inside email links. */
export function appUrl(): string {
  return getAppBaseUrl();
}
