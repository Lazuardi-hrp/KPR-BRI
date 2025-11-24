"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { MapPin, ChevronLeft, Import } from "lucide-react"
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
    <div className="min-h-screen bg-background">

      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/">
              <div className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <ChevronLeft className="w-6 h-6" />
                <span className="font-semibold">Kembali ke Beranda</span>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <MapPin className="w-6 h-6 text-red-500" />
              <span className="text-lg font-bold">Peta Perumahan</span>
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
      <div className="flex h-[calc(100vh-64px)]">
        
        {/* Map Container */}
        <div className="flex-1 relative">
          {isLoaded && (
            <HousingMap
              housingList={housingList}
              selectedHousing={selectedHousing}
              onMarkerClick={setSelectedHousing}
              userLocation={userLocation}   // <-- Lokasi saya
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="w-96 bg-card border-l border-border overflow-y-auto">

          {/* Header */}
          <div className="sticky top-0 bg-card border-b border-border p-4 z-30">
            <h2 className="text-lg font-bold">Daftar Perumahan</h2>
            <p className="text-sm text-muted-foreground">
              Klik marker atau pilih dari daftar
            </p>
          </div>

          {/* Housing List */}
          <div className="p-4 space-y-3">
            {housingList.map((housing) => (
              <Card
                key={housing.id}
                className={`p-3 cursor-pointer transition-all hover:shadow-md ${
                  selectedHousing?.id === housing.id ? "ring-2 ring-primary shadow-md" : ""
                }`}
                onClick={() => setSelectedHousing(housing)}
              >
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-blue flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">{housing.name}</h3>
                    <p className="text-xs text-muted-foreground">{housing.description}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-xs bg-sky-200 text-blue px-2 py-1 rounded">
                        {housing.availableUnits} unit tersedia
                      </span>
                      <span className="text-xs bg-green-200  text-teal-900 px-2 py-1 rounded">
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
          userLocation={userLocation}
          onSelectHousing={setSelectedHousing}
        />
      )}
    </div>
  )
}
