"use client"

import { useEffect, useState } from "react"
import { MapPin } from "lucide-react"
import { Card } from "@/components/ui/card"
import type { Housing } from "../lib/housing-storage"

// Fungsi menghitung jarak (Haversine)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export default function NearestHousingPanel({
  housingList,
  userLocation,
  onSelectHousing,
}: {
  housingList: Housing[]
  userLocation: { lat: number; lng: number } | null
  onSelectHousing: (h: Housing) => void
}) {
  const [nearest, setNearest] = useState<Housing[]>([])

  useEffect(() => {
    if (!userLocation) return

    const sorted = [...housingList].sort((a, b) => {
      const da = getDistance(userLocation.lat, userLocation.lng, a.lat, a.lng)
      const db = getDistance(userLocation.lat, userLocation.lng, b.lat, b.lng)
      return da - db
    })

    setNearest(sorted.slice(0, 3)) // rekomendasi 3 terdekat
  }, [userLocation, housingList])

  if (!userLocation) return null

  return (
    <div className="fixed bottom-4 right-4 w-80 p-4 bg-card border border-border shadow-lg rounded-lg z-50">
      <h3 className="font-bold text-lg mb-3">Perumahan Terdekat</h3>

      {nearest.map((h) => (
        <Card
          key={h.id}
          className="p-3 mb-2 cursor-pointer hover:shadow-md"
          onClick={() => onSelectHousing(h)}
        >
          <div className="flex gap-3">
            <MapPin className="w-5 h-5 text-primary mt-1" />
            <div>
              <p className="font-semibold text-sm">{h.name}</p>
              <p className="text-xs text-muted-foreground">{h.description}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
