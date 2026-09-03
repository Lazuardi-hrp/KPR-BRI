import type { Database, Json } from "@/lib/database.types"

export type VerificationStatus = Database["public"]["Enums"]["verification_status"]
import { publicImageUrl } from "@/lib/supabase/storage-url"
import { formatArea, formatPriceRange } from "@/lib/format"

/**
 * View model perumahan.
 *
 * Nama field sengaja mempertahankan bentuk camelCase interface `Housing` lama
 * agar JSX yang dibekukan design.md tidak perlu ditulis ulang. Bentuk basis
 * data yang sebenarnya (snake_case) ada di database.types.ts; jembatan di
 * antara keduanya adalah toHousing() di bawah.
 *
 * Dua perubahan yang tidak bisa dihindari dari interface lama:
 *   id: number -> string   kunci utama kini uuid; id 1..16 pindah ke legacyId
 *   email: string -> string | null   email placeholder tidak ikut dimigrasikan
 */
export interface Housing {
  id: string
  legacyId?: number | null
  slug?: string
  name: string
  lat: number
  lng: number
  description: string
  availableUnits: number
  totalUnits?: number
  /** null = total_units 0, artinya "Data belum lengkap", bukan "0% tersedia". */
  availabilityPercent?: number | null
  priceRange: string
  priceMin?: number | null
  priceMax?: number | null
  image?: string
  images?: string[]
  contactPerson: string
  phone: string
  email?: string | null
  roofType?: string
  wallType?: string
  foundationType?: string
  price?: string
  buildingArea?: string
  landArea?: string
  bedrooms?: number
  bathrooms?: number
  locationId?: string
  district?: string
  village?: string
  developerName?: string
  subsidiUnits?: number
  soldSubsidiUnits?: number
  commercialUnits?: number
  soldCommercialUnits?: number
  /** Angka diturunkan saat migrasi, belum diverifikasi tim data BRI. */
  needsReview?: boolean

  // ── Verifikasi properti (migrasi 0013) ────────────────────────────────
  verificationStatus?: VerificationStatus
  verifiedAt?: string | null
  verificationDueAt?: string | null
  /** Kapan bidang material terakhir berubah — dasar "Terakhir diperbarui". */
  lastDataChangeAt?: string | null
  /** Bidang yang dicentang pada verifikasi TERAKHIR, bukan gabungan semuanya. */
  verifiedFields?: string[] | null
  /**
   * Kapan tiap bidang terakhir diperiksa. Hanya diisi getHousingBySlug —
   * kueri daftar tidak mengambil kolomnya supaya subkuerinya tidak ikut
   * dihitung untuk 16 baris sekaligus.
   */
  fieldChecks?: Array<{ field: string; last_checked_at: string | null }> | null
}

type ImageJson = { path: string; alt: string | null; blur: string | null }
type ContactJson = { name: string | null; phone: string | null; email: string | null }

/** Satu baris public.v_housing_public sebagaimana dikembalikan PostgREST. */
export type HousingPublicRow = {
  id: string | null
  legacy_id: number | null
  slug: string | null
  name: string | null
  address: string | null
  lat: number | null
  lng: number | null
  price_min: number | null
  price_max: number | null
  subsidi_units: number | null
  sold_subsidi_units: number | null
  commercial_units: number | null
  sold_commercial_units: number | null
  total_units: number | null
  available_units: number | null
  availability_percent: number | null
  roof_type: string | null
  wall_type: string | null
  foundation_type: string | null
  building_area: number | null
  land_area: number | null
  bedrooms: number | null
  bathrooms: number | null
  needs_review: boolean | null
  developer_name: string | null
  district: string | null
  village: string | null
  cover_path: string | null
  images: Json | null
  contact: Json | null
  published_at: string | null
  verification_status: VerificationStatus | null
  verified_at: string | null
  verification_due_at: string | null
  last_data_change_at: string | null
  verified_fields: string[] | null
  field_checks?: Json | null
}

const num = (v: number | string | null | undefined) => (v == null ? undefined : Number(v))

export function toHousing(r: HousingPublicRow): Housing {
  const images = (Array.isArray(r.images) ? (r.images as unknown as ImageJson[]) : []) ?? []
  const urls = images.map((i) => publicImageUrl(i.path)).filter((u): u is string => Boolean(u))
  const contact = (r.contact ?? null) as unknown as ContactJson | null

  return {
    id: r.id!,
    legacyId: r.legacy_id,
    slug: r.slug ?? undefined,
    name: r.name ?? "",
    lat: r.lat!,
    lng: r.lng!,
    // Disusun ulang agar shortLocation() di perumahan-collection.tsx — yang
    // mengambil dua segmen koma terakhir — tetap menghasilkan
    // "<Kecamatan>, <Kelurahan>" seperti sebelumnya.
    description: [r.address, r.district, r.village].filter(Boolean).join(", "),
    availableUnits: r.available_units ?? 0,
    totalUnits: r.total_units ?? 0,
    availabilityPercent: r.availability_percent == null ? null : Number(r.availability_percent),
    priceRange: formatPriceRange(num(r.price_min), num(r.price_max)),
    priceMin: num(r.price_min) ?? null,
    priceMax: num(r.price_max) ?? null,
    image: publicImageUrl(r.cover_path) ?? urls[0],
    images: urls.length ? urls : undefined,
    contactPerson: contact?.name ?? "",
    phone: contact?.phone ?? "",
    email: contact?.email ?? null,
    roofType: r.roof_type ?? undefined,
    wallType: r.wall_type ?? undefined,
    foundationType: r.foundation_type ?? undefined,
    buildingArea: formatArea(r.building_area),
    landArea: formatArea(r.land_area),
    bedrooms: r.bedrooms ?? undefined,
    bathrooms: r.bathrooms ?? undefined,
    district: r.district ?? undefined,
    village: r.village ?? undefined,
    developerName: r.developer_name ?? undefined,
    subsidiUnits: r.subsidi_units ?? 0,
    soldSubsidiUnits: r.sold_subsidi_units ?? 0,
    commercialUnits: r.commercial_units ?? 0,
    soldCommercialUnits: r.sold_commercial_units ?? 0,
    needsReview: r.needs_review ?? false,
    verificationStatus: r.verification_status ?? "menunggu",
    verifiedAt: r.verified_at,
    verificationDueAt: r.verification_due_at,
    lastDataChangeAt: r.last_data_change_at,
    verifiedFields: r.verified_fields,
    fieldChecks: Array.isArray(r.field_checks)
      ? (r.field_checks as unknown as Housing["fieldChecks"])
      : null,
  }
}
