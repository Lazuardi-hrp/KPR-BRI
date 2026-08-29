import "server-only"

import { createClient } from "@/lib/supabase/server"

/**
 * Pembacaan sisi admin.
 *
 * Semuanya memakai klien bersesi (bukan anon), jadi RLS yang memutuskan apa
 * yang terlihat: admin melihat semuanya, pengembang hanya miliknya. Tidak ada
 * penyaringan berdasarkan peran di lapisan aplikasi — kalau ada, itu akan
 * menjadi tempat kedua yang bisa salah.
 */

export type RingkasanAdmin = {
  totalPerumahan: number
  terbit: number
  draft: number
  arsip: number
  perluTinjau: number
  totalUnitTersedia: number
  stokMenipis: { id: string; name: string; available_units: number }[]
  prospekBaru: number
  prospekTotal: number
  outboxTertunda: number
}

export async function getRingkasanAdmin(): Promise<RingkasanAdmin> {
  const supabase = await createClient()

  const [housings, leadsBaru, leadsTotal] = await Promise.all([
    supabase
      .from("housings")
      .select("id, name, status, available_units, needs_review")
      .is("deleted_at", null),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "baru"),
    supabase.from("leads").select("id", { count: "exact", head: true }),
  ])

  const rows = housings.data ?? []

  return {
    totalPerumahan: rows.length,
    terbit: rows.filter((r) => r.status === "published").length,
    draft: rows.filter((r) => r.status === "draft").length,
    arsip: rows.filter((r) => r.status === "archived").length,
    perluTinjau: rows.filter((r) => r.needs_review).length,
    totalUnitTersedia: rows.reduce((n, r) => n + (r.available_units ?? 0), 0),
    stokMenipis: rows
      .filter((r) => r.status === "published" && (r.available_units ?? 0) <= 5)
      .map((r) => ({ id: r.id, name: r.name, available_units: r.available_units ?? 0 }))
      .sort((a, b) => a.available_units - b.available_units),
    prospekBaru: leadsBaru.count ?? 0,
    prospekTotal: leadsTotal.count ?? 0,
    outboxTertunda: 0,
  }
}

export type BarisPerumahanAdmin = {
  id: string
  legacy_id: number | null
  slug: string
  name: string
  status: "draft" | "published" | "archived"
  available_units: number | null
  total_units: number | null
  price_min: number | null
  needs_review: boolean
  updated_at: string
}

export async function getDaftarPerumahanAdmin(): Promise<BarisPerumahanAdmin[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("housings")
    .select(
      "id, legacy_id, slug, name, status, available_units, total_units, price_min, needs_review, updated_at",
    )
    .is("deleted_at", null)
    .order("legacy_id", { ascending: true, nullsFirst: false })
    .order("name")

  if (error) throw new Error(`Gagal memuat daftar perumahan: ${error.message}`)
  return (data ?? []) as BarisPerumahanAdmin[]
}

export async function getPerumahanUntukEdit(id: string) {
  const supabase = await createClient()
  const [housing, kontak, gambar, regions] = await Promise.all([
    supabase.from("housings").select("*").eq("id", id).maybeSingle(),
    supabase.from("housing_contacts").select("*").eq("housing_id", id).order("is_primary", { ascending: false }),
    supabase.from("housing_images").select("*").eq("housing_id", id).order("is_cover", { ascending: false }).order("sort_order"),
    supabase.from("regions").select("id, district, village, city").order("district"),
  ])

  if (!housing.data) return null
  return {
    housing: housing.data,
    kontak: kontak.data ?? [],
    gambar: gambar.data ?? [],
    regions: regions.data ?? [],
  }
}

export async function getRegions() {
  const supabase = await createClient()
  const { data } = await supabase.from("regions").select("id, district, village, city").order("district")
  return data ?? []
}

export type ProspekAdmin = {
  id: string
  name: string
  phone: string
  email: string | null
  message: string | null
  status: "baru" | "dihubungi" | "diproses" | "selesai" | "batal"
  created_at: string
  consent_at: string
  consent_version: string
  purge_after: string
  housing: { name: string; slug: string } | null
}

export async function getDaftarProspek(): Promise<ProspekAdmin[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, name, phone, email, message, status, created_at, consent_at, consent_version, purge_after, housings(name, slug)",
    )
    .order("created_at", { ascending: false })
    .limit(200)

  if (error) throw new Error(`Gagal memuat prospek: ${error.message}`)

  return (data ?? []).map((r) => {
    const h = (r as unknown as { housings: { name: string; slug: string } | null }).housings
    return { ...(r as unknown as ProspekAdmin), housing: h }
  })
}

export async function getCatatanProspek(leadId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("lead_notes")
    .select("id, body, created_at")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
  return data ?? []
}

export async function getJejakAudit(limit = 50) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("audit_logs")
    .select("id, actor_email, table_name, record_id, action, created_at, diff")
    .order("created_at", { ascending: false })
    .limit(limit)
  return data ?? []
}
