import type { ReactNode } from "react";
import { SiteTopBar } from "@/components/layout/site-topbar";
import { SiteFooter } from "@/components/layout/site-footer";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      {/* Skip to main content — accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>

      <SiteTopBar />

      <main id="main-content" className="flex-1">
        {children}
      </main>

      <SiteFooter />
    </div>
  );
}
