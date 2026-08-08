import { cn } from "@/lib/utils";
import { findProvider, providerLogoSrc } from "@/lib/providers";

/**
 * Official provider brand mark (self-hosted from lobehub/lobe-icons).
 *
 * Color marks carry their own fills. Mono marks use `currentColor`, which an
 * `<img>` renders black — so they're inverted in dark mode to stay visible.
 * Returns null for unknown providers (callers render a fallback icon).
 */
export function ProviderLogo({
  provider,
  size = 24,
  className,
}: {
  provider?: string | null;
  size?: number;
  className?: string;
}) {
  const src = providerLogoSrc(provider);
  const def = findProvider(provider);
  if (!src || !def) return null;

  return (
    <img
      src={src}
      alt={`${def.label} logo`}
      width={size}
      height={size}
      loading="lazy"
      className={cn(
        "shrink-0 object-contain",
        !def.color && "dark:invert",
        className,
      )}
    />
  );
}
