"use client";

import { useState, useMemo } from "react";
import {
  SearchIcon,
  CopyIcon,
  CheckIcon,
  SparklesIcon,
  EyeIcon,
  WrenchIcon,
  AudioLinesIcon,
  XIcon,
  ArrowUpDownIcon,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { FadeIn, FadeInStagger, FadeInItem } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";

type Model = {
  publicId: string;
  type: string;
  description: string | null;
  provider: string | null;
  pricing: { per1MInput?: number; per1MOutput?: number; perUnit?: number } | null;
  capabilities: Record<string, unknown> | null;
  tags: string[];
};

const TYPE_FILTERS = ["All", "Chat", "Image", "TTS", "STT", "Embedding"] as const;
const TYPE_MAP: Record<string, string> = {
  Chat: "chat",
  Image: "image",
  TTS: "tts",
  STT: "stt",
  Embedding: "embedding",
};

const SORT_OPTIONS = [
  { label: "Name", value: "name" },
  { label: "Price ↑", value: "price-asc" },
  { label: "Price ↓", value: "price-desc" },
] as const;

function ModelCard({ model }: { model: Model }) {
  const [copied, setCopied] = useState(false);
  const pricing = model.pricing ?? {};
  const caps = model.capabilities ?? {};

  const curl = `curl ${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/v1/chat/completions \\
  -H "Authorization: Bearer sk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"${model.publicId}","messages":[{"role":"user","content":"Hello"}]}'`;

  function copyCurl() {
    navigator.clipboard.writeText(curl).then(() => {
      setCopied(true);
      toast.success("Curl command copied!");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Card className="group transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {model.provider && (
                <Badge variant="secondary" className="shrink-0">
                  {model.provider}
                </Badge>
              )}
              <Badge variant="outline" className="shrink-0 capitalize">
                {model.type}
              </Badge>
            </div>
            <CardTitle className="font-mono text-base truncate">
              {model.publicId}
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {model.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {model.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
          {pricing.per1MInput != null && (
            <span>
              In:{" "}
              <span className="text-foreground">
                ${pricing.per1MInput.toFixed(2)}
              </span>
              /1M
            </span>
          )}
          {pricing.per1MOutput != null && (
            <span>
              Out:{" "}
              <span className="text-foreground">
                ${pricing.per1MOutput.toFixed(2)}
              </span>
              /1M
            </span>
          )}
          {model.type !== "chat" && pricing.perUnit != null && (
            <span>
              Unit:{" "}
              <span className="text-foreground">
                ${pricing.perUnit.toFixed(4)}
              </span>
            </span>
          )}
          {pricing.per1MInput == null &&
            pricing.per1MOutput == null &&
            (model.type === "chat" || pricing.perUnit == null) && (
              <span className="italic">Pricing TBD</span>
            )}
        </div>

        <div className="flex flex-wrap gap-1">
          {caps.supportsImageInput === true && (
            <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-200 dark:border-emerald-800 dark:text-emerald-400">
              <EyeIcon className="size-3" />
              vision
            </Badge>
          )}
          {caps.supportsTools === true && (
            <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-200 dark:border-emerald-800 dark:text-emerald-400">
              <WrenchIcon className="size-3" />
              tools
            </Badge>
          )}
          {caps.supportsAudioInput === true && (
            <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-200 dark:border-emerald-800 dark:text-emerald-400">
              <AudioLinesIcon className="size-3" />
              audio
            </Badge>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5"
          onClick={copyCurl}
        >
          {copied ? (
            <CheckIcon className="size-3.5 text-emerald-500" />
          ) : (
            <CopyIcon className="size-3.5" />
          )}
          {copied ? "Copied!" : "Copy curl"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function ModelsCatalog({ models }: { models: Model[] }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [sort, setSort] = useState<string>("name");

  const providers = useMemo(
    () => [...new Set(models.map((m) => m.provider).filter(Boolean))].sort(),
    [models],
  );

  const [providerFilter, setProviderFilter] = useState("All");

  const filtered = useMemo(() => {
    let result = models;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.publicId.toLowerCase().includes(q) ||
          m.description?.toLowerCase().includes(q) ||
          m.provider?.toLowerCase().includes(q),
      );
    }

    if (typeFilter !== "All") {
      const t = TYPE_MAP[typeFilter];
      if (t) result = result.filter((m) => m.type === t);
    }

    if (providerFilter !== "All") {
      result = result.filter((m) => m.provider === providerFilter);
    }

    result = [...result].sort((a, b) => {
      if (sort === "name") return a.publicId.localeCompare(b.publicId);
      const aPrice = a.pricing?.per1MInput ?? a.pricing?.perUnit ?? Infinity;
      const bPrice = b.pricing?.per1MInput ?? b.pricing?.perUnit ?? Infinity;
      return sort === "price-asc" ? aPrice - bPrice : bPrice - aPrice;
    });

    return result;
  }, [models, search, typeFilter, providerFilter, sort]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <PageHeader
        title="Models"
        description="Browse and compare available AI models"
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Models" }]}
      />

      <FadeIn delay={0.1}>
        <div className="mt-8 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search models by name, provider, or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <ArrowUpDownIcon className="size-4 text-muted-foreground shrink-0" />
              <div className="flex gap-1">
                {SORT_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    variant={sort === opt.value ? "default" : "ghost"}
                    size="xs"
                    onClick={() => setSort(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex gap-1">
              {TYPE_FILTERS.map((t) => (
                <Button
                  key={t}
                  variant={typeFilter === t ? "default" : "outline"}
                  size="xs"
                  onClick={() => setTypeFilter(t)}
                >
                  {t}
                </Button>
              ))}
            </div>

            {providers.length > 0 && (
              <>
                <div className="w-px bg-border" />
                <div className="flex gap-1">
                  <Button
                    variant={providerFilter === "All" ? "default" : "outline"}
                    size="xs"
                    onClick={() => setProviderFilter("All")}
                  >
                    All providers
                  </Button>
                  {providers.map((p) => (
                    <Button
                      key={p}
                      variant={providerFilter === p ? "default" : "outline"}
                      size="xs"
                      onClick={() => setProviderFilter(p!)}
                    >
                      {p}
                    </Button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </FadeIn>

      <div className="mt-6">
        {filtered.length === 0 ? (
          <FadeIn delay={0.2}>
            <EmptyState
              icon={<SparklesIcon className="size-7" />}
              title="No models found"
              description="Try adjusting your search or filters."
            >
              {(search || typeFilter !== "All" || providerFilter !== "All") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setTypeFilter("All");
                    setProviderFilter("All");
                  }}
                >
                  <XIcon className="size-3.5 mr-1" />
                  Clear filters
                </Button>
              )}
            </EmptyState>
          </FadeIn>
        ) : (
          <FadeInStagger stagger={0.04}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((m) => (
                <FadeInItem key={m.publicId}>
                  <ModelCard model={m} />
                </FadeInItem>
              ))}
            </div>
          </FadeInStagger>
        )}
      </div>
    </div>
  );
}
