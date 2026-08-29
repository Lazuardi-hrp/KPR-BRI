# design.md — KPR Bersubsidi BRI · Frontend Redesign

**Project:** `~/Documents/BRI-App/KPR-BRI` (localhost:3000)
**Product:** Platform pencarian perumahan bersubsidi dengan peta interaktif — Pematang Siantar, Sumatera Utara
**Stack (read from the repo):** Next.js 16 · React 19 · **Tailwind CSS v4 (CSS-first, no `tailwind.config.ts`)** · shadcn/ui (new-york) · `motion` v13 (Framer) · Lenis · Leaflet (CDN) · lucide-react · next/font Plus Jakarta Sans · Vercel Analytics
**Direction:** `ATLAS SIANTAR` — a cartographic editorial system
**Audience:** the coding agent implementing this
**Version:** 2.0 — rebuilt from your codebase

---

## 0. How to use this document

### 0.1 What changed from v1

Version 1 of this document was written against **webekspor.com**, which turned out to be a *reference*, not your site. Everything in it that described colors, logos, assets or copy has been discarded.

**This version is built entirely from your own project.** Every hex value, class string, file path, component name and Indonesian sentence below was read out of `~/Documents/BRI-App/KPR-BRI`.

`webekspor.com` survives in exactly one way: as a **structural reference** for the numbered editorial section header (`01 · Keuntungan`) — a pattern you have already adopted in `src/components/section-header.tsx`. Nothing else from it — not one color, asset, logo or word — appears here.

### 0.2 Hard constraints

| Rule | Detail |
|---|---|
| **Your colors are frozen** | `--brand #003d82` · `--brand-deep #002a5c` · `--brand-sky #71c5e8` · `--brand-orange #ff8c42` · `--foreground #0a1a2f` · `--muted-foreground #55647a` · `--border #e6ecf4` · `--secondary #f3f6fb` · `--accent #eef4fc` · `#04203f` (footer). Every new token below is a **derived tint, shade or accessible ink of these** — never a replacement. |
| **Your logos are frozen** | `public/logobri.png` and `public/logokpr.png` ship unchanged. No redraw, no recolor, no lockup change. Optimization (WebP, resize) is allowed; alteration is not. |
| **Your assets are kept** | All 15 files in `public/kpr-assets/`, plus `rumah.png` and `rumah1.png`. They get compressed, re-cropped and served responsibly — never deleted, never replaced with stock. See §8. |
| **Your copy is kept** | Every existing Indonesian string stays. New copy is **additive only** and is always marked `[BARU]`. See §7. |
| **Your data model is frozen** | The `Housing` interface in `src/lib/housing-storage.ts` is not changed. The design reads existing fields (including `lat`/`lng`, which become a design element) — it does not require new ones. |
| **Your routes are frozen** | `/` · `/map` · `/admin` · `/admin/login`. |

### 0.3 Order of work

Land §3 first (it is additive — nothing can break), then §4, then components (§5), then pages (§6). Do §7–§9 alongside, not after. Ship against §12.

---

## 1. Audit — your codebase today

### 1.1 What you already have (and it's good)

You are much further along than a typical starting point. Do not rebuild these — extend them.

| Asset | Where | Verdict |
|---|---|---|
| **Numbered editorial section header** | `components/section-header.tsx` — `01 · Keuntungan` + big title + optional CTA | The strongest pattern in the codebase. It becomes the spine of the whole system. |
| **A real motion layer** | `components/motion/` — `Reveal`, `RevealGroup`, `RevealItem`, `Magnetic`, `WordsReveal`, `SmoothScroll` (Lenis) | Well written, reduced-motion aware. Mostly **unused** — `WordsReveal` appears nowhere. |
| **Animated counter** | `components/animated-counter.tsx`, with `toLocaleString("id-ID")` | Correct locale formatting, `tabular-nums`, IntersectionObserver-gated. Keep. |
| **A `cva` Button with 6 variants** | `components/ui/button.tsx` | `accent` uses `#3a1c00` on `#ff8c42` = **6.75:1** — someone already solved the orange-contrast problem correctly. |
| **Genuine data** | 16 perumahan with real coordinates, unit counts, prices, contacts | Real lat/lng is the single most valuable design material in this repo. §2 turns it into the visual signature. |
| **Real product depth** | Interactive Leaflet map, geolocation "perumahan terdekat", admin CRUD, image slideshow | This is a product, not a landing page. The design must respect that. |
| **`--radius: 1.5rem` + `rounded-3xl` cards** | `globals.css` + `ui/card.tsx` | Consistent, unlike most shadcn projects. Keep. |

### 1.2 What holds it back

| # | Problem | Evidence |
|---|---|---|
| 1 | **No surface rhythm on the landing page.** Everything is `bg-background` (white). The only breaks are one `bg-primary` stat band and the footer. Six consecutive sections read as one sheet. | `app/page.tsx` |
| 2 | **Section padding is uniform.** `py-20 sm:py-28` on every chapter regardless of weight, and the hero is *smaller* (`pt-12 pb-16`) than the sections that follow it. | `app/page.tsx` |
| 3 | **Hero is undersized and generic.** `text-[2.9rem] … md:text-7xl` (≈72px) is fine; but the hero visual is a floating PNG in a rounded box. **The product is a map of 16 real locations and the hero never says so.** | `app/page.tsx:123–211` |
| 4 | **`WordsReveal` is dead code.** The best motion primitive in the repo is imported nowhere. The H1 uses a plain `Reveal`. | `components/motion/text-reveal.tsx` |
| 5 | **~30 off-palette Tailwind colors.** `purple-600/700/900`, `amber-600/700/900`, `emerald-100/800`, `green-50/100/600/700/900`, `blue-50/100/400/600/700/900`, `slate-50/100/200`, `gray-600`, `yellow-600`, `red-600` — mostly in `housing-popup.tsx` and `app/admin/*`. The design system stops at the landing page. | grep across `src/` |
| 6 | **`#04203f` is hardcoded twice**, not a token — in the footer and the popup backdrop. | `app/page.tsx:348`, `housing-popup.tsx:57` |
| 7 | **Three contrast failures.** Availability status uses `text-green-600` (3.30:1), `text-yellow-600` (**2.94:1**), `text-red-600` (4.83:1) — inconsistent and two of three fail AA. `--destructive #e5484d` is 3.91:1. | computed, §9.1 |
| 8 | **`rumah.png` is 1.75 MB.** It is the hero LCP image. This alone likely costs you a full Lighthouse grade. | `public/rumah.png` |
| 9 | **`logobri.png` is 1500×1500 (102 KB)** and renders at 64×44 in the nav. ~23× more pixels than needed. | `public/logobri.png` |
| 10 | **Two referenced images do not exist.** `/luxury-residence.jpg` (housing id 1, `images[2]`) and `/placeholder.svg` (the *fallback* in `image-slideshow.tsx`) both 404. The fallback for a missing image is itself missing. | `housing-storage.ts`, `image-slideshow.tsx:23` |
| 11 | **`rumah1.png` (376 KB) is unused.** Referenced nowhere. | grep |
| 12 | **Leaflet is injected from a CDN at runtime**, and marker icons are pulled from **`raw.githubusercontent.com`** — an unversioned, uncached, third-party host serving a core UI element. | `housing-map.tsx:47–144` |
| 13 | **Footer links are dead.** `Kebijakan Privasi` and `Syarat & Ketentuan` are `href="#"`. On a financial product page that is a credibility problem, not a nit. | `app/page.tsx:380–381` |
| 14 | **Footer logo is `brightness-0 invert`** — flattening a blue-and-orange mark to solid white. Acceptable as a fallback, but not brand-faithful. | `app/page.tsx:353` |
| 15 | **Copyright says 2025**, the seed data and repo are current. | `app/page.tsx:387` |
| 16 | **`/map` has no loading or empty state** and no `<h1>`; the sidebar list and the popup carry no coordinate or distance context until geolocation is granted. | `app/map/page.tsx` |
| 17 | **Card shadows are hand-written `rgba()` strings**, duplicated across `card.tsx`, `perumahan-collection.tsx`, `map/page.tsx`, `admin/*`. No elevation scale. | grep |

---

## 2. Design direction — `ATLAS SIANTAR`

> **The concept:** this is not a brochure with a map bolted on. It is an **atlas of Pematang Siantar's subsidised housing** — and the site should look like one. Coordinates, plot numbers, contour lines, a legend. Precise, civic, trustworthy. Exactly the register a state-backed mortgage deserves.

This direction is chosen because it is *already sitting in your database*. Every one of your 16 perumahan carries a real latitude and longitude. Nothing has to be invented.

### 2.1 The five moves

**Move 1 — Coordinates become typography.**
`2.9971° LU, 99.0653° BT` set at 10px / 600 / `tracking-[0.24em]` / `tabular-nums` appears on every perumahan card, in the map popup header, in the sidebar list, and as a hero micro-label. It is honest data used as ornament — the cheapest and most convincing craft signal available to you, and it costs zero new content.

**Move 2 — Chapters become plot numbers.**
Your `01 · Keuntungan` header gets a hairline rule, a fixed-width numeral, and a left "kavling rail" on `lg+` that fills as you scroll. The page reads as a surveyed document.

