"use client"

import Link from "next/link"
import Image from "next/image"
import { MapPin, MessageCircle, Phone } from "lucide-react"
import { AtlasStrip } from "./atlas-strip"
import WhatsAppCta from "./whatsapp-cta"
import { useTranslation } from "../lib/i18n"
import { formatNomorTampil, type KontakWhatsApp } from "../lib/whatsapp"
import type { Housing } from "../lib/housing"

export function SiteFooter({
  items,
  waPusat,
}: {
  items: Housing[]
  /** Kontak WhatsApp tim pusat. null = barisnya tidak ada sama sekali. */
  waPusat?: KontakWhatsApp | null
}) {
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
                {/*
                  Nomornya berasal dari app_settings `public.whatsapp`, sumber
                  yang sama dengan baris WhatsApp di bawahnya. Sebelumnya ia
                  dieja sebagai dua konstanta di berkas ini — jadi mengganti
                  nomor tim menuntut satu perubahan basis data DAN satu deploy,
                  dan yang kedua akan terlupa. Bentuk tampilannya diturunkan,
                  bukan disimpan, dengan alasan yang sama.

                  Konsekuensi yang perlu diketahui: barisnya menawarkan `tel:`
                  atas nomor yang dicatat sebagai kontak WhatsApp. Keduanya
                  memang satu nomor hari ini, dan nomor WhatsApp bisnis di
                  Indonesia hampir selalu jalur seluler sungguhan — tetapi bila
                  suatu saat tim memakai nomor yang tidak menerima panggilan,
                  pemisahannya harus terjadi di app_settings, bukan dengan
                  menuliskan lagi sebuah angka di sini.
                */}
                {waPusat && (
                  <li className="flex items-start gap-2">
                    <Phone className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-sky" />
                    <a
                      href={`tel:+${waPusat.nomor}`}
                      className="underline-draw numeric inline-block hover:text-white"
                    >
                      {t.common.phone}: {formatNomorTampil(waPusat.nomor)}
                    </a>
                  </li>
                )}
                {/*
                  Jalan masuk untuk pertanyaan yang belum menyangkut perumahan
                  mana pun. Beranda hanya menawarkan "Lihat Peta" — berguna
                  bagi yang tahu sedang mencari apa, buntu bagi yang belum.
                  Niatnya 'bantuan', jadi pesannya tidak membawa satu pun angka.
                */}
                {waPusat && (
                  <li className="flex items-start gap-2">
                    {/* text-brand-sky, bukan text-ok: satu-satunya hijau dalam sistem
                        (#15803d) dipilih untuk kontras di atas PUTIH dan nyaris
                        hilang di atas bg-ink-deep. Palet footer tetap oranye +
                        biru; kata "WhatsApp" yang membawa artinya. */}
                    <MessageCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-sky" />
                    <span>
                      <WhatsAppCta
                        phone={waPusat.nomor}
                        niat="bantuan"
                        housingId={null}
                        varian="halus"
                        label={t.footer.whatsapp}
                        // cn() memakai tailwind-merge, jadi warna dari sini
                        // MENGGANTIKAN text-ok bawaan varian halus alih-alih
                        // menumpuk. Ikon bawaannya disembunyikan: barisnya sudah
                        // punya satu, sejajar dengan baris telepon di atasnya.
                        className="underline-draw inline-block text-mist-200 hover:text-white [&>svg]:hidden"
                      />
                      {waPusat.jam && (
                        <span className="mt-0.5 block text-xs text-mist-400">{waPusat.jam}</span>
                      )}
                    </span>
                  </li>
                )}
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
