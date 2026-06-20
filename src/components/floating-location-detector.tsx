"use client"

import { useState, useEffect, useRef } from "react"
import { MapPin, Navigation, AlertCircle, Loader, X, ChevronDown, ChevronUp } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "./ui/button"
import { requestUserLocation, getNearestHousing, type Coordinates, type HousingDistance } from "../lib/geolocation-utils"
import HousingMap from "./housing-map"

interface FloatingLocationDetectorProps {
  housingList: any[]
  onSelectHousing: (housing: any) => void
  userLocation?: { lat: number; lng: number } | null
}

export default function FloatingLocationDetector({
  housingList,
  onSelectHousing,
  userLocation: initialUserLocation,
}: FloatingLocationDetectorProps) {
  const [userLocation, setUserLocation] = useState<Coordinates | null>(initialUserLocation || null)
  const [nearestHousing, setNearestHousing] = useState<HousingDistance[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedHousing, setSelectedHousing] = useState<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleFindNearest = async () => {
    setLoading(true)
    setError(null)

    try {
      const location = await requestUserLocation()
      setUserLocation(location)

      const nearest = getNearestHousing(location, housingList, 5)
      setNearestHousing(nearest)
      setIsOpen(true)
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

  const handleSelectHousing = (housing: any) => {
    setSelectedHousing(housing)
    onSelectHousing(housing)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-primary text-primary-foreground rounded-full p-4 shadow-lg hover:shadow-xl transition-shadow flex items-center gap-2"
        title="Buka deteksi lokasi"
      >
        <Navigation className="w-6 h-6" />
      </button>
    )
  }

  return (
    <div
      ref={containerRef}
      className="fixed bottom-6 right-6 z-40 w-[90vw] h-[85vh] max-w-5xl bg-background rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-2">
          <Navigation className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-lg">Deteksi Lokasi</h2>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-muted-foreground hover:text-foreground transition-colors p-1"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden gap-0">
        {/* Map Section - Left Side */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-border">
          {userLocation ? (
            <div className="flex-1 relative">
              <HousingMap
                housingList={housingList}
                selectedHousing={selectedHousing}
                onMarkerClick={handleSelectHousing}
                userLocation={userLocation}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 bg-muted/50">
              <MapPin className="w-12 h-12 text-muted-foreground" />
              <div className="text-center">
                <p className="font-semibold text-lg mb-2">Temukan Perumahan Terdekat</p>
                <p className="text-sm text-muted-foreground mb-6">Klik tombol di bawah untuk mendeteksi lokasi Anda</p>
              </div>
              <Button
                onClick={handleFindNearest}
                disabled={loading}
                className="gap-2"
                size="lg"
              >
                {loading && <Loader className="w-4 h-4 animate-spin" />}
                {loading ? "Mendeteksi..." : "Deteksi Lokasi"}
              </Button>

              {error && (
                <div className="flex gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg w-full max-w-xs">
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* List Section - Right Side */}
        <div className="w-80 flex flex-col bg-card min-h-0">
          {/* List Header */}
          <div className="p-4 border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-base">5 Perumahan Terdekat</h3>
              {userLocation && (
                <Button
                  onClick={handleFindNearest}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs"
                >
                  {loading && <Loader className="w-3 h-3 animate-spin" />}
                  {loading ? "Refresh..." : "Refresh"}
                </Button>
              )}
            </div>
            {userLocation && (
              <p className="text-xs text-muted-foreground">
                📍 {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
              </p>
            )}
          </div>

          {/* List Content - Scrollable */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {error && !nearestHousing.length && (
              <div className="flex gap-2 p-3 m-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {nearestHousing.length > 0 ? (
              <div className="p-3 space-y-2">
                {nearestHousing.map((item, idx) => (
                  <div
                    key={item.housing.id}
                    onClick={() => handleSelectHousing(item.housing)}
                    className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      selectedHousing?.id === item.housing.id
                        ? "border-primary bg-primary/10 shadow-md ring-1 ring-primary"
                        : "border-border hover:border-primary/50 hover:bg-accent/50"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center bg-primary text-primary-foreground text-xs font-bold rounded-full">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold truncate">{item.housing.name}</h4>
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <p className="text-xs text-muted-foreground truncate">
                            {item.distance.toFixed(2)} km
                          </p>
                        </div>
                        <p className="text-xs text-primary font-semibold mt-1.5">
                          {item.housing.priceRange}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : nearestHousing.length === 0 && userLocation && !loading && !error ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p className="text-sm">Tidak ada perumahan ditemukan</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
