"use client"

import { Search } from "lucide-react"

import TitikAcuanPicker from "@/components/peta/titik-acuan"
import { formatIDR } from "@/lib/format"
import {
  DISCLAIMER,
  LABEL_KEMAMPUAN,
  WARNA_KEMAMPUAN,
  type BandKemampuan,
  type KonfigSkema,
} from "@/lib/kpr"
import type { FacetTersedia, FilterPeta } from "@/lib/pencarian"
import { useTranslation } from "@/lib/i18n"

type Props = {
  filter: FilterPeta
  onChange: (tambalan: Partial<FilterPeta>) => void
  onReset: () => void
  facet: FacetTersedia
  kecamatan: { nilai: string; jumlah: number }[]
  unit: { min: number; maks: number }
  konfig: KonfigSkema
  ditinjauPada: string | null
  modePilih: boolean
  onModePilih: (aktif: boolean) => void
  aktif: number
}

/** Band yang masuk akal sebagai batas atas. "melebihi" tidak: memilihnya
 *  berarti tidak menyaring apa pun, yang sudah diwakili "semua angsuran". */
const BAND_PILIHAN: BandKemampuan[] = ["aman", "wajar", "ketat"]

/**
 * Seluruh kontrol pencarian.
 *
 * Yang menentukan bentuknya bukan daftar keinginan, melainkan data: kontrol
 * hanya digambar untuk dimensi yang facet-nya bernilai true. Hari ini itu
 * berarti kecamatan, ketersediaan, jarak dan anggaran — harga, tipe dan
 * jumlah kamar tidak digambar karena ke-16 baris berbagi satu harga, semuanya
 * subsidi, dan kolom kamarnya kosong (docs/DATA-TODO.md §4–§5). Begitu
 * petugas mengisinya lewat /admin, kontrolnya muncul sendiri.
 *
 * Penggeser mati yang tidak pernah mengubah hasil lebih merusak kepercayaan
 * daripada filter yang tidak ada: yang satu terbaca sebagai aplikasi rusak,
 * yang lain sebagai aplikasi sederhana.
 */
