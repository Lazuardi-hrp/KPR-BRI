"use client"

import { useEffect, useState } from "react"
import { motion, useScroll } from "motion/react"
import { cn } from "../lib/utils"
import { useScrollToId } from "./motion/smooth-scroll"

export interface Kavling {
  /** two-digit chapter index */
  index: string
  /** the chapter's editorial label */
  label: string
  /** element id to scroll to */
  href: string
}

/**
 * A surveyor's rail down the left margin: the chapter numerals, a hairline
 * track, and an orange fill that follows scroll progress. `lg+` only, and
 * decorative — every destination is already in the nav and the page body.
 */
export function KavlingRail({ chapters }: { chapters: Kavling[] }) {
  const { scrollYProgress } = useScroll()
  const scrollToId = useScrollToId()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [onInk, setOnInk] = useState(false)

  // Which chapter is in view?
  useEffect(() => {
    const sections = chapters
      .map((c) => document.querySelector(c.href))
      .filter((el): el is Element => Boolean(el))
    if (!sections.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActiveId(`#${visible.target.id}`)
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5, 1] },
    )
    sections.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [chapters])

  // Invert the rail while it sits over an ink section.
  useEffect(() => {
    const inkSections = document.querySelectorAll('[data-surface="ink"]')
    if (!inkSections.length) return

    const observer = new IntersectionObserver(
      () => {
        const mid = window.innerHeight / 2
        const over = Array.from(inkSections).some((el) => {
          const r = el.getBoundingClientRect()
          return r.top <= mid && r.bottom >= mid
        })
        setOnInk(over)
      },
      { rootMargin: "-50% 0px -50% 0px", threshold: [0, 1] },
    )
    inkSections.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [])

  return (
    <div
      aria-hidden="true"
      /* The container caps at 1280px, so the rail only appears once the page
         gutter can actually hold it — otherwise it lands on the copy. */
      className="fixed left-4 top-1/2 z-40 hidden -translate-y-1/2 min-[1440px]:block"
    >
      <div className="flex items-stretch gap-3">
        {/* Track + scroll-progress fill */}
        <div
          className={cn(
            "relative w-px shrink-0 transition-colors duration-500",
            onInk ? "bg-white/15" : "bg-border",
          )}
          style={{ height: 240 }}
        >
          <motion.span
            className="absolute inset-x-0 top-0 block w-px origin-top bg-brand-orange"
            style={{ height: 240, scaleY: scrollYProgress }}
          />
        </div>

        <ul className="flex flex-col justify-between" style={{ height: 240 }}>
          {chapters.map((c) => {
            const active = activeId === c.href
            return (
              <li key={c.href}>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => scrollToId(c.href)}
                  className={cn(
                    "text-coord flex origin-left items-center gap-2 transition-all duration-300 ease-out",
                    active
                      ? cn(
                          "translate-x-0.5 scale-125",
                          onInk ? "text-brand-orange" : "text-brand-orange-ink",
                        )
                      : onInk
                        ? "text-mist-400 hover:text-mist-200"
                        : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span>{c.index}</span>
                  {/* The label needs a wider gutter still. */}
                  <span
                    className={cn(
                      "hidden whitespace-nowrap transition-opacity duration-300 min-[1700px]:inline",
                      active ? "opacity-100" : "opacity-0",
                    )}
                  >
                    {c.label}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

export default KavlingRail
