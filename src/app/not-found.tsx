import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { FileQuestionIcon, ArrowLeftIcon } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6 text-center">
      <div className="mx-auto max-w-md">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-muted">
          <FileQuestionIcon className="size-8 text-muted-foreground" />
        </div>

        <h1 className="text-4xl font-bold tracking-tight">404</h1>
        <p className="mt-2 text-lg font-medium">Page not found</p>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className={buttonVariants({ size: "lg" })}>
            <ArrowLeftIcon className="mr-2 size-4" />
            Back to home
          </Link>
          <Link
            href="/docs"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Read the docs
          </Link>
        </div>
      </div>
    </div>
  );
}
