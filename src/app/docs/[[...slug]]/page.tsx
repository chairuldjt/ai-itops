import { notFound } from "next/navigation";
import Link from "next/link";
import fs from "fs/promises";
import path from "path";
import { compileMDX } from "next-mdx-remote/rsc";
import { DocsToc } from "@/components/docs/docs-toc";
import { CopyButton } from "@/components/docs/copy-button";
import { getAppBaseUrl, getAppEmailDomain } from "@/lib/site";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  AlertTriangle,
  Info,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

const DOCS_DIR = path.join(process.cwd(), "src", "content", "docs");

/* ------------------------------------------------------------------ */
/*                        Base URL substitution                       */
/* ------------------------------------------------------------------ */

/**
 * Docs are written against the placeholder host `your-domain.com`. At render
 * time we swap it for the app's real base URL (NEXT_PUBLIC_APP_URL), so code
 * snippets are copy-paste ready and contact addresses match the deployment.
 */
function substituteBaseUrl(raw: string): string {
  const baseUrl = getAppBaseUrl();
  const emailDomain = getAppEmailDomain();
  return raw
    .replaceAll("https://your-domain.com", baseUrl)
    .replaceAll("http://your-domain.com", baseUrl)
    .replaceAll("your-domain.com", emailDomain);
}

/* ------------------------------------------------------------------ */
/*                           Endpoint bar                             */
/* ------------------------------------------------------------------ */

/**
 * Signature element of the docs: a terminal-style strip showing the live
 * gateway base URL with a copy action. Answers the #1 docs question —
 * "what do I set as the base URL?" — without prose.
 */
function EndpointBar() {
  const baseUrl = getAppBaseUrl();
  return (
    <div className="mb-10 overflow-hidden rounded-xl bg-zinc-950 ring-1 ring-white/10">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3 font-mono text-xs">
          <span
            className="size-1.5 shrink-0 rounded-full bg-emerald-400 ring-2 ring-emerald-400/25"
            aria-hidden="true"
          />
          <span className="shrink-0 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            Base URL
          </span>
          <code className="truncate text-[13px] text-zinc-100">
            {baseUrl}/v1
          </code>
        </div>
        <CopyButton code={`${baseUrl}/v1`} ariaLabel="Copy base URL" />
      </div>
    </div>
  );
}

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
    info: {
      icon: Info,
      rail: "bg-primary",
      border: "border-primary/25",
      bg: "bg-primary/5",
      iconColor: "text-primary",
    },
    warning: {
      icon: AlertTriangle,
      rail: "bg-yellow-500",
      border: "border-yellow-500/25",
      bg: "bg-yellow-500/5",
      iconColor: "text-yellow-600 dark:text-yellow-500",
    },
    success: {
      icon: CheckCircle2,
      rail: "bg-emerald-500",
      border: "border-emerald-500/25",
      bg: "bg-emerald-500/5",
      iconColor: "text-emerald-600 dark:text-emerald-500",
    },
  };
  const s = styles[type];
  const Icon = s.icon;

  return (
    <div className={`my-6 flex overflow-hidden rounded-lg border ${s.border} ${s.bg}`}>
      <span className={`w-1 shrink-0 ${s.rail}`} aria-hidden="true" />
      <div className="flex gap-3 p-4">
        <Icon className={`mt-0.5 size-4 shrink-0 ${s.iconColor}`} aria-hidden="true" />
        <div className="text-sm leading-relaxed [&_p]:my-0">{children}</div>
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
  const lang = match ? match[1] : "text";
  const isMultiLine = children.includes("\n");

  return (
    <div className="my-5 overflow-hidden rounded-xl bg-zinc-950 ring-1 ring-white/10">
      <div className="flex items-center justify-between gap-3 border-b border-white/5 bg-white/[0.03] px-4 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          {lang}
        </span>
        {isMultiLine && <CopyButton code={children.trim()} ariaLabel={`Copy ${lang} snippet`} />}
      </div>
      <div className="overflow-x-auto p-4">
        <pre>
          <code
            className={`${className ?? ""} font-mono text-[13px] leading-relaxed text-zinc-100`}
          >
            {children.trim()}
          </code>
        </pre>
      </div>
    </div>
  );
}

/* Inline code */
function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-md border bg-muted/60 px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
      {children}
    </code>
  );
}

/* ------------------------------------------------------------------ */
/*                        MDX Components                              */
/* ------------------------------------------------------------------ */

