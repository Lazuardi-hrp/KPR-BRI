"use client"

import { useMemo, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import Image from "next/image"
import { MapPin, ChevronLeft, List, X, Loader2, Search } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Coord } from "@/components/coord"
import HousingPopup from "@/components/housing-popup"
import NearestHousingPanel from "@/components/nearest-housing-panel"
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

export default function MapView({ housingList }: { housingList: Housing[] }) {
  const { t } = useTranslation()
  // Selection and the detail dialog are separate: closing the popup should leave
  // the perumahan highlighted — orange pin, orange sidebar row — not wipe every
  // trace of what you just looked at.
  const [selectedHousing, setSelectedHousing] = useState<Housing | null>(null)
  const [detailHousing, setDetailHousing] = useState<Housing | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [showSidebar, setShowSidebar] = useState(false)
  const [query, setQuery] = useState("")

  // Geolocation is never requested on mount — it happens only after an explicit
  // click in NearestHousingPanel, which explains why before asking.

  const openHousing = (housing: Housing) => {
    setSelectedHousing(housing)
    setDetailHousing(housing)
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return housingList
    return housingList.filter(
      (h) =>
        h.name.toLowerCase().includes(q) || h.description.toLowerCase().includes(q),
    )
  }, [housingList, query])

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

      <main id="main" className="flex min-h-0 flex-1 gap-0 overflow-hidden">
        <h1 className="sr-only">{t.mapPage.screenReaderTitle}</h1>
        <div className="relative min-h-0 w-full flex-1">
          <HousingMap
            housingList={housingList}
            selectedHousing={selectedHousing}
            onMarkerClick={openHousing}
            userLocation={userLocation}
            userLocationLabel={t.housingMap.yourLocation}
            coordLabels={{
              north: t.hero.coordNorth,
              south: "LS",
              east: t.hero.coordEast,
              west: "BB",
            }}
          />
        </div>

        {showSidebar && (
          <div
            className="fixed inset-0 z-30 bg-ink/60 backdrop-blur-sm md:hidden"
            onClick={() => setShowSidebar(false)}
          />
        )}

        <aside
          aria-label={t.mapPage.housingList}
          className={`fixed bottom-0 left-0 right-0 z-40 flex h-[60vh] w-full flex-col border-t border-border bg-card transition-transform duration-300 ease-out md:static md:z-0 md:h-full md:w-96 md:shrink-0 md:translate-y-0 md:border-l md:border-t-0 ${
            showSidebar ? "translate-y-0" : "translate-y-full"
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
                onClick={() => setShowSidebar(false)}
                aria-label={t.mapPage.closeList}
                className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.mapPage.searchPlaceholder}
                aria-label={t.mapPage.searchAriaLabel}
                className="h-11 w-full rounded-2xl border border-input bg-white pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </div>
          </div>

          <div data-lenis-prevent className="sidebar-scroll-area min-h-0 flex-1 overflow-y-auto">
            <div className="space-y-2.5 p-3 sm:p-4">
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

              {housingList.length > 0 && filtered.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t.mapPage.noResults.replace("{query}", query)}
                </p>
              )}

              {filtered.map((housing) => {
                const active = selectedHousing?.id === housing.id
                return (
                  <Card
                    key={housing.id}
                    role="button"
                    tabIndex={0}
                    aria-pressed={active}
                    className={`lift group cursor-pointer p-3 hover:border-brand-orange/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      active ? "border-brand-orange/50 shadow-e3 ring-2 ring-brand-orange/25" : ""
                    }`}
                    onClick={() => {
                      openHousing(housing)
                      setShowSidebar(false)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        openHousing(housing)
                        setShowSidebar(false)
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
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="numeric truncate rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                            {housing.availableUnits} {t.common.subsidyUnit}
                          </span>
                          <span className="numeric truncate rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-foreground">
                            {housing.priceRange}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        </aside>
      </main>

      {/* The sidebar had no trigger on mobile — it could only be opened by
          selecting a marker. */}
      {!showSidebar && (
        <button
          type="button"
          onClick={() => setShowSidebar(true)}
          aria-expanded={showSidebar}
          className="fixed right-4 top-[4.5rem] z-40 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-glow-brand transition-shadow hover:shadow-e4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:hidden"
        >
          <List className="h-5 w-5" />
          <span className="numeric">{t.common.list} ({housingList.length})</span>
        </button>
      )}

      {detailHousing && (
        <HousingPopup housing={detailHousing} onClose={() => setDetailHousing(null)} />
      )}

      <NearestHousingPanel
        housingList={housingList}
        onUserLocationDetected={setUserLocation}
        onSelectHousing={openHousing}
      />
    </div>
  )
}
