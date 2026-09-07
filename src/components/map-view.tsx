"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import dynamic from "next/dynamic"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { MapPin, ChevronLeft, List, X, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Coord } from "@/components/coord"
import { catatPeristiwa } from "@/components/jejak"
import { useJejakKalkulator } from "@/components/jejak-kalkulator"
import VerificationChip from "./verification-chip"
import HousingPopup from "@/components/housing-popup"
import ChipFilter from "@/components/peta/chip-filter"
import PanelFilter from "@/components/peta/panel-filter"
import PratinjauMarker, { formatJarak } from "@/components/peta/pratinjau-marker"
import { useFocusTrap } from "@/hooks/use-focus-trap"
import { formatIDR } from "@/lib/format"
import { LABEL_KEMAMPUAN, WARNA_KEMAMPUAN, type KonfigSkema } from "@/lib/kpr"
import {
  FILTER_KOSONG,
  bacaFilter,
  daftarKecamatan,
  hitungFacet,
  jumlahAktif,
  rentangUnit,
  terapkanFilter,
  tulisFilter,
  type FilterPeta,
  type HasilSaring,
} from "@/lib/pencarian"
import { useTranslation } from "@/lib/i18n"
import type { Housing } from "@/lib/housing"

/** Leaflet touches `window` on import — it must never render on the server. */
const HousingMap = dynamic(() => import("@/components/housing-map"), {
  ssr: false,
  loading: () => <MapSkeleton />,
})

function MapSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-secondary">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-coord">
          <MapSkeletonLabel />
        </p>
      </div>
    </div>
  )
}

/** Separate client component so the skeleton can access translations safely. */
function MapSkeletonLabel() {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { t } = useTranslation()
    return <>{t.mapPage.loadingMap}</>
  } catch {
    return <>Memuat peta…</>
  }
}

type Props = {
  housingList: Housing[]
  konfig: KonfigSkema
  ditinjauPada: string | null
}

