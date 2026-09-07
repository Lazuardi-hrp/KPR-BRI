"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import {
  ArrowRight,
  ArrowUpRight,
  Home,
  Shield,
  Percent,
  BadgeCheck,
  Phone,
  Calculator,
} from "lucide-react"
import { Button } from "../components/ui/button"
import { Card } from "../components/ui/card"
import { AnimatedCounter } from "../components/animated-counter"
import { Reveal, RevealGroup, RevealItem } from "../components/motion/reveal"
import { WordsReveal } from "../components/motion/text-reveal"
import { Magnetic } from "../components/motion/magnetic"
import { SectionHeader } from "../components/section-header"
import { Mark } from "../components/ui/mark"
import { PerumahanCollection } from "../components/perumahan-collection"
import { AtlasStrip } from "../components/atlas-strip"
import { SiteNav } from "../components/site-nav"
import { HeroVisual } from "../components/hero-visual"
import { InfoTicker } from "../components/info-ticker"
import { SiteFooter } from "../components/site-footer"
import { centroid } from "../components/coord"
import { useTranslation } from "../lib/i18n"
import type { Housing } from "../lib/housing"
import type { KontakWhatsApp } from "../lib/whatsapp"
import type { SiteStats } from "../lib/queries/stats"

/** Decorative, fixed, lg+ only — it must never ship to mobile. */
const KavlingRail = dynamic(() => import("../components/kavling-rail"), { ssr: false })
const StickyCta = dynamic(() => import("../components/sticky-cta"), { ssr: false })

const benefitIcons = [Home, Percent, Shield]
const benefitIndices = ["K-01", "K-02", "K-03"]
const stepNumbers = ["01", "02", "03"]