**Move 3 — Surface rhythm: light → ink → light → ink.**
Today: white, white, white, white, blue band, white, footer. New: chapter 03 (Koleksi Perumahan) and chapter 06 (CTA) invert to `#04203f` — the ink you already use in the footer. Your 15 housing photographs finally get a dark stage instead of competing with a white page.

**Move 4 — The map earns the hero.**
The hero gains an **Atlas Strip** directly beneath it: a full-bleed marquee of all 16 perumahan names and their real coordinates, built from `getInitialHousingData()`. It advertises the actual product in one glance, uses data you already ship, and adds motion with no new asset. `rumah.png` stays exactly where it is.

**Move 5 — Wire up the motion you already wrote.**
`WordsReveal` goes on the H1 and every chapter title. `Magnetic` extends to the two remaining primary CTAs. `AnimatedCounter` gets a second home in the hero stat row. Nothing new is authored — the layer exists and is idle.

### 2.2 Register

Civic-cartographic, not playful: survey documents, land certificates, transit maps. **No** glassmorphism, **no** gradient blobs, **no** purple, **no** emoji, **no** decorative 3D. The palette is your BRI blue, your ink, your orange accent, and paper.

The `.animate-blob` and `.animate-gradient-pan` keyframes in `globals.css` are the one part of the current CSS that fights this direction. Keep the keyframes (harmless), but do not introduce new uses.

#### Amendment — the hero survey model

The "no decorative 3D" rule stands, and it means what it says alongside the
company it keeps: glassmorphism, gradient blobs, ornament. It is **not** a ban on
drawing the housing stock.

The hero panel now renders `deret-rumah-subsidi.glb` — the five subsidised units
with their kerbs, verges and planting — under a scoped exception:

- **Orthographic**, never perspective. It is a site plan, not a product shot.
- **Matte.** One hemisphere light, one key, a single contact shadow. No
  environment map, no reflections, no bloom, no filmic tone curve.
- **Held.** Azimuth is clamped to a 92° arc and polar to 36°; the model is only
  ever seen from a surveyor's three-quarter view, never from below or overhead.
- **Quiet.** A slow sway, suppressed under `prefers-reduced-motion`.
- **Free.** The poster (`/rumah.webp`) is painted first and carries the LCP; the
  canvas may not mount until it has. The model is the visual on every screen
  size — the poster persists only where WebGL is unavailable or refused.

This is the same register as the kavling rail and the atlas strip — the drawing
of a surveyed thing — and §8.3's payload budget is respected rather than spent.
The hero frame, the `animate-float` "Tersertifikasi" chip and the `16 titik
lokasi` chip in §11 are unchanged.

---

## 3. Foundations

### 3.1 Tailwind v4 — everything goes in `globals.css`

You have **no `tailwind.config.ts`** (`components.json` → `"tailwind.config": ""`). All theming is CSS-first via `@theme inline`. Every addition below extends your existing `:root` and `@theme inline` blocks. **Nothing is renamed, so nothing breaks.**

#### 3.1.1 Extend `:root`

```css
/* src/app/globals.css — ADD to the existing :root block */
:root {
  /* ── existing brand tokens: unchanged ──────────────────── */
  /* --brand: #003d82;  --brand-deep: #002a5c;                */
  /* --brand-sky: #71c5e8;  --brand-orange: #ff8c42;          */

  /* ── NEW: ink ramp (dark surfaces) ─────────────────────── */
  --ink:        #04203f;   /* already used in the footer — now a token */
  --ink-deep:   #021629;   /* deepest ground */

  /* ── NEW: mist ramp (text on ink) ──────────────────────── */
  --mist-200:   #c9d8ee;   /* body copy on ink — 11.33:1 */
  --mist-400:   #8fa9cd;   /* muted meta on ink — 6.80:1  */

  /* ── NEW: accessible "ink" variants of brand accents ───── *
   * Use these whenever the brand accent must carry SMALL TEXT
   * on a light surface. The brand colors themselves are
   * unchanged — this only governs where text may use them.   */
  --brand-orange-ink: #a8490a;  /* 5.80:1 on white */
  --brand-sky-ink:    #0b6a8f;  /* 6.05:1 on white */

  /* ── NEW: accent tints ─────────────────────────────────── */
  --brand-orange-50:  #fff3e9;
  --brand-sky-50:     #eaf6fb;

  /* ── NEW: semantic status (replaces the ad-hoc
   *        green-600 / yellow-600 / red-600 trio) ─────────── */
  --ok:         #15803d;   /* 5.02:1 on white · 4.52:1 on --ok-50    */
  --ok-50:      #eaf6ee;
  --warn:       #8a5a00;   /* 5.93:1 on white · 5.50:1 on --warn-50  */
  --warn-50:    #fdf6e6;
  --danger:     #c0292e;   /* 5.84:1 on white · 5.11:1 on --danger-50 */
  --danger-50:  #fdeced;

  /* ── Fluid type ────────────────────────────────────────── */
  --fs-display-xl: clamp(2.75rem, 1.3rem + 6.4vw, 6.5rem);   /* 44 → 104 */
  --fs-display-l:  clamp(2rem,   1.1rem + 4.2vw, 4.5rem);    /* 32 →  72 */
  --fs-display-m:  clamp(1.625rem, 1.1rem + 2.4vw, 3rem);    /* 26 →  48 */
  --fs-display-s:  clamp(1.25rem, 1.05rem + 0.9vw, 1.75rem); /* 20 →  28 */
  --fs-title:      clamp(1.0625rem, 1rem + 0.4vw, 1.25rem);  /* 17 →  20 */
  --fs-coord:      0.625rem;                                  /* 10       */

  /* ── Spacing rhythm ────────────────────────────────────── */
  --space-section:    clamp(5rem, 8vw, 9rem);    /*  80 → 144 */
  --space-section-lg: clamp(6.5rem, 11vw, 12rem);/* 104 → 192 */
  --space-block:      clamp(2.5rem, 4vw, 4rem);  /*  40 →  64 */
  --gutter:           clamp(1rem, 1.6vw, 1.5rem);/*  16 →  24 */

  /* ── Easing & duration ─────────────────────────────────── */
  --ease-out-expo: cubic-bezier(0.22, 1, 0.36, 1);  /* matches your Reveal */
  --dur-fast: 180ms;  --dur-base: 320ms;
  --dur-slow: 700ms;  --dur-hero: 800ms;

  /* ── Elevation (replaces the hand-written rgba strings) ── */
  --e1: 0 1px 2px rgba(10,26,47,.04);
  --e2: 0 1px 2px rgba(10,26,47,.04), 0 16px 40px -28px rgba(10,26,47,.14);
  --e3: 0 2px 6px rgba(10,26,47,.05), 0 24px 50px -30px rgba(0,61,130,.24);
  --e4: 0 6px 14px rgba(10,26,47,.06), 0 34px 66px -32px rgba(0,61,130,.34);
  --e-ink: 0 24px 60px -28px rgba(0,0,0,.55);
  --e-glow-brand:  0 10px 34px -12px rgba(0,61,130,.45);
  --e-glow-orange: 0 10px 34px -12px rgba(255,140,66,.55);
}
```

#### 3.1.2 Extend `@theme inline`

```css
/* src/app/globals.css — ADD inside the existing @theme inline block */
@theme inline {
  /* … your existing mappings stay exactly as they are … */

  --color-ink:        var(--ink);
  --color-ink-deep:   var(--ink-deep);
  --color-mist-200:   var(--mist-200);
  --color-mist-400:   var(--mist-400);

  --color-brand-orange-ink: var(--brand-orange-ink);
  --color-brand-orange-50:  var(--brand-orange-50);
  --color-brand-sky-ink:    var(--brand-sky-ink);
  --color-brand-sky-50:     var(--brand-sky-50);

  --color-ok:        var(--ok);
  --color-ok-50:     var(--ok-50);
  --color-warn:      var(--warn);
  --color-warn-50:   var(--warn-50);
  --color-danger:    var(--danger);
  --color-danger-50: var(--danger-50);

  --shadow-e1: var(--e1);
  --shadow-e2: var(--e2);
  --shadow-e3: var(--e3);
  --shadow-e4: var(--e4);
  --shadow-ink: var(--e-ink);
}
```

This gives you `bg-ink`, `text-mist-200`, `text-brand-orange-ink`, `bg-ok-50`, `shadow-e3` and so on, with zero config file.

#### 3.1.3 Semantic usage rules

