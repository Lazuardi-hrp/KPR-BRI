"use client"

import { useEffect, useRef, useCallback } from "react"

// Allow Leaflet from CDN
declare global {
  interface Window {
    L: any
  }
}

interface HousingMapProps {
  housingList: any[]
  selectedHousing: any
  onMarkerClick: (housing: any) => void
  userLocation?: { lat: number; lng: number } | null
}

export default function HousingMap({
  housingList,
  selectedHousing,
  onMarkerClick,
  userLocation,
}: HousingMapProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const map = useRef<any>(null)
  const markers = useRef<Record<string, any>>({})
  const userMarker = useRef<any>(null)

  /**
   * -------------------------------
   *  LOAD LEAFLET FROM CDN
   * -------------------------------
   */
  useEffect(() => {
    if (!window.L) {
      loadLeaflet()
    } else {
      initializeMap()
    }
  }, [])

  const loadLeaflet = () => {
    // CSS
    const css = document.createElement("link")
    css.rel = "stylesheet"
    css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
    document.head.appendChild(css)

    // JS
    const script = document.createElement("script")
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"
    script.onload = initializeMap
    document.body.appendChild(script)
  }

  /**
   * -------------------------------
   *  INITIAL MAP SETUP
   * -------------------------------
   */
  const initializeMap = useCallback(() => {
    if (map.current || !window.L) return

    const defaultCenter = [2.961946, 99.054264] // Pematang Siantar

    map.current = window.L.map(mapContainer.current).setView(defaultCenter, 13)

    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map.current)

    renderHousingMarkers()
    renderUserLocation()
  }, [])

  /**
   * -------------------------------
   *  USER LOCATION MARKER
   * -------------------------------
   */
  const renderUserLocation = useCallback(() => {
    if (!userLocation || !map.current || !window.L) return

    // Remove previous marker
    if (userMarker.current) {
      map.current.removeLayer(userMarker.current)
    }

    // Custom icon using Tailwind + DIV
    const userIcon = window.L.divIcon({
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-6 h-6 bg-blue-400 rounded-full opacity-30 animate-pulse"></div>
          <div class="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-md"></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      className: "user-marker",
    })

    const marker = window.L.marker([userLocation.lat, userLocation.lng], {
      icon: userIcon,
      title: "Lokasi Anda",
      zIndexOffset: 1000,
    })

    marker.bindPopup(
      `
      <div class="font-semibold text-sm">Lokasi Anda</div>
      <div class="text-xs text-gray-600">${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}</div>
      `
    )

    marker.addTo(map.current)
    map.current.setView([userLocation.lat, userLocation.lng], 14)

    userMarker.current = marker
  }, [userLocation])

  /**
   * -------------------------------
   *  HOUSING MARKERS
   * -------------------------------
   */
  const renderHousingMarkers = useCallback(() => {
    if (!map.current || !window.L) return

    // Remove old markers
    Object.values(markers.current).forEach((m) => map.current.removeLayer(m))
    markers.current = {}

    housingList.forEach((house) => {
      const isSelected = selectedHousing?.id === house.id

      const iconUrl = isSelected
        ? "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png"
        : "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png"

      const markerIcon = window.L.icon({
        iconUrl,
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      })

      const marker = window.L.marker([house.lat, house.lng], { icon: markerIcon })

      marker.bindPopup(`<div class="font-semibold">${house.name}</div>`)

      marker.on("click", () => {
        map.current.closePopup()
        onMarkerClick(house)
      })

      marker.addTo(map.current)
      markers.current[house.id] = marker

      if (isSelected) {
        map.current.setView([house.lat, house.lng], 15)
      }
    })
  }, [housingList, selectedHousing])

  /**
   * -------------------------------
   *  EFFECTS
   * -------------------------------
   */

  // Update housing markers when list or selected changes
  useEffect(() => {
    if (map.current) renderHousingMarkers()
  }, [housingList, selectedHousing])

  // Update user marker
  useEffect(() => {
    if (map.current) renderUserLocation()
  }, [userLocation])

  return <div ref={mapContainer} className="w-full h-full" />
}
