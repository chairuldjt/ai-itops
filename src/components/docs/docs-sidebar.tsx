"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NavItem {
  title: string;
  href: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navigation: NavGroup[] = [
  {
    title: "Getting Started",
    items: [
      { title: "Introduction", href: "/docs/introduction" },
      { title: "Quickstart", href: "/docs/quickstart" },
    ],
  },
  {
    title: "API Setup",
    items: [
      { title: "OpenAI Compatible Setup", href: "/docs/openai-setup" },
      { title: "Anthropic Compatible Setup", href: "/docs/anthropic-setup" },
      { title: "Claude Code Setup", href: "/docs/claude-code-setup" },
    ],
  },
  {
    title: "Models",
    items: [
      { title: "Image Models", href: "/docs/image-models" },
      { title: "Video Models", href: "/docs/video-models" },
    ],
  },
  {
    title: "Advanced",
    items: [
      { title: "Capability Handling", href: "/docs/capability-handling" },
      { title: "Rate Limits", href: "/docs/rate-limits" },
      { title: "Management API", href: "/docs/management-api" },
    ],
  },
  {
    title: "Legal",
    items: [
      { title: "FAQ", href: "/docs/faq" },
      { title: "Privacy Policy", href: "/docs/privacy-policy" },
      { title: "Terms of Use", href: "/docs/terms-of-use" },
    ],
  },
];

export function DocsSidebar() {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(navigation.map((g) => [g.title, true]))
  );

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <ScrollArea className="h-full">
      <nav className="py-6 pr-4">
        <Link href="/docs" className="mb-6 block px-4 text-lg font-semibold">
          Documentation
        </Link>

        {navigation.map((group) => (
          <div key={group.title} className="mb-2">
            <button
              onClick={() => toggleGroup(group.title)}
              aria-expanded={openGroups[group.title]}
              className="flex w-full items-center justify-between px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              {group.title}
              <svg
                className={cn(
                  "size-3 transition-transform",
                  openGroups[group.title] ? "rotate-0" : "-rotate-90"
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {openGroups[group.title] && (
              <div className="mt-0.5 space-y-0.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "block rounded-md px-4 py-1.5 text-sm transition-colors",
                        isActive
                          ? "bg-primary/10 font-medium text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {item.title}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>
    </ScrollArea>
  );
}
