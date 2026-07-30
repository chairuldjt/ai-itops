"use client";

import { useEffect } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { AlertTriangleIcon, ArrowLeftIcon, RefreshCwIcon } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to an error reporting service
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6 text-center">
      <div className="mx-auto max-w-md">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertTriangleIcon className="size-8 text-destructive" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          An unexpected error occurred. Please try again or go back to the
          homepage.
        </p>

        {error.digest && (
          <p className="mt-3 rounded-lg bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
            Error ID: {error.digest}
          </p>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button onClick={reset} className={buttonVariants({ size: "lg" })}>
            <RefreshCwIcon className="mr-2 size-4" />
            Try again
          </button>
          <Link
            href="/"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            <ArrowLeftIcon className="mr-2 size-4" />
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
