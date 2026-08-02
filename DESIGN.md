---
name: AI Gateway
description: A unified AI gateway — calm, professional, minimal. Clean glass panels over living systems.
colors:
  fresh-emerald: "oklch(0.527 0.154 150.069)"
  fresh-emerald-deep: "oklch(0.448 0.119 151.328)"
  signal-red: "oklch(0.577 0.245 27.325)"
  signal-red-deep: "oklch(0.704 0.191 22.216)"
  clean-paper: "oklch(1 0 0)"
  clean-paper-deep: "oklch(0.145 0 0)"
  whisper: "oklch(0.97 0 0)"
  whisper-deep: "oklch(0.269 0 0)"
  faint-line: "oklch(0.922 0 0)"
  faint-line-deep: "oklch(1 0 0 / 10%)"
  ink: "oklch(0.145 0 0)"
  ink-deep: "oklch(0.985 0 0)"
  ink-muted: "oklch(0.556 0 0)"
  ink-muted-deep: "oklch(0.708 0 0)"
  canopy-1: "oklch(0.845 0.143 164.978)"
  canopy-2: "oklch(0.696 0.17 162.48)"
  canopy-3: "oklch(0.596 0.145 163.225)"
  canopy-4: "oklch(0.508 0.118 165.612)"
  canopy-5: "oklch(0.432 0.095 166.913)"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 5vw, 3.75rem)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 500
    lineHeight: 1.4
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
    maxLineLength: "70ch"
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
  caption:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
  mono:
    fontFamily: "Geist Mono, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  stat:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
rounded:
  sm: "4px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
  3xl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.fresh-emerald}"
    textColor: "{colors.clean-paper}"
    rounded: "{rounded.pill}"
    padding: "10px 24px"
  button-primary-hover:
    backgroundColor: "{colors.fresh-emerald-deep}"
  button-secondary:
    backgroundColor: "{colors.whisper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "10px 24px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "10px 24px"
  card:
    backgroundColor: "{colors.clean-paper}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  input:
    backgroundColor: "{colors.clean-paper}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  badge:
    backgroundColor: "{colors.whisper}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  chip:
    backgroundColor: "{colors.whisper}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
  sidebar:
    backgroundColor: "oklch(0.985 0 0)"
    rounded: "{rounded.lg}"
---

# Design System: AI Gateway

## 1. Overview

**Creative North Star: "The Greenhouse"**

This is a system for managing living things — models, keys, credits, usage — behind clean glass panels. The interface is organized like a greenhouse: transparent, structured, and alive. Every surface is a window into a system that grows and changes. The green accent isn't decoration; it's health, status, connection. A model is active. A key is valid. A balance is sufficient. The color communicates state the way a leaf communicates sunlight.

The system rejects noise. No gradient heroes, no card grids with icon-heading-paragraph repeating endlessly, no eyebrow text above every section, no numbered section markers as default scaffolding. Information density is welcome when it serves the task; cognitive overload is not. Every screen answers one question. If a page tries to do three things, it should be three pages.

Both light and dark themes are first-class. Neither is a default or an afterthought. The light theme is a clean workbench — bright, clear, high-contrast. The dark theme is a control room — focused, reduced, warm-dark without purple undertones. Both feel intentional.

**Key Characteristics:**
- **Functional color.** The emerald accent communicates state, not decoration. It appears on primary actions, active indicators, and success states. It does not appear on borders, backgrounds, or dividers.
- **Tonal neutrality.** Achromatic grays (zero chroma) carry all structural weight — backgrounds, cards, borders, muted text. No warm or cool tint on neutrals.
- **Warm approachability.** Components are rounded, tactile, and responsive. Buttons have pill radii. Cards have soft corners. Hover states feel alive. The tool should feel inviting, not clinical.
- **Breathing room.** Generous spacing between sections. Tight spacing within components. The gap between a card's content and its edge is smaller than the gap between two cards.

## 2. Colors

The palette is one saturated green over a bed of pure achromatic neutrals. No secondary or tertiary accent colors — the emerald carries the entire accent load, and its rarity is the point.

### Primary

- **Fresh Emerald** (`oklch(0.527 0.154 150.069)` ≈ `#1a9e52`): The single accent color. Used for primary buttons, active navigation states, success indicators, chart highlights, and the sidebar primary. Appears on ≤10% of any given screen.

### Neutral

- **Clean Paper** (`oklch(1 0 0)` = `#ffffff`): Background and card surface in light mode. Pure white, zero chroma.
- **Ink** (`oklch(0.145 0 0)` ≈ `#252525`): Primary text color in light mode. Near-black, high contrast against white.
- **Ink Muted** (`oklch(0.556 0 0)` ≈ `#8e8e8e`): Secondary text, placeholder text, disabled labels. Must still hit 4.5:1 against white.
- **Whisper** (`oklch(0.97 0 0)` ≈ `#f7f7f7`): Subtle background tint for sidebars, hover states, badge fills. One step above white.
- **Faint Line** (`oklch(0.922 0 0)` ≈ `#ebebeb`): Borders, dividers, input strokes. Barely visible — structure, not emphasis.

