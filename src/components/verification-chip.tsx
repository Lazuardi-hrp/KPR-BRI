"use client"

import { BadgeCheck, Clock, RefreshCw } from "lucide-react"

import { useTranslation } from "@/lib/i18n"
import { formatRelative } from "@/lib/format"
import { LENCANA_STATUS, LENCANA_STATUS_INK, type StatusVerifikasi } from "@/lib/verification"

const IKON = {
  terverifikasi: BadgeCheck,
  menunggu: Clock,
  perlu_pembaruan: RefreshCw,
} as const

/**
 * Baris kepercayaan satu baris untuk kartu daftar.
 *
 * Kartu adalah tempat pengunjung memutuskan properti mana yang layak dibuka,
 * jadi statusnya harus terbaca di sana — bukan hanya di halaman detail setelah
 * ia sudah terlanjur tertarik.
 *
 * onDark mengikuti kebiasaan Card, Mark, dan SectionHeader: proyek ini punya
 * varian .dark di globals.css tetapi tidak memakai satu pun utilitas dark:,
 * karena permukaan gelapnya ditentukan tata letak (bg-ink), bukan preferensi
 * sistem pengunjung.
 */
export default function VerificationChip({
  status,
  verifiedAt,
  onDark = false,
  className = "",
}: {
  status: StatusVerifikasi | null | undefined
  verifiedAt?: string | null
  onDark?: boolean
  className?: string
}) {
  const { t, locale } = useTranslation()
  const s = status ?? "menunggu"
  const Ikon = IKON[s]

  // Label pendek: "Informasi Perlu Pembaruan" memakan satu baris penuh di
  // kartu dan mendorong baris lokasi turun. Kalimat lengkapnya ada di
  // <TrustPanel>, tempat ruangnya memang tersedia.
  const label =
    s === "terverifikasi"
      ? t.verification.shortVerified
      : s === "perlu_pembaruan"
        ? t.verification.shortNeedsUpdate
        : t.verification.shortPending

  const kelas = onDark ? LENCANA_STATUS_INK[s] : LENCANA_STATUS[s]

  return (
    <span className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${className}`}>
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${kelas}`}
      >
        <Ikon className="h-3 w-3 shrink-0" aria-hidden />
        {label}
      </span>
      {s === "terverifikasi" && verifiedAt && (
        <time
          dateTime={verifiedAt}
          suppressHydrationWarning
          className={`text-[11px] ${onDark ? "text-mist-400" : "text-muted-foreground"}`}
        >
          {t.verification.lastVerified.replace("{time}", formatRelative(verifiedAt, locale))}
        </time>
      )}
    </span>
  )
}