function headingId(children: React.ReactNode): string {
  const text = typeof children === "string" ? children : "";
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const components = {
  h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1
      className="mb-3 text-3xl font-semibold tracking-tight text-balance md:text-4xl"
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
    const id = headingId(children);
    return (
      <h2
        id={id}
        className="group mb-4 mt-12 scroll-mt-24 border-b pb-2.5 text-xl font-semibold tracking-tight"
        {...props}
      >
        {children}
        <a
          href={`#${id}`}
          aria-label={`Link to section: ${typeof children === "string" ? children : ""}`}
          className="ml-2 font-mono text-sm text-primary/60 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        >
          #
        </a>
      </h2>
    );
  },
  h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
    const id = headingId(children);
    return (
      <h3
        id={id}
        className="mb-3 mt-8 scroll-mt-24 text-lg font-semibold tracking-tight"
        {...props}
      >
        {children}
      </h3>
    );
  },
  p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="my-4 text-[15px] leading-7 text-foreground/80" {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul
      className="my-4 ml-5 list-disc space-y-1.5 text-[15px] text-foreground/80 marker:text-primary/60"
      {...props}
    >
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
    <ol
      className="my-4 ml-5 list-decimal space-y-1.5 text-[15px] text-foreground/80 marker:font-mono marker:text-primary/70"
      {...props}
    >
      {children}
    </ol>
  ),
  li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="leading-7" {...props}>
      {children}
    </li>
  ),
  a: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <Link
      href={href ?? "#"}
      className="font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary"
      {...props}
    >
      {children}
    </Link>
  ),
  strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold text-foreground" {...props}>
      {children}
    </strong>
  ),
  code: InlineCode,
  pre: ({ children }: React.HTMLAttributes<HTMLPreElement>) => {
    const el = children as React.ReactElement<{
      children?: string;
      className?: string;
    }>;
    const codeChild = el?.props?.children ?? "";
    const className = el?.props?.className ?? "";
    return <CodeBlock className={className}>{codeChild}</CodeBlock>;
  },
  table: ({ children, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="my-6 overflow-x-auto rounded-lg border">
      <table className="w-full text-sm" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead className="border-b bg-muted/50" {...props}>
      {children}
    </thead>
  ),
  th: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th
      className="px-4 py-2.5 text-left font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td className="px-4 py-2.5 text-foreground/80" {...props}>
      {children}
    </td>
  ),
  tr: ({ children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr className="border-b last:border-b-0" {...props}>
      {children}
    </tr>
  ),
  hr: (props: React.HTMLAttributes<HTMLHRElement>) => (
    <hr className="my-10 border-border" {...props} />
  ),
  blockquote: ({ children, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className="my-6 border-l-2 border-primary/40 pl-4 text-foreground/70 italic"
      {...props}
    >
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
  "rate-limits",
  "faq",
  "privacy-policy",
  "terms-of-use",
];

const TITLE_MAP: Record<string, string> = {
  introduction: "Introduction",
  quickstart: "Quickstart",
  "openai-setup": "Connect your tools",
  "rate-limits": "Usage & limits",
  faq: "FAQ",
  "privacy-policy": "Privacy Policy",
  "terms-of-use": "Terms of Use",
};

const GROUP_MAP: Record<string, string> = {
  introduction: "Getting Started",
  quickstart: "Getting Started",
  "openai-setup": "Setup",
  "rate-limits": "Account",
  faq: "Account",
  "privacy-policy": "Legal",
  "terms-of-use": "Legal",
};

/* ------------------------------------------------------------------ */
/*                            Page                                    */
/* ------------------------------------------------------------------ */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const currentSlug = slug?.[0] ?? "introduction";
  const title = TITLE_MAP[currentSlug] ?? "Docs";
  return { title: `${title} — AI Gateway Docs` };
}

export default async function DocsPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
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

  // Swap the placeholder host for the deployment's real base URL.
  raw = substituteBaseUrl(raw);

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
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    headings.push({ id, text, level });
  }

  // Prev / next
  const idx = NAV_ORDER.indexOf(currentSlug);
  const prev = idx > 0 ? NAV_ORDER[idx - 1] : null;
  const next = idx < NAV_ORDER.length - 1 ? NAV_ORDER[idx + 1] : null;
  const group = GROUP_MAP[currentSlug];

  return (
    <div className="flex gap-10">
      <div className="min-w-0 flex-1">
        {/* Breadcrumb + section eyebrow */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <Breadcrumb>
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
          {group && (
            <span className="hidden shrink-0 rounded-full border bg-muted/40 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:inline-block">
              {group}
            </span>
          )}
        </div>

        {/* Signature: the live gateway base URL, copy-ready */}
        <EndpointBar />

        {/* MDX content */}
        <div className="max-w-none">{content}</div>

        {/* Prev / Next */}
        <div className="mt-14 grid gap-3 border-t pt-8 sm:grid-cols-2">
          {prev ? (
            <Link
              href={`/docs/${prev}`}
              className="group flex flex-col gap-1.5 rounded-xl border p-4 transition-colors hover:border-primary/40 hover:bg-muted/40"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Previous
              </span>
              <span className="flex items-center gap-2 text-sm font-medium">
                <ArrowLeft
                  className="size-4 text-muted-foreground transition-transform group-hover:-translate-x-0.5 group-hover:text-primary motion-reduce:transition-none"
                  aria-hidden="true"
                />
                {TITLE_MAP[prev]}
              </span>
            </Link>
          ) : (
            <span className="hidden sm:block" />
          )}
          {next ? (
            <Link
              href={`/docs/${next}`}
              className="group flex flex-col items-end gap-1.5 rounded-xl border p-4 text-right transition-colors hover:border-primary/40 hover:bg-muted/40"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Next
              </span>
              <span className="flex items-center gap-2 text-sm font-medium">
                {TITLE_MAP[next]}
                <ArrowRight
                  className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </span>
            </Link>
          ) : (
            <span className="hidden sm:block" />
          )}
        </div>
      </div>

      {/* Right TOC */}
      <aside className="hidden w-[220px] shrink-0 xl:block">
        <div className="sticky top-24">
          <DocsToc headings={headings} />
        </div>
      </aside>
    </div>
  );
}
