import Link from "next/link";
import {
  ShieldCheckIcon,
  KeyRoundIcon,
  LineChartIcon,
  ArrowRightIcon,
  TerminalIcon,
  SparklesIcon,
  GaugeIcon,
  CircleCheckIcon,
  CodeIcon,
  WalletIcon,
  SlidersHorizontalIcon,
  RadioIcon,
  UserPlusIcon,
  CreditCardIcon,
  RocketIcon,
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
import { getAppBaseUrl } from "@/lib/site";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Gateway — One API key for every AI model",
  description:
    "A single OpenAI-compatible API key for all leading AI models — transparent per-token pricing, real-time usage tracking, and per-key budgets and rate limits.",
};

/* ------------------------------------------------------------------ */
/*                                 HERO                               */
/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Layered backdrop: grid + radial glows */}
      <div
        className="bg-grid absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]"
        aria-hidden="true"
      />
      <div
        className="absolute -top-40 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-primary/25 blur-[120px]"
        aria-hidden="true"
      />
      <div
        className="absolute top-20 right-[12%] size-72 rounded-full bg-fuchsia-500/10 blur-[100px]"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-6xl px-4 py-20 text-center sm:py-24 md:py-32">
        <FadeIn>
          <Badge
            variant="outline"
            className="mb-7 gap-2 rounded-full border-primary/30 bg-primary/10 px-4 py-1.5 text-xs text-foreground backdrop-blur"
          >
            <SparklesIcon className="size-3.5 text-primary" aria-hidden="true" />
            OpenAI-compatible AI gateway
          </Badge>
        </FadeIn>

        <FadeIn delay={0.05}>
          <h1 className="mx-auto max-w-4xl text-4xl font-semibold tracking-tight text-balance md:text-6xl">
            One API key.
            <br />
            <span className="text-gradient">Every AI model.</span>
          </h1>
        </FadeIn>

        <FadeIn delay={0.1}>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground text-pretty">
            A single <strong className="text-foreground">OpenAI-compatible</strong>{" "}
            endpoint for your whole model catalog — with transparent per-token
            pricing, real-time usage tracking, and fine-grained control over every
            API key you issue.
          </p>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className={`${buttonVariants({ size: "lg" })} glow-md px-7`}
            >
              Start for free
              <ArrowRightIcon className="size-4 ml-2" aria-hidden="true" />
            </Link>
            <Link
              href="/models"
              className={buttonVariants({ size: "lg", variant: "outline", className: "px-7" })}
            >
              Browse models
            </Link>
          </div>
        </FadeIn>

        {/* Glowing code snippet */}
        <ScaleIn delay={0.2}>
          <div className="ring-gradient glow-lg mx-auto mt-16 max-w-2xl overflow-hidden rounded-2xl text-left">
            <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
              <span className="flex gap-1.5" aria-hidden="true">
                <span className="size-2.5 rounded-full bg-red-400/70" />
                <span className="size-2.5 rounded-full bg-yellow-400/70" />
                <span className="size-2.5 rounded-full bg-green-400/70" />
              </span>
              <TerminalIcon className="ml-2 size-3.5" aria-hidden="true" />
              <span className="font-mono">drop-in replacement for the OpenAI API</span>
            </div>
            <pre className="overflow-x-auto bg-card p-5 text-xs leading-relaxed font-mono">
{`curl ${getAppBaseUrl()}/v1/chat/completions \\
  -H "Authorization: Bearer sk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "mimo-v2.5",
    "messages": [{"role":"user","content":"Hello!"}]
  }'`}
            </pre>
          </div>
        </ScaleIn>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*                               FEATURES                             */
/* ------------------------------------------------------------------ */

const primaryFeatures = [
  {
    icon: <KeyRoundIcon className="size-5" aria-hidden="true" />,
    title: "One key, every model",
    desc: "A single API key unlocks your entire model catalog. Point one endpoint at us and switch models by name — no new integration for each one.",
  },
  {
    icon: <WalletIcon className="size-5" aria-hidden="true" />,
    title: "Pay only for what you use",
    desc: "Credits are metered per request down to the micro-dollar. Top up anytime, watch your balance live, and pay for tokens — never seat fees.",
  },
];

