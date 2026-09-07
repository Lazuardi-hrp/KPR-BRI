"use client"

import { useEffect, useRef, useState } from "react"
import { Crosshair, Loader2, MapPin, Search, X } from "lucide-react"

import { requestUserLocation } from "@/lib/geolocation-utils"
import {
  RADIUS_MAKS_KM,
  RADIUS_MIN_KM,
  type TitikAcuan,
} from "@/lib/pencarian"
import { useTranslation } from "@/lib/i18n"

type Props = {
  titik: TitikAcuan | null
  radiusKm: number | null
  modePilih: boolean
  onTitik: (titik: TitikAcuan | null) => void
  onRadius: (km: number | null) => void
  onModePilih: (aktif: boolean) => void
}

type Saran = { lat: number; lng: number; label: string }

/**
 * "Dari mana Anda mengukur jaraknya?"
 *
 * KENAPA TITIK PILIHAN SENDIRI, BUKAN DAFTAR TEMPAT PENTING
 * Permintaan aslinya menyebut "dekat dengan tempat penting". Basis data ini
 * tidak punya tabel tempat penting, dan mengetikkan koordinat pasar, rumah
 * sakit atau terminal dari ingatan akan menaruh angka yang tidak diverifikasi
 * ke layar orang yang sedang memilih tempat tinggal — persis yang ditolak
 * docs/DATA-TODO.md untuk data perumahan. Membiarkan pengunjung menaruh
 * titiknya sendiri menjawab pertanyaan yang sama tanpa mengarang satu pun
 * koordinat, dan menjawabnya lebih baik: tempat yang penting baginya adalah
 * kantornya atau rumah orang tuanya, bukan daftar yang kami pilihkan.
 *
 * Menggantikan NearestHousingPanel, yang menjalankan geolokasi dari tombol
 * mengambang tersendiri. Dua pintu masuk geolokasi pada satu layar hanya
 * membuat keduanya terasa setengah jadi.
 */