export default function LandingView({
  housing,
  stats,
  waPusat,
}: {
  housing: Housing[]
  stats: SiteStats
  /**
   * Kontak WhatsApp tim KPR pusat, diteruskan apa adanya ke footer.
   *
   * Dibaca di RSC induknya (src/app/page.tsx) dan bukan di sini: berkas ini
   * "use client", dan getKontakWhatsApp() berdiri di atas `import
   * "server-only"`. null berarti belum diatur, dan footer menghilangkan
   * barisnya alih-alih menampilkan tautan tanpa tujuan.
   */
  waPusat?: KontakWhatsApp | null
}) {
  const hub = centroid(housing)
  const { t } = useTranslation()

  const benefits = t.benefits.items.map((item, i) => ({
    icon: benefitIcons[i],
    index: benefitIndices[i],
    title: item.title,
    desc: item.desc,
  }))

  const steps = t.howItWorks.items.map((item, i) => ({
    n: stepNumbers[i],
    title: item.title,
    desc: item.desc,
  }))

  // Dua angka pertama kini agregat sungguhan dari basis data, jadi sufiks "+"
  // dilepas — membubuhkan "+" pada hitungan yang bisa diverifikasi adalah
  // mengarang. Hanya "keluarga bahagia" yang mempertahankan "+", karena itu
  // memang klaim pemasaran (app_settings), bukan hasil hitungan.
  const heroStats = [
    { end: stats.housingCount, suffix: "", label: t.heroStats.housing },
    { end: stats.availableUnits, suffix: "", label: t.heroStats.housingUnits },
    { end: stats.happyFamilies, suffix: "+", label: t.heroStats.happyFamilies },
  ]

  const bandStats = [
    { end: stats.housingCount, suffix: "", label: t.bandStats.registeredHousing },
    { end: stats.availableUnits, suffix: "", label: t.bandStats.availableUnits },
    { end: stats.happyFamilies, suffix: "+", label: t.bandStats.happyCustomers },
  ]

  const chapters = [
    { index: "01", label: t.chapters.benefits, href: "#keuntungan" },
    { index: "02", label: t.chapters.howItWorks, href: "#cara" },
    { index: "03", label: t.chapters.housing, href: "#perumahan" },
    { index: "04", label: t.chapters.simulation, href: "#simulasi" },
    { index: "05", label: t.chapters.getStarted, href: "#mulai" },
  ]

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <a
        href="#main"
        data-no-lenis
        className="skip-link inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-e3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {t.common.skipToContent}
      </a>

      <InfoTicker />

      <SiteNav />

      <main id="main" tabIndex={-1} className="outline-none">
        {/* ---------------------------------------------------------------- */}
        {/* Hero                                                             */}
        {/* ---------------------------------------------------------------- */}
        <section
          id="hero"
          className="relative overflow-hidden px-4 pb-[var(--space-section-lg)] pt-[var(--space-block)] sm:px-6 lg:px-8"
        >
          {/* The one ambient effect that fits the direction. */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-40 right-0 h-[34rem] w-[34rem] rounded-full bg-brand-sky/10 blur-[130px]"
          />

          <div className="relative mx-auto max-w-7xl">
            <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
              <div>
                <div className="rise">
                  <p className="text-coord text-muted-foreground">
                    {Math.abs(hub.lat).toFixed(2)}° {t.hero.coordNorth} · {Math.abs(hub.lng).toFixed(2)}° {t.hero.coordEast} —
                    {" "}{t.hero.pematangSiantar}
                  </p>
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-4 py-1.5 text-xs font-semibold text-primary sm:text-sm">
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand-orange" />
                    {t.hero.badge}
                  </div>
                </div>

                <h1 className="font-display mt-5 max-w-[14ch] text-[length:var(--fs-display-xl)] font-extrabold leading-[0.94] tracking-[-0.035em] text-foreground sm:mt-6">
                  {t.hero.headingKPR} <Mark>{t.hero.headingSubsidized}</Mark>{" "}
                  <span className="text-primary">
                    {t.hero.headingBRI}
                  </span>
                </h1>

                <div className="rise rise-3 mt-6 max-w-xl">
                  <p className="text-lg font-semibold text-foreground/90 sm:text-xl">
                    {t.hero.subtitle}
                  </p>
                  <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                    {t.hero.description}
                  </p>
                </div>

                <div className="rise rise-4 mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
                  <Magnetic strength={0.25}>
                    <Button asChild size="lg" className="w-full sm:w-auto">
                      <Link href="/map">
                        {t.hero.viewHousingMap}
                        <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
                      </Link>
                    </Button>
                  </Magnetic>
                  <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                    <Link href="#keuntungan">{t.common.learnMore}</Link>
                  </Button>
                </div>

                <div className="rise rise-5 mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
                  {heroStats.map((s) => (
                    <div key={s.label} className="flex flex-col">
                      <span className="font-display text-[length:var(--fs-display-m)] font-extrabold leading-[1.1] tracking-[-0.025em] text-primary">
                        <AnimatedCounter end={s.end} suffix={s.suffix} />
                      </span>
                      <span className="text-coord mt-2 text-muted-foreground">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Visual panel — same frame and chips; the asset is now the survey model. */}
              <div className="rise rise-3">
                <div className="relative overflow-hidden rounded-[2.5rem] border border-border bg-secondary/50 p-6 sm:p-8">
                  <HeroVisual />

                  <div className="animate-float absolute bottom-5 left-5 flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 shadow-e3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <BadgeCheck className="h-5 w-5 text-primary" />
                    </span>
                    <div>
                      <p className="text-sm font-bold leading-tight text-foreground">
                        {t.hero.certified}
                      </p>
                      <p className="text-xs text-muted-foreground">{t.hero.guaranteedByLPS}</p>
                    </div>
                  </div>

                  {/* Previews the map without adding an asset. */}
                  <div className="absolute right-5 top-5 flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 shadow-e2">
                    <span
                      aria-hidden
                      className="marker-ping relative h-2.5 w-2.5 shrink-0 rounded-full bg-brand-sky"
                    />
                    <div>
                      <p className="numeric text-sm font-bold leading-tight text-foreground">
                        {housing.length} {t.hero.locationPoints}
                      </p>
                      <p className="text-xs text-muted-foreground">{t.hero.mappedVerified}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Atlas Strip                                                      */}
        {/* ---------------------------------------------------------------- */}
        <AtlasStrip items={housing} />

        {/* ---------------------------------------------------------------- */}
        {/* 01 · Keuntungan                                                  */}
        {/* ---------------------------------------------------------------- */}
        <section
          id="keuntungan"
          aria-labelledby="bab-01"
          className="px-4 py-[var(--space-section)] sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <SectionHeader
              index="01"
              eyebrow={t.benefits.eyebrow}
              titleId="bab-01"
              title={<>{t.benefits.title}</>}
              description={t.benefits.description}
              align="split"
            />

            <RevealGroup className="mt-[var(--space-block)] grid grid-cols-1 gap-[var(--gutter)] md:grid-cols-3">
              {benefits.map((b) => (
                <RevealItem key={b.title} className="h-full">
                  <Card className="lift group h-full p-8 hover:border-primary/25 hover:shadow-e4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white transition-transform duration-300 group-hover:scale-105">
                      <b.icon className="h-7 w-7" />
                    </div>
                    <p className="text-coord mt-6 text-brand-orange-ink">{b.index}</p>
                    <h3 className="font-display mt-2 text-[length:var(--fs-display-s)] font-bold leading-[1.2] tracking-[-0.02em] text-foreground">
                      {b.title}
                    </h3>
                    <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                      {b.desc}
                    </p>
                  </Card>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 02 · Cara Kerja                                                  */}
        {/* ---------------------------------------------------------------- */}
        <section
          id="cara"
          aria-labelledby="bab-02"
          className="bg-secondary px-4 py-[var(--space-section)] sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <SectionHeader
              index="02"
              eyebrow={t.howItWorks.eyebrow}
              titleId="bab-02"
              title={<>{t.howItWorks.title}</>}
              description={t.howItWorks.description}
            />

            <RevealGroup
              className="mt-[var(--space-block)] grid grid-cols-1 gap-[var(--gutter)] md:grid-cols-3"
              stagger={0.09}
            >
              {steps.map((s) => (
                <RevealItem key={s.n} className="h-full">
                  <Card className="relative h-full overflow-hidden p-8">
                    {/* Ghost numeral — the kavling rail at card scale. */}
                    <span
                      aria-hidden
                      className="font-display numeric pointer-events-none absolute -bottom-8 right-2 text-[7rem] font-extrabold leading-none text-primary/[0.06]"
                    >
                      {s.n}
                    </span>
                    <div className="relative">
                      <div className="flex items-center gap-3">
                        <span aria-hidden className="h-px w-8 bg-brand-orange" />
                        <span className="text-coord text-brand-orange-ink">{t.howItWorks.stepLabel} {s.n}</span>
                      </div>
                      <h3 className="font-display mt-5 text-[length:var(--fs-display-s)] font-bold leading-[1.2] tracking-[-0.02em] text-foreground">
                        {s.title}
                      </h3>
                      <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-muted-foreground">
                        {s.desc}
                      </p>
                    </div>
                  </Card>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 03 · Koleksi Perumahan — ink, full-bleed                         */}
        {/* ---------------------------------------------------------------- */}
        <section
          id="perumahan"
          aria-labelledby="bab-03"
          data-surface="ink"
          className="bg-ink px-4 py-[var(--space-section)] sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <SectionHeader
              index="03"
              eyebrow={t.housingCollection.eyebrow}
              titleId="bab-03"
              title={<>{t.housingCollection.title}</>}
              description={t.housingCollection.description}
              cta={{ label: t.housingCollection.viewAllOnMap, href: "/map" }}
              align="split"
              onDark
            />

            <div className="mt-[var(--space-block)]">
              <PerumahanCollection items={housing} limit={6} />
            </div>

            {/* The former bg-primary stat band, folded in as a hairline row. */}
            <div className="mt-[var(--space-block)] grid grid-cols-1 gap-8 border-t border-white/10 pt-10 text-center sm:grid-cols-3 sm:divide-x sm:divide-white/10">
              {bandStats.map((s) => (
                <Reveal key={s.label}>
                  <p className="font-display numeric text-[length:var(--fs-display-m)] font-extrabold leading-[1.1] tracking-[-0.025em] text-white">
                    <AnimatedCounter end={s.end} suffix={s.suffix} />
                  </p>
                  <p className="text-coord mt-3 text-mist-400">{s.label}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 04 · Simulasi — white                                            */}
        {/* ---------------------------------------------------------------- */}
        {/*
          Penggoda, bukan kalkulator kedua. Perhitungannya tinggal di satu
          tempat (/simulasi); menaruh salinan ringkas di sini berarti dua
          rumus yang bisa menyimpang, dan yang menyimpang adalah yang lebih
          dulu dilihat orang.

          Putih di antara dua blok ink mengembalikan irama INK · putih · INK
          yang ditetapkan design.md §3.6.
        */}
        <section
          id="simulasi"
          aria-labelledby="bab-04"
          className="bg-white px-4 py-[var(--space-section)] sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <SectionHeader
              index="04"
              eyebrow={t.simulation.eyebrow}
              titleId="bab-04"
              title={<>{t.simulation.title}</>}
              description={t.simulation.description}
              align="split"
            />

            <Reveal>
              <div className="mt-[var(--space-block)] grid gap-6 rounded-3xl border border-border bg-secondary p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <ul className="grid gap-3 sm:grid-cols-3 lg:gap-6">
                  {t.simulation.points.map((point) => (
                    <li key={point} className="flex items-start gap-2.5">
                      <Calculator
                        className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                        aria-hidden
                      />
                      <span className="text-sm font-medium leading-snug text-foreground">
                        {point}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button asChild size="lg" className="w-full lg:w-auto">
                  <Link href="/simulasi">
                    {t.simulation.cta}
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
            </Reveal>

            {/* Terlihat tanpa interaksi, sebagaimana disyaratkan. */}
            <p className="mt-4 max-w-3xl text-xs leading-relaxed text-muted-foreground">
              {t.simulation.disclaimer}
            </p>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 05 · Mulai Hari Ini — ink, full-bleed                            */}
        {/* ---------------------------------------------------------------- */}
        <section
          id="mulai"
          aria-labelledby="bab-05"
          data-surface="ink"
          className="bg-ink px-4 py-[var(--space-section-lg)] sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-4xl text-center">
            <Reveal>
              <div className="flex items-center justify-center gap-3">
                <span aria-hidden className="h-px w-8 bg-brand-orange" />
                <span className="text-coord text-brand-orange">{t.cta.eyebrow}</span>
                <span aria-hidden className="h-px w-8 bg-brand-orange" />
              </div>
            </Reveal>

            <h2
              id="bab-05"
              className="font-display mx-auto mt-6 max-w-[16ch] text-[length:var(--fs-display-xl)] font-extrabold leading-[0.94] tracking-[-0.035em] text-white"
            >
              <WordsReveal text={t.cta.realizeWord} stagger={0.055} />{" "}
              <Mark onDark>{t.cta.dreamHome}</Mark>{" "}
              <WordsReveal text={t.cta.yourWord} stagger={0.055} delay={0.11} />
            </h2>

            <Reveal delay={0.1}>
              <p className="mx-auto mt-6 max-w-xl text-base text-mist-200 sm:text-lg">
                {t.cta.description}
              </p>
            </Reveal>

            <Reveal delay={0.15} className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Magnetic strength={0.25}>
                <Button asChild size="lg" variant="ink">
                  <Link href="/map">
                    {t.common.viewAvailableHousing}
                    <ArrowUpRight className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                </Button>
              </Magnetic>
              {/*
                Nomornya dari app_settings `public.whatsapp` — sumber yang sama
                dengan footer. Sebelumnya berkas ini dan site-footer.tsx
                masing-masing mengeja angka yang sama, jadi mengganti nomor tim
                menuntut dua suntingan yang tidak pernah dibuka bersamaan.
              */}
              {waPusat && (
                <Button asChild size="lg" variant="ink-outline">
                  <a href={`tel:+${waPusat.nomor}`}>
                    <Phone />
                    {t.common.contactUs}
                  </a>
                </Button>
              )}
            </Reveal>

            <Reveal delay={0.2}>
              <p className="text-coord mt-10 text-mist-400">
                {housing.length} {t.stickyCta.housing} · {stats.availableUnits} unit · {t.hero.pematangSiantar}
              </p>
            </Reveal>
          </div>
        </section>
      </main>

      <SiteFooter items={housing} waPusat={waPusat} />

      <KavlingRail chapters={chapters} />
      <StickyCta after="#hero" hideOver="#mulai" count={housing.length} />
    </div>
  )
}