const gridFeatures = [
  {
    icon: <LineChartIcon className="size-4" aria-hidden="true" />,
    title: "Real-time usage analytics",
    desc: "Per-request token counts, cost by model, daily trends, and a full request history.",
  },
  {
    icon: <SlidersHorizontalIcon className="size-4" aria-hidden="true" />,
    title: "Per-key controls",
    desc: "Rate limits, monthly budgets, model allowlists, and expiry — set on every key you issue.",
  },
  {
    icon: <RadioIcon className="size-4" aria-hidden="true" />,
    title: "Streaming built in",
    desc: "Token-by-token SSE passthrough with no buffering, so responses start instantly.",
  },
  {
    icon: <GaugeIcon className="size-4" aria-hidden="true" />,
    title: "Built for production",
    desc: "Atomic token-bucket rate limiting and a PostgreSQL-backed audit trail on every call.",
  },
];

function Features() {
  return (
    <section id="features" className="relative mx-auto max-w-6xl px-4 py-20">
      <FadeIn>
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/10">
            Features
          </Badge>
          <h2 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
            Everything you need to <span className="text-gradient">ship with AI</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-pretty">
            From the first request to detailed billing — one gateway handles access,
            metering, and control.
          </p>
        </div>
      </FadeIn>

      <FadeInStagger stagger={0.06} className="mt-14 grid gap-5 sm:grid-cols-2">
        {primaryFeatures.map((f) => (
          <FadeInItem key={f.title}>
            <Card className="card-hover h-full overflow-hidden">
              <CardHeader>
                <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
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

      <FadeInStagger stagger={0.06} className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {gridFeatures.map((f) => (
          <FadeInItem key={f.title}>
            <div className="card-hover flex h-full gap-3 rounded-xl border bg-card/60 p-4">
              <div className="mt-0.5 shrink-0 text-primary">{f.icon}</div>
              <div>
                <p className="text-sm font-medium">{f.title}</p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {f.desc}
                </p>
              </div>
            </div>
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
    title: "Create your account",
    desc: "Sign up free and verify your email with a one-time code. No card required to get started.",
    icon: <UserPlusIcon className="size-5" aria-hidden="true" />,
  },
  {
    title: "Get a key & add credits",
    desc: "Create an API key in the console and top up your balance. Set budgets and limits if you like.",
    icon: <CreditCardIcon className="size-5" aria-hidden="true" />,
  },
  {
    title: "Start building",
    desc: "Call /v1/chat/completions with any OpenAI-compatible client. Track every request live.",
    icon: <RocketIcon className="size-5" aria-hidden="true" />,
  },
];

function HowItWorks() {
  return (
    <section id="how" className="relative overflow-hidden py-20">
      <div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
        aria-hidden="true"
      />
      <div className="mx-auto max-w-6xl px-4">
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/10">
              How it works
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
              Up and running in <span className="text-gradient">minutes</span>
            </h2>
          </div>
        </FadeIn>

        <FadeInStagger stagger={0.06} className="mt-14 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {steps.map((s, i) => (
            <FadeInItem key={s.title}>
              <Card className="card-hover relative h-full p-6">
                <span className="absolute right-4 top-4 font-mono text-xs text-muted-foreground/60">
                  0{i + 1}
                </span>
                <div className="glow-sm flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  {s.icon}
                </div>
                <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </Card>
            </FadeInItem>
          ))}
        </FadeInStagger>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*                           UNIQUE FEATURE                           */
/* ------------------------------------------------------------------ */

function UniqueFeature() {
  return (
    <section className="relative overflow-hidden py-20">
      <div
        className="absolute left-1/2 top-1/2 h-[420px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-5xl px-4">
        <Card className="ring-gradient overflow-hidden p-0">
          <div className="grid md:grid-cols-[1.2fr_1fr]">
            <div className="p-8 md:p-12">
              <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/10">
                <ShieldCheckIcon className="size-3.5 mr-1" aria-hidden="true" /> Graceful by default
              </Badge>
              <h2 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">
                Text-only models that receive an image…
                <br />
                <span className="text-gradient">reply like a human.</span>
              </h2>
              <p className="mt-4 text-muted-foreground text-pretty">
                Normally, sending an image to a model without vision returns a{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">400 Bad Request</code>{" "}
                and your agent crashes. Here, each model has a policy you can rely on:
              </p>

              <ul className="mt-6 space-y-3.5 text-sm">
                {[
                  ["Strip & respond", "The image is dropped and the model replies naturally. No error."],
                  ["Canned response", "A friendly fixed reply is returned without an upstream call."],
                  ["Reject", "A classic 400 error, for clients that prefer to handle it explicitly."],
                ].map(([label, desc], i) => (
                  <li key={label} className="flex gap-3">
                    <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-xs font-semibold text-primary ring-1 ring-primary/25">
                      {i + 1}
                    </div>
                    <div>
                      <strong className="text-foreground">{label}</strong> — {desc}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t bg-muted/20 p-6 md:border-l md:border-t-0 md:p-8">
              <div className="mb-2 font-mono text-xs text-muted-foreground">
                {"// an image is sent to a text-only model"}
              </div>
              <pre className="overflow-x-auto rounded-xl bg-card p-4 text-xs leading-relaxed font-mono ring-1 ring-border">
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
              <div className="mb-2 mt-4 font-mono text-xs text-muted-foreground">
                {"// the gateway responds gracefully:"}
              </div>
              <pre className="overflow-x-auto rounded-xl bg-card p-4 text-xs leading-relaxed font-mono ring-1 ring-primary/30">
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
/*                            COMPATIBILITY                           */
/* ------------------------------------------------------------------ */

const compat = [
  { name: "OpenAI SDK", desc: "Any OpenAI-compatible client library" },
  { name: "opencode", desc: "CLI coding assistant, drop-in config" },
  { name: "Cursor / Windsurf", desc: "Use as a custom OpenAI endpoint" },
  { name: "Any HTTP client", desc: "Standard REST + SSE streaming" },
];

function Compatibility() {
  return (
    <section id="compat" className="mx-auto max-w-6xl px-4 py-20">
      <div className="grid gap-8 md:grid-cols-2 md:items-center md:gap-12">
        <div>
          <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/10">
            Compatibility
          </Badge>
          <h2 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
            Works with the tools you <span className="text-gradient">already use</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-pretty">
            Because we speak the standard OpenAI wire protocol, any tool that speaks
            it just works — no wrapper libraries, no vendor lock-in.
          </p>

          <div className="mt-8 space-y-2.5">
            {[
              "OpenAI-style chat, tools, and streaming",
              "Per-token usage and credit deduction",
              "Transparent SSE passthrough (no buffering)",
            ].map((t) => (
              <div key={t} className="flex items-start gap-2.5 text-sm">
                <CircleCheckIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {compat.map((c) => (
            <Card key={c.name} className="card-hover p-4">
              <div className="flex items-center gap-2 font-medium">
                <span className="flex size-6 items-center justify-center rounded-md bg-primary/15 text-primary">
                  <CodeIcon className="size-3.5" aria-hidden="true" />
                </span>
                {c.name}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{c.desc}</p>
            </Card>
          ))}
        </div>
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
      <div className="ring-gradient relative overflow-hidden rounded-2xl p-6 text-center sm:p-10 md:p-16">
        <div
          className="absolute left-1/2 top-0 h-40 w-[520px] -translate-x-1/2 rounded-full bg-primary/20 blur-[90px]"
          aria-hidden="true"
        />
        <div className="relative">
          <h2 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
            Ready to <span className="text-gradient">unify your AI stack?</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Free to start. Create an account, grab a key, and make your first request
            in under five minutes.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup" className={`${buttonVariants({ size: "lg" })} glow-md px-8`}>
              Start for free
              <ArrowRightIcon className="size-4 ml-2" aria-hidden="true" />
            </Link>
            <Link href="/models" className={buttonVariants({ size: "lg", variant: "outline", className: "px-8" })}>
              Browse models
            </Link>
          </div>
        </div>
      </div>
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
