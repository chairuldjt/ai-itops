"use client";

import { CheckIcon, XIcon, ZapIcon, CrownIcon, Building2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { FadeIn } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";

type Model = {
  publicId: string;
  type: string;
  provider: string | null;
  pricing: { per1MInput?: number; per1MOutput?: number; perUnit?: number } | null;
  capabilities: Record<string, unknown> | null;
};

interface TierFeature {
  text: string;
  included: boolean;
}

interface Tier {
  name: string;
  price: string;
  period: string;
  description: string;
  icon: typeof ZapIcon;
  cta: { label: string; href: string };
  popular?: boolean;
  features: TierFeature[];
}

const TIERS: Tier[] = [
  {
    name: "Free",
    price: "$0",
    period: "/mo",
    description: "Perfect for experimentation",
    icon: ZapIcon,
    cta: { label: "Get started", href: "/signup" },
    features: [
      { text: "100 requests / day", included: true },
      { text: "1M tokens / month", included: true },
      { text: "All models", included: true },
      { text: "Community support", included: true },
      { text: "Priority routing", included: false },
      { text: "Usage alerts", included: false },
    ],
  },
  {
    name: "Pro",
    price: "$29",
    period: "/mo",
    description: "For teams shipping production apps",
    icon: CrownIcon,
    cta: { label: "Start free trial", href: "/signup" },
    popular: true,
    features: [
      { text: "Unlimited requests", included: true },
      { text: "50M tokens / month included", included: true },
      { text: "All models", included: true },
      { text: "Email support", included: true },
      { text: "Priority routing", included: true },
      { text: "Usage alerts", included: true },
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For orgs with high-scale or compliance needs",
    icon: Building2Icon,
    cta: { label: "Contact sales", href: "/contact-us" },
    features: [
      { text: "Unlimited everything", included: true },
      { text: "Dedicated support", included: true },
      { text: "Custom models", included: true },
      { text: "SLA guarantee", included: true },
      { text: "Team management", included: true },
      { text: "On-premise deploy", included: true },
    ],
  },
];

function TierCard({ tier }: { tier: Tier }) {
  const Icon = tier.icon;
  return (
    <Card
      className={cn(
        "relative flex flex-col",
        tier.popular &&
          "ring-2 ring-emerald-500 shadow-lg shadow-emerald-500/10",
      )}
    >
      {tier.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 px-3">
            Most popular
          </Badge>
        </div>
      )}
      <CardHeader className="text-center pb-4 pt-6">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
          <Icon className="size-6" />
        </div>
        <CardTitle className="text-xl">{tier.name}</CardTitle>
        <div className="mt-2">
          <span className="text-4xl font-bold tracking-tight">
            {tier.price}
          </span>
          {tier.period && (
            <span className="text-muted-foreground">{tier.period}</span>
          )}
        </div>
        <CardDescription className="mt-1">{tier.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col pt-0">
        <ul className="flex-1 space-y-2.5 pb-6">
          {tier.features.map((f) => (
            <li key={f.text} className="flex items-start gap-2 text-sm">
              {f.included ? (
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-500" />
              ) : (
                <XIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground/40" />
              )}
              <span
                className={cn(
                  !f.included && "text-muted-foreground",
                )}
              >
                {f.text}
              </span>
            </li>
          ))}
        </ul>
        <Button
          variant={tier.popular ? "default" : "outline"}
          className="w-full"
          render={<Link href={tier.cta.href} />}
        >
          {tier.cta.label}
        </Button>
      </CardContent>
    </Card>
  );
}

function formatPrice(val: number | undefined) {
  if (val == null) return "—";
  return `$${val.toFixed(2)}`;
}

const TYPE_LABELS: Record<string, string> = {
  chat: "Chat",
  image: "Image",
  tts: "TTS",
  stt: "STT",
  embedding: "Embedding",
  rerank: "Rerank",
};

export function PricingPageContent({ models }: { models: Model[] }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <PageHeader
        title="Pricing"
        description="Simple, transparent pricing for every workload"
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Pricing" }]}
      />

      <FadeIn delay={0.1}>
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {TIERS.map((tier) => (
            <TierCard key={tier.name} tier={tier} />
          ))}
        </div>
      </FadeIn>

      <FadeIn delay={0.25}>
        <div className="mt-20">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold tracking-tight">
              Per-model pricing
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pay only for what you use. Prices shown per 1M tokens (or per
              unit for non-token models).
            </p>
          </div>

          {models.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                No models available yet.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Model</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Input</TableHead>
                      <TableHead>Output</TableHead>
                      <TableHead className="hidden sm:table-cell">
                        Capabilities
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {models.map((m) => {
                      const p = m.pricing ?? {};
                      const c = m.capabilities ?? {};
                      return (
                        <TableRow key={m.publicId}>
                          <TableCell>
                            <div className="font-mono text-sm">
                              {m.publicId}
                            </div>
                            {m.provider && (
                              <div className="text-xs text-muted-foreground">
                                {m.provider}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">
                              {TYPE_LABELS[m.type] ?? m.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {formatPrice(p.per1MInput)}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {formatPrice(p.per1MOutput)}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {c.supportsImageInput === true && (
                                <Badge variant="outline" className="text-emerald-600 border-emerald-200 dark:border-emerald-800 dark:text-emerald-400">
                                  vision
                                </Badge>
                              )}
                              {c.supportsTools === true && (
                                <Badge variant="outline" className="text-emerald-600 border-emerald-200 dark:border-emerald-800 dark:text-emerald-400">
                                  tools
                                </Badge>
                              )}
                              {c.supportsAudioInput === true && (
                                <Badge variant="outline" className="text-emerald-600 border-emerald-200 dark:border-emerald-800 dark:text-emerald-400">
                                  audio
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
