import { WorkflowIcon, KeyRoundIcon, ZapIcon, ShieldCheckIcon } from "lucide-react";

/**
 * Shared branding panel for the auth (login/signup) split layout.
 * Renders a gradient, dotted-grid backdrop with the product value props.
 */
export function AuthBrandPanel({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="relative hidden overflow-hidden bg-primary/[0.04] md:flex md:flex-col dark:bg-primary/[0.08]">
      {/* Dotted grid + soft radial glow */}
      <div className="bg-grid absolute inset-0 opacity-60" aria-hidden="true" />
      <div
        className="absolute -top-24 -right-24 size-72 rounded-full bg-primary/20 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-28 -left-20 size-72 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative flex flex-1 flex-col justify-between p-10">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
            <WorkflowIcon className="size-5" aria-hidden="true" />
          </span>
          <span className="text-base font-semibold tracking-tight">AI Gateway</span>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-semibold leading-tight tracking-tight text-balance">
              {title}
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          </div>

          <ul className="space-y-3.5">
            {[
              {
                icon: KeyRoundIcon,
                text: "One API key for an OpenAI-compatible endpoint",
              },
              {
                icon: ZapIcon,
                text: "Per-request metering with transparent micro-USD pricing",
              },
              {
                icon: ShieldCheckIcon,
                text: "Per-key model access, budgets, and rate limits",
              },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="text-sm text-foreground/90">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">
          Trusted by developers shipping AI products.
        </p>
      </div>
    </div>
  );
}
