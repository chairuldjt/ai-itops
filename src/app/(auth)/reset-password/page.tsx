import Link from "next/link";
import type { Metadata } from "next";
import { WorkflowIcon } from "lucide-react";
import { ResetPasswordForm } from "@/components/reset-password-form";

export const metadata: Metadata = {
  title: "Choose a new password — AI Gateway",
};

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const invalid = !!error || !token;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      {/* Logo link back to home */}
      <div className="absolute top-4 left-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-foreground hover:opacity-80 transition-opacity"
          aria-label="Back to home"
        >
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <WorkflowIcon className="size-4" aria-hidden="true" />
          </span>
          <span>AI Gateway</span>
        </Link>
      </div>

      <div className="w-full max-w-sm md:max-w-4xl">
        <ResetPasswordForm token={token} invalid={invalid} />
      </div>
    </div>
  );
}
