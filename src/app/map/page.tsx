import MapView from "@/components/map-view"
import { getPublishedHousings } from "@/lib/queries/housings"

/**
 * Shell RSC. MapView tetap client component — Leaflet menyentuh `window` dan
 * seluruh interaksi peta berjalan di browser. Yang berubah hanyalah asal
 * datanya: dulu localStorage per-perangkat, kini basis data bersama.
 */
export const revalidate = 300

export default async function Page() {
  const housingList = await getPublishedHousings()
  return <MapView housingList={housingList} />
}
