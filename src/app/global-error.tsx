"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { AlertTriangleIcon, ArrowLeftIcon } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-svh flex-col items-center justify-center p-6 text-center">
          <div className="mx-auto max-w-md">
            <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-destructive/10">
              <AlertTriangleIcon className="size-8 text-destructive" />
            </div>

            <h1 className="text-2xl font-bold tracking-tight">
              A critical error occurred
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              The application failed to load. Please try refreshing the page.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button onClick={reset} className={buttonVariants({ size: "lg" })}>
                Refresh page
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
      </body>
    </html>
  );
}