export default function TitikAcuanPicker({
  titik,
  radiusKm,
  modePilih,
  onTitik,
  onRadius,
  onModePilih,
}: Props) {
  const { t } = useTranslation()
  const [mencariLokasi, setMencariLokasi] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)

  const [kueri, setKueri] = useState("")
  const [saran, setSaran] = useState<Saran[] | null>(null)
  const [mencariAlamat, setMencariAlamat] = useState(false)

  // ── Lokasi saya ─────────────────────────────────────────────────────────
  const pakaiLokasiSaya = async () => {
    setGalat(null)
    setMencariLokasi(true)
    try {
      const lokasi = await requestUserLocation()
      onTitik({ ...lokasi, label: t.housingMap.yourLocation, sumber: "saya" })
    } catch (err) {
      // Ditolak dan gagal dibedakan: yang pertama berarti "ubah izin", yang
      // kedua berarti "coba lagi". Menyamakan keduanya membuat orang mencari
      // pengaturan yang tidak perlu diubah.
      setGalat(
        typeof GeolocationPositionError !== "undefined" &&
          err instanceof GeolocationPositionError &&
          err.code === err.PERMISSION_DENIED
          ? t.nearestPanel.locationDenied
          : t.nearestPanel.locationFailed,
      )
    } finally {
      setMencariLokasi(false)
    }
  }

  // ── Cari alamat ─────────────────────────────────────────────────────────
  //
  // Ditunda 400 ms dan permintaan sebelumnya dibatalkan: Nominatim adalah
  // layanan sukarela, dan menembakkan satu permintaan per ketukan papan tik
  // adalah cara tercepat membuat pemasangan ini diblokir.
  const batalRef = useRef<AbortController | null>(null)
  useEffect(() => {
    const q = kueri.trim()
    if (q.length < 3) {
      setSaran(null)
      setMencariAlamat(false)
      return
    }

    const jeda = setTimeout(async () => {
      batalRef.current?.abort()
      const batal = new AbortController()
      batalRef.current = batal
      setMencariAlamat(true)
      try {
        const jawab = await fetch(`/api/geokode?q=${encodeURIComponent(q)}`, {
          signal: batal.signal,
        })
        const data = (await jawab.json()) as { hasil?: Saran[] }
        setSaran(Array.isArray(data.hasil) ? data.hasil : [])
      } catch {
        // Termasuk pembatalan oleh ketukan berikutnya. Pencarian alamat adalah
        // kenyamanan; dua sumber titik lainnya tetap bekerja tanpanya.
        setSaran(null)
      } finally {
        setMencariAlamat(false)
      }
    }, 400)

    return () => clearTimeout(jeda)
  }, [kueri])

  const pilihSaran = (s: Saran) => {
    onTitik({ lat: s.lat, lng: s.lng, label: s.label, sumber: "alamat" })
    setKueri("")
    setSaran(null)
  }

  return (
    <section className="space-y-3">
      <h3 className="text-coord text-brand-orange-ink">{t.mapSearch.measureFrom}</h3>

      {titik ? (
        <div className="flex items-start gap-2 rounded-2xl border border-border bg-accent p-3">
          <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground">
              {titik.sumber === "saya" ? t.housingMap.yourLocation : titik.label}
            </p>
            <p className="text-coord mt-1 text-muted-foreground">
              {Math.abs(titik.lat).toFixed(4)}° {titik.lat >= 0 ? "LU" : "LS"} ·{" "}
              {Math.abs(titik.lng).toFixed(4)}° {titik.lng >= 0 ? "BT" : "BB"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onTitik(null)
              onRadius(null)
            }}
            aria-label={t.mapSearch.clearPoint}
            className="-m-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          {/* Geolokasi adalah permintaan izin: alasannya dinyatakan sebelum
              tombolnya ditekan, bukan sesudah — design.md §5.12. */}
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t.nearestPanel.locationPermissionInfo}
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={pakaiLokasiSaya}
              disabled={mencariLokasi}
              className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-border bg-white px-3 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-accent disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {mencariLokasi ? (
                <Loader2 aria-hidden className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <Crosshair aria-hidden className="h-4 w-4 text-primary" />
              )}
              <span className="truncate">
                {mencariLokasi ? t.mapSearch.locating : t.mapSearch.useMyLocation}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onModePilih(!modePilih)}
              aria-pressed={modePilih}
              className={`flex h-11 items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                modePilih
                  ? "border-brand-orange/50 bg-brand-orange text-brand-orange-fg"
                  : "border-border bg-white text-foreground hover:border-primary/40 hover:bg-accent"
              }`}
            >
              <MapPin aria-hidden className="h-4 w-4" />
              <span className="truncate">
                {modePilih ? t.mapSearch.cancelPick : t.mapSearch.pickOnMap}
              </span>
            </button>
          </div>

          {modePilih && (
            <p aria-live="polite" className="text-xs text-brand-orange-ink">
              {t.mapSearch.pickOnMapHint}
            </p>
          )}

          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              value={kueri}
              onChange={(e) => setKueri(e.target.value)}
              placeholder={t.mapSearch.addressPlaceholder}
              aria-label={t.mapSearch.searchAddress}
              className="h-11 w-full rounded-2xl border border-input bg-white pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>

          {mencariAlamat && (
            <p aria-live="polite" className="text-xs text-muted-foreground">
              {t.mapSearch.searching}
            </p>
          )}
          {!mencariAlamat && saran?.length === 0 && (
            <p aria-live="polite" className="text-xs text-muted-foreground">
              {t.mapSearch.noAddressFound}
            </p>
          )}
          {!!saran?.length && (
            <ul className="space-y-1">
              {saran.map((s) => (
                <li key={`${s.lat},${s.lng},${s.label}`}>
                  <button
                    type="button"
                    onClick={() => pilihSaran(s)}
                    className="flex min-h-11 w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <MapPin aria-hidden className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="line-clamp-2">{s.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {galat && (
        <p
          role="alert"
          className="rounded-xl bg-danger-50 px-3 py-2 text-xs leading-relaxed text-danger"
        >
          {galat}
        </p>
      )}

      {/* Radius baru masuk akal setelah ada titik untuk mengukurnya. */}
      {titik && (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor="filter-radius" className="text-xs font-semibold text-foreground">
              {t.mapSearch.radius}
            </label>
            <span className="numeric text-xs text-muted-foreground">
              {radiusKm == null
                ? t.mapSearch.anyDistance
                : t.mapSearch.radiusValue.replace("{n}", String(radiusKm))}
            </span>
          </div>
          <input
            id="filter-radius"
            type="range"
            min={RADIUS_MIN_KM}
            max={RADIUS_MAKS_KM}
            step={1}
            value={radiusKm ?? RADIUS_MAKS_KM}
            onChange={(e) => onRadius(Number(e.target.value))}
            aria-valuetext={
              radiusKm == null
                ? t.mapSearch.anyDistance
                : t.mapSearch.radiusValue.replace("{n}", String(radiusKm))
            }
            className="h-6 w-full cursor-pointer accent-[var(--brand)]"
          />
          {radiusKm != null && (
            <button
              type="button"
              onClick={() => onRadius(null)}
              className="text-xs font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t.mapSearch.anyDistance}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
