import "server-only"

import { cache } from "react"

import { createAnonClient } from "@/lib/supabase/anon"
import { toHousing, type Housing, type HousingPublicRow } from "@/lib/housing"

/** Kolom v_housing_public yang dipakai UI. */
const KOLOM = `
  id, legacy_id, slug, name, address, lat, lng,
  price_min, price_max,
  subsidi_units, sold_subsidi_units, commercial_units, sold_commercial_units,
  total_units, available_units, availability_percent,
  roof_type, wall_type, foundation_type,
  building_area, land_area, bedrooms, bathrooms,
  needs_review, developer_name, district, village,
  cover_path, images, contact, published_at,
  verification_status, verified_at, verification_due_at,
  last_data_change_at, verified_fields
`

/**
 * Halaman detail juga butuh kapan tiap bidang terakhir diperiksa.
 *
 * Kolom itu sengaja TIDAK ikut di KOLOM: field_checks adalah subkueri agregat
 * per baris, dan kueri daftar mengambil 16 baris sekaligus untuk beranda dan
 * /map. Perencana memangkas kolom view yang tidak di-SELECT, jadi memisahkan
 * daftar kolomnya membuat halaman daftar tidak membayarnya sama sekali.
 */
const KOLOM_DETAIL = `${KOLOM}, field_checks`

export async function getPublishedHousings(): Promise<Housing[]> {
  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from("v_housing_public")
    .select(KOLOM)
    .order("name", { ascending: true })

  if (error) throw new Error(`Gagal memuat data perumahan: ${error.message}`)
  return (data as unknown as HousingPublicRow[]).map(toHousing)
}

/**
 * Dibungkus cache() karena /perumahan/[slug] memanggilnya dua kali per render —
 * sekali di generateMetadata, sekali di komponen halaman. Tanpa ini, kueri yang
 * lebih berat (field_checks) dijalankan dua kali untuk halaman yang sama.
 */
export const getHousingBySlug = cache(async (slug: string): Promise<Housing | null> => {
  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from("v_housing_public")
    .select(KOLOM_DETAIL)
    .eq("slug", slug)
    .maybeSingle()

  if (error) throw new Error(`Gagal memuat perumahan: ${error.message}`)
  return data ? toHousing(data as unknown as HousingPublicRow) : null
})

export type NearestHousing = {
  id: string
  slug: string
  name: string
  address: string
  lat: number
  lng: number
  price_min: number | null
  available_units: number
  distance_m: number
}

/**
 * Perumahan terdekat, dihitung PostGIS di server (indeks GiST + operator KNN).
 * Menggantikan Haversine sisi klien di geolocation-utils.ts, yang tetap
 * dipertahankan sebagai cadangan luring (PRD Lampiran C).
 */
export async function getNearestHousings(lat: number, lng: number, limit = 5, maxKm = 50) {
  const supabase = createAnonClient()
  const { data, error } = await supabase.rpc("nearest_housings", {
    p_lat: lat,
    p_lng: lng,
    p_limit: limit,
    p_max_km: maxKm,
  })
  if (error) throw new Error(`Gagal mencari perumahan terdekat: ${error.message}`)
  return (data ?? []) as NearestHousing[]
}

export async function searchHousings(params: {
  q?: string
  district?: string
  minPrice?: number
  maxPrice?: number
  limit?: number
  offset?: number
}) {
  const supabase = createAnonClient()
  const { data, error } = await supabase.rpc("search_housings", {
    p_q: params.q ?? undefined,
    p_district: params.district ?? undefined,
    p_min_price: params.minPrice ?? undefined,
    p_max_price: params.maxPrice ?? undefined,
    p_limit: params.limit ?? 24,
    p_offset: params.offset ?? 0,
  })
  if (error) throw new Error(`Gagal mencari perumahan: ${error.message}`)
  return data ?? []
}
