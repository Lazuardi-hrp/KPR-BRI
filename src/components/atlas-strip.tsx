"use client"

import { useEffect, useRef } from "react"
import { cn } from "../lib/utils"
import { Coord } from "./coord"
import type { Housing } from "../lib/housing"

interface AtlasStripProps {
  /** Perumahan yang ditampilkan; datang dari RSC induk. */
  items: Housing[]
  /** Seconds for one full pass. The footer strip runs slower than the hero's. */
  speed?: number
  onDark?: boolean
  className?: string
}

/**
 * A full-bleed marquee of all 16 perumahan and their real coordinates.
 * It advertises the actual product in one glance using data already shipped,
 * and adds motion with no new asset.
 *
 * `aria-hidden` throughout: the same 16 names are reachable in chapter 03 and
 * on /map, so to a screen reader this is pure decoration.
 */
export function AtlasStrip({ items, speed = 34, onDark = false, className }: AtlasStripProps) {
  const hostRef = useRef<HTMLDivElement>(null)

  // Stop burning frames while the tab is hidden.
  useEffect(() => {
    const track = hostRef.current?.querySelector<HTMLElement>(".animate-marquee")
    if (!track) return

    const sync = () => {
      // An attribute, not an inline style — an inline style would outrank the
      // `.marquee-host:hover` pause rule.
      track.dataset.paused = document.visibilityState === "visible" ? "false" : "true"
    }
    sync()
    document.addEventListener("visibilitychange", sync)
    return () => document.removeEventListener("visibilitychange", sync)
  }, [])

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className={cn(
        "marquee-host overflow-hidden border-y py-4",
        onDark ? "border-white/10" : "border-border bg-secondary",
        className,
      )}
    >
      <div
        className="animate-marquee flex w-max items-center gap-10"
        style={{ animationDuration: `${speed}s` }}
      >
        {[...items, ...items].map((h, i) => (
          <span key={i} className="flex items-center gap-3 whitespace-nowrap">
            <span
              className={cn(
                "relative h-1.5 w-1.5 shrink-0 rounded-full bg-brand-sky",
                // Cap the ping at 3 concurrent instances (design.md §4.4).
                i % 6 === 0 && "marker-ping",
              )}
            />
            <span className={cn("text-coord", onDark ? "text-mist-200" : "text-foreground")}>
              {h.name}
            </span>
            <Coord
              lat={h.lat}
              lng={h.lng}
              className={onDark ? "text-mist-400" : "text-muted-foreground"}
            />
          </span>
        ))}
      </div>
    </div>
  )
}
