"use client"

import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import type { Housing } from "../lib/housing"

interface HousingMapProps {
  housingList: Housing[]
  selectedHousing: Housing | null
  onMarkerClick: (housing: Housing) => void
  userLocation?: { lat: number; lng: number } | null
  userLocationLabel?: string
  coordLabels?: { north: string; south: string; east: string; west: string }
}

const CENTER: [number, number] = [2.961946, 99.054264] // Pematang Siantar

/**
 * Brand pins, drawn inline. Nothing is fetched from a third-party host, and the
 * selected pin is orange — the same "selected" colour as the sidebar row and the
 * popup.
 */
const pinIcon = (active: boolean) => {
  const w = active ? 36 : 28
  const h = active ? 46 : 36
  // Leaflet renders divIcons as focusable buttons, so the hit area has to clear
  // 44×44 even though the pin art is smaller.
  const box = Math.max(w, 44)
  const boxH = Math.max(h, 44)
  return L.divIcon({
    className: `atlas-marker${active ? " atlas-marker-active" : ""}`,
    html: `
      <span style="display:flex;align-items:flex-end;justify-content:center;width:${box}px;height:${boxH}px">
        <svg width="${w}" height="${h}" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M14 35.5C14 35.5 26.5 21.9 26.5 13.6 26.5 6.6 20.9.9 14 .9S1.5 6.6 1.5 13.6C1.5 21.9 14 35.5 14 35.5Z"
                style="fill:${active ? "var(--brand-orange)" : "var(--brand)"};stroke:${active ? "var(--brand-orange-fg)" : "var(--brand-deep)"}"
                stroke-width="1.4"/>
          <circle cx="14" cy="13.4" r="4.6" style="fill:var(--background)"/>
        </svg>
      </span>`,
    iconSize: [box, boxH],
    iconAnchor: [box / 2, boxH],
    popupAnchor: [0, -h + 4],
  })
}

/** The user's own position: a sky dot that pings, unmistakably not a perumahan. */
const userIcon = () =>
  L.divIcon({
    className: "atlas-marker",
    html: `
      <span style="display:flex;align-items:center;justify-content:center;width:44px;height:44px">
        <span class="marker-ping" style="position:relative;display:block;width:16px;height:16px;border-radius:9999px;
                     background:var(--brand-sky);border:2px solid var(--background)"></span>
      </span>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  })

export default function HousingMap({
  housingList,
  selectedHousing,
  onMarkerClick,
  userLocation,
  userLocationLabel = "Lokasi Anda",
  coordLabels = { north: "LU", south: "LS", east: "BT", west: "BB" },
}: HousingMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<Record<string, L.Marker>>({})
  const userMarkerRef = useRef<L.Marker | null>(null)
  // Keep the latest click handler without re-binding every marker.
  const onMarkerClickRef = useRef(onMarkerClick)
  const didFitRef = useRef(false)

  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick
  }, [onMarkerClick])

  // Create the map once.
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return

    const map = L.map(containerRef.current, { zoomControl: true }).setView(CENTER, 13)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      markersRef.current = {}
      userMarkerRef.current = null
    }
  }, [])

  // Housing markers.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    Object.values(markersRef.current).forEach((m) => m.remove())
    markersRef.current = {}

    housingList.forEach((house) => {
      const active = selectedHousing?.id === house.id
      const marker = L.marker([house.lat, house.lng], {
        icon: pinIcon(active),
        title: house.name,
        zIndexOffset: active ? 900 : 0,
      })
        .bindPopup(`<div class="font-semibold text-sm">${house.name}</div>`)
        .on("click", () => {
          map.closePopup()
          onMarkerClickRef.current(house)
        })
        .addTo(map)

      markersRef.current[house.id] = marker
    })

    if (selectedHousing) {
      map.setView([selectedHousing.lat, selectedHousing.lng], 15)
    } else if (!didFitRef.current && housingList.length) {
      // Frame every perumahan on first paint — a fixed centre + zoom left the
      // whole cluster in one corner on wide viewports.
      didFitRef.current = true
      map.fitBounds(
        L.latLngBounds(housingList.map((h) => [h.lat, h.lng] as [number, number])),
        { padding: [64, 64], maxZoom: 14 },
      )
    }
  }, [housingList, selectedHousing])

  // User location marker.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    userMarkerRef.current?.remove()
    userMarkerRef.current = null
    if (!userLocation) return

    userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
      icon: userIcon(),
      title: userLocationLabel,
      zIndexOffset: 1000,
    })
      .bindPopup(
        `<div class="font-semibold text-sm">${userLocationLabel}</div>
         <div class="text-coord" style="margin-top:4px;color:var(--muted-foreground)">${Math.abs(userLocation.lat).toFixed(4)}° ${userLocation.lat >= 0 ? coordLabels.north : coordLabels.south} · ${Math.abs(userLocation.lng).toFixed(4)}° ${userLocation.lng >= 0 ? coordLabels.east : coordLabels.west}</div>`,
      )
      .addTo(map)

    map.setView([userLocation.lat, userLocation.lng], 14)
  }, [userLocation, userLocationLabel, coordLabels])

  return <div ref={containerRef} className="atlas-map h-full w-full" />
}
