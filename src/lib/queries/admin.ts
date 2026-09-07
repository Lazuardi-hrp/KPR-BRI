import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/database.types"

/**
 * Pembacaan sisi admin.
 *
 * Semuanya memakai klien bersesi (bukan anon), jadi RLS yang memutuskan apa
 * yang terlihat: admin melihat semuanya, pengembang hanya miliknya. Tidak ada
 * penyaringan berdasarkan peran di lapisan aplikasi — kalau ada, itu akan
 * menjadi tempat kedua yang bisa salah.
 */

export type StatusProspek = Database["public"]["Enums"]["lead_status"]
export type JenisProspek = Database["public"]["Enums"]["lead_kind"]
export type StatusVerifikasi = Database["public"]["Enums"]["verification_status"]

export type RingkasanAdmin = {
  totalPerumahan: number
  terbit: number
  draft: number
  arsip: number
  perluTinjau: number
  totalUnitTersedia: number
  stokMenipis: { id: string; name: string; available_units: number }[]
}

export async function getRingkasanAdmin(): Promise<RingkasanAdmin> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("housings")
    .select("id, name, status, available_units, needs_review")
    .is("deleted_at", null)

  const rows = data ?? []

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
  }
}

// ─────────────────────────── Metrik ───────────────────────────

export type MetrikProspek = {
  baru: number
  perluTindak: number
  terkualifikasi: number
  pengajuan: number
  terlambat: number
  belumDitugaskan: number
  total: number
  mingguIni: number
}

export async function getMetrikProspek(): Promise<MetrikProspek> {
  const supabase = await createClient()
  const { data } = await supabase.rpc("lead_metrics")
  const r = data?.[0]
  return {
    baru: Number(r?.baru ?? 0),
    perluTindak: Number(r?.perlu_tindak ?? 0),
    terkualifikasi: Number(r?.terkualifikasi ?? 0),
    pengajuan: Number(r?.pengajuan ?? 0),
    terlambat: Number(r?.terlambat ?? 0),
    belumDitugaskan: Number(r?.belum_ditugaskan ?? 0),
    total: Number(r?.total ?? 0),
    mingguIni: Number(r?.minggu_ini ?? 0),
  }
}

export type MetrikVerifikasi = {
  terverifikasi: number
  menunggu: number
  perluPembaruan: number
  jatuhTempo: number
  terbitBelumVerif: number
}

export async function getMetrikVerifikasi(): Promise<MetrikVerifikasi> {
  const supabase = await createClient()
  const { data } = await supabase.rpc("verification_metrics")
  const r = data?.[0]
  return {
    terverifikasi: Number(r?.terverifikasi ?? 0),
    menunggu: Number(r?.menunggu ?? 0),
    perluPembaruan: Number(r?.perlu_pembaruan ?? 0),
    jatuhTempo: Number(r?.jatuh_tempo ?? 0),
    terbitBelumVerif: Number(r?.terbit_belum_verif ?? 0),
  }
}

export type MetrikKeamanan = {
  peristiwa24j: number
  diblokirAktif: number
  kuotaTerlampaui: number
  botTertahan: number
  identitasUnik: number
  /** Temuan berbobot yang belum ditandai selesai (7 hari terakhir). */
  belumSelesai: number
  /** Peringatan lonjakan lalu lintas yang belum ditangani. */
  lonjakanTerbuka: number
}

/**
 * Metrik keamanan hanya terbaca oleh admin (kebijakan abuse_events_read_admin).
 * Bagi pengembang, RLS mengembalikan nol — bukan galat — jadi dashboard mereka
 * tetap tampil utuh tanpa panel yang bukan urusannya.
 */
export async function getMetrikKeamanan(): Promise<MetrikKeamanan> {
  const supabase = await createClient()
  const { data } = await supabase.rpc("security_metrics")
  const r = data?.[0]
  return {
    peristiwa24j: Number(r?.peristiwa_24j ?? 0),
    diblokirAktif: Number(r?.diblokir_aktif ?? 0),
    kuotaTerlampaui: Number(r?.kuota_terlampaui ?? 0),
    botTertahan: Number(r?.bot_tertahan ?? 0),
    identitasUnik: Number(r?.identitas_unik ?? 0),
    belumSelesai: Number(r?.belum_selesai ?? 0),
    lonjakanTerbuka: Number(r?.lonjakan_terbuka ?? 0),
  }
}

// ─────────────────────────── Perumahan ───────────────────────────

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
  verification_status: StatusVerifikasi
  verified_at: string | null
  updated_at: string
}

