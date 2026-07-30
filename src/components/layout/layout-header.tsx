"use client";

import { Fragment } from "react";
import { usePathname } from "next/navigation";
import {
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface CrumbConfig {
  label: string;
  href?: string;
}

const BREADCRUMB_MAP: Record<string, CrumbConfig[]> = {
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

export function LayoutHeader() {
  const pathname = usePathname();

  // Find matching breadcrumbs (exact match first, then prefix match)
  let crumbs = BREADCRUMB_MAP[pathname];
  if (!crumbs) {
    // Try prefix match for nested routes
    const prefix = Object.keys(BREADCRUMB_MAP)
      .filter((key) => pathname.startsWith(key))
      .sort((a, b) => b.length - a.length)[0];
    crumbs = prefix
      ? BREADCRUMB_MAP[prefix]
      : [{ label: pathname.split("/").filter(Boolean).pop() ?? "Home" }];
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="mr-2 data-[orientation=vertical]:h-4"
      />
      <Breadcrumb>
        <BreadcrumbList>
          {crumbs.map((crumb, i) => (
            <Fragment key={i}>
              {i > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {crumb.href ? (
                  <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
