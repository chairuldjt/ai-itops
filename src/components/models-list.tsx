"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { SearchIcon, ArrowUpDownIcon, XIcon, BotIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { FadeInStagger, FadeInItem } from "@/components/motion";
import { ModelCard, type ModelCardData } from "@/components/model-card";

export type ModelRow = ModelCardData;

const TYPE_FILTERS = ["All", "Chat", "Image", "TTS", "STT", "Embedding"] as const;
const TYPE_MAP: Record<string, string> = {
  Chat: "chat",
  Image: "image",
  TTS: "tts",
  STT: "stt",
  Embedding: "embedding",
};

const SORT_OPTIONS = [
  { label: "Featured", value: "featured" },
  { label: "Name", value: "name" },
  { label: "Price ↑", value: "price-asc" },
  { label: "Price ↓", value: "price-desc" },
] as const;

/**
 * TokenRouter-style models list: filter toolbar + responsive grid of pricing
 * cards. Shared by the public catalog and the console.
 */
export function ModelsList({ models }: { models: ModelRow[] }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [providerFilter, setProviderFilter] = useState("All");
  const [sort, setSort] = useState<string>("featured");

  const providers = useMemo(
    () => [...new Set(models.map((m) => m.provider).filter(Boolean))].sort(),
    [models],
  );

  const filtered = useMemo(() => {
    let result = models;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.publicId.toLowerCase().includes(q) ||
          (m.description ?? "").toLowerCase().includes(q) ||
          (m.provider ?? "").toLowerCase().includes(q),
      );
    }

    if (typeFilter !== "All") {
      const t = TYPE_MAP[typeFilter];
      if (t) result = result.filter((m) => m.type === t);
    }

    if (providerFilter !== "All") {
      result = result.filter((m) => m.provider === providerFilter);
    }

    // "featured" keeps the server-provided order (admin `sortOrder`); the other
    // options re-sort client-side.
    if (sort !== "featured") {
      result = [...result].sort((a, b) => {
        if (sort === "name") return a.publicId.localeCompare(b.publicId);
        const aPrice = a.pricing?.per1MInput ?? a.pricing?.perUnit ?? Infinity;
        const bPrice = b.pricing?.per1MInput ?? b.pricing?.perUnit ?? Infinity;
        return sort === "price-asc" ? aPrice - bPrice : bPrice - aPrice;
      });
    }

    return result;
  }, [models, search, typeFilter, providerFilter, sort]);

  const hasActiveFilter =
    search !== "" || typeFilter !== "All" || providerFilter !== "All";

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar: search + sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search models..."
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

      {/* Type + provider filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex flex-wrap gap-1">
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
            <div className="flex flex-wrap gap-1">
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

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<BotIcon className="size-7" />}
          title="No models found"
          description="No models match your search criteria."
        >
          {hasActiveFilter && (
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
      ) : (
        <FadeInStagger stagger={0.03}>
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
  );
}
