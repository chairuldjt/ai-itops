"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "absolute right-2 top-2 rounded-md border bg-muted px-2 py-1 text-xs transition-colors hover:bg-muted/80",
        copied && "text-primary"
      )}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}
