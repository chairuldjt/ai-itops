"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { signInAndSetRoleCookie } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Loader2 } from "lucide-react";

const schema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type FormData = z.infer<typeof schema>;

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const router = useRouter();
  const sp = useSearchParams();
  const redirect = sp.get("redirect") || "/dashboard";
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ defaultValues: { email: "", password: "" } });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    const res = await signInAndSetRoleCookie({
      email: data.email,
      password: data.password,
    });
    setLoading(false);
    if (res.error) {
      toast.error(res.error.message ?? "Invalid email or password");
      return;
    }
    toast.success("Welcome back!");
    router.push(redirect);
    router.refresh();
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleSubmit(onSubmit)}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Welcome back</h1>
                <p className="text-balance text-muted-foreground">
                  Log in to your AI Gateway account
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
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Link
                      href="/docs/faq"
                      className="ml-auto text-sm underline-offset-2 hover:underline"
                    >
                      Forgot?
                    </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...register("password")}
                />
                {errors.password && (
                  <FieldDescription className="text-destructive">
                    {errors.password.message}
                  </FieldDescription>
                )}
              </Field>

              <Field>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading && <Loader2 className="size-4 animate-spin mr-2" />}
                  Log in
                </Button>
              </Field>

              <FieldDescription className="text-center">
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="font-medium hover:underline">
                  Sign up
                </Link>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="relative hidden bg-muted md:block">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center px-8">
                <h2 className="text-3xl font-bold mb-2">AI Gateway</h2>
                <p className="text-muted-foreground">
                  A unified API for OpenAI, Anthropic and more. One key, every
                  model.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By continuing, you agree to our{" "}
        <Link href="/docs/terms-of-use" className="underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/docs/privacy-policy" className="underline">
          Privacy Policy
        </Link>
        .
      </FieldDescription>
    </div>
  );
}
