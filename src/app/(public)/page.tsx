import Link from "next/link";
import {
  ZapIcon,
  ShieldCheckIcon,
  KeyRoundIcon,
  BotIcon,
  LineChartIcon,
  WorkflowIcon,
  ArrowRightIcon,
  TerminalIcon,
  SparklesIcon,
  GaugeIcon,
  ServerIcon,
  CircleCheckIcon,
  CodeIcon,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FadeIn, FadeInStagger, FadeInItem, ScaleIn } from "@/components/motion";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Gateway — One API key for every AI model",
  description:
    "A unified AI hub that converts leading LLMs into OpenAI and Anthropic compatible APIs, with centralized credit, usage tracking, and graceful capability handling.",
};

/* ------------------------------------------------------------------ */
/*                                 HERO                               */
/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* background accent */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[1000px] rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-4 py-20 md:py-28 text-center">
        <FadeIn>
          <Badge variant="outline" className="mb-6 px-3 py-1 gap-2">
            <SparklesIcon className="size-3.5 text-primary" />
            Powered by 9router
          </Badge>
        </FadeIn>

        <FadeIn delay={0.1}>
          <h1 className="mx-auto max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">
            One API key.
            <br />
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Every AI model.
            </span>
          </h1>
        </FadeIn>

        <FadeIn delay={0.2}>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            A unified AI gateway that exposes <strong>OpenAI</strong> and{" "}
            <strong>Anthropic</strong> compatible APIs on top of your own
            model fleet — with centralized credit, usage tracking, and
            graceful capability handling.
          </p>
        </FadeIn>

        <FadeIn delay={0.3}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className={buttonVariants({ size: "lg", className: "px-6" })}
            >
              Start for free
              <ArrowRightIcon className="size-4 ml-2" />
            </Link>
            <Link
              href="/docs"
              className={buttonVariants({ size: "lg", variant: "outline", className: "px-6" })}
            >
              Read the docs
            </Link>
          </div>
        </FadeIn>

        {/* Code snippet */}
        <ScaleIn delay={0.4}>
          <Card className="mx-auto mt-16 max-w-2xl text-left overflow-hidden">
            <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
              <TerminalIcon className="size-3.5" />
              <span className="font-mono">curl — drop-in replacement for OpenAI</span>
            </div>
            <pre className="overflow-x-auto p-5 text-[13px] leading-relaxed font-mono">
{`curl ${process.env.NEXT_PUBLIC_APP_URL ?? "https://api.yourdomain.com"}/v1/chat/completions \\
  -H "Authorization: Bearer sk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "mimo-v2.5",
    "messages": [{"role":"user","content":"Hello!"}]
  }'`}
            </pre>
          </Card>
        </ScaleIn>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*                               FEATURES                             */
/* ------------------------------------------------------------------ */

const features = [
  {
    icon: <KeyRoundIcon className="size-5" />,
    title: "One key, every model",
    desc: "Issue a single API key that unlocks access to your whole model catalog. Revoke, limit, or rotate it anytime.",
  },
  {
    icon: <WorkflowIcon className="size-5" />,
    title: "OpenAI + Anthropic compatible",
    desc: "Point your OpenAI SDK, opencode, or Claude Code at one URL. No client-side changes required.",
  },
  {
    icon: <ShieldCheckIcon className="size-5" />,
    title: "Graceful capability handling",
    desc: "Non-vision models that receive an image respond naturally — no errors, no hallucinations.",
  },
  {
    icon: <BotIcon className="size-5" />,
    title: "Full admin control",
    desc: "Map public names to upstream IDs, set per-model pricing, declare capabilities, choose policies.",
  },
  {
    icon: <LineChartIcon className="size-5" />,
    title: "Usage & credit tracking",
    desc: "Per-request token metering, micro-USD credit balance, monthly budgets, and detailed audit logs.",
  },
  {
    icon: <GaugeIcon className="size-5" />,
    title: "Built for production",
    desc: "Streaming SSE passthrough, rate limits, budget caps, and a PostgreSQL-backed audit trail.",
  },
];

