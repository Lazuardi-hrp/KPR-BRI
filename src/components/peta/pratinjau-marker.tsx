"use client"

import Image from "next/image"
import { ArrowRight, X } from "lucide-react"

import { Coord } from "@/components/coord"
import VerificationChip from "@/components/verification-chip"
import { coverBlur } from "@/lib/image-blur"
import { formatIDR } from "@/lib/format"
import { LABEL_KEMAMPUAN, WARNA_KEMAMPUAN } from "@/lib/kpr"
import type { HasilSaring } from "@/lib/pencarian"
import { useTranslation } from "@/lib/i18n"

/**
 * Pratinjau sebuah perumahan, tepat di atas penandanya.
 *
 * Perannya adalah jembatan: cukup untuk memutuskan "yang ini layak dibuka"
 * tanpa membuka apa pun, dan satu tombol untuk membukanya sungguhan. Sebelum
 * ini, popup penanda hanya berisi nama — yang berarti satu-satunya cara
 * mengetahui apa pun tentang sebuah pin adalah membuka dialog penuh dan
 * menutupnya lagi, enam belas kali.
 *
 * Ditanam ke dalam popup Leaflet lewat createPortal (lihat housing-map.tsx),
 * bukan dirakit sebagai untaian HTML — sehingga terjemahan, token warna, dan
 * pelolosan teks bekerja seperti di komponen lain.
 */
export default function PratinjauMarker({
  hasil,
  onDetail,
  onTutup,
}: {
  hasil: HasilSaring
  onDetail: () => void
  onTutup: () => void
}) {
  const { t, locale } = useTranslation()
  const { housing: h, jarakKm, angsuran, band } = hasil

  return (
    <div className="atlas-pratinjau w-[248px] overflow-hidden rounded-[0.875rem] bg-card text-left sm:w-[288px]">
      <div className="relative aspect-[16/9] w-full bg-secondary">
        {h.image ? (
          <Image
            src={h.image}
            alt=""
            fill
            sizes="288px"
            className="object-cover"
            placeholder={coverBlur(h) ? "blur" : "empty"}
            blurDataURL={coverBlur(h)}
          />
        ) : (
          <Image src="/placeholder.svg" alt="" fill unoptimized className="object-cover" />
        )}
        <button
          type="button"
          onClick={onTutup}
          aria-label={t.mapSearch.closePreview}
          className="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-foreground shadow-e2 backdrop-blur-sm transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2 p-3">
        <div>
          <h3 className="font-display text-sm font-bold leading-tight text-foreground">
            {h.name}
          </h3>
          <Coord lat={h.lat} lng={h.lng} as="div" className="mt-1" />
        </div>

        {/* Angsuran hanya muncul bila perumahannya memang berharga. Menampilkan
            "Rp 0/bulan" untuk harga yang belum diisi akan menjadi angka
            karangan pada layar orang yang sedang menghitung rumahnya. */}
        {angsuran != null && (
          <div className="flex items-baseline justify-between gap-2 rounded-xl bg-accent px-2.5 py-2">
            <span className="numeric text-sm font-bold text-primary">
              {formatIDR(angsuran)}
              <span className="text-xs font-medium text-muted-foreground">
                {t.mapSearch.perMonth}
              </span>
            </span>
            {band && (
              <span
                className="text-coord flex shrink-0 items-center gap-1"
                style={{ color: WARNA_KEMAMPUAN[band] }}
              >
                <span
                  aria-hidden
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: WARNA_KEMAMPUAN[band] }}
                />
                {LABEL_KEMAMPUAN[band]}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          <span className="numeric rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            {t.mapSearch.unitsLeft.replace("{n}", String(h.availableUnits))}
          </span>
          {jarakKm != null && (
            <span className="numeric rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-foreground">
              {formatJarak(jarakKm, locale)}
            </span>
          )}
        </div>

        <VerificationChip status={h.verificationStatus} verifiedAt={h.verifiedAt} />

        <button
          type="button"
          onClick={onDetail}
          className="group flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-brand-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {t.mapSearch.viewDetail}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  )
}

/**
 * Jarak dalam bahasa yang dipakai orang: meter di bawah satu kilometer, satu
 * desimal di atasnya — "850 m", "1,2 km".
 *
 * Diekspor supaya baris daftar di bilah samping dan pratinjau penanda memakai
 * ejaan yang sama. Bentuknya diwarisi dari NearestHousingPanel, yang digantikan
 * filter jarak di panel pencarian; dua pintu masuk geolokasi pada satu layar
 * hanya membuat keduanya terasa setengah jadi.
 */
export function formatJarak(km: number, locale: "id" | "en") {
  if (km < 1) return `${Math.round(km * 1000).toLocaleString(locale === "id" ? "id-ID" : "en-US")} m`
  return `${km.toLocaleString(locale === "id" ? "id-ID" : "en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} km`
}