### State

- **Signal Red** (`oklch(0.577 0.245 27.325)` ≈ `#dc2626`): Destructive actions, error states, danger indicators. Used sparingly — only when the action is irreversible or the state requires immediate attention.

### Chart

- **Canopy 1–5** (OKLCH hue 162–167, stepping lightness 0.845 → 0.432): A five-step green ramp for usage charts and data visualization. Lightest at Canopy 1, darkest at Canopy 5. Not used outside chart contexts.

### Named Rules

**The 10% Rule.** The primary accent appears on ≤10% of any given screen. Its rarity is the point. If every button is green, no button is green.

**The Zero-Chroma Rule.** All neutrals — backgrounds, cards, borders, muted text, dividers — are achromatic (chroma = 0). No warm gray, no cool gray, no "slightly blue" surfaces. Tinted neutrals are prohibited. The only chromatic color on the page is the accent.

**The Functional Color Rule.** Color communicates state, not decoration. Green means "active / connected / valid / success." Red means "error / danger / destructive." No color appears on a surface that doesn't carry meaning.

## 3. Typography

**Display Font:** Inter (with system-ui fallback)
**Body Font:** Inter (with system-ui fallback)
**Mono Font:** Geist Mono (with monospace fallback)

**Character:** One family, many weights. Inter carries the entire surface — headings, body, labels, buttons, data. This is a product UI; display fonts belong on marketing pages, not in dashboards. The type is clean, slightly tight on headings (`-0.02em` tracking), and generous on body (1.6 line-height). The mono font appears only in code blocks, API key displays, and terminal output.

### Hierarchy

- **Display** (600, `clamp(2.25rem, 5vw, 3.75rem)`, 1.15): Landing page hero headings only. Never used inside the app shell.
- **Headline** (600, 1.5rem, 1.3): Page titles, section headings. Used in page headers and card titles.
- **Title** (500, 1.125rem, 1.4): Sub-section headings, dialog titles, table headers.
- **Body** (400, 0.9375rem, 1.6): All prose and paragraph text. Max line length 70ch.
- **Label** (500, 0.8125rem, 1.4): Form labels, badge text, table column headers, navigation items. Slightly smaller than body, slightly heavier.
- **Mono** (400, 0.875rem, 1.6): Code, API keys, terminal output, technical data.

### Named Rules

**The One-Family Rule.** Inter carries every text element in the product. No display font, no serif pairing, no secondary sans. The mono font (Geist Mono) is the only exception, and it appears only in code-adjacent contexts.

**The Fixed-Scale Rule.** Type sizes are fixed rem values, not fluid clamp scales. Users view product UI at consistent DPI; a heading that shrinks in a sidebar or on mobile looks broken, not responsive. The sole exception is the display heading on the landing page, which uses `clamp()` because it's brand, not product.

## 4. Elevation

This system uses subtle shadows for depth, not tonal layering. Surfaces are flat at rest (zero shadow). Shadows appear as responses to interaction: a card lifts slightly on hover, a dropdown floats above its trigger, a modal sits above a backdrop. The shadows are low-opacity, low-blur — ambient, not dramatic.

### Shadow Vocabulary

- **Surface** (no shadow): Default state for cards, panels, and containers. Flat.
- **Lift** (`0 4px 12px oklch(0 0 0 / 0.08)`): Hover state for interactive cards and elevated containers. Subtle lift that says "this is interactive."
- **Float** (`0 8px 24px oklch(0 0 0 / 0.12)`): Dropdowns, popovers, and tooltips. Enough separation from the surface to read as "above."
- **Backdrop** (`0 16px 48px oklch(0 0 0 / 0.16)`): Modals and dialogs. Maximum elevation.

### Named Rules

**The Flat-By-Default Rule.** No component ships with a shadow in its resting state. Shadows are earned through interaction — hover, focus, or elevation above another surface. A card that starts lifted has nowhere to go.

**The Ambient-Not-Dramatic Rule.** Shadows are soft, low-opacity, and large-blur. Hard-edged or high-contrast shadows are prohibited. If a shadow looks like a drop shadow from 2015, it's too dark and the blur is too small.

## 5. Components

Components are warm and approachable — rounded, tactile, responsive. They invite interaction rather than demanding it.

### Buttons

- **Shape:** Pill radius (9999px) for primary and secondary. Full-rounded, never rectangular.
- **Primary:** Fresh Emerald background, white text, 10px 24px padding. The most prominent interactive element on any screen.
- **Hover:** Background darkens to Fresh Emerald Deep (`oklch(0.448 0.119 151.328)`). 150ms ease-out transition.
- **Secondary:** Whisper background, ink text, same pill shape. Used for secondary actions alongside a primary.
- **Ghost:** Transparent background, ink text, subtle hover tint (whisper). Used for tertiary actions, navigation items, and toolbar buttons.

