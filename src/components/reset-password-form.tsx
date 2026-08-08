"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { resetPassword } from "@/lib/auth/client";
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
import {
  Loader2,
  KeyRoundIcon,
  CircleAlertIcon,
  CircleCheckIcon,
} from "lucide-react";

const MIN_PASSWORD_LENGTH = 8;

export function ResetPasswordForm({
  token,
  invalid,
  className,
  ...props
}: {
  /** Valid reset token from the emailed confirmation link. */
  token?: string;
  /** The link failed validation upstream (expired/used/tampered). */
  invalid?: boolean;
} & React.ComponentProps<"div">) {
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const canSubmit =
    !!token &&
    !saving &&
    newPassword.length >= MIN_PASSWORD_LENGTH &&
    newPassword === confirmPassword;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !token) return;
    setSaving(true);
    const res = await resetPassword({ newPassword, token });
    setSaving(false);
    if (res.error) {
      const m = (res.error.message ?? "").toUpperCase();
      if (m.includes("INVALID_TOKEN") || m.includes("TOKEN")) {
        toast.error("This reset link is invalid or has expired");
      } else if (m.includes("PASSWORD_TOO_SHORT")) {
        toast.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      } else {
        toast.error(res.error.message ?? "Could not reset the password");
      }
      return;
    }
    setDone(true);
    toast.success("Password updated — you can now log in");
  };

  /* ------------------------------ invalid link ----------------------------- */
  if (invalid) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card className="overflow-hidden p-0">
          <CardContent className="grid p-0 md:grid-cols-2">
            <div className="flex flex-col justify-center gap-4 p-6 md:p-8">
              <span className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <CircleAlertIcon className="size-5" aria-hidden="true" />
              </span>
              <h1 className="text-2xl font-bold">Link expired or invalid</h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                This password reset link is no longer valid — it may have
                expired (links last 60 minutes), already been used, or the URL
                was altered. For your security, each link works exactly once.
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <Link href="/forgot-password">
                  <Button className="w-full">Request a new link</Button>
                </Link>
                <Link
                  href="/login"
                  className="text-center text-sm font-medium underline-offset-2 hover:underline"
                >
                  Back to log in
                </Link>
              </div>
            </div>
            <AuthBrandPanel
              title="Security first."
              subtitle="Reset links are single-use and short-lived. If yours lapsed, requesting a fresh one takes seconds."
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  /* -------------------------------- success -------------------------------- */
  if (done) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card className="overflow-hidden p-0">
          <CardContent className="grid p-0 md:grid-cols-2">
            <div className="flex flex-col justify-center gap-4 p-6 md:p-8">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CircleCheckIcon className="size-5" aria-hidden="true" />
              </span>
              <h1 className="text-2xl font-bold">Password updated</h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Your password has been changed successfully and all other
                sessions were signed out. Use your new password from now on.
              </p>
              <Link href="/login" className="pt-2">
                <Button className="w-full">Continue to log in</Button>
              </Link>
            </div>
            <AuthBrandPanel
              title="You're all set."
              subtitle="One key, every model — pick up right where you left off with your fresh credentials."
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ------------------------------ new password ----------------------------- */
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={onSubmit}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <KeyRoundIcon className="size-5" aria-hidden="true" />
                </span>
                <h1 className="text-2xl font-bold">Choose a new password</h1>
                <p className="text-sm text-balance text-muted-foreground">
                  Your reset link was verified. Set a strong new password to
                  finish.
                </p>
              </div>

              <Field>
                <FieldLabel htmlFor="new-password">New password</FieldLabel>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <FieldDescription>
                  Must be at least {MIN_PASSWORD_LENGTH} characters long.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="confirm-password">
                  Confirm new password
                </FieldLabel>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                  <FieldDescription className="text-destructive">
                    Passwords do not match
                  </FieldDescription>
                )}
              </Field>

              <Field>
                <Button type="submit" disabled={!canSubmit} className="w-full">
                  {saving && <Loader2 className="size-4 animate-spin mr-2" />}
                  Update password
                </Button>
              </Field>

              <FieldDescription className="text-center">
                Remembered your password?{" "}
                <Link href="/login" className="font-medium hover:underline">
                  Log in
                </Link>
              </FieldDescription>
            </FieldGroup>
          </form>
          <AuthBrandPanel
            title="Security first."
            subtitle="Your new password is stored hashed, and this reset link becomes invalid the moment you use it."
          />
        </CardContent>
      </Card>
    </div>
  );
}
