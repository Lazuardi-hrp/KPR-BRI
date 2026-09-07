"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import type { HasilSaring, TitikAcuan } from "../lib/pencarian"
import type { Housing } from "../lib/housing"

interface HousingMapProps {
  /** Hasil yang SUDAH tersaring. Peta tidak pernah menggambar lebih dari ini. */
  results: HasilSaring[]
  selectedId: string | null
  onSelect: (housing: Housing) => void
  /** Titik acuan pengukuran jarak, bila pengunjung sudah memilihnya. */
  titik?: TitikAcuan | null
  radiusKm?: number | null
  /** Menyalakan mode "ketuk peta untuk menaruh titik". */
  modePilih?: boolean
  onPilihTitik?: (lat: number, lng: number) => void
  /**
   * Isi pratinjau penanda. Digambar React, ditempatkan Leaflet.
   * `tutup` diberikan dari sini karena popup-nya milik Leaflet — komponen
   * pratinjau tidak punya cara lain menutup wadahnya sendiri.
   */
  pratinjau?: (hasil: HasilSaring, tutup: () => void) => ReactNode
  userLocationLabel?: string
  coordLabels?: { north: string; south: string; east: string; west: string }
}

const CENTER: [number, number] = [2.961946, 99.054264] // Pematang Siantar

/**
 * Jarak antar pusat dua penanda berimpit yang bersebelahan, dalam piksel.
 *
 * Sengaja piksel dan bukan derajat: jarak dalam derajat yang cukup terlihat
 * pada zoom 13 akan menggeser pin sejauh ratusan meter dari koordinat
 * sebenarnya pada zoom 17 — memindahkan rumah demi bisa mengkliknya. Dengan
 * satuan piksel, pemisahannya konstan di mata dan mengecil sendiri di
 * lapangan setiap kali pengunjung memperbesar.
 *
 * Nilainya HARUS melebihi lebar kotak sentuh penanda (44px, lihat pinIcon).
 * Dengan pemisahan yang lebih sempit, kotak-kotaknya bertindih dan penanda
 * yang di atas menangkap ketukan yang ditujukan ke tetangganya — persis
 * kegagalan yang ingin diperbaiki penyebaran ini, hanya berpindah tempat.
 */
const PISAH_PX = 48

/**
 * Jari-jari lingkaran sebar untuk sekelompok penanda berimpit.
 *
 * Diturunkan dari jumlah anggotanya, bukan tetap: pada lingkaran berjari-jari
 * R, dua titik bersebelahan dari n titik berjarak 2·R·sin(π/n). Jari-jari
 * tetap akan cukup untuk tiga penanda dan kembali bertindih pada lima.
 */
const jariSebar = (jumlah: number) => PISAH_PX / (2 * Math.sin(Math.PI / jumlah))

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

/**
 * Titik acuan pengukuran: sebuah titik langit, jelas bukan perumahan.
 *
 * Hanya "lokasi saya" yang berdenyut. Titik yang ditaruh sendiri oleh
 * pengunjung tidak perlu menarik perhatian ke dirinya — ia sudah tahu di mana
 * menaruhnya — dan design.md §4.4 membatasi jumlah denyut per halaman.
 */
