"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useSession, signOut } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import { IconSwap } from "@/components/motion";
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
  WalletIcon,
  BookOpenIcon,
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

  if (!mounted) {
    return <div className="h-8 w-8" />;
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground after:absolute after:left-1/2 after:top-1/2 after:size-10 after:-translate-1/2"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      <IconSwap
        activeKey={isDark ? "sun" : "moon"}
        className="flex items-center justify-center"
      >
        {isDark ? (
          <SunIcon className="size-4" aria-hidden="true" />
        ) : (
          <MoonIcon className="size-4" aria-hidden="true" />
        )}
      </IconSwap>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*                          NAV CONFIG                                */
/* ------------------------------------------------------------------ */

export type SiteSection = "public" | "console" | "admin";

interface NavItem {
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Models", href: "/models" },
  { label: "Docs", href: "/docs" },
  { label: "Blog", href: "/blog" },
];

/* ------------------------------------------------------------------ */
/*                          LOGO                                      */
/* ------------------------------------------------------------------ */

function SiteLogo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="glow-sm flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <WorkflowIcon className="size-4.5" aria-hidden="true" />
      </span>
      <span className="text-[15px] font-semibold tracking-tight">
        AI Gateway
      </span>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*                       USER DROPDOWN                                */
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

function UserDropdown({ user }: { user: UserData }) {
  const initials = getInitials(user.name);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            className="flex items-center gap-2 rounded-xl px-1.5 py-1.5 outline-none transition-colors hover:bg-accent"
            aria-label="User menu"
          />
        }
      >
        <Avatar className="size-8">
          <AvatarImage src={user.image} alt={user.name} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <ChevronsUpDownIcon
          className="hidden size-3.5 text-muted-foreground sm:block"
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-60 rounded-xl" align="end" sideOffset={6}>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2.5 px-2 py-2 text-left">
              <Avatar>
                <AvatarImage src={user.image} alt={user.name} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left leading-tight min-w-0">
                <span className="truncate text-sm font-medium">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              </div>
            </div>
            <div className="px-2 pb-2">
              <Badge variant="outline" className="gap-1.5 font-mono text-xs">
                <WalletIcon className="size-3" aria-hidden="true" />
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
          <DropdownMenuItem render={<Link href="/docs" />}>
            <BookOpenIcon />
            Documentation
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
/*                       AUTH ACTIONS                                 */
/* ------------------------------------------------------------------ */

function GuestActions({ variant }: { variant: "desktop" | "mobile" }) {
  if (variant === "mobile") {
    return (
      <div className="mt-4 space-y-2 border-t pt-4">
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
      <Link href="/signup" className={`${buttonVariants({ size: "sm" })} glow-sm`}>
        Get started
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                         MOBILE MENU                                */
/* ------------------------------------------------------------------ */

function MobileMenu({ user }: { user: UserData | null }) {
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
            className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-accent"
            type="button"
            aria-label="Open navigation menu"
          />
        }
      >
        <MenuIcon className="size-5" aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="left" className="flex w-[280px] flex-col p-4 sm:w-[320px]">
        <SheetTitle className="sr-only">Site navigation</SheetTitle>

        <div className="flex items-center gap-2 border-b pb-4">
          <SiteLogo />
        </div>

        <nav className="flex-1 overflow-y-auto py-4" aria-label="Mobile navigation">
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center rounded-lg px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {user && (
            <div className="mt-4 space-y-1 border-t pt-4">
              <Link
                href="/console/dashboard"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent"
              >
                <LayoutDashboardIcon className="size-4" aria-hidden="true" />
                Console
              </Link>
              <Link
                href="/console/settings"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent"
              >
                <SettingsIcon className="size-4" aria-hidden="true" />
                Settings
              </Link>
            </div>
          )}

          <div className="mt-4 flex items-center gap-3 border-t px-3 py-2 text-sm text-muted-foreground">
            <ThemeToggle />
            <span>Toggle theme</span>
          </div>
        </nav>

        {user ? (
          <div className="mt-4 border-t pt-4">
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
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOutIcon className="size-4" aria-hidden="true" />
              Log out
            </button>
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
  sidebarTrigger,
}: {
  section?: SiteSection;
  sidebarTrigger?: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();

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

  // Fetch the live credit balance (the session doesn't carry custom fields).
  // The result is tagged with the email it belongs to, so a stale fetch from
  // a previous session is never displayed.
  const userEmail = user?.email ?? null;
  const [fetchedBalance, setFetchedBalance] = React.useState<{
    email: string;
    usd: number;
  } | null>(null);
  React.useEffect(() => {
    if (!userEmail) return;
    let cancelled = false;
    fetch("/api/me/balance")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d && typeof d.creditUsd === "number") {
          setFetchedBalance({ email: userEmail, usd: d.creditUsd });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userEmail]);

  const balanceUsd =
    fetchedBalance && fetchedBalance.email === userEmail
      ? fetchedBalance.usd
      : null;
  const displayBalance = balanceUsd ?? user?.creditBalance ?? 0;

  const inApp = section === "console" || section === "admin";

  // Blend with the page at the very top; gain a glass background once the
  // page scrolls beneath the bar. The bottom border stays constant so the
  // topbar always reads as a clean edge (including on sidebar pages).
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        // One consistent bottom border (same token as sidebar borders) so the
        // topbar reads as a clean horizontal edge on sidebar pages too.
        "sticky top-0 z-40 border-b border-border transition-[background-color,box-shadow] duration-300 motion-reduce:transition-none",
        scrolled
          ? "bg-background/75 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/60"
          : "bg-transparent"
      )}
    >
      <div className="flex h-topbar w-full items-center justify-between gap-3 px-4 sm:px-6">
        {/* Left: trigger + logo + nav */}
        <div className="flex min-w-0 items-center gap-1">
          {sidebarTrigger}
          <SiteLogo />

          {/* Desktop nav */}
          <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Primary navigation">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative rounded-md px-3 py-1.5 text-sm transition-colors hover:text-foreground",
                    isActive ? "font-medium text-foreground" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                  {isActive && (
                    <span
                      className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-primary"
                      aria-hidden="true"
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1.5">
          <div className="hidden md:flex">
            <ThemeToggle />
          </div>

          {user && !inApp && (
            <Link
              href="/console/dashboard"
              className={`${buttonVariants({ size: "sm" })} hidden md:inline-flex`}
            >
              Console
            </Link>
          )}

          {user && (
            <Badge
              variant="outline"
              className="hidden h-8 gap-2 rounded-lg px-3 font-mono text-sm md:inline-flex"
            >
              <WalletIcon className="size-4 text-primary" aria-hidden="true" />
              {balanceUsd != null ? `$${displayBalance.toFixed(2)}` : "…"}
            </Badge>
          )}

          <div className={inApp ? "flex" : "hidden md:flex"}>
            {user ? (
              <UserDropdown user={{ ...user, creditBalance: displayBalance }} />
            ) : (
              <GuestActions variant="desktop" />
            )}
          </div>

          {/* Mobile hamburger (public only; in-app uses the sidebar trigger) */}
          {!inApp && (
            <div className="md:hidden">
              <MobileMenu user={user} />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