export default function MapView({ housingList, konfig, ditinjauPada }: Props) {
  const { t, locale } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // ── Keadaan pencarian ───────────────────────────────────────────────────
  //
  // Sumber kebenarannya adalah state lokal, bukan URL: penggeser harus
  // bergerak dalam bingkai yang sama dengan jarinya, dan menunggu router
  // membuat setiap gerakan terasa tersendat. URL menyusul dengan penundaan,
  // supaya hasil yang ditemukan seseorang tetap bisa disalin dan dibagikan.
  const qsSekarang = searchParams.toString()
  const [filter, setFilter] = useState<FilterPeta>(() =>
    bacaFilter(new URLSearchParams(qsSekarang)),
  )
  // Query string terakhir yang sudah SELARAS dengan state — entah karena kami
  // yang menulisnya, atau karena kami baru saja membacanya.
  const [qsSelaras, setQsSelaras] = useState(qsSekarang)

  // Arah masuk: tombol maju/mundur peramban, atau URL yang ditempel orang.
  // Disetel saat render, bukan di dalam efek — inilah pola yang disarankan
  // React untuk menyesuaikan state terhadap masukan yang berubah, dan ia
  // menghindari satu putaran render tambahan pada setiap navigasi.
  if (qsSekarang !== qsSelaras) {
    setQsSelaras(qsSekarang)
    setFilter(bacaFilter(new URLSearchParams(qsSekarang)))
  }

  // Arah keluar, dengan penundaan. Perbandingannya terhadap qsSelaras — bukan
  // terhadap URL sekarang — supaya kedua arah tidak saling menimpa: tepat
  // setelah sebuah pembacaan, keduanya sama dan tidak ada yang ditulis.
  useEffect(() => {
    const qs = tulisFilter(filter).toString()
    if (qs === qsSelaras) return
    const jeda = setTimeout(() => {
      setQsSelaras(qs)
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    }, 300)
    return () => clearTimeout(jeda)
  }, [filter, qsSelaras, router, pathname])

  const ubah = useCallback(
    (tambalan: Partial<FilterPeta>) => setFilter((f) => ({ ...f, ...tambalan })),
    [],
  )
  const reset = useCallback(() => setFilter(FILTER_KOSONG), [])

  // ── Turunan ─────────────────────────────────────────────────────────────
  //
  // Facet dihitung dari daftar PENUH. Bila dihitung dari hasil saringan,
  // memilih satu kecamatan akan menyisakan satu nilai dan kontrolnya lenyap
  // tepat pada saat sedang dipakai.
  const facet = useMemo(() => hitungFacet(housingList), [housingList])
  const kecamatan = useMemo(() => daftarKecamatan(housingList), [housingList])
  const unit = useMemo(() => rentangUnit(housingList), [housingList])
  const results = useMemo(
    () => terapkanFilter(housingList, filter, konfig),
    [housingList, filter, konfig],
  )
  const aktif = useMemo(() => jumlahAktif(filter), [filter])

  // Masukan anggaran di peta adalah pemakaian kalkulator seperti di /simulasi.
  // Memakai kembali kait yang sama berarti corong analitik tetap utuh tanpa
  // nilai enum baru dan tanpa migrasi.
  useJejakKalkulator(null, [
    filter.penghasilan ?? 0,
    filter.dpPersen ?? 0,
    filter.tenor ?? 0,
  ])

  // ── Pilihan dan dialog ──────────────────────────────────────────────────
  //
  // Keduanya dipisah sejak semula: menutup dialog harus meninggalkan
  // perumahannya tetap tersorot — pin oranye, baris oranye — bukan menghapus
  // jejak apa yang baru saja dilihat.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detailHousing, setDetailHousing] = useState<Housing | null>(null)
  const [lembar, setLembar] = useState<"tutup" | "buka">("tutup")
  const [modePilih, setModePilih] = useState(false)

  // Satu-satunya tempat minat dari peta dicatat. Mencatatnya di penanda saja
  // akan melewatkan jalur yang tidak pernah menyentuh penanda.
  const pilih = useCallback((housing: Housing) => {
    setSelectedId(housing.id)
    catatPeristiwa("click_peta", housing.id)
  }, [])

  const bukaDetail = useCallback(
    (housing: Housing) => {
      pilih(housing)
      setDetailHousing(housing)
      setLembar("tutup")
    },
    [pilih],
  )

  const mulaiPilihTitik = useCallback((aktifkan: boolean) => {
    setModePilih(aktifkan)
    // Peta harus terlihat untuk bisa diketuk; lembar yang menutupinya
    // membuat mode ini tidak mungkin dijalankan di ponsel.
    if (aktifkan) setLembar("tutup")
  }, [])

  const pilihTitik = useCallback(
    (lat: number, lng: number) => {
      ubah({ titik: { lat, lng, label: t.mapSearch.referencePoint, sumber: "peta" } })
      setModePilih(false)
    },
    [ubah, t],
  )

  // Objek literal di dalam JSX akan menjadi referensi baru setiap render, dan
  // ini adalah dependensi efek penanda titik acuan di HousingMap — tanpa memo,
  // peta akan memusatkan ulang dirinya pada setiap ketukan papan tik.
  const coordLabels = useMemo(
    () => ({ north: t.hero.coordNorth, south: "LS", east: t.hero.coordEast, west: "BB" }),
    [t],
  )

  const pratinjau = useCallback(
    (hasil: HasilSaring, tutup: () => void) => (
      <PratinjauMarker
        hasil={hasil}
        onDetail={() => bukaDetail(hasil.housing)}
        onTutup={tutup}
      />
    ),
    [bukaDetail],
  )

  const lembarRef = useFocusTrap<HTMLElement>(lembar === "buka", () => setLembar("tutup"))

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* The basemap is this page's LCP element; skip the cold TLS handshake. */}
      {["a", "b", "c"].map((sub) => (
        <link
          key={sub}
          rel="preconnect"
          href={`https://${sub}.tile.openstreetmap.org`}
          crossOrigin="anonymous"
        />
      ))}
      <nav className="z-40 shrink-0 border-b border-border bg-white">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between gap-2 sm:h-16">
            <Link href="/" className="group">
              <div className="flex items-center gap-1 text-muted-foreground transition-colors group-hover:text-primary sm:gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white transition-colors group-hover:border-primary/40">
                  <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                </span>
                <span className="sr-only text-sm font-semibold sm:not-sr-only sm:text-base">
                  {t.common.backToHome}
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <MapPin className="h-4 w-4 text-primary" />
              </span>
              <span className="font-display text-base font-bold tracking-tight sm:text-lg">
                {t.mapPage.housingMap}
              </span>
            </div>

            <div className="relative h-10 w-14 sm:h-12 sm:w-16">
              <Image
                src="/logobri.webp"
                alt="BRI"
                fill
                sizes="64px"
                className="object-contain"
                priority
              />
            </div>
          </div>
        </div>
      </nav>

      <main id="main" className="relative flex min-h-0 flex-1 gap-0 overflow-hidden">
        <h1 className="sr-only">{t.mapPage.screenReaderTitle}</h1>

        <div className="relative min-h-0 w-full flex-1">
          <HousingMap
            results={results}
            selectedId={selectedId}
            onSelect={pilih}
            titik={filter.titik}
            radiusKm={filter.radiusKm}
            modePilih={modePilih}
            onPilihTitik={pilihTitik}
            pratinjau={pratinjau}
            userLocationLabel={t.housingMap.yourLocation}
            coordLabels={coordLabels}
          />

          {/* Baris chip di ponsel: melayang di atas peta, tepat di bawah nav.
              Kembarannya ada di kepala bilah samping untuk layar lebar. Hanya
              satu yang pernah tampil (`md:hidden` / `hidden md:block`), dan
              subpohon display:none tidak diumumkan pembaca layar — jadi tidak
              ada aria-live ganda. */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3 md:hidden">
            <div className="pointer-events-auto rounded-2xl border border-border bg-white/95 p-2.5 shadow-e2 backdrop-blur-md">
              <ChipFilter
                filter={filter}
                onChange={ubah}
                onReset={reset}
                onBuka={() => setLembar("buka")}
                jumlah={results.length}
                total={housingList.length}
                aktif={aktif}
              />
            </div>
          </div>
        </div>

        {lembar === "buka" && (
          <div
            className="fixed inset-0 z-30 bg-ink/60 backdrop-blur-sm md:hidden"
            onClick={() => setLembar("tutup")}
          />
        )}

        <aside
          ref={lembarRef}
          aria-label={t.mapPage.housingList}
          className={`fixed bottom-0 left-0 right-0 z-40 flex h-[85vh] w-full flex-col border-t border-border bg-card transition-transform duration-300 ease-out md:static md:z-0 md:h-full md:w-96 md:shrink-0 md:translate-y-0 md:border-l md:border-t-0 ${
            lembar === "buka" ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="shrink-0 space-y-3 border-b border-border bg-card/95 p-4 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-bold tracking-tight sm:text-lg">
                  {t.mapPage.housingList}
                </h2>
                <p className="text-coord mt-2 text-brand-orange-ink">
                  {housingList.length} {t.mapPage.locations} · {t.hero.pematangSiantar}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLembar("tutup")}
                aria-label={t.mapSearch.closeFilters}
                className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="hidden md:block">
              <ChipFilter
                filter={filter}
                onChange={ubah}
                onReset={reset}
                onBuka={() => setLembar("buka")}
                jumlah={results.length}
                total={housingList.length}
                aktif={aktif}
              />
            </div>
          </div>

          <div data-lenis-prevent className="sidebar-scroll-area min-h-0 flex-1 overflow-y-auto">
            <div className="space-y-4 p-3 sm:p-4">
              <PanelFilter
                filter={filter}
                onChange={ubah}
                onReset={reset}
                facet={facet}
                kecamatan={kecamatan}
                unit={unit}
                konfig={konfig}
                ditinjauPada={ditinjauPada}
                modePilih={modePilih}
                onModePilih={mulaiPilihTitik}
                aktif={aktif}
              />

              <hr className="border-border" />

              {housingList.length === 0 && (
                <Card className="p-6 text-center">
                  <Image
                    src="/placeholder.svg"
                    alt=""
                    width={160}
                    height={120}
                    unoptimized
                    className="mx-auto rounded-xl"
                  />
                  <p className="mt-4 text-sm text-muted-foreground">
                    {t.mapPage.noHousingData}
                  </p>
                </Card>
              )}

              {housingList.length > 0 && results.length === 0 && (
                <div className="space-y-2 py-6 text-center">
                  <p className="text-sm font-semibold text-foreground">
                    {t.mapSearch.noMatches}
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {t.mapSearch.noMatchesHint}
                  </p>
                  <button
                    type="button"
                    onClick={reset}
                    className="h-11 rounded-full border border-border bg-white px-5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {t.mapSearch.reset}
                  </button>
                </div>
              )}

              <ul className="space-y-2.5">
                {results.map(({ housing, jarakKm, angsuran, band }) => {
                  const active = selectedId === housing.id
                  return (
                    <li key={housing.id}>
                      <Card
                        role="button"
                        tabIndex={0}
                        aria-pressed={active}
                        className={`lift group cursor-pointer p-3 hover:border-brand-orange/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          active
                            ? "border-brand-orange/50 shadow-e3 ring-2 ring-brand-orange/25"
                            : ""
                        }`}
                        onClick={() => bukaDetail(housing)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            bukaDetail(housing)
                          }
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${
                              active
                                ? "marker-ping bg-brand-orange text-brand-orange-fg"
                                : "bg-primary/10 text-primary group-hover:bg-primary/20"
                            }`}
                          >
                            <MapPin className="relative h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-sm font-semibold text-foreground">
                              {housing.name}
                            </h3>
                            <Coord lat={housing.lat} lng={housing.lng} as="div" className="mt-1.5" />
                            <p className="mt-1.5 line-clamp-1 text-xs text-muted-foreground sm:hidden">
                              {housing.description}
                            </p>

                            {/* Angsuran menggantikan rentang harga begitu
                                penghasilan diisi: "Rp 1,24 jt/bulan" menjawab
                                pertanyaan yang sebenarnya, "Rp 166.000.000"
                                hanya mengulang angka yang sama enam belas kali. */}
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <span className="numeric truncate rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                                {housing.availableUnits} {t.common.subsidyUnit}
                              </span>
                              {angsuran != null && filter.penghasilan ? (
                                <span
                                  className="numeric truncate rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium"
                                  style={band ? { color: WARNA_KEMAMPUAN[band] } : undefined}
                                >
                                  {formatIDR(angsuran)}
                                  {t.mapSearch.perMonth}
                                  {band ? ` · ${LABEL_KEMAMPUAN[band]}` : ""}
                                </span>
                              ) : (
                                <span className="numeric truncate rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-foreground">
                                  {housing.priceRange}
                                </span>
                              )}
                              {jarakKm != null && (
                                <span className="numeric truncate rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-primary">
                                  {formatJarak(jarakKm, locale)}
                                </span>
                              )}
                            </div>

                            <VerificationChip
                              status={housing.verificationStatus}
                              verifiedAt={housing.verifiedAt}
                              className="mt-2"
                            />
                          </div>
                        </div>
                      </Card>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </aside>
      </main>

      {/* Bilah samping tidak punya pemicu di ponsel selain memilih penanda. */}
      {lembar === "tutup" && (
        <button
          type="button"
          onClick={() => setLembar("buka")}
          aria-expanded={false}
          className="fixed bottom-6 right-4 z-40 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-glow-brand transition-shadow hover:shadow-e4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:hidden"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
        >
          <List className="h-5 w-5" />
          <span className="numeric">
            {t.common.list} ({results.length})
          </span>
        </button>
      )}

      {detailHousing && (
        <HousingPopup housing={detailHousing} onClose={() => setDetailHousing(null)} />
      )}
    </div>
  )
}
