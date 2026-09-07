"use client"

import Image from "next/image"
import dynamic from "next/dynamic"
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { useReducedMotion } from "motion/react"
import { blurFor } from "../lib/image-blur"

/** The static hero art, and the fallback whenever the model cannot be shown. */
const POSTER = "/rumah.webp"

const HeroModel = dynamic(() => import("./hero-model"), { ssr: false })

/**
 * Whether this device can render the model.
 *
 * The model is the hero's real subject, so phones get it too — it is only
 * withheld where it genuinely cannot or should not be drawn: no WebGL, or the
 * user has asked the browser to save data.
 */
function supportsModel() {
  if (typeof window === "undefined") return false

  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  if (connection?.saveData) return false

  try {
    const probe = document.createElement("canvas")
    return Boolean(probe.getContext("webgl2") ?? probe.getContext("webgl"))
  } catch {
    return false
  }
}

/** Falls back to the poster if the model throws, and never retries. */
class ModelBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error) {
    console.error("[hero] 3D model failed, falling back to poster:", error)
    this.props.onError()
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

/**
 * The hero visual: a survey model of the housing stock, over the poster it
 * replaces.
 *
 * The model is the hero's subject; `/rumah.webp` is only ever a stand-in. The
 * poster is painted first so it can carry the LCP, then hands over to the canvas
 * the moment there are pixels — and comes back only if WebGL is unavailable, the
 * context is lost, or the model fails to load.
 */
export function HeroVisual() {
  const frame = useRef<HTMLDivElement>(null)
  const [posterPainted, setPosterPainted] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [ready, setReady] = useState(false)
  // Same hook the rest of the page's motion runs through.
  const reducedMotion = useReducedMotion() ?? false

  useEffect(() => {
    const node = frame.current
    // Waiting on the poster is what protects the LCP. Spinning up a WebGL
    // context is main-thread-heavy enough to delay the very paint it is meant
    // to replace, so the model is not allowed to start until the poster has
    // decoded and had a frame to show itself.
    if (!node || !posterPainted || !supportsModel()) return

    let idle = 0
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        // The poster is on screen; take over as soon as the browser is free.
        idle = window.requestIdleCallback
          ? window.requestIdleCallback(() => setMounted(true), { timeout: 200 })
          : window.setTimeout(() => setMounted(true), 100)
      },
      { rootMargin: "400px" },
    )
    observer.observe(node)

    return () => {
      observer.disconnect()
      if (idle) {
        if (window.cancelIdleCallback) window.cancelIdleCallback(idle)
        else window.clearTimeout(idle)
      }
    }
  }, [posterPainted])

  const onReady = useCallback(() => setReady(true), [])
  // Tears the canvas down and brings the poster back, once. The observer has
  // already disconnected by this point, so nothing remounts it.
  const onError = useCallback(() => {
    setMounted(false)
    setReady(false)
  }, [])

  return (
    <div ref={frame} className="relative aspect-[4/3] w-full">
      <Image
        src={POSTER}
        alt="Deret rumah subsidi KPR BRI"
        fill
        sizes="(max-width: 1024px) 62vw, 34vw"
        placeholder={blurFor(POSTER) ? "blur" : "empty"}
        blurDataURL={blurFor(POSTER)}
        className={`object-contain transition-opacity duration-500 ${ready ? "opacity-0" : "opacity-100"}`}
        priority
        onLoad={() =>
          requestAnimationFrame(() => requestAnimationFrame(() => setPosterPainted(true)))
        }
      />

      {mounted && (
        <div
          aria-hidden
          className={`absolute inset-0 transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`}
        >
          <ModelBoundary onError={onError}>
            <HeroModel reducedMotion={reducedMotion} onReady={onReady} onLost={onError} />
          </ModelBoundary>
        </div>
      )}
    </div>
  )
}