| Meaning | Token | Notes |
|---|---|---|
| Primary structure, headings, primary CTA | `primary` / `brand` #003d82 | 10.55:1 on white — AAA |
| Pressed / hover state of primary | `brand-deep` #002a5c | already used by `Button` |
| Dark stage (chapters 03 & 06, footer, popup scrim) | `ink` #04203f | white on it = 16.36:1 |
| Body copy on ink | `mist-200` #c9d8ee | 11.33:1 — AAA |
| Muted meta on ink | `mist-400` #8fa9cd | 6.80:1 — AA. **On `brand` blue use `mist-200`, not `mist-400`** (4.38:1, large text only) |
| **Accent** — coordinate ticks, active marker, index rules, `accent` CTA | `brand-orange` #ff8c42 | **decorative or large only on white** (2.31:1). Safe for text on ink (7.08:1) and on brand (4.56:1) |
| Orange as small text on light | `brand-orange-ink` #a8490a | 5.80:1 — AA |
| **Atmosphere** — map water, geolocation pulse, hero tint | `brand-sky` #71c5e8 | **never text on white** (1.93:1). Text-safe on ink (8.46:1) |
| Sky as small text on light | `brand-sky-ink` #0b6a8f | 6.05:1 — AA |
| Availability high / medium / low | `ok` / `warn` / `danger` | all ≥ 4.5:1 on white and on their own 50-tint |
| Body copy on light | `muted-foreground` #55647a | 6.02:1 — AA |
| Headings on light | `foreground` #0a1a2f | 17.48:1 — AAA |

---

### 3.2 Typography

One family — **Plus Jakarta Sans**, already loaded in `layout.tsx` as `--font-jkt`. Do not add a second.

You load weights `400 500 600 700 800`. Keep all five; the system uses 800 for display, 700 for titles, 600 for labels, 500 for meta, 400 for body.

| Role | Size | Weight | Line-height | Tracking | Where |
|---|---|---|---|---|---|
| `display-xl` | `--fs-display-xl` | 800 | 0.94 | -0.035em | Hero H1, chapter 06 H2 |
| `display-l` | `--fs-display-l` | 800 | 1.02 | -0.03em | `SectionHeader` title |
| `display-m` | `--fs-display-m` | 800 | 1.1 | -0.025em | Stat figures, popup H2 |
| `display-s` | `--fs-display-s` | 700 | 1.2 | -0.02em | Card headings (`benefits`, `steps`) |
| `title` | `--fs-title` | 700 | 1.35 | -0.01em | Perumahan card name |
| `body-l` | 1.125rem | 400 | 1.65 | 0 | Section lede |
| `body` | 1rem | 400 | 1.7 | 0 | Default |
| `body-s` | 0.875rem | 500 | 1.6 | 0 | Meta, nav links |
| `label` | 0.75rem | 600 | 1 | 0.14em | Uppercase eyebrows |
| **`coord`** | **`--fs-coord`** | **600** | **1** | **0.24em** | **Coordinate micro-label — uppercase, `tabular-nums`** |

```css
/* globals.css */
.font-display { font-family: var(--font-display); letter-spacing: -0.02em; }  /* exists */

.text-coord {
  font-size: var(--fs-coord);
  font-weight: 600;
  letter-spacing: 0.24em;
  line-height: 1;
  text-transform: uppercase;
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
}
.numeric { font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1; }

h1, h2, h3, .font-display { text-wrap: balance; }
p { text-wrap: pretty; }
```

**Indonesian typesetting note:** Indonesian words are long (`Perumahan`, `Bersubsidi`, `Pematangsiantar`). At `display-xl` this causes ugly breaks. Always pair `text-wrap: balance` with an explicit `max-w-[16ch]`–`[20ch]` on display headings, and test the H1 at 375px, 768px and 1440px.

---

### 3.3 Spacing rhythm

Replace the flat `py-20 sm:py-28` with a hierarchy that says which chapter matters.

| Section | Was | Becomes |
|---|---|---|
| Hero | `pt-12 pb-16 sm:pt-16 md:pt-24 md:pb-24` | `pt-[--space-block] pb-[--space-section-lg]` — the hero must be the **tallest** block, not the shortest |
| Chapters 01, 02, 03, 05 | `py-20 sm:py-28` / `pb-20 sm:pb-28` | `py-[--space-section]` |
| Chapter 06 (CTA) | `pb-20 sm:pb-28` | `py-[--space-section-lg]` |
| Header → content gap | `mt-12` | `mt-[--space-block]` |
| Grid gap | `gap-5 sm:gap-6` | `gap-[--gutter]` |

Keep everything on a 4px grid.

---

### 3.4 Grid & layout

- Container stays `max-w-7xl` (1280px) with `px-4 sm:px-6 lg:px-8`. It works — do not widen it.
- **New: full-bleed escape hatch** for the Atlas Strip and the chapter-03 gallery:

```css
.bleed { width: 100vw; margin-inline: calc(50% - 50vw); }
```

- **Asymmetry:** `SectionHeader` currently supports `align="start" | "between"`. Add a third, `align="split"` — title in a 7-column block, lede in a 4-column block starting at column 9. Use it on chapters 01, 03 and 05 so headers stop looking identical.
- Hero grid `lg:grid-cols-[1.05fr_0.95fr]` is good. Keep it.

**Breakpoints** (Tailwind defaults):

| Range | Behavior |
|---|---|
| `< 640` | 1 column. Kavling rail hidden. `display-xl` caps at 44px. Atlas Strip halves its speed. Sticky bottom CTA appears. |
| `640–1023` | 2-column card grids. Rail hidden. Hero stacks, image above stats. |
| `1024+` | Full spec. Rail at `left-6`. Hero splits. Chapter 03 gallery goes 3-up. |

---

### 3.5 Elevation

Replace every hand-written `shadow-[0_1px_2px_rgba(10,26,47,0.04)…]` string with the scale.

| Level | Token | Where |
|---|---|---|
| 1 | `shadow-e1` | flat chips, badges |
| 2 | `shadow-e2` | resting `Card` (matches your current value) |
| 3 | `shadow-e3` | hovered card, sticky nav after scroll, sidebar item active |
| 4 | `shadow-e4` | hovered perumahan card, popup |
| ink | `shadow-ink` | cards sitting on `bg-ink` |

Files to update: `ui/card.tsx`, `perumahan-collection.tsx`, `app/map/page.tsx`, `app/admin/page.tsx`, `app/admin/login/page.tsx`.

