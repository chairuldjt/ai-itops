"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { requestPasswordReset } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
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
import { Loader2, MailIcon, ShieldCheckIcon } from "lucide-react";

const schema = z.object({
  email: z.string().email("Please enter a valid email"),
});
type FormData = z.infer<typeof schema>;

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [loading, setLoading] = React.useState(false);
  const [sentTo, setSentTo] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    const redirectTo = `${window.location.origin}/reset-password`;
    const res = await requestPasswordReset({
      email: data.email,
      redirectTo,
    });
    setLoading(false);
    if (res.error) {
      toast.error(res.error.message ?? "Could not send the reset link");
      return;
    }
    // Always show the same confirmation (prevents email enumeration).
    setSentTo(data.email);
  };

  if (sentTo) {
    return (
      <div className={cn(className)} {...props}>
        <Card className="overflow-hidden p-0">
          <CardContent className="grid p-0 md:grid-cols-2">
            <div className="flex flex-col justify-center gap-4 p-6 md:p-8">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MailIcon className="size-5" aria-hidden="true" />
              </span>
              <h1 className="text-2xl font-bold">Check your inbox</h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                If an account exists for{" "}
                <span className="font-medium text-foreground">{sentTo}</span>,
                we&apos;ve sent a secure link to reset your password. The link
                expires in 60 minutes.
              </p>
              <p className="text-sm text-muted-foreground">
                Didn&apos;t get it? Check your spam folder, then{" "}
                <button
                  type="button"
                  onClick={() => setSentTo(null)}
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  try again
                </button>
                .
              </p>
              <Link
                href="/login"
                className="mt-2 text-sm font-medium underline-offset-2 hover:underline"
              >
                Back to log in
              </Link>
            </div>
            <AuthBrandPanel
              title="Security first."
              subtitle="Password changes always require a confirmation link delivered to your inbox — no one can reset your password without access to your email."
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleSubmit(onSubmit)}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ShieldCheckIcon className="size-5" aria-hidden="true" />
                </span>
                <h1 className="text-2xl font-bold">Forgot your password?</h1>
                <p className="text-sm text-balance text-muted-foreground">
                  Enter the email on your account and we&apos;ll send you a
                  secure link to set a new password.
                </p>
              </div>

              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...register("email")}
                />
                {errors.email && (
                  <FieldDescription className="text-destructive">
                    {errors.email.message}
                  </FieldDescription>
                )}
              </Field>

              <Field>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading && <Loader2 className="size-4 animate-spin mr-2" />}
                  Send reset link
                </Button>
              </Field>

              <FieldDescription className="text-center">
                Remembered it?{" "}
                <Link href="/login" className="font-medium hover:underline">
                  Back to log in
                </Link>
              </FieldDescription>
            </FieldGroup>
          </form>
          <AuthBrandPanel
            title="Security first."
            subtitle="Password changes always require a confirmation link delivered to your inbox — no one can reset your password without access to your email."
          />
        </CardContent>
      </Card>
    </div>
  );
}
