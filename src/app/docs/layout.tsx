import type { ReactNode } from "react";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { DocsMobileNav } from "@/components/docs/docs-mobile-nav";
import { SiteTopBar } from "@/components/layout/site-topbar";
import { SiteFooter } from "@/components/layout/site-footer";

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Skip to main content — accessibility */}
      <a
        href="#docs-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg focus:outline-none"
      >
        Skip to content
      </a>

      {/* Unified top bar */}
      <SiteTopBar />

      <div className="mx-auto flex w-full max-w-7xl flex-1">
        {/* Left sidebar — sticky, scrolls independently (desktop only) */}
        <aside className="sticky top-[var(--topbar-height)] hidden max-h-[calc(100svh-var(--topbar-height))] w-[260px] shrink-0 overflow-hidden border-r lg:block">
          <DocsSidebar />
        </aside>

        {/* Main content */}
        <main id="docs-content" className="min-w-0 flex-1">
          {/* Mobile docs navigation (hidden on desktop) */}
          <div className="px-6 pt-6 lg:hidden">
            <DocsMobileNav />
          </div>
          <article className="px-6 py-10 lg:px-12">
            {children}
          </article>
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}
