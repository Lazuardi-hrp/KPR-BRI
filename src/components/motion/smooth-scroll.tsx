"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react"
import Lenis from "lenis"

const LenisContext = createContext<Lenis | null>(null)

/** The live Lenis instance, or null when smooth scrolling is disabled. */
export const useLenis = () => useContext(LenisContext)

/**
 * Scroll to an element by id — via Lenis when it is running, natively otherwise
 * (reduced motion, or below the mobile cut-off).
 */
export function useScrollToId() {
  const lenis = useLenis()
  return (id: string) => {
    const el = document.querySelector(id)
    if (!el) return
    if (lenis) lenis.scrollTo(el as HTMLElement, { offset: -80 })
    else el.scrollIntoView({ behavior: "smooth", block: "start" })
  }
}

/**
 * Buttery inertia scrolling via Lenis.
 * Disabled for reduced motion, and below 768px where it is a real cost on
 * low-end Android for very little gain.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null)
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)")
    const wide = window.matchMedia("(min-width: 768px)")

    let raf = 0

    const start = () => {
      if (lenisRef.current) return
      const instance = new Lenis({
        duration: 1.1,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        touchMultiplier: 1.6,
      })
      lenisRef.current = instance
      setLenis(instance)

      const loop = (time: number) => {
        instance.raf(time)
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
    }

    const stop = () => {
      if (!lenisRef.current) return
      cancelAnimationFrame(raf)
      lenisRef.current.destroy()
      lenisRef.current = null
      setLenis(null)
    }

    const sync = () => (!reduced.matches && wide.matches ? start() : stop())
    sync()

    reduced.addEventListener("change", sync)
    wide.addEventListener("change", sync)

    // Let in-page anchor links use Lenis for a smooth glide.
    const onAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest?.(
        'a[href^="#"]',
      ) as HTMLAnchorElement | null
      if (!target || target.dataset.noLenis !== undefined) return
      const id = target.getAttribute("href")
      if (!id || id === "#") return
      const el = document.querySelector(id)
      if (el && lenisRef.current) {
        e.preventDefault()
        lenisRef.current.scrollTo(el as HTMLElement, { offset: -80 })
      }
    }
    document.addEventListener("click", onAnchorClick)

    return () => {
      reduced.removeEventListener("change", sync)
      wide.removeEventListener("change", sync)
      document.removeEventListener("click", onAnchorClick)
      stop()
    }
  }, [])

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>
}
