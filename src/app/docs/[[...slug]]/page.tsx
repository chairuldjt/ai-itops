import { notFound } from "next/navigation";
import Link from "next/link";
import fs from "fs/promises";
import path from "path";
import { compileMDX } from "next-mdx-remote/rsc";
import { DocsToc } from "@/components/docs/docs-toc";
import { CopyButton } from "@/components/docs/copy-button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { AlertTriangle, Info, CheckCircle2, ArrowLeft, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

const DOCS_DIR = path.join(process.cwd(), "src", "content", "docs");

/* ------------------------------------------------------------------ */
/*                            Callout                                 */
/* ------------------------------------------------------------------ */

function Callout({
  type = "info",
  children,
}: {
  type?: "info" | "warning" | "success";
  children: React.ReactNode;
}) {
  const styles = {
    info: { icon: Info, border: "border-blue-500/30", bg: "bg-blue-500/5", iconColor: "text-blue-500" },
    warning: { icon: AlertTriangle, border: "border-yellow-500/30", bg: "bg-yellow-500/5", iconColor: "text-yellow-500" },
    success: { icon: CheckCircle2, border: "border-emerald-500/30", bg: "bg-emerald-500/5", iconColor: "text-emerald-500" },
  };
  const s = styles[type];
  const Icon = s.icon;

  return (
    <div className={`my-6 rounded-lg border ${s.border} ${s.bg} p-4`}>
      <div className="flex gap-3">
        <Icon className={`mt-0.5 size-4 shrink-0 ${s.iconColor}`} />
        <div className="text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                            CodeBlock                               */
/* ------------------------------------------------------------------ */

function CodeBlock({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  const match = /language-(\w+)/.exec(className || "");
  const lang = match ? match[1] : "";
  const isMultiLine = children.includes("\n");

  return (
    <div className="relative my-4">
      {isMultiLine && <CopyButton code={children} />}
      <div className="overflow-x-auto rounded-lg border bg-zinc-900 p-4 text-sm leading-relaxed dark:bg-zinc-950">
        <pre>
          <code className={`${className ?? ""} text-zinc-100`}>
            {children.trim()}
          </code>
        </pre>
        {lang && (
          <div className="mt-2 text-right text-[10px] uppercase tracking-wider text-zinc-500">
            {lang}
          </div>
        )}
      </div>
    </div>
  );
}

/* Inline code */
function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
      {children}
    </code>
  );
}

/* ------------------------------------------------------------------ */
/*                        MDX Components                              */
/* ------------------------------------------------------------------ */

const components = {
  h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="mb-4 text-3xl font-semibold tracking-tight" {...props}>{children}</h1>
  ),
  h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
    const text = typeof children === "string" ? children : "";
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    return (
      <h2 id={id} className="mb-3 mt-10 text-xl font-semibold tracking-tight border-b pb-2" {...props}>
        {children}
      </h2>
    );
  },
  h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
    const text = typeof children === "string" ? children : "";
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    return (
      <h3 id={id} className="mb-2 mt-8 text-lg font-semibold tracking-tight" {...props}>
        {children}
      </h3>
    );
  },
  p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="mb-4 text-muted-foreground leading-relaxed" {...props}>{children}</p>
  ),
  ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="mb-4 ml-6 list-disc space-y-1 text-muted-foreground" {...props}>{children}</ul>
  ),
  ol: ({ children, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="mb-4 ml-6 list-decimal space-y-1 text-muted-foreground" {...props}>{children}</ol>
  ),
  li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="leading-relaxed" {...props}>{children}</li>
  ),
  a: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <Link href={href ?? "#"} className="font-medium text-primary underline underline-offset-4 hover:text-primary/80" {...props}>
      {children}
    </Link>
  ),
  strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold text-foreground" {...props}>{children}</strong>
  ),
  code: InlineCode,
  pre: ({ children }: React.HTMLAttributes<HTMLPreElement>) => {
    const el = children as React.ReactElement<{ children?: string; className?: string }>;
    const codeChild = el?.props?.children ?? "";
    const className = el?.props?.className ?? "";
    return <CodeBlock className={className}>{codeChild}</CodeBlock>;
  },
  table: ({ children, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="my-6 overflow-x-auto rounded-lg border">
      <table className="w-full text-sm" {...props}>{children}</table>
    </div>
  ),
  thead: ({ children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead className="border-b bg-muted/50" {...props}>{children}</thead>
  ),
  th: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th className="px-4 py-2.5 text-left font-medium text-foreground" {...props}>{children}</th>
  ),
  td: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td className="px-4 py-2.5 text-muted-foreground" {...props}>{children}</td>
  ),
  hr: (props: React.HTMLAttributes<HTMLHRElement>) => (
    <hr className="my-8 border-border" {...props} />
  ),
  blockquote: ({ children, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote className="my-6 border-l-2 border-primary/30 pl-4 text-muted-foreground italic" {...props}>
      {children}
    </blockquote>
  ),
  Callout,
};

