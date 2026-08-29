"use client"

import { useState, useEffect, useRef } from "react"
import { useReducedMotion } from "motion/react"

interface AnimatedCounterProps {
  end: number
  duration?: number
  suffix?: string
}

/**
 * Counts up to `end` once it scrolls into view.
 *
 * Accessibility: the ticking figure is `aria-hidden`, and the final value is
 * always present in the accessibility tree — assistive tech reads "500+", never
 * "1, 2, 3, …". Reduced-motion users get the final value with no animation.
 */
export function AnimatedCounter({ end, duration = 1100, suffix = "" }: AnimatedCounterProps) {
  const [count, setCount] = useState(0)
  const [hasAnimated, setHasAnimated] = useState(false)
  const containerRef = useRef<HTMLSpanElement>(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    const node = containerRef.current
    if (!node || reduce) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasAnimated(true)
          observer.disconnect()
        }
      },
      { threshold: 0, rootMargin: "0px 0px -8% 0px" },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [reduce])

  useEffect(() => {
    if (!hasAnimated || reduce) return

    let startTime: number | null = null
    let animationFrameId: number

    const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t)

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      setCount(Math.floor(end * easeOutQuad(progress)))

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate)
      }
    }

    animationFrameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrameId)
  }, [hasAnimated, end, duration, reduce])

  return (
    <span ref={containerRef} className="numeric">
      <span aria-hidden="true">
        {(reduce ? end : count).toLocaleString("id-ID")}
        {suffix}
      </span>
      <span className="sr-only">
        {end.toLocaleString("id-ID")}
        {suffix}
      </span>
    </span>
  )
}