const titikIcon = (berdenyut: boolean) =>
  L.divIcon({
    className: "atlas-marker",
    html: `
      <span style="display:flex;align-items:center;justify-content:center;width:44px;height:44px">
        <span ${berdenyut ? 'class="marker-ping"' : ""} style="position:relative;display:block;width:16px;height:16px;border-radius:9999px;
                     background:var(--brand-sky);border:2px solid var(--background)"></span>
      </span>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  })

/** Untuk label titik acuan, yang bisa berasal dari hasil pencarian alamat. */
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;",
  )
}

/**
 * Mengelompokkan perumahan yang koordinatnya persis sama.
 *
 * Tiga perumahan — GRAHA ASIDO 7 TAHAP II, GRIYA AL-FALAH IV dan GRIYA TAMA 3
 * — berbagi titik 3.011792, 99.096234. Tanpa penyebaran, dua di antaranya
 * tertimbun dan tidak pernah bisa diklik: filter apa pun boleh meloloskan
 * ketiganya, yang terlihat tetap satu.
 *
 * INI BUKAN PERBAIKAN DATA. Koordinat aslinya memang belum diketahui dan
 * sengaja tidak dikarang — lihat docs/DATA-TODO.md §2. Yang dilakukan di sini
 * hanya membuat ketiganya bisa dijangkau jari, dan penyebarannya diurutkan
 * menurut id supaya posisinya tidak berpindah-pindah antar render.
 *
 * Yang TIDAK diselesaikan: pratinjau yang sedang terbuka lebarnya ~280px dan
 * karenanya menutupi kedua tetangganya yang hanya berjarak 48px. Menutup
 * pratinjau membuat ketiganya bisa diketuk lagi, dan setiap perumahan selalu
 * punya jalur kedua lewat baris daftar di bilah samping. Itu perilaku yang
 * sama dengan popup peta mana pun; membereskannya sungguhan berarti
 * clustering + spiderfy, yaitu satu dependensi baru untuk satu titik data
 * yang seharusnya diperbaiki di basis datanya.
 */
function kelompokBerimpit(results: HasilSaring[]) {
  const grup = new Map<string, string[]>()
  for (const r of results) {
    const kunci = `${r.housing.lat.toFixed(5)},${r.housing.lng.toFixed(5)}`
    const daftar = grup.get(kunci)
    if (daftar) daftar.push(r.housing.id)
    else grup.set(kunci, [r.housing.id])
  }

  const posisi = new Map<string, { indeks: number; jumlah: number }>()
  for (const ids of grup.values()) {
    if (ids.length < 2) continue
    ids.sort()
    ids.forEach((id, indeks) => posisi.set(id, { indeks, jumlah: ids.length }))
  }
  return posisi
}

export default function HousingMap({
  results,
  selectedId,
  onSelect,
  titik = null,
  radiusKm = null,
  modePilih = false,
  onPilihTitik,
  pratinjau,
  userLocationLabel = "Lokasi Anda",
  coordLabels = { north: "LU", south: "LS", east: "BT", west: "BB" },
}: HousingMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<Record<string, L.Marker>>({})
  const titikMarkerRef = useRef<L.Marker | null>(null)
  const lingkaranRef = useRef<L.Circle | null>(null)
  const didFitRef = useRef(false)
  const jumlahTerakhirRef = useRef(0)

  const olehId = useMemo(() => {
    const peta = new Map<string, HasilSaring>()
    for (const r of results) peta.set(r.housing.id, r)
    return peta
  }, [results])

  const berimpit = useMemo(() => kelompokBerimpit(results), [results])

  /** Posisi gambar sebuah penanda — digeser hanya bila koordinatnya kembar. */
  const posisiPenanda = useCallback(
    (map: L.Map, h: Housing) => {
      const sebar = berimpit.get(h.id)
      if (!sebar) return L.latLng(h.lat, h.lng)

      const zoom = map.getZoom()
      const p = map.project([h.lat, h.lng], zoom)
      const sudut = (2 * Math.PI * sebar.indeks) / sebar.jumlah - Math.PI / 2
      const r = jariSebar(sebar.jumlah)
      return map.unproject(
        L.point(p.x + r * Math.cos(sudut), p.y + r * Math.sin(sudut)),
        zoom,
      )
    },
    [berimpit],
  )

  // Nilai terbaru untuk penangan yang dipasang sekali dan karena itu tidak
  // boleh menangkap tangkapan render pertama.
  const onSelectRef = useRef(onSelect)
  const onPilihTitikRef = useRef(onPilihTitik)
  const olehIdRef = useRef(olehId)
  const posisiPenandaRef = useRef(posisiPenanda)
  useEffect(() => {
    onSelectRef.current = onSelect
    onPilihTitikRef.current = onPilihTitik
    olehIdRef.current = olehId
    posisiPenandaRef.current = posisiPenanda
  })

  // Penanda mana yang pratinjaunya sedang terbuka. Leaflet hanya membuka satu
  // popup pada satu waktu, jadi satu simpul induk dipakai bersama oleh semua
  // penanda — 16 simpul kosong yang menunggu giliran tidak ada gunanya.
  const [pratinjauId, setPratinjauId] = useState<string | null>(null)
  // useState, bukan useRef: simpul ini dibaca saat render (untuk portalnya),
  // dan itu justru yang dilarang pada ref. Penginisialisasi malas menjamin ia
  // dibuat sekali seumur komponen — sama seperti ref, tanpa pelanggarannya.
  const [host] = useState<HTMLDivElement | null>(() =>
    typeof document === "undefined" ? null : document.createElement("div"),
  )

  // ── Peta dibuat sekali ──────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return

    const map = L.map(containerRef.current, { zoomControl: true }).setView(CENTER, 13)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)
    mapRef.current = map

    // Penanda berimpit dipisah dalam satuan piksel, jadi posisinya harus
    // dihitung ulang setiap kali skalanya berubah.
    const geser = () => {
      for (const [id, marker] of Object.entries(markersRef.current)) {
        const r = olehIdRef.current.get(id)
        if (r) marker.setLatLng(posisiPenandaRef.current(map, r.housing))
      }
    }
    map.on("zoomend", geser)

    return () => {
      map.off("zoomend", geser)
      map.remove()
      mapRef.current = null
      markersRef.current = {}
      titikMarkerRef.current = null
      lingkaranRef.current = null
    }
  }, [])

  // ── Penanda: hanya yang berubah yang disentuh ───────────────────────────
  //
  // Versi sebelumnya membongkar keenam belas penanda pada SETIAP perubahan
  // daftar maupun pilihan. Dengan filter, "perubahan daftar" terjadi pada
  // setiap ketukan papan tik — dan membangun ulang 16 simpul DOM per ketukan
  // membuat pencarian terasa berat persis di saat ia harus terasa ringan.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const adaSekarang = new Set(results.map((r) => r.housing.id))

    for (const [id, marker] of Object.entries(markersRef.current)) {
      if (!adaSekarang.has(id)) {
        marker.remove()
        delete markersRef.current[id]
      }
    }

    for (const r of results) {
      const h = r.housing
      const posisi = posisiPenanda(map, h)
      const adaSudah = markersRef.current[h.id]

      if (adaSudah) {
        adaSudah.setLatLng(posisi)
        continue
      }

      const marker = L.marker(posisi, {
        icon: pinIcon(selectedId === h.id),
        title: h.name,
        zIndexOffset: selectedId === h.id ? 900 : 0,
      })
        .on("click", () => onSelectRef.current(h))
        .on("popupopen", () => setPratinjauId(h.id))
        .on("popupclose", () => setPratinjauId((kini) => (kini === h.id ? null : kini)))
        .addTo(map)

      // Isi popup adalah simpul DOM, bukan untaian HTML. Selain membuat
      // pratinjau bisa ditulis sebagai komponen React biasa, ini menutup
      // penyisipan `house.name` mentah ke dalam HTML yang ada sebelumnya.
      if (host) {
        marker.bindPopup(host, {
          minWidth: 248,
          maxWidth: 288,
          closeButton: false,
          autoPanPadding: L.point(24, 24),
        })
      }

      markersRef.current[h.id] = marker
    }
  }, [results, posisiPenanda, selectedId, host])

  // ── Pilihan: tukar ikon saja ────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    for (const [id, marker] of Object.entries(markersRef.current)) {
      const aktif = id === selectedId
      marker.setIcon(pinIcon(aktif))
      marker.setZIndexOffset(aktif ? 900 : 0)
    }

    if (!selectedId) return
    const terpilih = olehId.get(selectedId)
    if (!terpilih) return

    // Kamera hanya bergerak bila penandanya memang di luar pandangan. Menggeser
    // peta setiap kali sesuatu dipilih akan merenggut kendali dari orang yang
    // baru saja menggeser petanya sendiri — termasuk saat ia mengklik penanda
    // yang sudah terlihat jelas.
    const posisi = L.latLng(terpilih.housing.lat, terpilih.housing.lng)
    if (!map.getBounds().pad(-0.15).contains(posisi)) {
      map.panTo(posisi, { animate: true })
    }
  }, [selectedId, olehId])

  // ── Bingkai ulang saat jumlah hasil berubah ─────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !results.length) return

    const jumlahBerubah = jumlahTerakhirRef.current !== results.length
    jumlahTerakhirRef.current = results.length

    // Saat ada yang dipilih, orangnya sedang melihat sesuatu — membingkai
    // ulang di situ akan melemparkannya keluar dari yang sedang dilihat.
    if (selectedId) return
    if (!jumlahBerubah && didFitRef.current) return

    didFitRef.current = true
    map.fitBounds(
      L.latLngBounds(results.map((r) => [r.housing.lat, r.housing.lng] as [number, number])),
      { padding: [64, 64], maxZoom: 15 },
    )
  }, [results, selectedId])

  // ── Titik acuan dan radiusnya ───────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    titikMarkerRef.current?.remove()
    titikMarkerRef.current = null
    lingkaranRef.current?.remove()
    lingkaranRef.current = null
    if (!titik) return

    const label = titik.sumber === "saya" ? userLocationLabel : titik.label

    titikMarkerRef.current = L.marker([titik.lat, titik.lng], {
      icon: titikIcon(titik.sumber === "saya"),
      title: label,
      zIndexOffset: 1000,
    })
      .bindPopup(
        // Satu-satunya untaian HTML yang tersisa di berkas ini. Labelnya lolos
        // escapeHtml karena bisa datang dari hasil pencarian alamat, dan dua
        // bilangannya sudah lewat toFixed.
        `<div class="font-semibold text-sm">${escapeHtml(label)}</div>
         <div class="text-coord" style="margin-top:4px;color:var(--muted-foreground)">${Math.abs(titik.lat).toFixed(4)}° ${titik.lat >= 0 ? coordLabels.north : coordLabels.south} · ${Math.abs(titik.lng).toFixed(4)}° ${titik.lng >= 0 ? coordLabels.east : coordLabels.west}</div>`,
      )
      .addTo(map)

    if (radiusKm != null) {
      // Warna lewat className, bukan opsi `color`: Leaflet menuliskannya
      // sebagai atribut presentasi SVG, dan var() di sana tidak dijamin
      // terselesaikan di setiap peramban. Gayanya ada di globals.css bersama
      // sisa skin .atlas-map.
      lingkaranRef.current = L.circle([titik.lat, titik.lng], {
        radius: radiusKm * 1000,
        className: "atlas-radius",
        interactive: false,
      }).addTo(map)
      map.fitBounds(lingkaranRef.current.getBounds(), { padding: [32, 32], maxZoom: 15 })
    } else {
      map.panTo([titik.lat, titik.lng])
    }
  }, [titik, radiusKm, userLocationLabel, coordLabels])

  // ── Mode "ketuk peta untuk menaruh titik" ───────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    const el = containerRef.current
    if (!map || !el || !modePilih) return

    const ketuk = (e: L.LeafletMouseEvent) =>
      onPilihTitikRef.current?.(e.latlng.lat, e.latlng.lng)

    map.on("click", ketuk)
    el.classList.add("atlas-map--memilih")

    return () => {
      map.off("click", ketuk)
      el.classList.remove("atlas-map--memilih")
    }
  }, [modePilih])

  // Permintaan tutup lewat state, bukan lewat penutup yang membaca mapRef:
  // menyerahkan fungsi semacam itu ke komponen anak berarti ref-nya berpotensi
  // terbaca saat render. Sebuah pencacah dipakai alih-alih boolean supaya
  // penutupan kedua tetap terkirim tanpa perlu disetel ulang, dan supaya efek
  // ini TIDAK ikut berjalan saat popup ditutup Leaflet sendiri — yang bila
  // terjadi bisa menutup popup berikutnya tepat setelah dibuka.
  const [tutupKe, setTutupKe] = useState(0)
  const tutupPratinjau = useCallback(() => setTutupKe((n) => n + 1), [])

  useEffect(() => {
    if (tutupKe > 0) mapRef.current?.closePopup()
  }, [tutupKe])

  const hasilPratinjau = pratinjauId ? olehId.get(pratinjauId) : null

  return (
    <>
      <div ref={containerRef} className="atlas-map h-full w-full" />
      {host && hasilPratinjau && pratinjau
        ? createPortal(pratinjau(hasilPratinjau, tutupPratinjau), host)
        : null}
    </>
  )
}
