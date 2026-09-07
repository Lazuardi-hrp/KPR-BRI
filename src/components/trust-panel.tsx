"use client"

import { useId, useState } from "react"
import { AlertTriangle, BadgeCheck, ChevronDown, Clock, Minus, RefreshCw } from "lucide-react"

import { formatRelative } from "@/lib/format"
import { useTranslation } from "@/lib/i18n"
import type { Housing } from "@/lib/housing"
import {
  petaPemeriksaan,
  sinyalDariHousing,
  skorKepercayaan,
  URUTAN_BIDANG,
  verifikasiBasi,
  type BandSkor,
} from "@/lib/verification"
import { ConfidenceMeter } from "./confidence-meter"

const IKON_STATUS = {
  terverifikasi: BadgeCheck,
  menunggu: Clock,
  perlu_pembaruan: RefreshCw,
} as const

/** Kelas permukaan panel per status. Hairline 1px, sesuai design.md §3.5. */
const PERMUKAAN = {
  terverifikasi: "border-ok/30 bg-ok-50",
  menunggu: "border-border bg-secondary",
  perlu_pembaruan: "border-warn/30 bg-warn-50",
} as const

const TINTA = {
  terverifikasi: "text-ok",
  menunggu: "text-muted-foreground",
  perlu_pembaruan: "text-warn",
} as const

/**
 * Panel kepercayaan halaman detail.
 *
 * Janjinya bukan kata "Terverifikasi" melainkan tiga hal yang bisa diperiksa
 * pengunjung sendiri: APA yang diperiksa, KAPAN, dan seberapa lengkap datanya.
 * Lencana tanpa ketiganya hanyalah stiker yang tidak menanggung apa pun — dan
 * stiker semacam itu justru menurunkan kepercayaan begitu satu pembeli
 * menemukan datanya keliru.
 *
 * Skornya dihitung dari kolom yang sama dengan yang dipakai kartu di beranda
 * (lihat sinyalDariHousing), supaya angka di kartu dan di sini tidak pernah
 * berbeda untuk properti yang sama.
 */
