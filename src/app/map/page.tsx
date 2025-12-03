"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { MapPin, ChevronLeft, Menu, X } from "lucide-react"
import { Card } from "@/components/ui/card"
import HousingMap from "../../components/housing-map"
import HousingPopup from "../../components/housing-popup"
import NearestHousingPanel from "../../components/nearest-housing-panel"
import Image from "next/image"

// Import tipe Housing dari storage
import { loadHousingData, Housing } from "../../lib/housing-storage"

export default function MapPage() {
  const [selectedHousing, setSelectedHousing] = useState<Housing | null>(null)
  const [housingList, setHousingList] = useState<Housing[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  // Lokasi pengguna (geo API)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [showSidebar, setShowSidebar] = useState(false)
  
  useEffect(() => {
    const data = loadHousingData()
    setHousingList(data)
    setIsLoaded(true)

    // GEOLOCATION DETECTION
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          })
        },
        (err) => {
          console.warn("Gagal mengambil lokasi:", err)
        },
        { enableHighAccuracy: true }
      )
    }
  }, [])

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16 gap-2">
            <Link href="/">
              <div className="flex items-center gap-1 sm:gap-2 hover:opacity-80 transition-opacity">
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="text-sm sm:text-base font-semibold hidden xs:inline">Kembali ke Beranda</span>
              </div>
            </Link>

            <div className="flex items-center gap-1 sm:gap-2">
              <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              <span className="text-base sm:text-lg font-bold">Peta Perumahan</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-22 h-22">
                  <Image src="/logobri.png" alt="Logo" fill
                      className="object-contain"
                      priority/>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden gap-0">
        
        {/* Map Container */}
        <div className="flex-1 relative min-h-0 w-full">
          {isLoaded && (
            <HousingMap
              housingList={housingList}
              selectedHousing={selectedHousing}
              onMarkerClick={setSelectedHousing}
              userLocation={userLocation}   // <-- Lokasi saya
            />
          )}
        </div>

        {/* Sidebar Overlay for Mobile */}
        {showSidebar && (
          <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setShowSidebar(false)} />
        )}

        {/* Sidebar */}
        <div className={`fixed md:static bottom-0 left-0 right-0 z-40 md:z-0 h-[60vh] md:h-auto w-full md:w-96 bg-card border-t md:border-t-0 md:border-l border-border overflow-y-auto transition-transform duration-200 ${
            showSidebar ? "translate-y-0" : "translate-y-full md:translate-y-0"
          }`}>

          {/* Header */}
          <div className="sticky top-0 bg-card border-b border-border p-3 sm:p-4 z-30">
            <h2 className="text-base sm:text-lg font-bold">Daftar Perumahan</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Klik marker atau pilih dari daftar
            </p>
          </div>

          {/* Housing List */}
          <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
            {housingList.map((housing) => (
              <Card
                key={housing.id}
                className={`p-2 sm:p-3 cursor-pointer transition-all hover:shadow-md ${
                  selectedHousing?.id === housing.id ? "ring-2 ring-primary shadow-md" : ""
                }`}
                onClick={() => {
                  setSelectedHousing(housing)
                  setShowSidebar(false)
                }}
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0 mt-0.5 sm:mt-1" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-xs sm:text-sm truncate">{housing.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">{housing.description}</p>
                    <div className="flex gap-1 mt-1 sm:mt-2 flex-wrap">
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded truncate">
                        {housing.availableUnits} unit Subsidi
                      </span>
                      <span className="text-xs bg-green-200  text-teal-900 px-2 py-1 rounded truncate">
                        {housing.priceRange}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Popup Modal */}
      {selectedHousing && (
        <HousingPopup
          housing={selectedHousing}
          onClose={() => setSelectedHousing(null)}
        />
      )}

      {/* Floating Nearest Housing Panel */}
      {isLoaded && (
        <NearestHousingPanel
          housingList={housingList}
          onUserLocationDetected={setUserLocation}
          onSelectHousing={setSelectedHousing}
        />
      )}
    </div>
  )
}
