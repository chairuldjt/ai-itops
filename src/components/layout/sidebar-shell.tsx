"use client";

import * as React from "react";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { SiteTopBar } from "@/components/layout/site-topbar";
import type { SiteSection } from "@/components/layout/site-topbar";
import { FadeIn } from "@/components/motion";

export function SidebarShell({
  children,
  sidebar,
  section = "console",
}: {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  section?: SiteSection;
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-svh w-full flex-col overflow-hidden">
        <SiteTopBar
          section={section}
          sidebarTrigger={<SidebarTrigger className="-ml-1" />}
        />
        <div className="flex flex-1 min-w-0">
          {sidebar}
          <SidebarInset className="min-w-0">
            <main className="flex flex-1 flex-col gap-4 p-4">
              <FadeIn duration={0.3} y={12}>
                {children}
              </FadeIn>
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
