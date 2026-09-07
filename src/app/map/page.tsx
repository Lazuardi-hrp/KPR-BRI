import { Suspense } from "react"

import MapView from "@/components/map-view"
import { getPublishedHousings } from "@/lib/queries/housings"
import { getKonfigKPR } from "@/lib/queries/kpr"

/**
 * Shell RSC. MapView tetap client component — Leaflet menyentuh `window` dan
 * seluruh interaksi peta berjalan di browser. Yang berubah hanyalah asal
 * datanya: dulu localStorage per-perangkat, kini basis data bersama.
 *
 * Parameter filter TIDAK dibaca lewat prop `searchParams`. Menyentuhnya akan
 * menjadikan rute ini dinamis dan mematikan ISR di halaman yang basemap-nya
 * adalah elemen LCP; MapView membacanya dengan useSearchParams di dalam
 * Suspense, persis seperti /simulasi.
 *
 * getKonfigKPR ikut dipanggil karena peta kini menayangkan angsuran, dan
 * design.md §7.3 melarang menayangkan bunga tebakan — yang berlaku dibaca
 * dari app_settings, bukan dari cadangan yang dikompilasi.
 */
export const revalidate = 300

export default async function Page() {
  const [housingList, konfig] = await Promise.all([
    getPublishedHousings(),
    getKonfigKPR(),
  ])

  return (
    <Suspense fallback={null}>
      <MapView
        housingList={housingList}
        konfig={konfig.skema}
        ditinjauPada={konfig.ditinjauPada}
      />
    </Suspense>
  )
}
