import Link from "next/link";
import { WorkflowIcon } from "lucide-react";

const FOOTER_LINKS = [
  { label: "Models", href: "/models" },
  { label: "Docs", href: "/docs" },
  { label: "Blog", href: "/blog" },
  { label: "Release Notes", href: "/release-notes" },
  { label: "Contact", href: "/contact-us" },
];

const LEGAL_LINKS = [
  { label: "Privacy", href: "/docs/privacy-policy" },
  { label: "Terms", href: "/docs/terms-of-use" },
];

export function SiteFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <WorkflowIcon className="size-3.5" aria-hidden="true" />
              </span>
              <span>AI Gateway</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-xs">
              A unified AI gateway that exposes an OpenAI-compatible API with
              centralized credit and usage tracking.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-sm font-semibold">Product</h3>
            <nav className="mt-3 space-y-2" aria-label="Product links">
              {FOOTER_LINKS.slice(0, 3).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-sm font-semibold">Resources</h3>
            <nav className="mt-3 space-y-2" aria-label="Resource links">
              {FOOTER_LINKS.slice(3).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/docs/faq"
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                FAQ
              </Link>
            </nav>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-sm font-semibold">Account</h3>
            <nav className="mt-3 space-y-2" aria-label="Account links">
              <Link
                href="/login"
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign up
              </Link>
              <Link
                href="/console/dashboard"
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Console
              </Link>
            </nav>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} AI Gateway. All rights reserved.
          </p>
          <nav className="flex gap-4" aria-label="Legal links">
            {LEGAL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
