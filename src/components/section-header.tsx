import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { cn } from "../lib/utils"
import { Reveal } from "./motion/reveal"
import { WordsReveal } from "./motion/text-reveal"

interface SectionHeaderProps {
  /** two-digit index, e.g. "01" */
  index: string
  /** small editorial label, e.g. "Keuntungan" */
  eyebrow: string
  title: string | React.ReactNode
  description?: string
  cta?: { label: string; href: string }
  /**
   * `start`   — stacked, single column
   * `between` — title left, CTA right
   * `split`   — title in cols 1–7, lede in cols 9–12 (asymmetric)
   */
  align?: "start" | "between" | "split"
  /** Invert the ink for sections sitting on `bg-ink`. */
  onDark?: boolean
  /** id for the <h2>, so the parent <section> can aria-labelledby it. */
  titleId?: string
}

/**
 * The numbered editorial section header — the spine of ATLAS SIANTAR.
 * `01 · Keuntungan` becomes a hairline-ruled kavling label; the title
 * animates word-by-word on scroll into view.
 */
export function SectionHeader({
  index,
  eyebrow,
  title,
  description,
  cta,
  align = "start",
  onDark = false,
  titleId,
}: SectionHeaderProps) {
  const kavling = (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className={cn("h-px w-8", onDark ? "bg-brand-orange" : "bg-brand-orange")}
      />
      <span
        className={cn(
          "text-coord",
          onDark ? "text-brand-orange" : "text-brand-orange-ink",
        )}
      >
        {index} · {eyebrow}
      </span>
    </div>
  )

  const heading = (
    <h2
      id={titleId}
      className={cn(
        "font-display mt-5 text-[length:var(--fs-display-l)] font-extrabold leading-[1.02] tracking-[-0.03em]",
        "max-w-[18ch]",
        onDark ? "text-white" : "text-foreground",
      )}
    >
      {typeof title === "string" ? (
        <WordsReveal text={title} stagger={0.055} />
      ) : (
        title
      )}
    </h2>
  )

  const lede = description ? (
    <p
      className={cn(
        "text-base leading-relaxed sm:text-lg",
        onDark ? "text-mist-200" : "text-muted-foreground",
      )}
    >
      {description}
    </p>
  ) : null

  const link = cta ? (
    <Link
      href={cta.href}
      className={cn(
        "group inline-flex flex-shrink-0 items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors",
        onDark
          ? "border-white/25 text-white hover:border-brand-orange/40 hover:bg-white/10"
          : "border-border bg-white text-primary hover:border-primary/40 hover:bg-primary/[0.04]",
      )}
    >
      {cta.label}
      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
    </Link>
  ) : null

  if (align === "split") {
    return (
      <Reveal className="grid grid-cols-1 items-end gap-8 lg:grid-cols-12 lg:gap-[var(--gutter)]">
        <div className="lg:col-span-7">
          {kavling}
          {heading}
        </div>
        {(lede || link) && (
          <div className="flex flex-col items-start gap-6 lg:col-span-4 lg:col-start-9">
            {lede}
            {link}
          </div>
        )}
      </Reveal>
    )
  }

  return (
    <Reveal
      className={
        align === "between"
          ? "flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
          : "max-w-2xl"
      }
    >
      <div className="max-w-2xl">
        {kavling}
        {heading}
        {lede && <div className="mt-4">{lede}</div>}
      </div>
      {link}
    </Reveal>
  )
}
