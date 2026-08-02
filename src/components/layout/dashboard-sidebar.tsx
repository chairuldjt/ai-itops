"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "@/lib/auth/client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NavUser } from "@/components/nav-user";
import {
  LayoutDashboardIcon,
  KeyRoundIcon,
  BotIcon,
  ActivityIcon,
  Settings2Icon,
  UsersIcon,
  CreditCardIcon,
  BarChart3Icon,
} from "lucide-react";

export type SidebarMode = "dashboard" | "admin";

export function DashboardSidebar({
  mode,
  ...props
}: Omit<React.ComponentProps<typeof Sidebar>, "variant"> & { mode: SidebarMode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;

  const dashboardMenu = [
    {
      title: "Overview",
      url: "/dashboard",
      icon: <LayoutDashboardIcon />,
      isActive: pathname === "/dashboard",
    },
    {
      title: "API Keys",
      url: "/dashboard/keys",
      icon: <KeyRoundIcon />,
      isActive: pathname.startsWith("/dashboard/keys"),
    },
    {
      title: "Models",
      url: "/dashboard/models",
      icon: <BotIcon />,
      isActive: pathname.startsWith("/dashboard/models"),
    },
    {
      title: "Usage",
      url: "/dashboard/usage",
      icon: <ActivityIcon />,
      isActive: pathname.startsWith("/dashboard/usage"),
    },
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: <Settings2Icon />,
      isActive: pathname.startsWith("/dashboard/settings"),
    },
  ];

  const adminMenu = [
    {
      title: "Overview",
      url: "/admin",
      icon: <BarChart3Icon />,
      isActive: pathname === "/admin",
    },
    {
      title: "Models",
      url: "/admin/models",
      icon: <BotIcon />,
      isActive: pathname.startsWith("/admin/models"),
    },
    {
      title: "Users",
      url: "/admin/users",
      icon: <UsersIcon />,
      isActive: pathname.startsWith("/admin/users"),
    },
    {
      title: "Billing",
      url: "/admin/billing",
      icon: <CreditCardIcon />,
      isActive: pathname.startsWith("/admin/billing"),
    },
  ];

  const menu = mode === "admin" ? adminMenu : dashboardMenu;

  const u = user as unknown as
    | { creditBalance?: bigint | number | string }
    | undefined;
  const rawBalance = u?.creditBalance;
  const creditBalanceUsd =
    typeof rawBalance === "bigint"
      ? Number(rawBalance) / 1_000_000
      : Number(rawBalance ?? 0) / 1_000_000;

  return (
    <Sidebar className="top-topbar bottom-auto h-[calc(100svh-var(--topbar-height))]" {...props}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{mode === "admin" ? "Admin" : "Dashboard"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menu.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    render={<Link href={item.url}>{item.icon}<span>{item.title}</span></Link>}
                    isActive={item.isActive}
                    tooltip={item.title}
                  />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {mode === "dashboard" && user?.role === "admin" && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminMenu.slice(0, 2).map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      render={<Link href={item.url}>{item.icon}<span>{item.title}</span></Link>}
                      isActive={item.isActive}
                      tooltip={item.title}
                    />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <NavUser
          user={{
            name: user?.name ?? "Guest",
            email: user?.email ?? "",
            avatar: user?.image ?? "",
            creditBalance: creditBalanceUsd,
          }}
          onSignOut={() =>
            signOut({
              fetchOptions: {
                onSuccess: () => {
                  document.cookie = "ba_role=; Path=/; Max-Age=0";
                  window.location.href = "/login";
                },
              },
            })
          }
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
