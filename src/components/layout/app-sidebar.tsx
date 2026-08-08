"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/auth/client";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutDashboardIcon,
  MessageSquareIcon,
  BotIcon,
  KeyRoundIcon,
  BarChart3Icon,
  CoinsIcon,
  SettingsIcon,
  ShieldIcon,
  UsersIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
} from "lucide-react";

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
};

const CONSOLE_NAV: NavItem[] = [
  { title: "Overview", url: "/console/dashboard", icon: LayoutDashboardIcon },
  { title: "Chat", url: "/console/chat", icon: MessageSquareIcon },
  { title: "Models", url: "/console/models", icon: BotIcon },
  { title: "API Keys", url: "/console/api-keys", icon: KeyRoundIcon },
  { title: "Usage", url: "/console/usage", icon: BarChart3Icon },
  { title: "Billing", url: "/console/balance", icon: CoinsIcon },
  { title: "Settings", url: "/console/settings", icon: SettingsIcon },
];

const ADMIN_NAV: NavItem[] = [
  { title: "Overview", url: "/admin", icon: ShieldIcon },
  { title: "Models", url: "/admin/models", icon: BotIcon },
  { title: "Users", url: "/admin/users", icon: UsersIcon },
];

/**
 * Whether a nav item should be highlighted for the current path.
 * Section roots (like "/admin") must NOT match their child routes,
 * otherwise "Overview" stays active on /admin/models, /admin/users, etc.
 */
function isActivePath(pathname: string, url: string): boolean {
  if (pathname === url) return true;
  if (url === "/admin") return false;
  return pathname.startsWith(url + "/");
}

function NavGroup({ label, items }: { label?: string; items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active = isActivePath(pathname, item.url);
            return (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton
                  render={<Link href={item.url} />}
                  isActive={active}
                  tooltip={item.title}
                >
                  <item.icon className="size-4" />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

/**
 * Static profile header (not clickable — the topbar already carries the
 * interactive account menu) plus the sidebar collapse/expand toggle.
 * When collapsed, only the expand button is shown (the profile is hidden).
 */
function SidebarProfileHeader() {
  const { data: session } = useSession();
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";

  // Collapsed: show only the expand button, hide the profile.
  if (collapsed) {
    return (
      <div className="flex justify-center px-2 pt-5 pb-2">
        <button
          type="button"
          onClick={toggleSidebar}
          className="relative hidden size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground after:absolute after:left-1/2 after:top-1/2 after:size-10 after:-translate-1/2 md:flex"
          aria-label="Expand sidebar"
          title="Expand sidebar"
        >
          <PanelLeftOpenIcon className="size-[18px]" aria-hidden="true" />
        </button>
      </div>
    );
  }

  const name = session?.user?.name ?? "Guest";
  const email = session?.user?.email ?? "";
  const initials = (name || "?")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center gap-2.5 px-3 pt-5 pb-3">
      <Avatar className="size-8 shrink-0">
        <AvatarImage src={session?.user?.image ?? ""} alt={name} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate text-sm font-medium">{name}</div>
        <div className="truncate text-xs text-muted-foreground">{email}</div>
      </div>

      <button
        type="button"
        onClick={toggleSidebar}
        className="relative hidden size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground after:absolute after:left-1/2 after:top-1/2 after:size-10 after:-translate-1/2 md:flex"
        aria-label="Collapse sidebar"
        title="Collapse sidebar"
      >
        <PanelLeftCloseIcon className="size-[18px]" aria-hidden="true" />
      </button>
    </div>
  );
}

export function AppSidebar({
  section = "console",
}: {
  section?: "console" | "admin";
}) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  return (
    <Sidebar
      collapsible="icon"
      className="top-topbar bottom-auto h-[calc(100svh-var(--topbar-height))]"
    >
      <SidebarProfileHeader />

      <SidebarContent className="pt-2">
        <NavGroup items={CONSOLE_NAV} label="Platform" />
        {isAdmin && <NavGroup items={ADMIN_NAV} label="Administration" />}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
