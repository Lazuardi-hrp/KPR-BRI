import "server-only"

import { createAnonClient } from "@/lib/supabase/anon"
import type { Housing } from "@/lib/housing"

export type SiteStats = {
  /** Jumlah perumahan published. Angka sungguhan. */
  housingCount: number
  /** Total unit tersedia di seluruh perumahan. Angka sungguhan. */
  availableUnits: number
  /** Jumlah kecamatan terwakili. Angka sungguhan. */
  districtCount: number
  /**
   * Klaim pemasaran dari app_settings — BUKAN agregat basis data.
   * sum(sold_subsidi_units) yang sebenarnya hanya 5, karena data terjual
   * belum diketahui. Dipisahkan supaya tidak ada yang mengira ini terhitung.
   */
  happyFamilies: number
}

/**
 * Statistik landing page.
 *
 * Tiga angka pertama diturunkan dari array perumahan yang sudah diambil RSC —
 * tidak ada round trip tambahan. Hanya klaim pemasaran yang perlu dibaca dari
 * app_settings, agar bisa diubah admin tanpa deploy.
 */
export async function getSiteStats(housing: Housing[]): Promise<SiteStats> {
  const supabase = createAnonClient()
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "public.stats_happy_families")
    .maybeSingle()

  return {
    housingCount: housing.length,
    availableUnits: housing.reduce((n, h) => n + (h.availableUnits ?? 0), 0),
    districtCount: new Set(housing.map((h) => h.district).filter(Boolean)).size,
    happyFamilies: Number(data?.value ?? 1000),
  }
}
