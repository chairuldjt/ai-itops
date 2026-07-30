"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/layout/site-topbar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  LayoutDashboardIcon,
  BotIcon,
  MessageSquareIcon,
  KeyRoundIcon,
  BarChart3Icon,
  CoinsIcon,
  SettingsIcon,
  LogOutIcon,
  BellIcon,
  BookOpenIcon,
  ChevronsUpDownIcon,
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

const BREADCRUMB_MAP: Record<string, { label: string; href?: string }[]> = {
  // Console routes
  "/console/dashboard": [{ label: "Console" }, { label: "Dashboard" }],
  "/console/models": [{ label: "Console" }, { label: "Models" }],
  "/console/chat": [{ label: "Console" }, { label: "Chat Playground" }],
  "/console/api-keys": [{ label: "Console" }, { label: "API Keys" }],
  "/console/usage": [{ label: "Console" }, { label: "Usage Logs" }],
  "/console/balance": [{ label: "Console" }, { label: "Billing" }],
  "/console/settings": [{ label: "Console" }, { label: "Settings" }],
  // Dashboard routes
  "/dashboard": [{ label: "Dashboard" }, { label: "Overview" }],
  "/dashboard/keys": [{ label: "Dashboard", href: "/dashboard" }, { label: "API Keys" }],
  "/dashboard/models": [{ label: "Dashboard", href: "/dashboard" }, { label: "Models" }],
  "/dashboard/usage": [{ label: "Dashboard", href: "/dashboard" }, { label: "Usage" }],
  "/dashboard/settings": [{ label: "Dashboard", href: "/dashboard" }, { label: "Settings" }],
  // Admin routes
  "/admin": [{ label: "Admin" }, { label: "Overview" }],
  "/admin/models": [{ label: "Admin", href: "/admin" }, { label: "Models" }],
  "/admin/users": [{ label: "Admin", href: "/admin" }, { label: "Users" }],
  "/admin/billing": [{ label: "Admin", href: "/admin" }, { label: "Billing" }],
};

function ConsoleUserNav({
  user,
  side,
}: {
  user: { name: string; email: string; image: string; creditBalance: number };
  side?: "bottom" | "right";
}) {
  const initials = (user.name || "?")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm outline-none hover:bg-accent" />
        }
      >
        <Avatar>
          <AvatarImage src={user.image} alt={user.name} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
          <span className="truncate font-medium">{user.name}</span>
          <span className="truncate text-xs text-muted-foreground">
            {user.email}
          </span>
        </div>
        <ChevronsUpDownIcon className="ml-auto size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="min-w-56 rounded-lg"
        side={side ?? "bottom"}
        align="end"
        sideOffset={4}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar>
                <AvatarImage src={user.image} alt={user.name} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
            </div>
            <div className="px-1 pb-1">
              <Badge variant="outline" className="font-mono">
                ${user.creditBalance.toFixed(2)} credit
              </Badge>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href="/console/settings" />}>
            <SettingsIcon />
            Profile
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() =>
            signOut({
              fetchOptions: {
                onSuccess: () => {
                  document.cookie = "ba_role=; Path=/; Max-Age=0";
                  window.location.href = "/login";
                },
              },
            })
          }
        >
          <LogOutIcon />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ConsoleSidebarInner({
  user,
}: {
  user: { name: string; email: string; image: string; creditBalance: number };
}) {
  const pathname = usePathname();

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/" />}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <BotIcon className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">AI Gateway</span>
                <span className="truncate text-xs">Console</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

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

      <SidebarFooter>
        <ConsoleUserNav user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export function ConsoleTopBar({
  user,
}: {
  user: { name: string; email: string; image: string; creditBalance: number; role: string };
}) {
  const pathname = usePathname();
  const crumbs = BREADCRUMB_MAP[pathname] ?? [{ label: "Console" }];

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b px-4">
      {/* Left: Sidebar trigger + breadcrumb */}
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb className="hidden sm:block">
          <BreadcrumbList>
            {crumbs.map((b, i) => (
              <React.Fragment key={i}>
                {i > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {b.href ? (
                    <BreadcrumbLink href={b.href}>{b.label}</BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{b.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Right: Balance + Docs + Release Notes + Bell + Theme + User */}
      <div className="flex items-center gap-1 md:gap-2">
        {/* Balance badge */}
        <Badge variant="outline" className="font-mono text-xs">
          <span className="hidden sm:inline">Balance </span>
          ${user.creditBalance.toFixed(2)}
        </Badge>

        {/* Quick links — hidden on mobile */}
        <div className="hidden md:flex items-center gap-1">
          <Link
            href="/docs"
            className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Docs
          </Link>
          <Link
            href="/release-notes"
            className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Release Notes
          </Link>
          {user.role === "admin" && (
            <Link
              href="/admin"
              className={cn(
                "rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-foreground",
                pathname.startsWith("/admin")
                  ? "text-foreground font-medium"
                  : "text-muted-foreground"
              )}
            >
              Admin
            </Link>
          )}
        </div>

        {/* Notification bell */}
        <Button variant="ghost" size="icon-sm" aria-label="Notifications">
          <BellIcon className="size-4" aria-hidden="true" />
        </Button>

        {/* Theme toggle */}
        <ThemeToggle />

        {/* User nav */}
        <div className="hidden md:block">
          <ConsoleUserNav user={user} side="bottom" />
        </div>
      </div>
    </header>
  );
}

export function ConsoleLayoutClient({
  children,
  user,
}: {
  children: React.ReactNode;
  user: {
    id: string;
    name: string;
    email: string;
    image: string;
    role: string;
    creditBalance: number;
  };
}) {
  return (
    <SidebarProvider>
      <ConsoleSidebarInner user={user} />
      <SidebarInset>
        <ConsoleTopBar user={user} />
        <main className="flex flex-1 flex-col gap-4 p-4">
          <FadeIn duration={0.3} y={12}>
            {children}
          </FadeIn>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
