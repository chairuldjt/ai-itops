"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useSession, signOut } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  WorkflowIcon,
  MenuIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  SettingsIcon,
  ChevronsUpDownIcon,
  SunIcon,
  MoonIcon,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*                         THEME TOGGLE                               */
/* ------------------------------------------------------------------ */

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // Prevent hydration mismatch — render empty until mounted
  if (!mounted) {
    return <div className="h-8 w-8" />;
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*                          NAV ITEM CONFIG                           */
/* ------------------------------------------------------------------ */

export type SiteSection = "public" | "console" | "admin";

interface NavItem {
  label: string;
  href: string;
}

const BASE_NAV: NavItem[] = [
  { label: "Models", href: "/models" },
  { label: "Docs", href: "/docs" },
  { label: "Blog", href: "/blog" },
];

function buildNavItems(section: SiteSection, isAdmin: boolean): NavItem[] {
  const items: NavItem[] = [...BASE_NAV];

  // Release Notes — always show except on public (where it's in mobile menu only)
  if (section !== "public") {
    items.push({ label: "Release Notes", href: "/release-notes" });
  }

  if (section === "admin") {
    // On admin pages: show Console link (to switch back), but NOT "Admin"
    items.push({ label: "Console", href: "/console/dashboard" });
  } else if (isAdmin) {
    // On non-admin pages: show Admin link
    items.push({ label: "Admin", href: "/admin" });

    // On non-console pages: show Console link
    if (section !== "console") {
      items.push({ label: "Console", href: "/console/dashboard" });
    }
  } else if (section !== "console") {
    // Non-admin users on non-console pages: show Console link
    items.push({ label: "Console", href: "/console/dashboard" });
  }

  return items;
}

/* ------------------------------------------------------------------ */
/*                          LOGO COMPONENT                            */
/* ------------------------------------------------------------------ */

function SiteLogo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold">
      <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <WorkflowIcon className="size-4" aria-hidden="true" />
      </span>
      <span className="hidden sm:inline">AI Gateway</span>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*                       AUTHENTICATED USER NAV                       */
/* ------------------------------------------------------------------ */

type UserData = {
  name: string;
  email: string;
  image: string;
  role: string;
  creditBalance: number;
};

function getInitials(name: string) {
  return (name || "?")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function UserDropdown({ user, side }: { user: UserData; side?: "bottom" | "right" }) {
  const initials = getInitials(user.name);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm outline-none hover:bg-accent transition-colors"
            aria-label="User menu"
          />
        }
      >
        <Avatar className="size-8">
          <AvatarImage src={user.image} alt={user.name} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-[100px] truncate text-sm md:inline">
          {user.email}
        </span>
        <ChevronsUpDownIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56 rounded-lg" side={side ?? "bottom"} align="end" sideOffset={4}>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar>
                <AvatarImage src={user.image} alt={user.name} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
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
          <DropdownMenuItem render={<Link href="/console/dashboard" />}>
            <LayoutDashboardIcon />
            Console
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/console/settings" />}>
            <SettingsIcon />
            Settings
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

/* ------------------------------------------------------------------ */
/*                       AUTH BUTTONS (GUEST)                         */
/* ------------------------------------------------------------------ */

function GuestActions({ variant }: { variant: "desktop" | "mobile" }) {
  if (variant === "mobile") {
    return (
      <div className="border-t pt-4 mt-4 space-y-2">
        <Link
          href="/login"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full justify-center")}
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className={cn(buttonVariants({ size: "lg" }), "w-full justify-center")}
        >
          Get started
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
        Log in
      </Link>
      <Link href="/signup" className={buttonVariants({ size: "sm" })}>
        Get started
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                    AUTHENTICATED ACTIONS (DESKTOP)                 */
/* ------------------------------------------------------------------ */

function AuthenticatedActions({ user, hideLinks = [] }: { user: UserData; hideLinks?: string[] }) {
  return (
    <div className="flex items-center gap-1">
      {!hideLinks.includes("Console") && (
        <Link
          href="/console/dashboard"
          className={cn(
            buttonVariants({ size: "sm" }),
            "rounded-full px-4 text-xs"
          )}
        >
          Console
        </Link>
      )}
      <UserDropdown user={user} side="bottom" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                         MOBILE MENU                                */
/* ------------------------------------------------------------------ */

function MobileMenu({
  navItems,
  user,
}: {
  navItems: NavItem[];
  user: UserData | null;
}) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = React.useState(pathname);

  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    if (open) setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-accent md:hidden"
            type="button"
            aria-label="Open navigation menu"
          />
        }
      >
        <MenuIcon className="size-5" aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] sm:w-[320px] flex flex-col p-4">
        <SheetTitle className="sr-only">Site navigation</SheetTitle>

        {/* Logo */}
        <div className="flex items-center gap-2 pb-4 border-b">
          <SiteLogo />
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-4" aria-label="Mobile navigation">
          <div className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center rounded-lg px-3 py-2.5 text-sm transition-colors",
                  pathname === item.href || pathname.startsWith(item.href + "/")
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Extra links */}
          <div className="mt-4 space-y-1 border-t pt-4">
            <Link
              href="/release-notes"
              className={cn(
                "flex items-center rounded-lg px-3 py-2.5 text-sm transition-colors",
                pathname === "/release-notes"
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              Release Notes
            </Link>
            <Link
              href="/contact-us"
              className={cn(
                "flex items-center rounded-lg px-3 py-2.5 text-sm transition-colors",
                pathname === "/contact-us"
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              Contact us
            </Link>
          </div>

          {/* Theme toggle in mobile */}
          <div className="mt-4 border-t pt-4 flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground">
            <ThemeToggle />
            <span>Toggle theme</span>
          </div>
        </nav>

        {/* Auth section */}
        {user ? (
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center gap-3 px-2 pb-3">
              <Avatar className="size-9">
                <AvatarImage src={user.image} alt={user.name} />
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{user.name}</div>
                <div className="truncate text-xs text-muted-foreground">{user.email}</div>
              </div>
            </div>
            <div className="space-y-1">
              <Link
                href="/console/dashboard"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                <LayoutDashboardIcon className="size-4" aria-hidden="true" />
                Console
              </Link>
              <Link
                href="/console/settings"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                <SettingsIcon className="size-4" aria-hidden="true" />
                Settings
              </Link>
              <button
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
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOutIcon className="size-4" aria-hidden="true" />
                Log out
              </button>
            </div>
          </div>
        ) : (
          <GuestActions variant="mobile" />
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/*                         SITE TOP BAR                               */
/* ------------------------------------------------------------------ */

export function SiteTopBar({
  section = "public",
  hideLinks = [],
  sidebarTrigger,
}: {
  section?: SiteSection;
  hideLinks?: string[];
  sidebarTrigger?: React.ReactNode;
} = {}) {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Compute user data
  const rawUser = session?.user as
    | {
        id: string;
        name: string;
        email: string;
        image?: string;
        role?: string;
        creditBalance?: bigint | number | string;
      }
    | undefined;

  const rawBalance = rawUser?.creditBalance;
  const creditBalanceUsd =
    typeof rawBalance === "bigint"
      ? Number(rawBalance) / 1_000_000
      : Number(rawBalance ?? 0) / 1_000_000;

  const user: UserData | null = rawUser
    ? {
        name: rawUser.name,
        email: rawUser.email,
        image: (rawUser.image as string) ?? "",
        role: (rawUser.role as string) ?? "user",
        creditBalance: creditBalanceUsd,
      }
    : null;

  // Build nav items based on section + role
  const navItems: NavItem[] = React.useMemo(() => {
    return buildNavItems(section, user?.role === "admin").filter(
      (item) => !hideLinks.includes(item.label)
    );
  }, [section, user?.role, hideLinks]);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="flex h-topbar w-full items-center justify-between px-4">
        {/* Left: Sidebar trigger (console) + Mobile hamburger + Logo */}
        <div className="flex items-center gap-2">
          {sidebarTrigger}
          <MobileMenu navItems={navItems} user={user} />
          <SiteLogo />
        </div>

        {/* Right: Desktop nav + Theme + Balance + Divider + Auth */}
        <div className="flex items-center gap-1">
          {/* Desktop nav links */}
          <nav
            className="hidden items-center gap-1 md:flex"
            aria-label="Primary navigation"
          >
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm transition-colors hover:bg-accent hover:text-foreground",
                    isActive
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Theme toggle */}
          <div className="hidden md:flex ml-2">
            <ThemeToggle />
          </div>

          {/* Balance badge — only when logged in */}
          {user && (
            <Badge variant="outline" className="hidden md:inline-flex font-mono text-xs ml-2">
              <span className="hidden lg:inline">Balance </span>
              ${user.creditBalance.toFixed(2)}
            </Badge>
          )}

          {/* Divider */}
          <div className="mx-3 hidden h-6 w-px bg-border md:block" aria-hidden="true" />

          {/* Auth section */}
          <div className="hidden md:flex">
            {user ? (
              <AuthenticatedActions user={user} hideLinks={hideLinks} />
            ) : (
              <GuestActions variant="desktop" />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