### Cards

- **Corner Style:** Gently curved (10px radius).
- **Background:** Clean Paper (white in light, dark-card in dark mode).
- **Shadow Strategy:** Flat at rest. Lift shadow on hover when the card is interactive (links, clickable rows). No shadow on static cards.
- **Border:** 1px Faint Line. Structure, not emphasis.
- **Internal Padding:** 24px (lg). Generous internal breathing room.

### Inputs / Fields

- **Style:** Clean Paper background, 1px Faint Line border, 8px radius. Slightly inset feel.
- **Focus:** Border shifts to Fresh Emerald. No glow, no box-shadow — just the color shift. 150ms transition.
- **Error:** Border shifts to Signal Red. Error message appears below in Signal Red, body size.
- **Disabled:** Background shifts to Whisper, text to Ink Muted. Cursor: not-allowed.

### Badges / Chips

- **Style:** Whisper background, Ink Muted text, pill radius, 2px 10px padding. Small, unobtrusive labels.
- **Variant:** Outline badges use a Faint Line border with transparent background. Used for status tags.

### Navigation

- **Site Topbar:** Adaptive — items change based on page context and user role. Fresh Emerald for the active item. Ghost style for inactive items.
- **Dashboard Sidebar:** Slightly warmer background (Whisper in light, sidebar token in dark). Collapsible. Active item has a Fresh Emerald left indicator or tinted background.
- **Breadcrumbs:** Label size, Ink Muted, with "/" separator. Current page in Ink.

### Sidebar

- **Background:** `oklch(0.985 0 0)` in light mode — one step warmer than pure white, visually distinct from content area.
- **Active state:** Fresh Emerald left border (2px) or tinted background.
- **Hover:** Whisper background tint.

## 6. Do's and Don'ts

### Do:

- **Do** use Fresh Emerald sparingly — primary buttons, active states, success indicators. The 10% Rule applies.
- **Do** use achromatic neutrals for all structural surfaces. Backgrounds, cards, borders, muted text — all chroma = 0.
- **Do** make both themes feel intentional. Light is a workbench; dark is a control room. Neither is a default.
- **Do** use pill radii on buttons. Every button — primary, secondary, ghost — is fully rounded.
- **Do** use 150ms ease-out transitions on interactive state changes. Users are in flow; don't make them wait.
- **Do** show a number before a chart. When a developer asks "how much did I spend?", the answer is a number, not a visualization.
- **Do** use skeleton states for loading, not spinners in the middle of content.
- **Do** keep shadows ambient and subtle. Flat by default; lift on interaction.
- **Do** respect `prefers-reduced-motion`. Every animation has an instant or fade fallback.
- **Do** use the mono font (Geist Mono) only for code, API keys, and terminal output.

### Don't:

- **Don't** use gradient text (`background-clip: text` with a gradient background). Per PRODUCT.md anti-references and the shared absolute bans. Use a single solid color.
- **Don't** use side-stripe borders (`border-left` or `border-right` > 1px as a colored accent). Use full borders, background tints, or leading icons instead.
- **Don't** use glassmorphism as a default. Blurs and glass cards are decorative, not structural.
- **Don't** put tiny uppercase tracked eyebrows above every section. The 2023-era kicker pattern is a saturated AI tell.
- **Don't** use numbered section markers (01 / 02 / 03) as default scaffolding. Numbers earn their place when order carries information.
- **Don't** use identical card grids — same-sized cards with icon + heading + text, repeated endlessly. Per PRODUCT.md anti-references.
- **Don't** use the hero-metric template — big number, small label, supporting stats, gradient accent. SaaS cliché.
- **Don't** use overly complex dashboards with 15 charts and 3 sidebars. Per PRODUCT.md: "information density is good; cognitive overload is not."
- **Don't** use dark-only or dev-tool cliché aesthetics. Per PRODUCT.md: "both themes must feel intentional."
- **Don't** use `border-radius: 32px+` on cards or sections. Cards top out at 10–16px. Pill is fine for buttons only.
- **Don't** use decorative grid backgrounds (`linear-gradient` 1px overlays). Use product structure or a plain surface.
- **Don't** use `repeating-linear-gradient` stripe backgrounds. No diagonal stripes.
- **Don't** use tinted neutrals. Achromatic means chroma = 0. No warm gray, no cool gray.
- **Don't** use a display font for UI labels, buttons, or data. Inter carries everything in the product; display fonts belong on the landing page only.
- **Don't** animate CSS layout properties. Transform and opacity only.
- **Don't** use bounce or elastic easing. Ease-out with exponential curves only.
