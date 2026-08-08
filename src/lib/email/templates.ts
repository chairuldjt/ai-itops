/**
 * Transactional email templates.
 *
 * Plain HTML + inline CSS only (email-client safe). Every template renders a
 * consistent, minimal brand layout so OTP and security emails feel
 * professional and pass spam heuristics (single CTA, no images, text-first).
 */

const BRAND_NAME = "AI Gateway";

function layout(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="x-app-disable-link-rewrite" content="true" />
    <title>${BRAND_NAME}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div role="presentation" style="width:100%;background-color:#f4f4f5;padding:32px 16px;">
      <div role="presentation" style="max-width:480px;margin:0 auto;background-color:#ffffff;border:1px solid #e4e4e7;border-radius:12px;overflow:hidden;">
        <!-- Header -->
        <div style="padding:24px 32px 0 32px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:28px;height:28px;border-radius:8px;background-color:#18181b;"></div>
            <span style="font-size:15px;font-weight:600;color:#18181b;letter-spacing:-0.01em;">${BRAND_NAME}</span>
          </div>
        </div>
        <!-- Body -->
        <div style="padding:24px 32px;">
          ${body}
        </div>
        <!-- Footer -->
        <div style="padding:16px 32px 24px 32px;border-top:1px solid #f4f4f5;">
          <p style="margin:0;font-size:12px;line-height:1.5;color:#a1a1aa;">
            You received this email because of activity on your ${BRAND_NAME} account.
            If you didn't request this, you can safely ignore it.
          </p>
        </div>
      </div>
      <p style="max-width:480px;margin:16px auto 0 auto;font-size:11px;color:#a1a1aa;text-align:center;">
        &copy; ${new Date().getFullYear()} ${BRAND_NAME}. All rights reserved.
      </p>
    </div>
  </body>
</html>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#3f3f46;">${text}</p>`;
}

/**
 * One-time passcode email (registration / email verification / sign-in).
 */
export function otpEmailHtml(opts: {
  otp: string;
  expiresInMinutes: number;
  purpose: "sign-up" | "sign-in" | "email-verification";
}): string {
  const headline =
    opts.purpose === "sign-in"
      ? "Sign-in verification code"
      : "Verify your email address";

  const intro =
    opts.purpose === "sign-in"
      ? "Use the code below to finish signing in to your account."
      : "Use the code below to verify your email address and activate your account.";

  const body = `
    <h1 style="margin:0 0 12px 0;font-size:20px;font-weight:700;color:#18181b;letter-spacing:-0.02em;">${headline}</h1>
    ${paragraph(intro)}
    <div style="margin:24px 0;padding:16px;background-color:#fafafa;border:1px dashed #d4d4d8;border-radius:10px;text-align:center;">
      <div style="font-size:32px;font-weight:700;letter-spacing:0.35em;color:#18181b;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;">${opts.otp}</div>
    </div>
    ${paragraph(`This code expires in <strong>${opts.expiresInMinutes} minutes</strong>. For your security, never share it with anyone.`)}
  `;
  return layout(body);
}

/**
 * Plain-text fallback for email clients that don't render HTML.
 */
export function otpEmailText(opts: {
  otp: string;
  expiresInMinutes: number;
}): string {
  return `Your ${BRAND_NAME} verification code is: ${opts.otp}

It expires in ${opts.expiresInMinutes} minutes. If you didn't request this, you can safely ignore this email.`;
}

/**
 * Password reset email with a confirmation link.
 */
export function resetPasswordEmailHtml(opts: {
  userName: string;
  resetUrl: string;
  expiresInMinutes: number;
}): string {
  const firstName = opts.userName.split(/\s+/)[0] || "there";
  const body = `
    <h1 style="margin:0 0 12px 0;font-size:20px;font-weight:700;color:#18181b;letter-spacing:-0.02em;">Reset your password</h1>
    ${paragraph(`Hi ${firstName},`)}
    ${paragraph("We received a request to change the password on your account. Click the button below to choose a new password.")}
    <div style="margin:24px 0;text-align:center;">
      <a href="${opts.resetUrl}" style="display:inline-block;padding:12px 24px;background-color:#18181b;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">Reset password</a>
    </div>
    ${paragraph(`This link expires in <strong>${opts.expiresInMinutes} minutes</strong> and can only be used once.`)}
    ${paragraph(
      `If the button doesn't work, copy and paste this URL into your browser:<br />
      <a href="${opts.resetUrl}" style="color:#3f3f46;word-break:break-all;font-size:12px;">${opts.resetUrl}</a>`,
    )}
    ${paragraph("If you didn't request a password change, no action is needed — your password stays the same.")}
  `;
  return layout(body);
}

export function resetPasswordEmailText(opts: {
  userName: string;
  resetUrl: string;
  expiresInMinutes: number;
}): string {
  const firstName = opts.userName.split(/\s+/)[0] || "there";
  return `Hi ${firstName},

We received a request to change the password on your ${BRAND_NAME} account.

Open this link to choose a new password (expires in ${opts.expiresInMinutes} minutes):
${opts.resetUrl}

If you didn't request this, you can safely ignore this email.`;
}
