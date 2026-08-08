"use client";

import * as React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { cn, formatTokenPrice } from "@/lib/utils";
import { IconSwap } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { ProviderLogo } from "@/components/provider-logo";
import { providerLogoSrc } from "@/lib/providers";
import {
  BotIcon,
  ImageIcon,
  MicIcon,
  FileTextIcon,
  SparklesIcon,
  CopyIcon,
  CheckIcon,
  WrenchIcon,
  BracesIcon,
  RadioIcon,
  LayersIcon,
} from "lucide-react";

export interface ModelCardData {
  publicId: string;
  type: string;
  description?: string | null;
  provider?: string | null;
  pricing?: {
    per1MInput?: number | null;
    per1MOutput?: number | null;
    per1MCached?: number | null;
    /** Legacy split rates — shown as "Cached" when the unified rate is absent. */
    per1MCacheRead?: number | null;
    per1MCacheWrite?: number | null;
    perUnit?: number | null;
  } | null;
  capabilities?: Record<string, unknown> | null;
}

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  chat: BotIcon,
  image: ImageIcon,
  tts: MicIcon,
  stt: MicIcon,
  embedding: FileTextIcon,
  rerank: SparklesIcon,
};

const TYPE_ICON_COLOR: Record<string, string> = {
  chat: "text-primary",
  image: "text-violet-500",
  tts: "text-amber-500",
  stt: "text-amber-500",
  embedding: "text-emerald-500",
  rerank: "text-rose-500",
};

const TYPE_LABEL: Record<string, string> = {
  chat: "Chat",
  image: "Image",
  tts: "TTS",
  stt: "STT",
  embedding: "Embedding",
  rerank: "Rerank",
};

interface PriceRow {
  label: string;
  price: string;
  unit: string;
}

function buildPriceRows(m: ModelCardData): PriceRow[] {
  const p = m.pricing ?? {};
  const caps = m.capabilities ?? {};
  const rows: PriceRow[] = [];
  if (p.per1MInput != null) {
    rows.push({ label: "Input", price: `$${formatTokenPrice(p.per1MInput)}`, unit: "/ 1M tokens" });
  }
  if (p.per1MOutput != null) {
    rows.push({ label: "Output", price: `$${formatTokenPrice(p.per1MOutput)}`, unit: "/ 1M tokens" });
  }
  // Cached prompt tokens — unified rate, with a legacy split-rate fallback.
  // Only shown when the model actually supports prompt caching.
  const cachedRate = p.per1MCached ?? p.per1MCacheRead ?? p.per1MCacheWrite;
  if (m.type === "chat" && cachedRate != null && caps.supportsCache !== false) {
    rows.push({ label: "Cached", price: `$${formatTokenPrice(cachedRate)}`, unit: "/ 1M tokens" });
  }
  if (m.type !== "chat" && p.perUnit != null) {
    rows.push({ label: "Price", price: `$${formatTokenPrice(p.perUnit)}`, unit: "/ unit" });
  }
  return rows;
}

/** Format a token count for display (e.g. 131072 -> "128K", 1000000 -> "1M"). */
function formatContextTokens(n: number): string {
  if (n >= 1_048_576 && n % 1_048_576 === 0) return `${n / 1_048_576}M`;
  if (n >= 1024 && n % 1024 === 0) return `${n / 1024}K`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return `${n}`;
}

/**
 * TokenRouter-style pricing card.
 * Header (icon + name + copy), price rows, description, footer tags.
 */
