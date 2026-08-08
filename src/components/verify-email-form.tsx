"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { emailOtp } from "@/lib/auth/client";
import { AuthBrandPanel } from "@/components/auth-brand-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Loader2, MailCheckIcon } from "lucide-react";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

function otpErrorMessage(message?: string): string {
  const m = (message ?? "").toUpperCase();
  if (m.includes("OTP_EXPIRED"))
    return "That code has expired. Request a new one below.";
  if (m.includes("TOO_MANY_ATTEMPTS"))
    return "Too many incorrect attempts. Request a new code below.";
  if (m.includes("INVALID_OTP")) return "That code is incorrect. Please try again.";
  if (m.includes("USER_NOT_FOUND"))
    return "We couldn't find an account for that email.";
  return message ?? "Could not verify the code. Please try again.";
}

export function VerifyEmailForm({
  initialEmail = "",
  className,
  ...props
}: { initialEmail?: string } & React.ComponentProps<"div">) {
  const router = useRouter();
  const [email, setEmail] = React.useState(initialEmail);
  const [otp, setOtp] = React.useState("");
  const [verifying, setVerifying] = React.useState(false);
  const [resending, setResending] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(RESEND_COOLDOWN_SECONDS);

  // Countdown for the resend button.
  React.useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canVerify = validEmail && otp.length === OTP_LENGTH && !verifying;

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canVerify) return;
    setVerifying(true);
    const res = await emailOtp.verifyEmail({ email, otp });
    setVerifying(false);
    if (res.error) {
      toast.error(otpErrorMessage(res.error.message));
      return;
    }
    toast.success("Email verified — welcome aboard!");
    // autoSignInAfterVerification already created the session.
    router.push("/console/dashboard");
    router.refresh();
  };

  const onResend = async () => {
    if (!validEmail || cooldown > 0 || resending) return;
    setResending(true);
    const res = await emailOtp.sendVerificationOtp({
      email,
      type: "email-verification",
    });
    setResending(false);
    if (res.error) {
      toast.error(res.error.message ?? "Could not resend the code");
      return;
    }
    setCooldown(RESEND_COOLDOWN_SECONDS);
    toast.success("A new code is on its way to your inbox");
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={onVerify}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <MailCheckIcon className="size-5" aria-hidden="true" />
                </span>
                <h1 className="text-2xl font-bold">Verify your email</h1>
                <p className="text-sm text-balance text-muted-foreground">
                  We sent a {OTP_LENGTH}-digit code to{" "}
                  <span className="font-medium text-foreground">
                    {initialEmail || "your inbox"}
                  </span>
                  . Enter it below to activate your account.
                </p>
              </div>

              {!initialEmail && (
                <Field>
                  <FieldLabel htmlFor="verify-email">Email</FieldLabel>
                  <Input
                    id="verify-email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
              )}

              <Field>
                <FieldLabel htmlFor="otp">Verification code</FieldLabel>
                <Input
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="••••••"
                  maxLength={OTP_LENGTH}
                  className="text-center font-mono text-lg tracking-[0.5em]"
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))
                  }
                />
                <FieldDescription className="text-center">
                  The code expires in 5 minutes.
                </FieldDescription>
              </Field>

              <Field>
                <Button type="submit" disabled={!canVerify} className="w-full">
                  {verifying && <Loader2 className="size-4 animate-spin mr-2" />}
                  Verify & continue
                </Button>
              </Field>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={onResend}
                  disabled={!validEmail || cooldown > 0 || resending}
                  className="font-medium text-primary underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {resending
                    ? "Sending…"
                    : cooldown > 0
                      ? `Resend code in ${cooldown}s`
                      : "Resend code"}
                </button>
                <Link
                  href="/signup"
                  className="text-muted-foreground underline-offset-2 hover:underline"
                >
                  Use a different email
                </Link>
              </div>
            </FieldGroup>
          </form>
          <AuthBrandPanel
            title="One last step."
            subtitle="Verifying your email protects your account and unlocks the full gateway — one API key, every model, metered to the micro-dollar."
          />
        </CardContent>
      </Card>
      <p className="px-6 text-center text-sm text-muted-foreground">
        Already verified?{" "}
        <Link href="/login" className="font-medium text-foreground hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