function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-20">
      <FadeIn>
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mb-4">Features</Badge>
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Everything you need to run an AI API business
          </h2>
          <p className="mt-4 text-muted-foreground">
            From authentication to billing, from request translation to capability
            enforcement — batteries included.
          </p>
        </div>
      </FadeIn>

      <FadeInStagger stagger={0.08} className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <FadeInItem key={f.title}>
            <Card className="relative overflow-hidden h-full">
              <CardHeader className="pb-2">
                <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {f.icon}
                </div>
                <CardTitle className="text-lg">{f.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                  {f.desc}
                </CardDescription>
              </CardContent>
            </Card>
          </FadeInItem>
        ))}
      </FadeInStagger>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*                            HOW IT WORKS                            */
/* ------------------------------------------------------------------ */

const steps = [
  {
    n: "01",
    title: "Bring your 9router",
    desc: "Connect the gateway to your own 9router instance — any OpenAI-compatible upstream works.",
    icon: <ServerIcon className="size-5" />,
  },
  {
    n: "02",
    title: "Configure your models",
    desc: "In the admin panel, map public IDs, set pricing, declare capabilities, and pick image policies.",
    icon: <BotIcon className="size-5" />,
  },
  {
    n: "03",
    title: "Issue keys to your users",
    desc: "Your users get one API key and can hit /v1/chat/completions (OpenAI) or /anthropic/v1/messages.",
    icon: <KeyRoundIcon className="size-5" />,
  },
];

function HowItWorks() {
  return (
    <section id="how" className="bg-muted/40 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-4">How it works</Badge>
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Up and running in minutes
            </h2>
          </div>
        </FadeIn>

        <FadeInStagger stagger={0.12} className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <FadeInItem key={s.n}>
              <div className="relative rounded-2xl border bg-card p-6 shadow-sm h-full">
                <div className="flex items-center justify-between">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    {s.icon}
                  </div>
                  <span className="text-3xl font-bold text-muted-foreground/30">
                    {s.n}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            </FadeInItem>
          ))}
        </FadeInStagger>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*                            COMPATIBILITY                           */
/* ------------------------------------------------------------------ */

const compat = [
  { name: "OpenAI SDK", desc: "Any OpenAI-compatible client library" },
  { name: "Anthropic SDK", desc: "Claude SDKs and the Messages API" },
  { name: "opencode", desc: "CLI coding assistant, drop-in config" },
  { name: "Claude Code", desc: "Point ANTHROPIC_BASE_URL at us" },
  { name: "Cursor / Windsurf", desc: "Use as a custom OpenAI endpoint" },
  { name: "Any HTTP client", desc: "Standard REST + SSE streaming" },
];

