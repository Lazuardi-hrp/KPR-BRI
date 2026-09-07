"use client"

import { useEffect, useRef } from "react"
import { cn } from "../lib/utils"
import { useTranslation } from "../lib/i18n"

/**
 * Copies of the phrase inside ONE group. The group must be at least as wide as
 * the viewport, or a gap opens at the seam on very wide screens; four passes
 * clears ~3400px of uppercase tracking, well past an ultra-wide desktop.
 */
const REPEATS = 4

interface InfoTickerProps {
  /** Seconds for one full pass of a group. Larger = slower. */
  speed?: number
  className?: string
}

function Phrase({ segments }: { segments: string[] }) {
  return (
    <>
      {segments.map((text, i) => (
        <span key={i} className="flex shrink-0 items-center">
          <span className="whitespace-nowrap">{text}</span>
          <span aria-hidden className="px-3 text-ink/45 sm:px-4">
            •
          </span>
        </span>
      ))}
    </>
  )
}

function Group({ segments, hidden = false }: { segments: string[], hidden?: boolean }) {
  return (
    <div aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {Array.from({ length: REPEATS }, (_, i) => (
        <Phrase key={i} segments={segments} />
      ))}
    </div>
  )
}

/**
 * Announcement bar — a continuous right-to-left information ticker that sits
 * above the navbar on the landing page.
 *
 * Seamless by construction: two identical groups sit flush side by side inside
 * a `w-max` track, and `@keyframes marquee` translates that track by exactly
 * -50%. At the end of a cycle the second group occupies the pixels the first
 * one started on, so the reset is invisible.
 *
 * The track is `pointer-events-none` — it scrolls past without ever taking a
 * click, a drag or a text selection away from the page underneath. The second
 * group is `aria-hidden`, so a screen reader reads the sentence exactly once.
 * `prefers-reduced-motion` freezes it via the global rule in globals.css.
 */
export function InfoTicker({ speed = 48, className }: InfoTickerProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()

  // Stop burning frames while the tab is hidden.
  useEffect(() => {
    const track = hostRef.current?.querySelector<HTMLElement>(".animate-marquee")
    if (!track) return

    const sync = () => {
      track.dataset.paused = document.visibilityState === "visible" ? "false" : "true"
    }
    sync()
    document.addEventListener("visibilitychange", sync)
    return () => document.removeEventListener("visibilitychange", sync)
  }, [])

  return (
    <div
      ref={hostRef}
      role="complementary"
      aria-label={t.ticker.ariaLabel}
      className={cn(
        "relative z-40 flex h-10 items-center overflow-hidden bg-brand-orange sm:h-11",
        className,
      )}
    >
      <div
        className="animate-marquee pointer-events-none flex w-max select-none items-center text-[10px] font-bold uppercase tracking-[0.16em] text-ink sm:text-[11px] sm:tracking-[0.2em]"
        style={{ animationDuration: `${speed}s` }}
      >
        <Group segments={t.ticker.segments} />
        <Group segments={t.ticker.segments} hidden />
      </div>
    </div>
  )
}