export function ModelCard({ model }: { model: ModelCardData }) {
  const [copied, setCopied] = useState(false);
  const Icon = TYPE_ICON[model.type] ?? BotIcon;
  const iconColor = TYPE_ICON_COLOR[model.type] ?? "text-primary";
  const priceRows = buildPriceRows(model);
  const isUnit = model.type !== "chat" && model.pricing?.perUnit != null;
  const hasProviderLogo = Boolean(providerLogoSrc(model.provider));

  // Capability icons (logo only) + max context window.
  const caps = model.capabilities ?? {};
  const capIcons = [
    caps.supportsImageInput ? { icon: ImageIcon, label: "Vision (image input)" } : null,
    caps.supportsAudioInput ? { icon: MicIcon, label: "Audio input" } : null,
    caps.supportsTools ? { icon: WrenchIcon, label: "Tools / function calling" } : null,
    caps.supportsJson ? { icon: BracesIcon, label: "JSON mode" } : null,
    caps.supportsStreaming ? { icon: RadioIcon, label: "Streaming" } : null,
  ].filter(Boolean) as { icon: React.ElementType; label: string }[];
  const contextTokens = Number(caps.maxContextTokens ?? 0) || 0;
  const contextLabel = contextTokens > 0 ? formatContextTokens(contextTokens) : null;

  const copyId = () => {
    navigator.clipboard.writeText(model.publicId).then(() => {
      setCopied(true);
      toast.success(`Copied "${model.publicId}"`);
      setTimeout(() => setCopied(false), 1600);
    });
  };

  return (
    <div
      className={cn(
        "group flex h-full flex-col rounded-[14px] border border-border bg-card p-5",
        "transition-[border-color,box-shadow] duration-200 ease-out",
        "hover:border-primary/30 hover:shadow-[0px_0px_20px_0px_rgba(0,0,0,0.06)]",
        "dark:hover:shadow-[0px_0px_24px_0px_rgba(99,102,241,0.10)]"
      )}
    >
      {/* Header: icon + name + copy */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="flex size-[42px] shrink-0 items-center justify-center rounded-[10px] border border-border bg-muted/40">
            {hasProviderLogo ? (
              <ProviderLogo provider={model.provider} size={24} />
            ) : (
              <Icon className={cn("size-5", iconColor)} aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3
              className="truncate text-lg font-medium leading-7"
              title={model.publicId}
            >
              {model.publicId}
            </h3>
            {model.provider && (
              <div className="truncate text-xs text-muted-foreground">
                {model.provider}
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={copyId}
          aria-label={`Copy model name ${model.publicId}`}
          title="Copy model name"
          className="relative flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground after:absolute after:left-1/2 after:top-1/2 after:size-10 after:-translate-1/2"
        >
          <IconSwap
            activeKey={copied ? "check" : "copy"}
            className="flex items-center justify-center"
          >
            {copied ? (
              <CheckIcon className="size-4 text-emerald-500" aria-hidden="true" />
            ) : (
              <CopyIcon className="size-4" aria-hidden="true" />
            )}
          </IconSwap>
        </button>
      </div>

      {/* Price rows */}
      <div className="mt-4 flex flex-col gap-1">
        {priceRows.length > 0 ? (
          priceRows.map((r) => (
            <div key={r.label} className="flex items-baseline text-sm">
              <span className="text-muted-foreground">{r.label}:</span>
              <span className="ml-1.5 font-medium text-foreground">{r.price}</span>
              <span className="ml-1 text-muted-foreground">{r.unit}</span>
            </div>
          ))
        ) : (
          <div className="text-sm italic text-muted-foreground">Pricing TBD</div>
        )}
      </div>

      {/* Description */}
      <div className="mb-4 mt-3 flex-1">
        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground text-pretty">
          {model.description || ""}
        </p>
      </div>

      {/* Capability icons + max context window */}
      {(capIcons.length > 0 || contextLabel) && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {capIcons.map((c) => (
            <span
              key={c.label}
              title={c.label}
              className="flex size-6 items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground"
            >
              <c.icon className="size-3.5" aria-hidden="true" />
              <span className="sr-only">{c.label}</span>
            </span>
          ))}
          {contextLabel && (
            <span
              title={`Max context window: ${contextLabel} tokens`}
              className="flex h-6 items-center gap-1 rounded-md border border-border bg-muted/40 px-1.5 text-[11px] font-medium text-muted-foreground tabular-nums"
            >
              <LayersIcon className="size-3" aria-hidden="true" />
              {contextLabel}
            </span>
          )}
        </div>
      )}

      {/* Footer: billing tag + type tag */}
      <div className="mt-auto flex items-center justify-between">
        <Badge
          variant="outline"
          className="rounded-full px-3 text-xs font-normal text-muted-foreground"
        >
          {isUnit ? "Pay Per Unit" : "Pay Per Token"}
        </Badge>
        <Badge className="rounded-full bg-primary/10 px-3.5 py-1 text-[13px] font-normal text-primary hover:bg-primary/10">
          {TYPE_LABEL[model.type] ?? model.type}
        </Badge>
      </div>
    </div>
  );
}
