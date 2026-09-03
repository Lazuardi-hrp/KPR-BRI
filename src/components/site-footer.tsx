"use client"

import Link from "next/link"
import Image from "next/image"
import { MapPin, Phone } from "lucide-react"
import { AtlasStrip } from "./atlas-strip"
import { useTranslation } from "../lib/i18n"

const PHONE_DISPLAY = "(0813) 71901927"
import type { Housing } from "../lib/housing"

const PHONE_TEL = "081371901927"

export function SiteFooter({ items }: { items: Housing[] }) {
  const { t, locale } = useTranslation()

  return (
    <footer className="bg-ink-deep text-white">
      <AtlasStrip items={items} speed={60} onDark className="!border-t-0 border-b-white/10" />

      <div className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 grid grid-cols-2 gap-8 md:grid-cols-3">
            <div className="col-span-2 md:col-span-1">
              <div className="relative mb-4 h-12 w-28">
                <Image
                  src="/logobri.webp"
                  alt="BRI"
                  fill
                  sizes="112px"
                  className="object-contain object-left brightness-0 invert"
                />
              </div>
              <p className="max-w-xs text-sm leading-relaxed text-mist-200">
                {t.footer.tagline}
              </p>
            </div>

            <div>
              <h2 className="text-coord mb-5 text-brand-orange">{t.footer.contact}</h2>
              <ul className="space-y-3 text-sm text-mist-200">
                <li className="flex items-start gap-2">
                  <Phone className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-sky" />
                  <a href={`tel:${PHONE_TEL}`} className="underline-draw numeric inline-block hover:text-white">
                    {t.common.phone}: {PHONE_DISPLAY}
                  </a>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-orange" />
                  Pematang Siantar, Sumatera Utara
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-coord mb-5 text-brand-orange">{t.footer.serviceArea}</h2>
              <ul className="space-y-3 text-sm text-mist-200">
                <li className="numeric">2.98° {t.hero.coordNorth} · 99.07° {t.hero.coordEast}</li>
                <li>{t.footer.city}</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 text-center text-xs text-mist-400">
            <p className="mb-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
              <Link href="/kebijakan-privasi" className="underline-draw inline-block hover:text-white">
                {t.footer.privacyPolicy}
              </Link>
              <Link href="/syarat-ketentuan" className="underline-draw inline-block hover:text-white">
                {t.footer.termsConditions}
              </Link>
            </p>
            <p>
              &copy; {new Date().getFullYear()} {t.footer.copyright}
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