export default function PanelFilter({
  filter,
  onChange,
  onReset,
  facet,
  kecamatan,
  unit,
  konfig,
  ditinjauPada,
  modePilih,
  onModePilih,
  aktif,
}: Props) {
  const { t } = useTranslation()

  // Uang muka dan tenor ditampilkan memakai skema subsidi: ke-16 perumahan
  // berada di bawah batas harga subsidi, jadi itulah skema yang benar-benar
  // dipakai. hitungKPR tetap memilih skema per perumahan, sehingga rumah
  // komersial yang muncul kemudian tetap dihitung dengan parameternya sendiri.
  const s = konfig.subsidi
  const dp = filter.dpPersen ?? s.dpDefaultPersen
  const tenor = filter.tenor ?? s.tenorDefault

  const toggleKecamatan = (nilai: string) => {
    const ada = filter.kecamatan.includes(nilai)
    onChange({
      kecamatan: ada
        ? filter.kecamatan.filter((k) => k !== nilai)
        : [...filter.kecamatan, nilai],
    })
  }

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="search"
          value={filter.q}
          onChange={(e) => onChange({ q: e.target.value })}
          placeholder={t.mapPage.searchPlaceholder}
          aria-label={t.mapPage.searchAriaLabel}
          className="h-11 w-full rounded-2xl border border-input bg-white pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>

      {facet.kecamatan && (
        <fieldset className="space-y-2">
          <legend className="text-coord text-brand-orange-ink">{t.mapSearch.district}</legend>
          <div className="flex flex-wrap gap-1.5">
            {kecamatan.map((k) => {
              const dipilih = filter.kecamatan.includes(k.nilai)
              return (
                <button
                  key={k.nilai}
                  type="button"
                  onClick={() => toggleKecamatan(k.nilai)}
                  aria-pressed={dipilih}
                  className={`min-h-11 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    dipilih
                      ? "border-brand-orange/50 bg-brand-orange text-brand-orange-fg"
                      : "border-border bg-white text-foreground hover:border-primary/40 hover:bg-accent"
                  }`}
                >
                  {k.nilai}{" "}
                  <span className="numeric opacity-70">({k.jumlah})</span>
                </button>
              )
            })}
          </div>
        </fieldset>
      )}

      {facet.unit && (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor="filter-unit" className="text-coord text-brand-orange-ink">
              {t.mapSearch.availability}
            </label>
            <span className="numeric text-xs text-muted-foreground">
              {filter.unitMin == null
                ? t.mapSearch.anyDistance
                : t.mapSearch.minUnits.replace("{n}", String(filter.unitMin))}
            </span>
          </div>
          <input
            id="filter-unit"
            type="range"
            min={unit.min}
            max={unit.maks}
            step={1}
            value={filter.unitMin ?? unit.min}
            onChange={(e) => {
              const n = Number(e.target.value)
              onChange({ unitMin: n <= unit.min ? null : n })
            }}
            aria-valuetext={t.mapSearch.minUnits.replace(
              "{n}",
              String(filter.unitMin ?? unit.min),
            )}
            className="h-6 w-full cursor-pointer accent-[var(--brand)]"
          />
        </div>
      )}

      <hr className="border-border" />

      <TitikAcuanPicker
        titik={filter.titik}
        radiusKm={filter.radiusKm}
        modePilih={modePilih}
        onTitik={(titik) => onChange({ titik })}
        onRadius={(radiusKm) => onChange({ radiusKm })}
        onModePilih={onModePilih}
      />

      <hr className="border-border" />

      {/* ── Anggaran ──────────────────────────────────────────────────────
          Menghubungkan peta dengan kalkulator: satu penghasilan yang diketik
          di sini mengubah setiap baris daftar dan setiap pratinjau penanda
          menjadi "berapa angsurannya untuk saya", bukan sekadar harga. */}
      <section className="space-y-3">
        <h3 className="text-coord text-brand-orange-ink">{t.mapSearch.budget}</h3>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t.mapSearch.budgetHint}
        </p>

        <div className="space-y-1.5">
          <label htmlFor="filter-inc" className="text-xs font-semibold text-foreground">
            {t.mapSearch.monthlyIncome}
          </label>
          <div className="flex items-center gap-2 rounded-2xl border border-input bg-white px-3 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-ring/40">
            <span className="text-sm font-medium text-muted-foreground">Rp</span>
            <input
              id="filter-inc"
              type="text"
              inputMode="numeric"
              value={filter.penghasilan ? filter.penghasilan.toLocaleString("id-ID") : ""}
              onChange={(e) => {
                const n = Number(e.target.value.replace(/\D/g, ""))
                onChange({ penghasilan: n > 0 ? Math.min(n, 1_000_000_000) : null })
              }}
              placeholder="0"
              className="numeric h-11 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor="filter-dp" className="text-xs font-semibold text-foreground">
              {t.mapSearch.downPayment}
            </label>
            <span className="numeric text-xs text-muted-foreground">{dp}%</span>
          </div>
          <input
            id="filter-dp"
            type="range"
            min={s.dpMinPersen}
            max={50}
            step={1}
            value={dp}
            onChange={(e) => onChange({ dpPersen: Number(e.target.value) })}
            aria-valuetext={`${dp}%`}
            className="h-6 w-full cursor-pointer accent-[var(--brand)]"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor="filter-tenor" className="text-xs font-semibold text-foreground">
              {t.mapSearch.tenor}
            </label>
            <span className="numeric text-xs text-muted-foreground">
              {t.mapSearch.tenorYears.replace("{n}", String(tenor))}
            </span>
          </div>
          <input
            id="filter-tenor"
            type="range"
            min={1}
            max={s.tenorMax}
            step={1}
            value={tenor}
            onChange={(e) => onChange({ tenor: Number(e.target.value) })}
            aria-valuetext={t.mapSearch.tenorYears.replace("{n}", String(tenor))}
            className="h-6 w-full cursor-pointer accent-[var(--brand)]"
          />
        </div>

        {/* Band baru bisa dihitung setelah ada penghasilan; menawarkan
            saringannya lebih dulu hanya menyediakan tombol yang tidak
            melakukan apa-apa. */}
        {filter.penghasilan != null && filter.penghasilan > 0 && (
          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold text-foreground">
              {t.mapSearch.showOnly}
            </legend>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onChange({ bandMaks: null })}
                aria-pressed={filter.bandMaks == null}
                className={`min-h-11 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  filter.bandMaks == null
                    ? "border-brand-orange/50 bg-brand-orange text-brand-orange-fg"
                    : "border-border bg-white text-foreground hover:border-primary/40 hover:bg-accent"
                }`}
              >
                {t.mapSearch.anyInstalment}
              </button>
              {BAND_PILIHAN.map((band) => {
                const dipilih = filter.bandMaks === band
                return (
                  <button
                    key={band}
                    type="button"
                    onClick={() => onChange({ bandMaks: dipilih ? null : band })}
                    aria-pressed={dipilih}
                    className={`min-h-11 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      dipilih
                        ? "border-brand-orange/50 bg-brand-orange text-brand-orange-fg"
                        : "border-border bg-white text-foreground hover:border-primary/40 hover:bg-accent"
                    }`}
                  >
                    <span
                      aria-hidden
                      className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle"
                      style={{ background: WARNA_KEMAMPUAN[band] }}
                    />
                    {LABEL_KEMAMPUAN[band]}
                  </button>
                )
              })}
            </div>
          </fieldset>
        )}

        {/* design.md §7.3: setiap permukaan yang menayangkan angsuran wajib
            menyertakan kalimat ini, dan bunga yang dipakai wajib yang
            berlaku — dibaca dari app_settings, bukan yang dikompilasi. */}
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {DISCLAIMER}
          {ditinjauPada && (
            <>
              {" "}
              <span className="numeric">
                {t.mapSearch.estimateFrom.replace("{date}", ditinjauPada)}
              </span>
            </>
          )}
        </p>
      </section>

      {aktif > 0 && (
        <button
          type="button"
          onClick={onReset}
          className="h-11 w-full rounded-full border border-border bg-white text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t.mapSearch.reset}
        </button>
      )}
    </div>
  )
}

/** Dipakai chip filter agar rentang harga tampil dengan ejaan yang sama. */
export const ringkasHarga = (min: number | null, maks: number | null) =>
  [min != null ? formatIDR(min) : null, maks != null ? formatIDR(maks) : null]
    .filter(Boolean)
    .join(" – ")
