# Product

## Register

split

## Platform

web

## Users

**Primary:** Developer / tech lead — the person who integrates AI into their product and needs one clean endpoint instead of juggling multiple provider SDKs. They arrive with a specific model they want to route, test in the console playground, generate an API key, and ship. Context: mid-sprint, browser next to terminal, wants things to work in under 5 minutes.

**Secondary:** Platform team / DevOps — the person managing AI spend across a team or org. They care about per-user budgets, usage logs, RPM limits, and knowing exactly who called what model and how much it cost. Context: periodic check-in, reviewing dashboards and controls rather than writing code.

## Product Purpose

AI Gateway is a unified proxy that sits in front of any OpenAI-compatible upstream (like 9router) and exposes an OpenAI-compatible API. It gives teams a single endpoint, a single API key, and full admin control over models, pricing, capabilities, and user credits — so developers integrate once and platform teams manage cost and access without touching provider consoles.

Success looks like: a developer generates a key and starts calling models in under 5 minutes. A platform admin can see who is spending what, set budgets, and add or remove models without downtime.

## Positioning

One endpoint, one key, full control — AI Gateway is the simplest way to unify multiple AI providers behind a single API that your team actually manages.

## Conversion & proof

- **Primary CTA:** "Start for free" — developer signs up, generates key, calls first model.
- **Secondary CTA:** "View docs" — for developers who want to read before committing.
- **The line a visitor remembers:** "One key, every model."
- **Belief ladder:**
  1. I can unify my AI providers behind one endpoint.
  2. My team gets full control over models, pricing, and budgets.
  3. It works with the tools I already use (OpenAI SDK, opencode, Cursor).
  4. I can start in 5 minutes, not 5 hours.
- **Proof on hand:** None yet — no testimonials, case studies, or press. As proof accumulates, add here.

## Brand Personality

Calm, precise, trustworthy. The interface should feel like a well-organized control room — every element has a purpose, nothing is decorative. Voice is direct and technical without being cold; confident without being loud. Three words: **calm, professional, minimal**.

## Anti-references

- **Overly complex dashboards.** Grafana-default-style layouts with 15 charts, 8 filters, and 3 sidebars. Information density is good; cognitive overload is not.
- **Generic SaaS look.** Gradient hero sections, identical card grids with icon + heading + paragraph, eyebrow text above every section, numbered section markers. The saturated AI-default aesthetic of 2025-2026.
- **Dark-only / dev-tool cliché.** Interfaces that only feel "designed" in dark mode, or lean into hacker/terminal aesthetics as a crutch. Both themes must feel intentional.

## Design Principles

1. **Simplicity is the feature.** Every screen should answer one question. If a page tries to do three things, it should be three pages.
2. **Show the number, not the chart.** When a developer asks "how much did I spend?", the answer is a number — not a visualization they have to decode.
3. **Work in under 5 minutes.** From signup to first API call: generate key, set base URL, call model. No wizard, no onboarding tour, no config file.
4. **Admin controls, not admin overhead.** Adding a model or topping up credits should take 30 seconds. If it takes more, the UI is wrong.
5. **Both themes matter.** Light and dark mode are both first-class. Neither is the "default" — the user picks, and both look intentional.

## Accessibility & Inclusion

Target WCAG 2.1 AA: 4.5:1 contrast ratio for body text, 3:1 for large text. Full keyboard navigation. Screen reader support with proper ARIA attributes. `prefers-reduced-motion` respected — all Framer Motion animations have instant/fade fallbacks.
