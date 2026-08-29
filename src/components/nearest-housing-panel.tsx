"use client"

import { AnimatePresence, motion } from "motion/react"
import { useState } from "react"
import { MapPin, Navigation, AlertCircle, Loader, X } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card"
import { Button } from "./ui/button"
import { Coord } from "./coord"
import {
  requestUserLocation,
  getNearestHousing,
  type Coordinates,
  type HousingDistance,
} from "../lib/geolocation-utils"
import type { Housing } from "../lib/housing"
import { useTranslation } from "../lib/i18n"

interface NearestHousingPanelProps {
  housingList: Housing[]
  onSelectHousing: (housing: Housing) => void
  onUserLocationDetected?: (location: Coordinates | null) => void
}

/** `1,2 km` above a kilometre, `850 m` below it — locale formatting. */
function formatDistance(km: number, locale: string) {
  if (km < 1) return `${Math.round(km * 1000).toLocaleString(locale)} m`
  return `${km.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`
}

export default function NearestHousingPanel({
  housingList,
  onSelectHousing,
  onUserLocationDetected,
}: NearestHousingPanelProps) {
  const { t, locale } = useTranslation()
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null)
  const [nearestHousing, setNearestHousing] = useState<HousingDistance[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPanel, setShowPanel] = useState(true)

  const handleFindNearest = async () => {
    setLoading(true)
    setError(null)

    try {
      const location = await requestUserLocation()
      setUserLocation(location)
      onUserLocationDetected?.(location)
      setNearestHousing(getNearestHousing(location, housingList, 5))
    } catch (err) {
      setError(
        err instanceof GeolocationPositionError
          ? t.nearestPanel.locationDenied
          : err instanceof Error
            ? err.message
            : t.nearestPanel.locationFailed,
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <AnimatePresence>
        {showPanel && (
          <motion.section
            aria-label={t.nearestPanel.ariaLabel}
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="fixed bottom-6 right-4 z-[9998] flex max-h-[60vh] w-[calc(100%-2rem)] flex-col sm:right-6 sm:max-w-sm md:right-[26rem] md:max-h-[26rem]"
          >
            <Card className="flex h-full min-h-0 flex-col overflow-hidden border-primary/15 shadow-e4">
              <CardHeader className="flex-shrink-0 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                      <Navigation className="h-4 w-4 flex-shrink-0 text-primary sm:h-5 sm:w-5" />
                      <span className="truncate">{t.nearestPanel.title}</span>
                    </CardTitle>
                    <CardDescription className="mt-1.5 text-xs leading-relaxed">
                      {userLocation ? (
                        <Coord lat={userLocation.lat} lng={userLocation.lng} as="span" />
                      ) : (
                        t.nearestPanel.locationPermissionInfo
                      )}
                    </CardDescription>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPanel(false)}
                    aria-label={t.nearestPanel.closePanelLabel}
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </CardHeader>

              <CardContent data-lenis-prevent className="sidebar-scroll-area min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-6">
                {error && (
                  <div
                    role="alert"
                    className="flex gap-2 rounded-xl border border-danger/25 bg-danger-50 p-3 text-xs sm:text-sm"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-danger" />
                    <p className="text-danger">{error}</p>
                  </div>
                )}

                <Button onClick={handleFindNearest} disabled={loading} className="w-full gap-2">
                  {loading && <Loader className="h-4 w-4 animate-spin" />}
                  {loading ? t.nearestPanel.detecting : t.nearestPanel.detectLocation}
                </Button>

                <p aria-live="polite" className="sr-only">
                  {loading ? t.nearestPanel.detectingScreenReader : ""}
                </p>

                {nearestHousing.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-coord text-brand-orange-ink">{t.nearestPanel.nearestHousing}</h3>
                    <div className="space-y-2">
                      {nearestHousing.map((item, idx) => (
                        <button
                          key={item.housing.id}
                          type="button"
                          onClick={() => onSelectHousing(item.housing)}
                          className="w-full rounded-xl border border-border p-3 text-left transition-colors hover:border-brand-orange/40 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <div className="flex items-start gap-2">
                            <span className="numeric flex-shrink-0 rounded bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                              #{idx + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <h4 className="truncate text-xs font-semibold text-foreground sm:text-sm">
                                {item.housing.name}
                              </h4>
                              <Coord
                                lat={item.housing.lat}
                                lng={item.housing.lng}
                                as="div"
                                className="mt-1.5"
                              />
                              <div className="mt-1.5 flex items-center gap-1">
                                <MapPin className="h-3 w-3 flex-shrink-0 text-brand-sky-ink" />
                                <p className="numeric truncate text-xs text-muted-foreground">
                                  {formatDistance(item.distance, locale)}
                                </p>
                              </div>
                              <p className="numeric mt-1 text-xs font-semibold text-primary">
                                {item.housing.priceRange}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!loading && nearestHousing.length === 0 && userLocation && (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    {t.nearestPanel.noHousingFound}
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.section>
        )}
      </AnimatePresence>

      {!showPanel && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => setShowPanel(true)}
          aria-label={t.nearestPanel.ariaLabel}
          className="fixed bottom-6 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow-brand transition-shadow hover:shadow-e4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:right-6 md:right-[26rem]"
        >
          <Navigation className="h-5 w-5 sm:h-6 sm:w-6" />
        </motion.button>
      )}
    </>
  )
}