export async function getDaftarPerumahanAdmin(): Promise<BarisPerumahanAdmin[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("housings")
    .select(
      "id, legacy_id, slug, name, status, available_units, total_units, price_min, needs_review, verification_status, verified_at, updated_at",
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
    supabase
      .from("housing_contacts")
      .select("*")
      .eq("housing_id", id)
      .order("is_primary", { ascending: false }),
    supabase
      .from("housing_images")
      .select("*")
      .eq("housing_id", id)
      .order("is_cover", { ascending: false })
      .order("sort_order"),
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
  const { data } = await supabase
    .from("regions")
    .select("id, district, village, city")
    .order("district")
  return data ?? []
}

// ─────────────────────────── Verifikasi ───────────────────────────

/**
 * Tipe ditulis tangan karena tipe hasil RPC yang digenerate menandai kolom
 * timestamp nullable sebagai `string` non-null. Kolom lokasi dan bahan skor
 * ditambahkan migrasi 0016 supaya tabel /admin/verifikasi bisa menampilkan
 * Lokasi dan Skor tanpa satu kueri tambahan per baris.
 */
export type AntreanVerifikasi = {
  id: string
  name: string
  slug: string
  status: string
  verification_status: string
  verified_at: string | null
  verification_due_at: string | null
  last_data_change_at: string | null
  hari_terlambat: number
  prioritas: number
  district: string | null
  village: string | null
  price_min: number | null
  developer_id: string | null
  punya_kontak: boolean
  jumlah_foto: number
  total_units: number | null
  needs_review: boolean
  verified_fields: string[] | null
}

export async function getAntreanVerifikasi(limit = 100): Promise<AntreanVerifikasi[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("verification_queue", { p_limit: limit })
  if (error) throw new Error(`Gagal memuat antrean verifikasi: ${error.message}`)
  return (data ?? []) as AntreanVerifikasi[]
}

export type PemeriksaanBidang = {
  field: string
  last_checked_at: string | null
  checked_by: string | null
  changed_since: boolean
}

/**
 * Seluruh bahan layar verifikasi satu perumahan dalam satu perjalanan:
 * datanya sendiri, status per bidang, riwayat perubahan, dan verifikasi lampau.
 */
export async function getDetailVerifikasi(id: string) {
  const supabase = await createClient()

  const [housing, kontak, gambar, bidang, riwayat, lampau] = await Promise.all([
    supabase
      .from("housings")
      .select(
        "id, name, slug, status, price_min, price_max, address, lat, lng, developer_id, subsidi_units, commercial_units, sold_subsidi_units, sold_commercial_units, available_units, verification_status, verified_at, verification_due_at, verification_note, last_data_change_at, needs_review, created_at, developers(name)",
      )
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("housing_contacts")
      .select("name, phone, email, is_primary")
      .eq("housing_id", id)
      .order("is_primary", { ascending: false }),
    supabase
      .from("housing_images")
      .select("id, storage_path, is_cover, created_at")
      .eq("housing_id", id),
    supabase.rpc("housing_field_checks", { p_housing_id: id }),
    supabase
      .from("housing_field_history")
      .select("id, field, nilai_lama, nilai_baru, created_at")
      .eq("housing_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("housing_verifications")
      .select("id, verified_email, checked, note, next_review_at, created_at")
      .eq("housing_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
  ])

  if (!housing.data) return null

  return {
    housing: housing.data,
    kontak: kontak.data ?? [],
    gambar: gambar.data ?? [],
    bidang: (bidang.data ?? []) as PemeriksaanBidang[],
    riwayat: riwayat.data ?? [],
    lampau: lampau.data ?? [],
  }
}

// ─────────────────────────── Prospek ───────────────────────────

export type ProspekAdmin = {
  id: string
  name: string
  phone: string
  email: string | null
  message: string | null
  status: StatusProspek
  lead_kind: JenisProspek
  source_page: string | null
  price_snapshot: number | null
  est_monthly_payment: number | null
  tenor_years: number | null
  /** Dilaporkan sendiri calon pembeli di kalkulator. Tidak diverifikasi. */
  monthly_income: number | null
  monthly_commitments: number | null
  /** Hasil hitungan server, bukan kiriman klien. Bukan penilaian kelayakan. */
  affordability_band: string | null
  created_at: string
  first_contact_due_at: string | null
  contacted_at: string | null
  last_activity_at: string
  assigned_to: string | null
  risk_score: number
  is_flagged: boolean
  consent_at: string
  consent_version: string
  purge_after: string
  housing: { name: string; slug: string } | null
}

const KOLOM_PROSPEK =
  "id, name, phone, email, message, status, lead_kind, source_page, " +
  "price_snapshot, est_monthly_payment, tenor_years, " +
  "monthly_income, monthly_commitments, affordability_band, created_at, " +
  "first_contact_due_at, contacted_at, last_activity_at, assigned_to, " +
  "risk_score, is_flagged, consent_at, consent_version, purge_after, housings(name, slug)"

function bentukProspek(r: unknown): ProspekAdmin {
  const h = (r as { housings: { name: string; slug: string } | null }).housings
  return { ...(r as ProspekAdmin), housing: h }
}

export type FilterProspek = {
  status?: StatusProspek
  /** Hanya yang belum dihubungi dan sudah lewat batas SLA. */
  terlambat?: boolean
  belumDitugaskan?: boolean
  q?: string
}

export async function getDaftarProspek(f: FilterProspek = {}): Promise<ProspekAdmin[]> {
  const supabase = await createClient()

  let q = supabase.from("leads").select(KOLOM_PROSPEK)

  if (f.status) q = q.eq("status", f.status)
  if (f.terlambat) q = q.eq("status", "baru").lt("first_contact_due_at", new Date().toISOString())
  if (f.belumDitugaskan) q = q.is("assigned_to", null)
  if (f.q?.trim()) {
    const t = f.q.trim().replace(/[%,()]/g, "")
    if (t) q = q.or(`name.ilike.%${t}%,phone.ilike.%${t}%`)
  }

  const { data, error } = await q.order("created_at", { ascending: false }).limit(200)
  if (error) throw new Error(`Gagal memuat prospek: ${error.message}`)

  return (data ?? []).map(bentukProspek)
}

export async function getProspek(id: string) {
  const supabase = await createClient()

  const [lead, catatan, riwayat, staf] = await Promise.all([
    supabase.from("leads").select(KOLOM_PROSPEK).eq("id", id).maybeSingle(),
    supabase
      .from("lead_notes")
      .select("id, body, created_at, profiles(full_name)")
      .eq("lead_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("lead_status_history")
      .select("id, dari, ke, created_at, profiles(full_name)")
      .eq("lead_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("is_active", true)
      .in("role", ["admin", "pengembang"])
      .order("full_name"),
  ])

  if (!lead.data) return null

  return {
    lead: bentukProspek(lead.data),
    catatan: catatan.data ?? [],
    riwayat: riwayat.data ?? [],
    staf: staf.data ?? [],
  }
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

// ─────────────────────────── Notifikasi ───────────────────────────

export type Notifikasi = {
  id: string
  kind: Database["public"]["Enums"]["notif_kind"]
  title: string
  body: string | null
  href: string | null
  severity: number
  read_at: string | null
  created_at: string
}

export async function getNotifikasi(limit = 20): Promise<Notifikasi[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("admin_notifications")
    .select("id, kind, title, body, href, severity, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit)
  return (data ?? []) as Notifikasi[]
}

export async function getJumlahBelumDibaca(): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from("admin_notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null)
  return count ?? 0
}

// ─────────────────────────── Keamanan ───────────────────────────

export type PeristiwaKeamanan = {
  id: number
  ip_hash: string
  kind: Database["public"]["Enums"]["abuse_kind"]
  action: string | null
  path: string | null
  severity: number
  created_at: string
  resolved_at: string | null
}

export async function getPeristiwaKeamanan(limit = 100): Promise<PeristiwaKeamanan[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("abuse_events")
    .select("id, ip_hash, kind, action, path, severity, created_at, resolved_at")
    .order("created_at", { ascending: false })
    .limit(limit)
  return (data ?? []) as PeristiwaKeamanan[]
}

export type LonjakanKeamanan = {
  id: number
  action: string
  requests: number
  identities: number
  suspicious: number
  created_at: string
  resolved_at: string | null
}

/**
 * Peringatan lonjakan lalu lintas, yang belum ditangani lebih dulu.
 *
 * Lonjakan adalah satu-satunya sinyal di halaman ini yang tidak berasal dari
 * satu identitas: ia justru muncul ketika BANYAK identitas berperilaku wajar
 * satu per satu namun tidak wajar bila dijumlahkan. Karena itu ia butuh
 * daftarnya sendiri dan tidak bisa digabung ke tabel peristiwa.
 */
export async function getLonjakanKeamanan(limit = 20): Promise<LonjakanKeamanan[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("security_alerts")
    .select("id, action, requests, identities, suspicious, created_at, resolved_at")
    .order("resolved_at", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: false })
    .limit(limit)
  return (data ?? []) as LonjakanKeamanan[]
}

export type IdentitasDiblokir = {
  ip_hash: string
  reason: string
  blocked_at: string
  blocked_until: string
  hits: number
  is_manual: boolean
}

/**
 * Identitas yang blokirnya masih berlaku.
 *
 * "Masih berlaku" disaring di basis data, bukan setelah baris-barisnya
 * sampai: jam server itulah yang menentukan, dan halaman ini tidak pernah
 * menampilkan blokir yang sudah lewat.
 */
export async function getIdentitasDiblokir(): Promise<IdentitasDiblokir[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("blocked_identities")
    .select("ip_hash, reason, blocked_at, blocked_until, hits, is_manual")
    .gt("blocked_until", new Date().toISOString())
    .order("blocked_until", { ascending: false })
    .limit(100)
  return (data ?? []) as IdentitasDiblokir[]
}

// ─────────────────────────── Audit ───────────────────────────

export async function getJejakAudit(limit = 50) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("audit_logs")
    .select("id, actor_email, table_name, record_id, action, created_at, diff")
    .order("created_at", { ascending: false })
    .limit(limit)
  return data ?? []
}
