"use client"

import { useState } from "react"
import { MapPin, Navigation, AlertCircle, Loader, X } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "../components/ui/button"
import { requestUserLocation, getNearestHousing, type Coordinates, type HousingDistance } from "../lib/geolocation-utils"

interface NearestHousingPanelProps {
  housingList: any[]
  onSelectHousing: (housing: any) => void
  onUserLocationDetected?: (location: Coordinates | null) => void
}

export default function NearestHousingPanel({
  housingList,
  onSelectHousing,
  onUserLocationDetected,
}: NearestHousingPanelProps) {
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

      const nearest = getNearestHousing(location, housingList, 5)
      setNearestHousing(nearest)
    } catch (err) {
      setError(
        err instanceof GeolocationPositionError
          ? "Izin akses lokasi ditolak. Silakan aktifkan lokasi di browser Anda."
          : err instanceof Error
            ? err.message
            : "Gagal mendapatkan lokasi Anda",
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {showPanel && (
        <div className="fixed bottom-6 right-4 sm:right-6 z-40 w-[calc(100%-2rem)] sm:max-w-sm max-h-[50vh] md:max-h-96">
          <Card className="shadow-2xl h-full overflow-hidden flex flex-col">
            <CardHeader className="pb-2 sm:pb-3 flex-shrink-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <Navigation className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                    <span className="truncate">Cari Terdekat</span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-1 line-clamp-1">
                    {userLocation
                      ? `Lokasi: ${userLocation.lat.toFixed(2)}, ${userLocation.lng.toFixed(2)}`
                      : "Temukan perumahan terdekat"}
                  </CardDescription>
                </div>
                <button
                  onClick={() => setShowPanel(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 p-1"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 sm:space-y-4 overflow-y-auto flex-1 px-4 sm:px-6 pb-4 sm:pb-6">
              {/* Error Message */}
              {error && (
                <div className="flex gap-2 p-2 sm:p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs sm:text-sm">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-destructive">{error}</p>
                </div>
              )}

              {/* Find Location Button */}
              <Button
                onClick={handleFindNearest}
                disabled={loading}
                className="w-full gap-2 text-xs sm:text-sm"
                size="sm"
              >
                {loading && <Loader className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />}
                {loading ? "Mendeteksi..." : "Deteksi Lokasi"}
              </Button>

              {/* Nearest Housing List */}
              {nearestHousing.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs sm:text-sm font-semibold">Perumahan Terdekat</h3>
                  <div className="space-y-2">
                    {nearestHousing.map((item, idx) => (
                      <div
                        key={item.housing.id}
                        className="p-2 sm:p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer text-xs sm:text-sm"
                        onClick={() => onSelectHousing(item.housing)}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded flex-shrink-0">
                            #{idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs sm:text-sm font-semibold truncate">{item.housing.name}</h4>
                            <div className="flex items-center gap-1 mt-0.5 sm:mt-1">
                              <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                              <p className="text-xs text-muted-foreground truncate">{item.distance.toFixed(2)} km</p>
                            </div>
                            <p className="text-xs text-primary font-semibold mt-0.5 sm:mt-1">
                              {item.housing.priceRange}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!loading && nearestHousing.length === 0 && userLocation && (
                <div className="text-center py-4">
                  <p className="text-xs text-muted-foreground">Tidak ada perumahan ditemukan</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Floating Button untuk membuka panel */}
      {!showPanel && (
        <button
          onClick={() => setShowPanel(true)}
          className="fixed bottom-6 right-4 sm:right-6 z-40 bg-primary text-primary-foreground rounded-full p-3 sm:p-4 shadow-lg hover:shadow-xl transition-shadow flex-shrink-0"
          title="Cari perumahan terdekat"
        >
          <Navigation className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      )}
    </>
  )
}
