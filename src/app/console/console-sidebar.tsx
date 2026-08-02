"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarShell } from "@/components/layout/sidebar-shell";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  LayoutDashboardIcon,
  BotIcon,
  MessageSquareIcon,
  KeyRoundIcon,
  BarChart3Icon,
  CoinsIcon,
  SettingsIcon,
} from "lucide-react";

const NAV_ITEMS = [
  { title: "Dashboard", url: "/console/dashboard", icon: LayoutDashboardIcon },
  { title: "Models", url: "/console/models", icon: BotIcon },
  { title: "Chat", url: "/console/chat", icon: MessageSquareIcon },
  { title: "API Keys", url: "/console/api-keys", icon: KeyRoundIcon },
  { title: "Usage Logs", url: "/console/usage", icon: BarChart3Icon },
  { title: "Billing", url: "/console/balance", icon: CoinsIcon },
  { title: "Settings", url: "/console/settings", icon: SettingsIcon },
];

export function ConsoleSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" className="top-topbar bottom-auto h-[calc(100svh-var(--topbar-height))]">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    render={<Link href={item.url} />}
                    isActive={pathname === item.url || pathname.startsWith(item.url + "/")}
                    tooltip={item.title}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
