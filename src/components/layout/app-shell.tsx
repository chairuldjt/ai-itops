"use client";

import * as React from "react";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SiteTopBar } from "@/components/layout/site-topbar";

/**
 * Unified application shell for the authenticated console + admin areas.
 * A global SiteTopBar spans the top; below it a sidebar drives app navigation.
 */
export function AppShell({
  children,
  section = "console",
}: {
  children: React.ReactNode;
  section?: "console" | "admin";
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-svh w-full flex-col">
        <SiteTopBar
          section={section}
          sidebarTrigger={<SidebarTrigger size="icon-lg" className="md:hidden" />}
        />
        <div className="flex min-w-0 flex-1">
          <AppSidebar section={section} />
          <SidebarInset className="relative min-w-0 flex-1">
            {/* Ambient backdrop glow for the content area */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-0 h-64 bg-gradient-to-b from-primary/[0.06] to-transparent"
              aria-hidden="true"
            />
            <main className="relative z-10 flex flex-1 flex-col p-4 sm:p-6 lg:p-8">
              <div className="mx-auto w-full max-w-6xl flex-1">{children}</div>
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