**Borders:** 1px hairlines only. `border-border` (#e6ecf4) on light, `border-white/10` on ink. Hover shifts to `border-primary/25` on light (you already do this) and `border-brand-orange/40` on ink.

---

### 3.6 Surface rhythm — the new page shape

| # | Section | Today | **Becomes** |
|---|---|---|---|
| — | Nav | `bg-white`, border on scroll | keep, + `backdrop-blur-md`, + logo swap over ink |
| — | Hero | white | white + a single `brand-sky/10` blur tint (keep) |
| — | **Atlas Strip** `[BARU]` | — | `bg-secondary` full-bleed marquee |
| 01 | Keuntungan | white | white |
| 02 | Cara Kerja | white | `bg-secondary` (#f3f6fb) |
| 03 | Koleksi Perumahan | white | **`bg-ink` #04203f, full-bleed** |
| — | Statistik band | `bg-primary` rounded card | **merged into chapter 03's ink section** as a hairline stat row — removes a redundant colored box |
| 04 | Simulasi Angsuran `[BARU, opsional]` | — | white |
| 05 | Pertanyaan Umum `[BARU, opsional]` | — | `bg-secondary` |
| 06 | Mulai Hari Ini (CTA) | `bg-secondary/50` rounded card | **`bg-ink`, full-bleed** |
| — | Footer | `bg-[#04203f]` | `bg-ink-deep` #021629 — one step darker so the CTA and footer separate |

Result: `white · tint · white · tint · INK · white · tint · INK · INK`. The page finally has a shape, and both ink blocks are exactly where your best imagery and your conversion moment live.

---

## 4. Motion

You already have the layer. This section mostly **wires up what is idle** and adds two primitives.

### 4.1 Keep as-is

`Reveal` / `RevealGroup` / `RevealItem` (`duration 0.7`, `ease [0.22,1,0.36,1]`, `viewport margin -12%`) — this is a good default. Do not change the timing; instead adopt `--ease-out-expo` as the CSS mirror of the same curve so CSS and Framer agree.

`SmoothScroll` (Lenis, `duration 1.1`) and its anchor interception — keep. Note it already bails out on `prefers-reduced-motion`.

`Magnetic` — keep. It already no-ops for reduced motion.

### 4.2 Wire up `WordsReveal`

It is written and unused. Put it on:

- the hero `<h1>` — `KPR Bersubsidi BRI`, `stagger={0.07}`
- every `SectionHeader` title
- the chapter 06 H2

```tsx
// components/section-header.tsx
<h2 className="font-display mt-4 text-[length:var(--fs-display-l)] font-extrabold
               leading-[1.02] tracking-[-.03em] text-foreground max-w-[18ch]">
  <WordsReveal text={title} stagger={0.055} />
</h2>
```

`WordsReveal` currently uses `animate="show"` (fires on mount). For section titles it must fire **on scroll into view** — change `animate` to `whileInView` with `viewport={{ once: true, margin: "-12% 0px" }}`, matching `Reveal`. Add a `trigger?: "mount" | "view"` prop, default `"view"`, and pass `"mount"` for the hero.

### 4.3 New primitive — `lift` (hover)

Standardise the three different hover treatments currently in the repo (`hover:-translate-y-1.5`, `hover:-translate-y-1`, `hover:-translate-y-0.5`).

```css
.lift { transition: transform var(--dur-base) var(--ease-out-expo),
                    box-shadow var(--dur-base) var(--ease-out-expo),
                    border-color var(--dur-base) var(--ease-out-expo); }
.lift:hover { transform: translate3d(0,-4px,0); }
.lift .lift-img { transition: transform var(--dur-slow) var(--ease-out-expo); }
.lift:hover .lift-img { transform: scale(1.05); }
```

One value — `-4px` — everywhere. Your `perumahan-collection.tsx` already scales the image to `1.05` over `700ms`; that becomes the shared default.

### 4.4 New primitive — `pulse-marker`

The signature motion of an atlas: a location pinging.

```css
@keyframes ping-ring {
  0%   { transform: scale(.6); opacity: .55; }
  70%  { transform: scale(2.2); opacity: 0; }
  100% { transform: scale(2.2); opacity: 0; }
}
.marker-ping::before {
  content: ''; position: absolute; inset: 0; border-radius: 9999px;
  background: var(--brand-sky); animation: ping-ring 2.4s var(--ease-out-expo) infinite;
}
```

Used on: the Atlas Strip dots, the "lokasi saya" marker on `/map`, and the active sidebar item. **Cap it at 3 simultaneous instances** — a page of pinging dots reads as noise, not precision.

### 4.5 Marquee

`globals.css` already has `@keyframes marquee` and `.animate-marquee` (34s). Reuse it verbatim for the Atlas Strip. Add:

```css
.animate-marquee { animation-play-state: running; }
.marquee-host:hover .animate-marquee { animation-play-state: paused; }
```

Also pause when `document.visibilityState !== "visible"`.

### 4.6 Reduced motion

Your existing `@media (prefers-reduced-motion: reduce)` block is good. **Add** to it:

```css
@media (prefers-reduced-motion: reduce) {
  .marker-ping::before { animation: none !important; }
  .lift:hover { transform: none !important; }
  .lift:hover .lift-img { transform: none !important; }
}
```

Framer's `useReducedMotion` should also gate `WordsReveal` (render the plain string) and the marker ping.

---

## 5. Components

### 5.1 `SectionHeader` — `src/components/section-header.tsx`

The keystone. Three changes.

```tsx
// 1. index + eyebrow become a hairline-ruled kavling label
<div className="flex items-center gap-3">
  <span aria-hidden className="h-px w-8 bg-brand-orange" />
  <span className="text-coord text-brand-orange-ink">
    {index} · {eyebrow}
  </span>
</div>

// 2. title uses WordsReveal + the fluid scale + a character cap
<h2 className="font-display mt-5 text-[length:var(--fs-display-l)] font-extrabold
               leading-[1.02] tracking-[-.03em] text-foreground max-w-[18ch]">
  <WordsReveal text={title} stagger={0.055} />
</h2>

// 3. new align="split" variant
align === "split"
  ? "grid grid-cols-12 gap-[--gutter] items-end"
  : align === "between"
  ? "flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
  : "max-w-2xl"
```

**Accessibility fix:** the eyebrow moves from `text-primary` + a `text-brand-orange` separator (2.31:1) to `text-brand-orange-ink` (5.80:1). On `bg-ink` sections it becomes the true `text-brand-orange` (7.08:1). Same identity, both pass AA.

Add an `onDark?: boolean` prop that flips `text-foreground → text-white` and `text-muted-foreground → text-mist-200`.

### 5.2 `Coord` — new, `src/components/coord.tsx`

The signature element. ~20 lines, used everywhere.

```tsx
export function Coord({ lat, lng, className }: { lat: number; lng: number; className?: string }) {
  const ns = lat >= 0 ? "LU" : "LS"          // Lintang Utara / Selatan
  const ew = lng >= 0 ? "BT" : "BB"          // Bujur Timur / Barat
  return (
    <span className={cn("text-coord text-muted-foreground", className)}>
      {Math.abs(lat).toFixed(4)}° {ns} · {Math.abs(lng).toFixed(4)}° {ew}
    </span>
  )
}
```

Reads `housing.lat` / `housing.lng` straight from your existing data. Place it in:

- `PerumahanCollection` card — under the name, above the address
- `HousingPopup` header — under the H2
- `/map` sidebar item — replacing the truncated address line on `sm+`
- the Atlas Strip
- the hero micro-label (the geographic centroid of your 16 entries)

### 5.3 `KavlingRail` — new, `src/components/kavling-rail.tsx`

Fixed left rail, `lg+` only, `aria-hidden`.

- `fixed left-6 top-1/2 -translate-y-1/2 z-40`
- 1px `bg-border` track, 240px tall, with a `bg-brand-orange` `scaleY` fill driven by `useScroll().scrollYProgress` from `motion/react` — you already import `useScroll` in `app/page.tsx`.
- Chapter numerals `01`–`06` at `text-coord`, `text-muted-foreground` at rest.
- Active: `text-brand-orange-ink`, `scale-125`, `translate-x-0.5`; the eyebrow label fades in to its right.
- Over `bg-ink` sections it inverts (track `bg-white/15`, numerals `text-mist-400`, active `text-brand-orange`). Detect with an `IntersectionObserver` on `[data-surface="ink"]`.
- Clicking a numeral calls `lenis.scrollTo` — expose the Lenis instance from `SmoothScroll` via a small context so the rail and the anchor handler share it.

`next/dynamic` with `ssr: false`. It must not ship to mobile.

### 5.4 `Button` — `src/components/ui/button.tsx`

Mostly right. Four adjustments.

| Change | Detail |
|---|---|
| `#3a1c00` → token | Add `--brand-orange-fg: #3a1c00` to `:root` and map it. The ratio (6.75:1) is correct — only the hardcoding is wrong. |
| New `ink` variant | `bg-white text-primary hover:bg-mist-200` — for primary CTAs on `bg-ink` sections |
| New `ink-outline` variant | `border border-white/25 text-white hover:bg-white/10` |
| Touch target | `size="sm"` is `h-10` (40px). Bump to `h-11` (44px) or restrict `sm` to desktop-only contexts. `default` and `lg` are already ≥44px. |

Keep `active:scale-[0.97]`, keep `rounded-full`, keep the focus ring.

### 5.5 `Card` — `src/components/ui/card.tsx`

- Swap the inline shadow string for `shadow-e2`.
- Add an `onDark?: boolean` prop → `bg-white/[.04] border-white/10 shadow-ink`.
- Add `.lift` as an opt-in class rather than each consumer inventing its own `hover:-translate-y-*`.

### 5.6 `PerumahanCollection` — `src/components/perumahan-collection.tsx`

This becomes the strongest card in the product, and it moves onto ink.

```tsx
<Link href="/map" className="lift group block h-full overflow-hidden rounded-3xl
        border border-white/10 bg-white/[.04] shadow-ink
        hover:border-brand-orange/40 hover:bg-white/[.07]">

  <div className="relative aspect-[4/3] overflow-hidden bg-ink-deep">
    <Image … className="lift-img object-cover" />
    {/* availability chip — was bg-white/95 text-primary */}
    <span className="absolute left-3 top-3 rounded-full bg-ink/80 px-3 py-1
                     text-coord text-mist-200 backdrop-blur-sm">
      {h.availableUnits} UNIT TERSEDIA
    </span>
    {/* NEW: orange corner tick on hover */}
    <span aria-hidden className="absolute right-3 top-3 h-6 w-6 rounded-tr-md opacity-0
                 border-r-2 border-t-2 border-brand-orange
                 transition-opacity duration-300 group-hover:opacity-100" />
  </div>

  <div className="p-5">
    <h3 className="font-display text-[length:var(--fs-title)] font-bold
                   leading-snug text-white line-clamp-1">{h.name}</h3>
    <Coord lat={h.lat} lng={h.lng} className="mt-2 block text-mist-400" />
    <p className="mt-2 flex items-start gap-1.5 text-sm text-mist-400">
      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-sky" />
      <span className="line-clamp-1">{shortLocation(h.description)}</span>
    </p>

    <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
      <div>
        <p className="text-coord text-mist-400">MULAI DARI</p>
        <p className="font-display numeric mt-1 text-base font-bold text-white">{h.priceRange}</p>
      </div>
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full
                       bg-white/10 text-white transition-colors
                       group-hover:bg-brand-orange group-hover:text-[--brand-orange-fg]">
        <ArrowUpRight className="h-4 w-4" />
      </span>
    </div>
  </div>
</Link>
```

Keep `shortLocation()` exactly as written — it is a neat piece of logic.

**One data caveat:** all 16 entries currently share `priceRange: "Rp 166.000.000"`. Either that is genuinely the uniform subsidy ceiling — in which case say so once in the chapter lede rather than repeating it on 16 cards — or the data needs filling in. Flag it; do not design around a placeholder.

### 5.7 `AtlasStrip` — new, `src/components/atlas-strip.tsx`

The Move-4 element. Full-bleed, sits directly under the hero.

```tsx
const items = getInitialHousingData()   // your existing function

<section aria-hidden className="bleed marquee-host overflow-hidden
                                border-y border-border bg-secondary py-4">
  <div className="animate-marquee flex w-max items-center gap-10">
    {[...items, ...items].map((h, i) => (
      <span key={i} className="flex items-center gap-3 whitespace-nowrap">
        <span className="marker-ping relative h-1.5 w-1.5 rounded-full bg-brand-sky" />
        <span className="text-coord text-foreground">{h.name}</span>
        <Coord lat={h.lat} lng={h.lng} className="text-muted-foreground" />
      </span>
    ))}
  </div>
</section>
```

- The track is duplicated once; `@keyframes marquee` already translates `-50%`. Correct by construction.
- `aria-hidden` on the whole strip — the same 16 names are already reachable in chapter 03 and on `/map`, so this is pure decoration to a screen reader.
- Cap `marker-ping` to the first 3 visible dots (§4.4) by rendering the ping class only when `i % 6 === 0`.

### 5.8 `StatRow` — replaces the standalone `bg-primary` band

Today the stat band is a `rounded-[2.5rem] bg-primary` box sitting alone between two white sections. Once chapter 03 is ink, that box becomes a third competing blue surface.

Fold it into the bottom of chapter 03 as a hairline row:

```tsx
<div className="mt-[--space-block] grid grid-cols-1 gap-8 border-t border-white/10
                pt-10 text-center sm:grid-cols-3 sm:divide-x sm:divide-white/10">
  {stats.map(s => (
    <Reveal key={s.label}>
      <p className="font-display numeric text-[length:var(--fs-display-m)] font-extrabold text-white">
        <AnimatedCounter end={s.end} suffix={s.suffix} />
      </p>
      <p className="text-coord mt-3 text-mist-400">{s.label}</p>
    </Reveal>
  ))}
</div>
```

`AnimatedCounter` needs one fix for accessibility (§9.2): render the final value in the DOM and animate a visual layer, so assistive tech never reads a ticking number.

### 5.9 `HousingPopup` — `src/components/housing-popup.tsx`

The biggest system break in the repo. It contains `blue-50/100/600/700/900`, `slate-50`, `green-600`, `yellow-600`, `red-600`, `amber-*`, `purple-*`, `emerald-*`.

| Was | Becomes |
|---|---|
| `bg-[#04203f]/50 backdrop-blur-sm` scrim | `bg-ink/60 backdrop-blur-sm` |
| `statusColor` = `text-green-600` / `text-yellow-600` / `text-red-600` | `text-ok` / `text-warn` / `text-danger` — **fixes two AA failures** |
| `bg-blue-50` + `text-blue-700` availability chip | `bg-accent` + `text-primary` |
| `bg-slate-50` spec tiles | `bg-secondary` + `border border-border` |
| `border-blue-100 bg-blue-50/60` "Subsidi" row | `border-border bg-accent` |
| `text-blue-900` figures | `text-primary` + `numeric` |
| the commercial/other rows using `amber-*` / `purple-*` / `green-*` | `--warn-50/--warn`, `--ok-50/--ok`, `bg-secondary/text-foreground` — **at most three semantic colors in the whole popup** |
| H2 | add `<Coord lat lng />` directly beneath |
| Close button | `h-11 w-11` touch target; add `aria-label="Tutup"` |
| — | **Add a focus trap + `Esc` to close + focus return.** The modal currently has neither. |

The spring entrance (`stiffness 260, damping 26`) is good — keep it.

### 5.10 `ImageSlideshow` — `src/components/image-slideshow.tsx`

- **Fix the broken fallback.** `"/placeholder.svg"` does not exist. Create `public/placeholder.svg` — a 4:3 SVG in `--secondary` with a centered `--muted-foreground` house glyph and the text `Foto belum tersedia`. Inline, ~600 bytes.
- Replace the raw `<motion.img>` with `next/image` (`fill`, `sizes="(max-width:640px) 100vw, 640px"`) so the 200–390 KB JPEGs are not shipped at full size into a 288px-tall frame.
- Add keyboard support: `←` / `→` when the slideshow has focus, and `aria-live="polite"` on a visually hidden `Foto {i} dari {n}`.
- Add dot indicators (`h-1.5`, active `w-6 bg-brand-orange`) — there is currently no position feedback.
- The `from-black/45` gradient stays.

### 5.11 `HousingMap` — `src/components/housing-map.tsx`

Design and reliability both.

| Issue | Fix |
|---|---|
| Leaflet CSS+JS injected from `cdnjs` at runtime | `npm i leaflet @types/leaflet`, import normally, `next/dynamic` with `ssr: false`. Removes two render-blocking third-party requests and a flash of unstyled map. |
| Marker icons from `raw.githubusercontent.com` | **Replace with brand markers.** Two inline SVG `divIcon`s: default = `--brand` pin with a white centre; active = `--brand-orange` pin, larger, with the `marker-ping` ring. Zero external requests, and the map finally looks like part of the product. |
| Marker shadow from `cdnjs` | Drop it; use a CSS `drop-shadow`. |
| OSM raster tiles | Keep (free, no key). Add `className="[&_.leaflet-tile]:saturate-[.55] [&_.leaflet-tile]:contrast-[1.05]"` so the basemap desaturates and your brand markers read as the only saturated thing on screen. This single line is the highest-impact visual change on `/map`. |
| No attribution styling | Style `.leaflet-control-attribution` to `bg-white/80 text-[10px] text-muted-foreground` — required by OSM, currently unstyled. |
| "Lokasi saya" marker | `--brand-sky` dot + `marker-ping`, visually distinct from perumahan pins. |

### 5.12 `NearestHousingPanel` — `src/components/nearest-housing-panel.tsx`

- Distances get `numeric` and Indonesian formatting: `1,2 km` / `850 m` (`toLocaleString("id-ID")`).
- Each result row gains a `<Coord />`.
- Error states use `--danger` / `--danger-50`, not ad-hoc reds.
- The `Loader` icon needs `animate-spin` + `aria-live="polite"` announcing `Mencari lokasi Anda…`.
- Geolocation is a permission prompt: the trigger button must state *why* before firing. See `[BARU]` copy in §7.

### 5.13 `Navbar` — inside `app/page.tsx`

Currently good; four refinements.

- Add `backdrop-blur-md` alongside `bg-white/95` when `scrolled`.
- Add `shadow-e3` when scrolled (currently only a border appears).
- **Add a mobile menu.** The three nav links are `hidden md:flex` with no `< md` replacement — on mobile the site has no navigation at all beyond the logo and the map button. Add a drawer: `Keuntungan · Cara Kerja · Perumahan · Lihat Peta`, focus-trapped, `Esc` to close.
- The `Lihat Peta` button is `hidden sm:block`. Below `sm` it disappears entirely — the sticky bottom CTA (§5.15) covers this.
- Underline-draw on nav link hover: `after:scale-x-0 → group-hover:after:scale-x-100`, `origin-left`, `bg-brand-orange`, 320ms.

### 5.14 `Footer` — inside `app/page.tsx`

- `bg-[#04203f]` → `bg-ink-deep`.
- Column headings → `text-coord text-brand-orange`.
- Links `text-white/70` → `text-mist-200` (12.28:1 on ink-deep vs the current ~7:1) with an orange underline draw on hover.
- Legal row `text-white/50` → `text-mist-400`.
- **Fix the dead links** (`href="#"`) — see §7.
- **Fix the year** — `© 2025` → `{new Date().getFullYear()}`.
- Prefer a real white logo asset over `brightness-0 invert` (§8.1).
- **New:** a hairline top strip carrying the 16 coordinates as a slow second marquee — reuses `AtlasStrip` at 60s with `text-mist-400`. Ties the top and bottom of the page together.

### 5.15 `StickyCta` — new, `< lg` only

Appears once the hero leaves the viewport; hides while chapter 06 is in view.

`fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 backdrop-blur px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]`, containing `16 perumahan · Pematang Siantar` on the left and a `default` Button `Lihat Peta` on the right.

### 5.16 Admin — `app/admin/page.tsx`, `app/admin/login/page.tsx`

Lower priority, but it is part of the product.

- Replace all `slate-*` / `gray-*` / `blue-*` with `secondary` / `border` / `muted-foreground` / `primary`.
- Form inputs: one shared `Input` component — `h-11 rounded-2xl border border-input bg-white px-4 focus-visible:ring-2 ring-ring ring-offset-2`.
- Error messaging uses `--danger` on `--danger-50` with an `AlertCircle`, `role="alert"`.
- Tables/lists reuse `Card` + `shadow-e2`.
- Note: `lib/admin-auth.ts` is client-side. That is a security matter, not a design one — but the login screen should not imply stronger protection than exists. Do not add copy like *"Terenkripsi end-to-end"*.

---

## 6. Pages

### 6.1 `/` — landing

Order after the redesign:

```
Nav
Hero                          pt-[--space-block] pb-[--space-section-lg]   white
AtlasStrip            [BARU]  py-4  full-bleed                            secondary
01 · Keuntungan               py-[--space-section]                        white
02 · Cara Kerja               py-[--space-section]                        secondary
03 · Koleksi Perumahan        py-[--space-section]  full-bleed            INK
   └ StatRow (merged in)
04 · Simulasi Angsuran [BARU, opsional]  py-[--space-section]             white
05 · Pertanyaan Umum   [BARU, opsional]  py-[--space-section]             secondary
06 · Mulai Hari Ini           py-[--space-section-lg]  full-bleed         INK
Footer                                                                    INK-DEEP
KavlingRail (fixed, lg+)   ·   StickyCta (fixed, <lg)
```

#### Hero

| Was | Becomes |
|---|---|
| `text-[2.9rem] … md:text-7xl` | `text-[length:var(--fs-display-xl)]` (up to 104px), `leading-[.94]`, `tracking-[-.035em]`, `max-w-[14ch]` |
| Plain `Reveal` on H1 | `WordsReveal` with `trigger="mount"`, `stagger={0.07}` |
| Badge `MILIKI RUMAH IMPIAN` | keep verbatim; restyle to `text-coord`, dot stays `bg-brand-orange` |
| Stat trio `25+ / 500+ / 1000+` hand-written | reuse `AnimatedCounter` — the component exists and the hero is the better place for it |
| — | **New:** a `<Coord>` micro-label above the badge showing the centroid of your 16 entries, `2.98° LU · 99.07° BT · PEMATANG SIANTAR` |
| `rumah.png` in a `rounded-[2.5rem]` panel | **keep exactly** — same asset, same frame, same `animate-float` "Tersertifikasi" chip. Only the image is re-encoded (§8.3). |
| — | **New:** a second floating chip on the opposite corner — `16 titik lokasi` with a `marker-ping` dot — previewing the map without adding an asset |
| `bg-brand-sky/10 blur-[130px]` tint | keep — it is the one ambient effect that fits |

The `Tersertifikasi / Dijamin oleh LPS` chip is a factual claim about deposit insurance. Keep the wording exactly as written; do not embellish it.

#### 01 · Keuntungan

`SectionHeader` with `align="split"`. Three `benefits` cards get `.lift`, `shadow-e2 → hover:shadow-e4`, and the icon tile keeps `bg-primary text-white`. Add a `text-coord` index (`K-01`…`K-03`) above each title — ties the cards to the atlas system for free.

#### 02 · Cara Kerja

Surface → `bg-secondary`. `SectionHeader` gains the missing `description` (§7). The `01/02/03` numerals move from a `bg-secondary` tile to a large ghost numeral (`text-[7rem] font-extrabold text-primary/[.06]`) clipped at the card's bottom-right — the same move as the kavling rail, at card scale.

#### 03 · Koleksi Perumahan — **ink, full-bleed**

`data-surface="ink"`. `SectionHeader onDark align="split"`, CTA `Lihat semua di peta` becomes the `ink-outline` Button variant. Grid stays `sm:grid-cols-2 lg:grid-cols-3` with `PerumahanCollection limit={6}`. `StatRow` folds in beneath (§5.8).

**Why ink:** your 15 housing photographs are the product. On white they compete with the page; on `#04203f` they read as illuminated plates.

#### 06 · Mulai Hari Ini — **ink, full-bleed**

- Was a `bg-secondary/50` rounded card; becomes a full-bleed ink block at `--space-section-lg`.
- H2 at `display-xl`, white, `WordsReveal`.
- Primary CTA `Lihat Perumahan Tersedia` → Button `variant="ink"` wrapped in `Magnetic` (already is).
- **New secondary CTA:** `Hubungi Kami` → `tel:081371901927`, `ink-outline`. The phone number is already in your footer; making it tappable is a conversion fix, not a design flourish.
- Below the buttons, a `text-coord text-mist-400` trust row: `16 PERUMAHAN · 500+ UNIT · PEMATANG SIANTAR`.

### 6.2 `/map`

The product's core screen. It deserves more than it currently gets.

| Change | Detail |
|---|---|
| **Add an `<h1>`** | Visually hidden: `Peta perumahan bersubsidi di Pematang Siantar`. The page currently has no `h1`. |
| Basemap | desaturate (§5.11) so brand markers dominate |
| Markers | brand SVG `divIcon`s, active marker pings |
| Sidebar header | add `text-coord` line: `16 LOKASI · PEMATANG SIANTAR` |
| Sidebar item | add `<Coord />`; availability chip `bg-emerald-100 text-emerald-800` → `bg-ok-50 text-ok`; unit chip stays `bg-primary/10 text-primary` |
| Active item | `border-primary/50 ring-2 ring-primary/20` → `border-brand-orange/50 ring-2 ring-brand-orange/25` so "selected" is orange everywhere (map pin, sidebar, popup) |
| **Loading state** | The map renders only `isLoaded`. Add a skeleton: `bg-secondary` + a centered spinner + `Memuat peta…` |
| **Empty state** | If `housingList.length === 0`, show a `Card` with the placeholder glyph and `Belum ada data perumahan.` |
| **Mobile sidebar** | The toggle imports `Menu`/`X` but no trigger button is rendered — the sidebar can only be opened by selecting a marker. Add a persistent FAB: `Daftar (16)`. |
| Search | `[BARU, opsional]` a filter input above the list — `Cari nama perumahan atau kecamatan…`, client-side `includes()` over `name` + `description` |

### 6.3 `/admin`, `/admin/login`

Per §5.16. Same tokens, same `Card`, same `Button`, same focus rings. No new visual language.

---

## 7. Copywriting — keep, then expand

**Every existing string is kept verbatim.** New copy is marked `[BARU]` and written in your voice: formal-warm Indonesian, second person `Anda`, short sentences, concrete benefits, no hype.

### 7.1 Existing copy — unchanged

Hero (`MILIKI RUMAH IMPIAN` · `KPR Bersubsidi BRI` · `Rumah nyaman, cicilan ringan, untuk masa depan keluarga.` · the paragraph · both button labels · the three stats), all three `benefits`, all three `steps`, every `SectionHeader` title and description, the CTA block, the footer, all 16 perumahan names and descriptions, every label in the popup and the admin.

### 7.2 New copy `[BARU]`

**Chapter 02 — the missing description**
> Tiga langkah sederhana, dari pengajuan sampai serah terima kunci.

**Hero — coordinate micro-label**
> `2.98° LU · 99.07° BT — PEMATANG SIANTAR`

**Hero — second floating chip**
> `16 titik lokasi` / `Terpetakan & terverifikasi`

**Atlas Strip — screen-reader-hidden, so no copy needed.**

**Chapter 03 — lede addition** (append to the existing description)
> Seluruh perumahan di bawah ini berada dalam program subsidi dengan harga jual yang sama, Rp 166.000.000.

*Only ship this line if the uniform price in your data is real. If it is placeholder data, fill the data instead — see §5.6.*

**Chapter 06 — secondary CTA**
> `Hubungi Kami` → `tel:081371901927`

**Chapter 06 — trust row**
> `16 PERUMAHAN · 500+ UNIT · PEMATANG SIANTAR`

**Geolocation trigger — `NearestHousingPanel`**
> **Cari perumahan terdekat**
> Kami akan meminta izin lokasi dari browser Anda. Lokasi hanya dipakai untuk menghitung jarak dan tidak kami simpan.

*Say this before firing the permission prompt. It measurably improves grant rates, and here it is also simply true.*

**Map — loading / empty**
> `Memuat peta…`
> `Belum ada data perumahan untuk ditampilkan.`

**Image fallback — `public/placeholder.svg`**
> `Foto belum tersedia`

**Footer — filling the dead links**
> `Kebijakan Privasi` → `/kebijakan-privasi`
> `Syarat & Ketentuan` → `/syarat-ketentuan`

Two short static pages. Until they exist, remove the links rather than pointing them at `#`. A financial product with a link labelled "Privacy Policy" that goes nowhere is worse than no link.

### 7.3 Chapter 04 — `Simulasi Angsuran` `[BARU, opsional]`

High conversion value for a mortgage product, but it carries obligations.

**Copy**
> `04 · SIMULASI`
> **Perkirakan angsuran bulanan Anda**
> Geser harga rumah, uang muka, dan tenor untuk melihat estimasi angsuran.

**Required disclaimer, always visible, not behind a tooltip:**
> Angka di atas hanyalah **estimasi** berdasarkan input Anda dan bukan penawaran resmi. Besaran angsuran, suku bunga, dan persetujuan akhir ditentukan oleh Bank BRI setelah proses verifikasi.

**Implementation rules:**
- The interest rate must be a real, current, BRI-published figure supplied by you — **do not hardcode a guessed rate**, and do not let a visitor's input imply approval.
- Standard annuity formula, `Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })`.
- Sliders need `<label>`, `aria-valuetext` in Rupiah, and a keyboard-operable number input beside each.
- Skip this chapter entirely if you cannot source an accurate rate. A wrong number here is a liability, not a design problem.

### 7.4 Chapter 05 — `Pertanyaan Umum` `[BARU, opsional]`

Accordion, 6 items. **Draft questions below; the answers must be checked against current BRI and Kementerian PUPR terms before publishing** — I have written them deliberately general so they are easy to verify and correct.

1. **Siapa yang bisa mengajukan KPR bersubsidi?** — Program subsidi ditujukan untuk pembelian rumah pertama dengan batas penghasilan yang ditetapkan pemerintah. Syarat lengkap dan batas terbaru dapat dikonfirmasi ke kantor BRI terdekat.
2. **Berapa uang muka yang harus disiapkan?** — Besaran uang muka mengikuti ketentuan program yang berlaku dan hasil penilaian bank atas profil Anda.
3. **Berapa lama tenor yang tersedia?** — Tenor KPR subsidi umumnya panjang agar angsuran tetap ringan; jangka waktu final ditentukan saat proses pengajuan.
4. **Dokumen apa saja yang perlu disiapkan?** — Umumnya identitas diri, dokumen penghasilan, dan dokumen pendukung lain. Daftar pastinya diberikan oleh petugas BRI saat pengajuan.
5. **Apakah rumah di peta ini sudah siap huni?** — Status ketersediaan unit ditampilkan pada setiap perumahan. Untuk kondisi terkini, hubungi kontak yang tercantum.
6. **Berapa lama proses persetujuannya?** — Waktu proses bergantung pada kelengkapan dokumen dan verifikasi bank.

Mark up as `<dl>` or a proper disclosure pattern (`button[aria-expanded]` + `region`), and add `FAQPage` JSON-LD only once the answers are verified.

---

## 8. Assets — preserve and upgrade

**Nothing is deleted. Nothing is replaced with stock.** Every action below is compression, resizing, cropping or a missing-file fix.

### 8.1 Logos — frozen artwork

| File | Now | Action |
|---|---|---|
| `public/logobri.png` | 1500×1500, 102 KB, rendered at 64×44 and 112×48 | Keep the artwork byte-identical as the master. Ship `logobri.webp` at 256×256 (~8 KB) + a 512 retina variant. Add explicit `width`/`height`. Expected saving ≈ **94 KB**. |
| `public/logokpr.png` | 667×374, 95 KB, rendered at 128×56 | Same treatment → `logokpr.webp` at 384×215 (~10 KB). |
| Footer white logo | `brightness-0 invert` on the colour PNG | Produce **`logobri-white.svg`** (or `.png`) — the official monochrome BRI mark — and use it directly. Keep the filter as the fallback if no white version is available. Do not recolour the mark by hand. |

Sampling the files confirms the logo palette is BRI blue ≈ `#0C4890`/`#0054A8` and BRI orange ≈ `#E46C24`/`#F09018`. Your CSS tokens (`--brand #003d82`, `--brand-orange #ff8c42`) are deliberately deeper and warmer than the printed mark. **That is your decision and this document keeps it.** Noted only so it is a choice rather than a drift.

### 8.2 `public/kpr-assets/` — 15 photographs, 88–390 KB each

| Action | Detail |
|---|---|
| **Normalise aspect** | Cards render `aspect-[4/3]`; the slideshow renders `h-40 sm:h-56 md:h-72`. Re-crop every photo to **4:3**, master **1200×900**. |
| **Normalise format** | AVIF primary + WebP fallback, quality ~72. Keep the base filenames so no `image:` string in `housing-storage.ts` changes. |
| **Normalise extension** | `puri.jpeg` is the only `.jpeg`. Rename to `.jpg` and update the one reference, or leave it — but do not leave it undecided. |
| **Serve responsively** | `sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"` — already correct in `perumahan-collection.tsx`; add the same to the slideshow. |
| **Blur placeholder** | `placeholder="blur"` with a 12px `blurDataURL`. Especially important now that cards sit on ink, where a white flash is very visible. |

Expected saving across the folder: **~65%** with no perceptible quality loss.

### 8.3 `public/rumah.png` — 1.75 MB

The hero LCP image. Keep the artwork; fix the delivery.

- Export **AVIF + WebP at 1200px wide**, keep the PNG as the transparency fallback.
- It already has `priority` and `sizes` — good.
- Expected: **1.75 MB → ~90 KB**. This is the single largest performance win available.

### 8.4 `public/rumah1.png` — 376 KB, unused

Referenced nowhere. **Keep the file** (per your constraint), but it must never be requested. Either leave it as an unused artefact or wire it into the hero as slide 2 of a two-image cross-fade — it is a usable asset, just currently orphaned.

### 8.5 Two broken references — fix these first

| Reference | Problem | Fix |
|---|---|---|
| `/luxury-residence.jpg` — `housing-storage.ts`, housing id 1, `images[2]` | 404. `public/kpr-assets/luxury.jpg` exists; the path is wrong. | Change to `/kpr-assets/luxury.jpg` |
| `/placeholder.svg` — `image-slideshow.tsx:23` and the `<motion.img>` fallback | 404. **The fallback for a missing image is itself missing.** | Create `public/placeholder.svg` (§7.2) |

### 8.6 New assets — additive only, ≈ 3 KB total

| Asset | Form | Bytes |
|---|---|---|
| `placeholder.svg` | inline SVG | ~0.6 KB |
| Brand map markers (default + active) | inline SVG `divIcon` | ~1 KB |
| Corner tick, ghost numerals, hairline rules, ping ring | pure CSS | 0 |
| `logobri-white.svg` | your official mono mark | ~2 KB |

No photograph is added. No photograph is removed.

---

## 9. Accessibility

### 9.1 Contrast — computed against **your** palette

Every ratio below was calculated with the WCAG 2.1 relative-luminance formula against the hex values in your `globals.css`.

**Already passing — no change needed:**

| Pair | Ratio | Verdict |
|---|---|---|
| `#0a1a2f` foreground on white | **17.48** | AAA ✅ |
| `#003d82` brand on white | **10.55** | AAA ✅ |
| white on `#003d82` | **10.55** | AAA ✅ |
| white on `#04203f` ink | **16.36** | AAA ✅ |
| white on `#002a5c` brand-deep | **14.13** | AAA ✅ |
| `#55647a` muted-foreground on white | **6.02** | AA ✅ |
| `#55647a` on `#f3f6fb` secondary | **5.55** | AA ✅ |
| `#003d82` on `#eef4fc` accent | **9.54** | AAA ✅ |
| `#3a1c00` on `#ff8c42` (`accent` Button) | **6.75** | AA ✅ — already correct |
| `#ff8c42` orange on `#04203f` ink | **7.08** | AAA ✅ |
| `#71c5e8` sky on `#04203f` ink | **8.46** | AAA ✅ |

**New tokens — verified before being written into §3.1.1:**

| Pair | Ratio | Verdict |
|---|---|---|
| `#c9d8ee` mist-200 on `#04203f` | **11.33** | AAA ✅ |
| `#8fa9cd` mist-400 on `#04203f` | **6.80** | AA ✅ |
| `#c9d8ee` mist-200 on `#003d82` | **7.31** | AAA ✅ |
| `#a8490a` brand-orange-ink on white | **5.80** | AA ✅ |
| `#a8490a` on `#fff3e9` orange-50 | **5.31** | AA ✅ |
| `#0b6a8f` brand-sky-ink on white | **6.05** | AA ✅ |
| `#0b6a8f` on `#eaf6fb` sky-50 | **5.49** | AA ✅ |
| `#15803d` ok on white | **5.02** | AA ✅ |
| `#15803d` on `#eaf6ee` ok-50 | **4.52** | AA ✅ |
| `#8a5a00` warn on white | **5.93** | AA ✅ |
| `#8a5a00` on `#fdf6e6` warn-50 | **5.50** | AA ✅ |
| `#c0292e` danger on white | **5.84** | AA ✅ |
| `#c0292e` on `#fdeced` danger-50 | **5.11** | AA ✅ |

**Failing today — must be fixed:**

| Pair | Ratio | Where | Fix |
|---|---|---|---|
| ⚠ `#ca8a04` yellow-600 on white | **2.94** | `housing-popup.tsx` — availability "Sedang" | → `--warn` #8a5a00 (5.93) |
| ⚠ `#16a34a` green-600 on white | **3.30** | availability "Tinggi" | → `--ok` #15803d (5.02) |
| ⚠ `#dc2626` red-600 on white | **4.83** | availability "Rendah" | passes, but → `--danger` for consistency |
| ⚠ `#e5484d` `--destructive` on white | **3.91** | error text | → `--danger` #c0292e (5.84) for text; keep `--destructive` for fills with white text |
| ⚠ `#ff8c42` brand-orange on white | **2.31** | eyebrow separator, badge dot | decorative + `aria-hidden` today, so tolerable — but **never** put text on it. Use `--brand-orange-ink` |
| ⚠ `#71c5e8` brand-sky on white | **1.93** | hero blur tint only | fine as atmosphere; **never** text. Use `--brand-sky-ink` |
| ⚠ `#8fa9cd` mist-400 on `#003d82` | **4.38** | — | large text only. On `brand` blue surfaces use `mist-200` |

### 9.2 Structure & interaction

- **`<h1>` per page.** `/` has one ✅. **`/map` has none** — add a visually hidden one. `/admin` and `/admin/login` need checking.
- Each chapter becomes `<section aria-labelledby="bab-0X">` with the `SectionHeader` title carrying that id.
- **Skip link** to `#main` as the first focusable element — currently absent.
- **Focus trap** in `HousingPopup` and the new mobile drawer: `Esc` closes, focus returns to the trigger, `aria-expanded` maintained. Neither exists today.
- **`AnimatedCounter`**: render the final value in the DOM and animate a visual layer, or wrap the ticking span in `aria-hidden` with a sibling `sr-only` final value. Screen readers must not hear `1, 2, 3, …`.
- **Marquee** (`AtlasStrip`, footer strip): `aria-hidden="true"`. The same names are reachable in chapter 03 and `/map`.
- **Decorative elements** — kavling rail, ghost numerals, corner ticks, ping rings, hero blur — all `aria-hidden="true"`.
- **Touch targets ≥ 44×44**: `Button size="sm"` (h-10), the popup close button (`p-2` ≈ 32px), slideshow arrows (`p-1.5` ≈ 28px), map zoom controls. All need bumping.
- **Icon-only controls** need `aria-label`: popup close (`Tutup`), slideshow arrows (already have English labels — translate to `Foto sebelumnya` / `Foto berikutnya`), sidebar toggle, `NearestHousingPanel` close.
- **`lang="id"`** is correctly set in `layout.tsx` ✅.
- **Geolocation**: never auto-request. `/map` currently calls `getCurrentPosition` in a `useEffect` on mount — move it behind the explicit button in `NearestHousingPanel` with the `[BARU]` explanatory copy from §7.2. An unexplained permission prompt on page load is both an a11y and a trust problem.

---

## 10. Performance

| Metric | Target |
|---|---|
| LCP | **< 2.0s** on 4G |
| CLS | **< 0.05** |
| INP | **< 200ms** |
| First-load JS (gzipped) | **< 200 KB** |
| Above-the-fold image bytes | **< 250 KB** |

**The five wins, in order of size:**

1. **`rumah.png` 1.75 MB → ~90 KB** (§8.3). Biggest single item on the page.
2. **`kpr-assets/` −65%** (§8.2) — chapter 03 loads 6 images at once.
3. **`logobri.png` 102 KB → ~8 KB** (§8.1).
4. **Leaflet from npm, not CDN** (§5.11) — removes two render-blocking third-party requests plus the GitHub-hosted marker icons.
5. **`next/dynamic ssr:false`** on `HousingMap`, `KavlingRail`, and the magnetic/parallax layer.

**Rules:**
- Animate `transform` and `opacity` only. `will-change` only while animating.
- `AtlasStrip` and the footer marquee pause on `document.visibilityState !== "visible"`.
- Cap `marker-ping` at 3 concurrent instances.
- `@vercel/analytics` is fine; if any tag manager is added later, use `next/script strategy="lazyOnload"`.
- `AnimatedCounter` creates one `IntersectionObserver` per instance and captures `containerRef.current` in its cleanup — fix the stale-ref cleanup and share a single observer across the page.
- Lenis is a real cost on low-end Android. Consider disabling it below 768px in addition to the existing reduced-motion bail-out.

---

## 11. Implementation plan

**Phase 0 — bugs (do these before any design work)**
1. Fix `/luxury-residence.jpg` → `/kpr-assets/luxury.jpg`.
2. Create `public/placeholder.svg`.
3. `© 2025` → `{new Date().getFullYear()}`.
4. Remove or route the two `href="#"` footer links.

**Phase 1 — foundations (additive, cannot regress)**
5. Extend `:root` and `@theme inline` per §3.1.
6. Add `.text-coord`, `.numeric`, `.bleed`, `.lift`, `.marker-ping`, and the extra reduced-motion rules.
7. Tokenise `#04203f` and `#3a1c00`; swap every hand-written shadow for `shadow-e*`.

**Phase 2 — primitives**
8. `Coord` component.
9. `SectionHeader` rework (kavling label, `WordsReveal`, `align="split"`, `onDark`).
10. `Button` `ink` / `ink-outline` variants + touch-target fix.
11. `Card` `onDark` + `.lift`.
12. `WordsReveal` gains `trigger` prop.

**Phase 3 — landing page**
13. Spacing rhythm across all sections.
14. Hero: fluid H1, `WordsReveal`, `AnimatedCounter`, coordinate label, second chip.
15. `AtlasStrip`.
16. Chapter 03 → ink, full-bleed; `PerumahanCollection` on-dark; `StatRow` merged in.
17. Chapter 06 → ink, full-bleed; secondary `tel:` CTA.
18. Chapter 02 → `bg-secondary` + ghost numerals + new description.
19. Nav: blur, shadow, mobile drawer, underline draw. `StickyCta`.
20. Footer: `ink-deep`, mist text, coordinate strip, white logo.

**Phase 4 — `/map` and the popup**
21. `HousingMap`: npm Leaflet, brand markers, desaturated tiles, attribution styling.
22. `HousingPopup`: full detokenisation, focus trap, `Coord`, status colors.
23. `ImageSlideshow`: `next/image`, dots, keyboard, working fallback.
24. `/map`: `h1`, loading + empty states, sidebar toggle, orange active state.
25. `NearestHousingPanel`: consent copy, Indonesian distances, `Coord`.

**Phase 5 — signature & optional chapters**
26. `KavlingRail`.
27. Chapter 04 `Simulasi Angsuran` — **only with a verified rate**.
28. Chapter 05 `Pertanyaan Umum` — **only with verified answers**.
29. `/kebijakan-privasi` and `/syarat-ketentuan` pages.

**Phase 6 — assets & audit**
30. Re-encode and re-crop everything per §8; add `sizes` and blur placeholders.
31. Admin detokenisation.
32. axe-core pass, Lighthouse pass, manual keyboard pass.

---

## 12. Acceptance checklist

**Fidelity to your project**
- [ ] `--brand`, `--brand-deep`, `--brand-sky`, `--brand-orange`, `--foreground`, `--muted-foreground`, `--border`, `--secondary`, `--accent` are byte-identical in `globals.css`; every new color is a derived ink or tint
- [ ] `logobri.png` and `logokpr.png` artwork unchanged (re-encoding is fine, alteration is not)
- [ ] All 15 `kpr-assets/` photos plus `rumah.png` and `rumah1.png` still present
- [ ] Every pre-existing Indonesian string appears verbatim; all new copy is marked `[BARU]`
- [ ] The `Housing` interface is unchanged; no new required fields
- [ ] `/`, `/map`, `/admin`, `/admin/login` all still work
- [ ] **No color, asset, logo or word from webekspor.com appears anywhere**

**Design system**
- [ ] Zero hardcoded hex or `rgba()` in `src/` — tokens only (`#04203f` and `#3a1c00` included)
- [ ] Zero off-palette Tailwind color classes (`purple-*`, `amber-*`, `emerald-*`, `green-*`, `slate-*`, `gray-*`, `yellow-*`, raw `blue-*`)
- [ ] Every section uses `--space-section` / `--space-section-lg`; no `py-20 sm:py-28` remains
- [ ] One hover value: `.lift` at `-4px`, image `1.05`
- [ ] Surface rhythm matches §3.6 (`white · tint · white · tint · INK · white · tint · INK · INK`)
- [ ] Every display heading uses the fluid scale and a `max-w-[Nch]` cap

**Motion**
- [ ] `WordsReveal` is live on the hero H1 and every `SectionHeader`
- [ ] `AnimatedCounter` is used in the hero stat row and the `StatRow`
- [ ] At most 3 concurrent `marker-ping` instances
- [ ] Marquees pause on hover and when the tab is hidden
- [ ] `prefers-reduced-motion: reduce` yields a fully static, fully readable page — Lenis off, ping off, lift off, words rendered plain

**Accessibility**
- [ ] All four §9.1 failures fixed; automated scan reports zero contrast violations
- [ ] `/map` has an `h1`; heading order valid on every route
- [ ] Skip link present; full keyboard traversal of nav, drawer, map sidebar, popup, slideshow, admin forms
- [ ] Focus trap + `Esc` + focus return in `HousingPopup` and the mobile drawer
- [ ] `AnimatedCounter` never announces intermediate values
- [ ] Geolocation is requested only after an explicit click, with the consent sentence shown first
- [ ] All touch targets ≥ 44×44; all icon-only buttons labelled in Indonesian
- [ ] axe-core: 0 serious/critical

**Performance**
- [ ] `rumah.png` served under 100 KB above the fold
- [ ] No image served at more than 2× its rendered CSS width
- [ ] Leaflet bundled from npm; no `raw.githubusercontent.com` request remains
- [ ] Lighthouse mobile: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95
- [ ] CLS < 0.05 · LCP < 2.0s · INP < 200ms

**Integrity (financial product)**
- [ ] `Simulasi Angsuran` either ships with a real BRI rate and the full disclaimer, or does not ship
- [ ] FAQ answers verified against current BRI / Kementerian PUPR terms, or the chapter does not ship
- [ ] `Kebijakan Privasi` and `Syarat & Ketentuan` resolve to real pages, or the links are removed
- [ ] No copy claims a security, guarantee or approval the product does not provide

**Craft**
- [ ] `<Coord>` appears on cards, popup, sidebar, atlas strip and hero — same format everywhere
- [ ] The kavling rail tracks scroll accurately and inverts over ink sections
- [ ] Selected state is orange in all three places at once: map pin, sidebar item, popup
- [ ] Tested at 375 / 768 / 1024 / 1440 / 1920 with no horizontal scroll and no broken Indonesian headline breaks
