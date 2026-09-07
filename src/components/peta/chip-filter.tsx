"use client"

import { SlidersHorizontal, X } from "lucide-react"

import { formatIDR } from "@/lib/format"
import { LABEL_KEMAMPUAN } from "@/lib/kpr"
import type { FilterPeta } from "@/lib/pencarian"
import { useTranslation } from "@/lib/i18n"

type Props = {
  filter: FilterPeta
  onChange: (tambalan: Partial<FilterPeta>) => void
  onReset: () => void
  onBuka: () => void
  jumlah: number
  total: number
  aktif: number
}

/**
 * Baris ringkas di atas hasil: apa yang sedang menyala, dan berapa yang
 * tersisa.
 *
 * Ini yang menjaga janji "sederhana di ponsel". Kontrol lengkapnya tinggal di
 * lembar yang harus dibuka; yang selalu terlihat hanya filter yang benar-benar
 * dipakai — jadi keadaan bawaan nyaris kosong, dan setiap chip yang muncul
 * adalah sesuatu yang pengunjungnya sendiri nyalakan dan bisa dimatikan di
 * tempat, tanpa membuka apa pun.
 */
export default function ChipFilter({
  filter,
  onChange,
  onReset,
  onBuka,
  jumlah,
  total,
  aktif,
}: Props) {
  const { t } = useTranslation()

  const chips: { kunci: string; label: string; hapus: () => void }[] = []

  if (filter.q.trim())
    chips.push({ kunci: "q", label: `“${filter.q.trim()}”`, hapus: () => onChange({ q: "" }) })

  for (const k of filter.kecamatan)
    chips.push({
      kunci: `kec-${k}`,
      label: k,
      hapus: () => onChange({ kecamatan: filter.kecamatan.filter((x) => x !== k) }),
    })

  if (filter.unitMin != null)
    chips.push({
      kunci: "unit",
      label: t.mapSearch.minUnits.replace("{n}", String(filter.unitMin)),
      hapus: () => onChange({ unitMin: null }),
    })

  if (filter.titik)
    chips.push({
      kunci: "titik",
      label:
        filter.titik.sumber === "saya" ? t.housingMap.yourLocation : filter.titik.label,
      // Radius tanpa titik acuan tidak berarti apa-apa, jadi keduanya padam
      // bersama-sama.
      hapus: () => onChange({ titik: null, radiusKm: null }),
    })

  if (filter.radiusKm != null)
    chips.push({
      kunci: "radius",
      label: t.mapSearch.radiusValue.replace("{n}", String(filter.radiusKm)),
      hapus: () => onChange({ radiusKm: null }),
    })

  if (filter.penghasilan != null && filter.penghasilan > 0)
    chips.push({
      kunci: "inc",
      label: `${formatIDR(filter.penghasilan)}${t.mapSearch.perMonth}`,
      // Band adalah turunan dari penghasilan; menyisakannya menyala setelah
      // penghasilannya dihapus akan menyaring dengan angka yang tak terlihat.
      hapus: () => onChange({ penghasilan: null, bandMaks: null }),
    })

  if (filter.bandMaks)
    chips.push({
      kunci: "band",
      label: LABEL_KEMAMPUAN[filter.bandMaks],
      hapus: () => onChange({ bandMaks: null }),
    })

  if (filter.hargaMin != null || filter.hargaMaks != null)
    chips.push({
      kunci: "harga",
      label: [
        filter.hargaMin != null ? formatIDR(filter.hargaMin) : null,
        filter.hargaMaks != null ? formatIDR(filter.hargaMaks) : null,
      ]
        .filter(Boolean)
        .join(" – "),
      hapus: () => onChange({ hargaMin: null, hargaMaks: null }),
    })

  if (filter.tipe)
    chips.push({
      kunci: "tipe",
      label: filter.tipe,
      hapus: () => onChange({ tipe: null }),
    })

  if (filter.kamarMin != null)
    chips.push({
      kunci: "kamar",
      label: `≥ ${filter.kamarMin}`,
      hapus: () => onChange({ kamarMin: null }),
    })

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBuka}
          aria-label={t.mapSearch.openFilters}
          className={`flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden ${
            aktif > 0
              ? "border-brand-orange/50 bg-brand-orange text-brand-orange-fg"
              : "border-border bg-white text-foreground hover:border-primary/40"
          }`}
        >
          <SlidersHorizontal aria-hidden className="h-4 w-4" />
          {aktif > 0
            ? t.mapSearch.filterCount.replace("{n}", String(aktif))
            : t.mapSearch.filters}
        </button>

        <p aria-live="polite" className="numeric text-coord text-brand-orange-ink">
          {t.mapSearch.results
            .replace("{n}", String(jumlah))
            .replace("{m}", String(total))}
        </p>

        {aktif > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="ml-auto shrink-0 text-xs font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t.mapSearch.reset}
          </button>
        )}
      </div>

      {chips.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <li key={c.kunci}>
              <button
                type="button"
                onClick={c.hapus}
                className="flex min-h-8 max-w-[15rem] items-center gap-1 rounded-full border border-border bg-secondary py-1 pl-2.5 pr-1.5 text-xs font-medium text-foreground transition-colors hover:border-danger/40 hover:bg-danger-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="truncate">{c.label}</span>
                <X aria-hidden className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="sr-only">{t.mapSearch.reset}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
