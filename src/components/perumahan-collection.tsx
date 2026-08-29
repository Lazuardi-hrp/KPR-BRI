"use client"

import Link from "next/link"
import Image from "next/image"
import { MapPin, ArrowUpRight } from "lucide-react"
import { blurFor } from "../lib/image-blur"
import { RevealGroup, RevealItem } from "./motion/reveal"
import { Coord } from "./coord"
import { useTranslation } from "../lib/i18n"
import type { Housing } from "../lib/housing"

/** Shorten the long address into a readable location line. */
function shortLocation(description: string) {
  const parts = description.split(",").map((p) => p.trim())
  const tail = parts.slice(-2).filter(Boolean)
  return tail.length ? tail.join(", ") : description
}

/**
 * The strongest card in the product. It lives on `bg-ink`, where the
 * photographs read as illuminated plates instead of competing with a white page.
 */
export function PerumahanCollection({
  items: all,
  limit = 6,
}: {
  items: Housing[]
  limit?: number
}) {
  const { t } = useTranslation()
  const items = all.slice(0, limit)

  return (
    <RevealGroup
      className="grid grid-cols-1 gap-[var(--gutter)] sm:grid-cols-2 lg:grid-cols-3"
      stagger={0.06}
    >
      {items.map((h) => (
        <RevealItem key={h.id}>
          <Link
            href={h.slug ? `/perumahan/${h.slug}` : "/map"}
            className="lift group block h-full overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-ink hover:border-brand-orange/40 hover:bg-white/[0.07]"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-ink-deep">
              <Image
                src={h.image || "/rumah.webp"}
                alt={h.name}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                placeholder={blurFor(h.image) ? "blur" : "empty"}
                blurDataURL={blurFor(h.image)}
                className="lift-img object-cover"
              />
              <span className="text-coord absolute left-3 top-3 rounded-full bg-ink/80 px-3 py-1.5 text-mist-200 backdrop-blur-sm">
                {h.availableUnits} {t.common.unitAvailable}
              </span>
              {/* Surveyor's corner tick, drawn on hover. */}
              <span
                aria-hidden
                className="absolute right-3 top-3 h-6 w-6 rounded-tr-md border-r-2 border-t-2 border-brand-orange opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              />
            </div>

            <div className="p-5">
              <h3 className="font-display line-clamp-1 text-[length:var(--fs-title)] font-bold leading-snug text-white">
                {h.name}
              </h3>
              <Coord lat={h.lat} lng={h.lng} as="div" className="mt-2 text-mist-400" />
              <p className="mt-2 flex items-start gap-1.5 text-sm text-mist-400">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-sky" />
                <span className="line-clamp-1">{shortLocation(h.description)}</span>
              </p>

              <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                <div>
                  <p className="text-coord text-mist-400">{t.common.startingFrom}</p>
                  <p className="font-display numeric mt-1.5 text-base font-bold text-white">
                    {h.priceRange}
                  </p>
                </div>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors group-hover:bg-brand-orange group-hover:text-brand-orange-fg">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </Link>
        </RevealItem>
      ))}
    </RevealGroup>
  )
}
