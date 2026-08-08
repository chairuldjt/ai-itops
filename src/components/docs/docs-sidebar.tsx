"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenIcon, ChevronDownIcon } from "lucide-react";
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
    title: "Setup",
    items: [{ title: "Connect your tools", href: "/docs/openai-setup" }],
  },
  {
    title: "Account",
    items: [
      { title: "Usage & limits", href: "/docs/rate-limits" },
      { title: "FAQ", href: "/docs/faq" },
    ],
  },
  {
    title: "Legal",
    items: [
      { title: "Privacy Policy", href: "/docs/privacy-policy" },
      { title: "Terms of Use", href: "/docs/terms-of-use" },
    ],
  },
];

export function DocsSidebar({ onNavigate }: { onNavigate?: () => void } = {}) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(navigation.map((g) => [g.title, true]))
  );

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <ScrollArea className="h-full">
      <nav className="py-6 pr-4" aria-label="Documentation navigation">
        <Link
          href="/docs"
          onClick={onNavigate}
          className="mb-7 flex items-center gap-2 rounded-lg px-3 text-[15px] font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/20">
            <BookOpenIcon className="size-3.5" aria-hidden="true" />
          </span>
          Documentation
        </Link>

        {navigation.map((group) => (
          <div key={group.title} className="mb-4">
            <button
              type="button"
              onClick={() => toggleGroup(group.title)}
              aria-expanded={openGroups[group.title]}
              className="flex w-full items-center justify-between rounded-md px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80 transition-colors hover:text-foreground"
            >
              {group.title}
              <ChevronDownIcon
                className={cn(
                  "size-3 transition-transform motion-reduce:transition-none",
                  !openGroups[group.title] && "-rotate-90"
                )}
                aria-hidden="true"
              />
            </button>

            {openGroups[group.title] && (
              <div className="mt-1 ml-3 border-l border-border">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "-ml-px block border-l-2 py-1.5 pl-4 pr-3 text-sm transition-colors",
                        isActive
                          ? "border-primary bg-primary/5 font-medium text-primary"
                          : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
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
