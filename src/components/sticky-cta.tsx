"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"
import { ArrowRight } from "lucide-react"
import { Button } from "./ui/button"
import { useTranslation } from "../lib/i18n"

interface StickyCtaProps {
  /** Selector for the block that must leave the viewport before this appears. */
  after: string
  /** Selector for the block that hides this again (the page's own CTA). */
  hideOver: string
  count: number
}

/**
 * Below `lg`, the nav's "Lihat Peta" button is hidden and the page has no
 * persistent way into the product. This is it.
 */
export function StickyCta({ after, hideOver, count }: StickyCtaProps) {
  const { t } = useTranslation()
  const [pastHero, setPastHero] = useState(false)
  const [atCta, setAtCta] = useState(false)

  useEffect(() => {
    const hero = document.querySelector(after)
    const cta = document.querySelector(hideOver)
    const observers: IntersectionObserver[] = []

    if (hero) {
      const o = new IntersectionObserver(
        ([e]) => setPastHero(!e.isIntersecting && e.boundingClientRect.top < 0),
        { threshold: 0 },
      )
      o.observe(hero)
      observers.push(o)
    }
    if (cta) {
      const o = new IntersectionObserver(([e]) => setAtCta(e.isIntersecting), {
        threshold: 0,
      })
      o.observe(cta)
      observers.push(o)
    }
    return () => observers.forEach((o) => o.disconnect())
  }, [after, hideOver])

  return (
    <AnimatePresence>
      {pastHero && !atCta && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 px-4 py-3 backdrop-blur-md lg:hidden"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <p className="text-coord text-muted-foreground">
              {count} {t.stickyCta.housing} · {t.hero.pematangSiantar}
            </p>
            <Button asChild size="sm" className="shrink-0">
              <Link href="/map">
                {t.common.viewMap}
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default StickyCta
