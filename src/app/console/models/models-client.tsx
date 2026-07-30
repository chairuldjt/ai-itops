"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  EmptyState,
} from "@/components/ui/empty-state";
import {
  FadeInStagger,
  FadeInItem,
} from "@/components/motion";
import {
  SearchIcon,
  BotIcon,
  ImageIcon,
  MicIcon,
  FileTextIcon,
  SparklesIcon,
} from "lucide-react";

type Model = {
  id: string;
  publicId: string;
  upstreamId: string;
  type: string;
  description: string;
  provider: string;
  pricing: {
    per1MInput?: number;
    per1MOutput?: number;
    perUnit?: number;
  };
  capabilities: {
    supportsImageInput?: boolean;
    supportsStreaming?: boolean;
    maxContextTokens?: number;
  };
  tags: string[];
};

type Props = { models: Model[] };

const TYPE_ICONS: Record<string, React.ReactNode> = {
  chat: <BotIcon className="size-5" />,
  image: <ImageIcon className="size-5" />,
  tts: <MicIcon className="size-5" />,
  stt: <MicIcon className="size-5" />,
  embedding: <FileTextIcon className="size-5" />,
  rerank: <SparklesIcon className="size-5" />,
};

const TYPE_COLORS: Record<string, string> = {
  chat: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  image: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  tts: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  stt: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  embedding: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  rerank: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export function ModelsClient({ models }: Props) {
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");

  const filtered = models.filter((m) => {
    const matchesSearch =
      !search ||
      m.publicId.toLowerCase().includes(search.toLowerCase()) ||
      m.provider.toLowerCase().includes(search.toLowerCase()) ||
      m.description.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || m.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const types = Array.from(new Set(models.map((m) => m.type)));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Models</h1>
        <p className="text-sm text-muted-foreground">
          Browse available AI models and their pricing.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search models..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={typeFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter("all")}
          >
            All
          </Button>
          {types.map((t) => (
            <Button
              key={t}
              variant={typeFilter === t ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter(t)}
            >
              {t}
            </Button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<BotIcon className="size-7" />}
          title="No Models Found"
          description="No models match your search criteria."
        />
      ) : (
        <FadeInStagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <FadeInItem key={m.id}>
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div
                      className={`flex size-10 items-center justify-center rounded-xl ${TYPE_COLORS[m.type] ?? "bg-muted"}`}
                    >
                      {TYPE_ICONS[m.type] ?? <BotIcon className="size-5" />}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {m.provider}
                    </Badge>
                  </div>
                  <CardTitle className="text-base mt-3">{m.publicId}</CardTitle>
                  <CardDescription className="line-clamp-2 text-xs">
                    {m.description || "No description available."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-xs">
                    {m.pricing.per1MInput != null && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Input (1M tokens)
                        </span>
                        <span className="font-mono">
                          ${m.pricing.per1MInput.toFixed(4)}
                        </span>
                      </div>
                    )}
                    {m.pricing.per1MOutput != null && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Output (1M tokens)
                        </span>
                        <span className="font-mono">
                          ${m.pricing.per1MOutput.toFixed(4)}
                        </span>
                      </div>
                    )}
                    {m.type !== "chat" && m.pricing.perUnit != null && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Per Unit</span>
                        <span className="font-mono">
                          ${m.pricing.perUnit.toFixed(4)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-3">
                    <Badge variant="secondary" className="text-[10px]">
                      {m.type}
                    </Badge>
                    {m.capabilities.supportsImageInput && (
                      <Badge variant="secondary" className="text-[10px]">
                        Vision
                      </Badge>
                    )}
                    {m.capabilities.supportsStreaming && (
                      <Badge variant="secondary" className="text-[10px]">
                        Streaming
                      </Badge>
                    )}
                    {m.capabilities.maxContextTokens && (
                      <Badge variant="secondary" className="text-[10px]">
                        {(m.capabilities.maxContextTokens / 1000).toFixed(0)}K
                        ctx
                      </Badge>
                    )}
                    {m.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="text-[10px]"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </FadeInItem>
          ))}
        </FadeInStagger>
      )}
    </div>
  );
}