/* ------------------------------------------------------------------ */
/*                        Nav ordering                                */
/* ------------------------------------------------------------------ */

const NAV_ORDER = [
  "introduction",
  "quickstart",
  "openai-setup",
  "anthropic-setup",
  "claude-code-setup",
  "image-models",
  "video-models",
  "capability-handling",
  "rate-limits",
  "management-api",
  "faq",
  "privacy-policy",
  "terms-of-use",
];

const TITLE_MAP: Record<string, string> = {
  "introduction": "Introduction",
  "quickstart": "Quickstart",
  "openai-setup": "OpenAI Compatible Setup",
  "anthropic-setup": "Anthropic Compatible Setup",
  "claude-code-setup": "Claude Code Setup",
  "image-models": "Image Models",
  "video-models": "Video Models",
  "capability-handling": "Capability Handling",
  "rate-limits": "Rate Limits",
  "management-api": "Management API",
  "faq": "FAQ",
  "privacy-policy": "Privacy Policy",
  "terms-of-use": "Terms of Use",
};

/* ------------------------------------------------------------------ */
/*                            Page                                    */
/* ------------------------------------------------------------------ */

export async function generateMetadata({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const currentSlug = slug?.[0] ?? "introduction";
  const title = TITLE_MAP[currentSlug] ?? "Docs";
  return { title: `${title} — AI Gateway Docs` };
}

export default async function DocsPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const currentSlug = slug?.[0] ?? "introduction";

  // Check file exists
  const filePath = path.join(DOCS_DIR, `${currentSlug}.mdx`);
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf-8");
  } catch {
    notFound();
  }

  // Compile MDX
  const { content } = await compileMDX({
    source: raw,
    components,
    options: { mdxOptions: {} },
  });

  // Extract headings for TOC (from raw markdown)
  const headingRegex = /^#{2,3}\s+(.+)$/gm;
  const headings: { id: string; text: string; level: number }[] = [];
  let match;
  while ((match = headingRegex.exec(raw)) !== null) {
    const level = match[0].startsWith("###") ? 3 : 2;
    const text = match[1].replace(/[`*_]/g, "").trim();
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    headings.push({ id, text, level });
  }

  // Prev / next
  const idx = NAV_ORDER.indexOf(currentSlug);
  const prev = idx > 0 ? NAV_ORDER[idx - 1] : null;
  const next = idx < NAV_ORDER.length - 1 ? NAV_ORDER[idx + 1] : null;

  return (
    <div className="flex gap-8">
      <div className="min-w-0 flex-1">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/docs">Docs</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{TITLE_MAP[currentSlug]}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* MDX content */}
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          {content}
        </div>

        {/* Prev / Next */}
        <div className="mt-12 flex items-center justify-between border-t pt-6">
          {prev ? (
            <Link
              href={`/docs/${prev}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-4" />
              {TITLE_MAP[prev]}
            </Link>
          ) : <span />}
          {next ? (
            <Link
              href={`/docs/${next}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {TITLE_MAP[next]}
              <ArrowRight className="size-4" />
            </Link>
          ) : <span />}
        </div>
      </div>

      {/* Right TOC */}
      <aside className="hidden w-[200px] shrink-0 xl:block">
        <div className="sticky top-20">
          <DocsToc headings={headings} />
        </div>
      </aside>
    </div>
  );
}