export default function TrustPanel({ housing }: { housing: Housing }) {
  const { t, locale } = useTranslation()
  const [terbuka, setTerbuka] = useState(false)
  const idRincian = useId()

  const status = housing.verificationStatus ?? "menunggu"
  const Ikon = IKON_STATUS[status]
  const { skor, band, rincian } = skorKepercayaan(sinyalDariHousing(housing))
  const cek = petaPemeriksaan(housing.fieldChecks)
  const basi = verifikasiBasi(housing.verifiedAt, housing.lastDataChangeAt)

  const judul =
    status === "terverifikasi"
      ? t.verification.verified
      : status === "perlu_pembaruan"
        ? t.verification.needsUpdate
        : t.verification.pending

  const catatan =
    status === "terverifikasi"
      ? t.verification.verifiedNote
      : status === "perlu_pembaruan"
        ? t.verification.needsUpdateNote
        : t.verification.pendingNote

  const labelBand: Record<BandSkor, string> = {
    sangat_baik: t.verification.bandExcellent,
    baik: t.verification.bandGood,
    cukup: t.verification.bandFair,
    perlu_perhatian: t.verification.bandAttention,
  }

  return (
    <section
      aria-label={t.verification.detailsTitle}
      className={`rounded-2xl border ${PERMUKAAN[status]}`}
    >
      <div className="flex flex-wrap items-start gap-4 p-4 sm:flex-nowrap">
        <div className="min-w-0 flex-1">
          <p className={`flex items-center gap-2 text-sm font-bold ${TINTA[status]}`}>
            <Ikon className="h-4 w-4 shrink-0" aria-hidden />
            {judul}
          </p>

          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{catatan}</p>

          {/* Kalimat utuh, bukan pasangan label/nilai: templat i18n-nya
              ("Diverifikasi {time}") harus tetap bisa disusun ulang oleh
              penerjemah, dan memecahnya di "{time}" akan rusak begitu ada
              bahasa yang menaruh keterangan waktunya di depan. */}
          <div className="mt-3 space-y-1 text-xs">
            <p className="text-muted-foreground">
              {housing.verifiedAt ? (
                <>
                  {t.verification.lastVerified.split("{time}").map((bagian, i) => (
                    <span key={i}>
                      {bagian}
                      {i === 0 && (
                        <time
                          dateTime={housing.verifiedAt!}
                          suppressHydrationWarning
                          className="font-semibold text-foreground"
                        >
                          {formatRelative(housing.verifiedAt, locale)}
                        </time>
                      )}
                    </span>
                  ))}
                </>
              ) : (
                t.verification.neverVerified
              )}
            </p>
            {housing.lastDataChangeAt && (
              <p className="text-muted-foreground">
                {t.verification.lastUpdated.split("{time}").map((bagian, i) => (
                  <span key={i}>
                    {bagian}
                    {i === 0 && (
                      <time
                        dateTime={housing.lastDataChangeAt!}
                        suppressHydrationWarning
                        className="font-semibold text-foreground"
                      >
                        {formatRelative(housing.lastDataChangeAt, locale)}
                      </time>
                    )}
                  </span>
                ))}
              </p>
            )}
          </div>
        </div>

        {/* Skor. Diberi teks lengkapnya untuk pembaca layar; cincinnya sendiri
            aria-hidden di dalam ConfidenceMeter. */}
        <div className="shrink-0">
          <p className="text-coord mb-1 text-center text-muted-foreground">
            {t.verification.confidence}
          </p>
          <ConfidenceMeter skor={skor} band={band} label={labelBand[band]} ukuran={88} />
          <p className="sr-only">
            {skor} {t.verification.outOf}. {labelBand[band]}. {t.verification.confidenceNote}
          </p>
        </div>
      </div>

      {basi && (
        <p className="mx-4 mb-4 flex items-start gap-2 rounded-xl border border-warn/30 bg-white/70 p-3 text-xs leading-relaxed text-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" aria-hidden />
          {t.verification.staleWarning}
        </p>
      )}

      {/* Disclosure: button[aria-expanded] + region, pola yang diminta
          design.md §6 untuk setiap konten yang bisa dibuka-tutup. */}
      <div className="border-t border-current/10">
        <button
          type="button"
          aria-expanded={terbuka}
          aria-controls={idRincian}
          onClick={() => setTerbuka((v) => !v)}
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-xs font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          {terbuka ? t.verification.hideDetails : t.verification.showDetails}
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform duration-200 ${terbuka ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>

        {terbuka && (
          <div id={idRincian} className="px-4 pb-4">
            <p className="text-coord text-muted-foreground">{t.verification.detailsTitle}</p>
            <ul className="mt-2 divide-y divide-current/10">
              {URUTAN_BIDANG.map((bidang) => {
                const r = rincian.find((x) => x.bidang === bidang)!
                const dicek = cek.get(bidang) ?? null

                return (
                  <li
                    key={bidang}
                    className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2 text-xs"
                  >
                    <span className="font-medium text-foreground">
                      {t.verification.fields[bidang]}
                    </span>
                    <BarisStatus
                      ada={r.ada}
                      terverifikasi={r.terverifikasi}
                      dicek={dicek}
                      locale={locale}
                      teks={{
                        verified: t.verification.fieldVerified,
                        checked: t.verification.fieldChecked,
                        unchecked: t.verification.fieldUnchecked,
                        missing: t.verification.fieldMissing,
                      }}
                    />
                  </li>
                )
              })}
            </ul>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              {t.verification.confidenceNote}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

/**
 * Tiga keadaan per bidang, dan tidak lebih:
 *   ✓ terverifikasi pada pemeriksaan terakhir
 *   ⚠ pernah diperiksa, tetapi tidak pada pemeriksaan terakhir — sertai tanggal
 *   — tidak ada datanya sama sekali, jadi tidak ada yang bisa diperiksa
 */
function BarisStatus({
  ada,
  terverifikasi,
  dicek,
  locale,
  teks,
}: {
  ada: boolean
  terverifikasi: boolean
  dicek: string | null
  locale: "id" | "en"
  teks: { verified: string; checked: string; unchecked: string; missing: string }
}) {
  if (!ada) {
    return (
      <span className="inline-flex items-center gap-1 font-medium text-muted-foreground">
        <Minus className="h-3 w-3 shrink-0" aria-hidden />
        {teks.missing}
      </span>
    )
  }

  if (terverifikasi) {
    return (
      <span className="inline-flex items-center gap-1 font-semibold text-ok">
        <BadgeCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {teks.verified}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 font-medium text-warn">
      <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
      {dicek ? (
        <time dateTime={dicek} suppressHydrationWarning>
          {teks.checked.replace("{time}", formatRelative(dicek, locale))}
        </time>
      ) : (
        teks.unchecked
      )}
    </span>
  )
}