function Compatibility() {
  return (
    <section id="compat" className="mx-auto max-w-6xl px-4 py-20">
      <div className="grid gap-12 md:grid-cols-2 md:items-center">
        <div>
          <Badge variant="outline" className="mb-4">Compatibility</Badge>
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Works with the tools you already use
          </h2>
          <p className="mt-4 text-muted-foreground">
            Because we expose the standard OpenAI and Anthropic wire
            protocols, any tool that speaks them will work — no vendor
            lock-in, no wrapper libraries.
          </p>

          <div className="mt-8 space-y-2">
            {[
              "OpenAI-style chat, vision, tools, streaming",
              "Anthropic Messages API with tool_use events",
              "Token-level usage & credit deduction",
              "Transparent SSE passthrough (no buffering)",
            ].map((t) => (
              <div key={t} className="flex items-start gap-2 text-sm">
                <CircleCheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {compat.map((c) => (
            <Card key={c.name} className="p-4">
              <div className="flex items-center gap-2 font-medium">
                <CodeIcon className="size-4 text-primary" />
                {c.name}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{c.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*                           UNIQUE FEATURE                           */
/* ------------------------------------------------------------------ */

function UniqueFeature() {
  return (
    <section className="bg-muted/40 py-20">
      <div className="mx-auto max-w-5xl px-4">
        <Card className="overflow-hidden p-0">
          <div className="grid md:grid-cols-[1.2fr_1fr]">
            <div className="p-8 md:p-12">
              <Badge variant="outline" className="mb-4">
                <ShieldCheckIcon className="size-3.5 mr-1" /> Signature feature
              </Badge>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Non-vision models that receive an image…
                <br />
                <span className="text-primary">reply like a human.</span>
              </h2>
              <p className="mt-4 text-muted-foreground">
                In a normal gateway, sending an image to a text-only model
                returns a <code className="rounded bg-muted px-1.5 py-0.5 text-xs">400 Bad Request</code>.
                Your agent crashes. With AI Gateway, you choose the policy
                <strong> per model</strong>:
              </p>

              <ul className="mt-6 space-y-3 text-sm">
                <li className="flex gap-3">
                  <div className="mt-0.5 size-6 shrink-0 rounded-lg bg-primary/10 text-center text-xs leading-6 font-semibold text-primary">
                    1
                  </div>
                  <div>
                    <strong>Strip &amp; instruct</strong> — silently drop the
                    image, inject a human-like note, and the model replies
                    naturally. No error.
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-0.5 size-6 shrink-0 rounded-lg bg-primary/10 text-center text-xs leading-6 font-semibold text-primary">
                    2
                  </div>
                  <div>
                    <strong>Canned response</strong> — the gateway replies
                    itself with a friendly canned text. No upstream call.
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-0.5 size-6 shrink-0 rounded-lg bg-primary/10 text-center text-xs leading-6 font-semibold text-primary">
                    3
                  </div>
                  <div>
                    <strong>Reject</strong> — classic 400 error for clients
                    that prefer to handle it explicitly.
                  </div>
                </li>
              </ul>
            </div>

            <div className="border-t md:border-t-0 md:border-l bg-muted/30 p-6 md:p-8">
              <div className="text-xs text-muted-foreground mb-2 font-mono">
                {"// opencode sends an image to a text-only model"}
              </div>
              <pre className="overflow-x-auto rounded-xl bg-card p-4 text-[12px] leading-relaxed font-mono ring-1 ring-border">
{`{
  "model": "mimo-v2.5",
  "messages": [{
    "role": "user",
    "content": [
      { "type": "text",
        "text": "What's in this?" },
      { "type": "image_url",
        "image_url": { "url": "..." } }
    ]
  }]
}`}
              </pre>
              <div className="mt-4 text-xs text-muted-foreground mb-2 font-mono">
                {"// gateway strips the image, model replies:"}
              </div>
              <pre className="overflow-x-auto rounded-xl bg-card p-4 text-[12px] leading-relaxed font-mono ring-1 ring-border">
{`{ "choices": [{
  "message": {
    "content": "I can't actually see
images in this conversation — could
you describe what you'd like me to
help with?"
  }
}] }`}
              </pre>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*                                CTA                                 */
/* ------------------------------------------------------------------ */

function Cta() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <Card className="overflow-hidden bg-gradient-to-br from-primary/10 via-card to-card p-10 text-center md:p-16">
        <ZapIcon className="mx-auto size-10 text-primary" />
        <h2 className="mt-6 text-3xl font-semibold tracking-tight md:text-4xl">
          Ready to unify your AI stack?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Free to start. Connect your 9router, configure your models, and
          issue your first API key in under 5 minutes.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/signup" className={buttonVariants({ size: "lg", className: "px-8" })}>
            Create your account
            <ArrowRightIcon className="size-4 ml-2" />
          </Link>
          <Link href="/models" className={buttonVariants({ size: "lg", variant: "outline", className: "px-8" })}>
            Browse models
          </Link>
        </div>
      </Card>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*                                PAGE                                */
/* ------------------------------------------------------------------ */

export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <HowItWorks />
      <UniqueFeature />
      <Compatibility />
      <Cta />
    </>
  );
}
