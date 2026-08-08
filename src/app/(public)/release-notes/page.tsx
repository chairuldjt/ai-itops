"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import {
  FadeIn,
  FadeInStagger,
  FadeInItem,
} from "@/components/motion";
import { cn } from "@/lib/utils";

const tagColors: Record<string, string> = {
  Feature: "bg-primary/10 text-primary border-primary/20",
  Fix: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  Improvement: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  Launch: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
};

const allTags = ["All", "Feature", "Fix", "Improvement", "Launch"];

interface ReleaseEntry {
  version: string;
  date: string;
  title: string;
  description: string;
  tags: string[];
}

const releases: ReleaseEntry[] = [
  {
    version: "v1.3.0",
    date: "2026-08-15",
    title: "Team Management",
    description:
      "Organization and team-level API keys, role-based access control, and team usage dashboards for multi-user deployments.",
    tags: ["Feature"],
  },
  {
    version: "v1.2.1",
    date: "2026-08-08",
    title: "Usage Analytics",
    description:
      "Enhanced chart components with date range filtering, cost breakdowns by model, and exportable usage reports.",
    tags: ["Improvement"],
  },
  {
    version: "v1.2.0",
    date: "2026-08-05",
    title: "Dashboard & Playground",
    description:
      "Full admin dashboard with real-time metrics, and an interactive playground to test model responses directly in the browser.",
    tags: ["Feature", "Improvement"],
  },
  {
    version: "v1.1.1",
    date: "2026-08-01",
    title: "Per-Key Model Access",
    description:
      "Restrict each API key to a specific set of models with an allowlist, enforced on every request and editable from the console.",
    tags: ["Feature"],
  },
  {
    version: "v1.1.0",
    date: "2026-07-30",
    title: "Capability Handling",
    description:
      "Per-model image policies: strip_and_instruct, canned_response, and reject. Non-vision models handle images gracefully.",
    tags: ["Feature"],
  },
  {
    version: "v1.0.0",
    date: "2026-07-28",
    title: "Initial Release",
    description:
      "Unified OpenAI-compatible API gateway with credit tracking, key management, model routing, and SSE streaming passthrough.",
    tags: ["Feature", "Launch"],
  },
];

export default function ReleaseNotesPage() {
  const [activeTag, setActiveTag] = useState("All");

  const filtered =
    activeTag === "All"
      ? releases
      : releases.filter((r) => r.tags.includes(activeTag));

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10">
      <PageHeader
        title="Release Notes"
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Release Notes" }]}
      />

      <FadeIn delay={0.1}>
        <div className="mt-8 flex flex-wrap gap-2">
          {allTags.map((tag) => (
            <Button
              key={tag}
              variant={activeTag === tag ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTag(tag)}
              aria-pressed={activeTag === tag}
              className={cn(
                "rounded-full text-xs",
                activeTag === tag && "shadow-sm",
              )}
            >
              {tag}
            </Button>
          ))}
        </div>
      </FadeIn>

      <div className="relative mt-10">
        {/* vertical line */}
        <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" aria-hidden="true" />

        <FadeInStagger stagger={0.1} className="space-y-8">
          {filtered.map((entry) => (
            <FadeInItem key={entry.version}>
              <div className="relative flex gap-5">
                {/* dot */}
                <div className="relative z-10 mt-1 flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-background" aria-hidden="true">
                  <div className="size-2.5 rounded-full bg-primary" />
                </div>

                <div className="min-w-0 flex-1 rounded-xl border bg-card p-5 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {entry.version}
                    </Badge>
                    <time className="text-xs text-muted-foreground" dateTime={entry.date}>
                      {new Date(entry.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </time>
                  </div>

                  <h3 className="mt-3 text-lg font-semibold">{entry.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {entry.description}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {entry.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className={cn("text-[10px] font-medium", tagColors[tag])}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </FadeInItem>
          ))}
        </FadeInStagger>

        {filtered.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No releases match this filter.
          </div>
        )}
      </div>
    </div>
  );
}
