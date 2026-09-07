import "server-only"

import { createClient } from "@/lib/supabase/server"

/**
 * Pembacaan analitik untuk /admin/analitik.
 *
 * Sama seperti queries/admin.ts: klien bersesi, RLS yang memutuskan. Tidak ada
 * penyaringan peran di lapisan ini — kalau ada, ia menjadi tempat kedua yang
 * bisa salah.
 *
 * Yang perlu diketahui sebelum memakai angka mana pun dari berkas ini:
 * kebijakan `events_read_staff` pada housing_events berbunyi
 * `using (public.is_admin())`, jadi seorang 'pengembang' menerima NOL BARIS
 * dan bukan galat. Halaman pemanggil menutup pintunya sendiri untuk peran itu;
 * lihat catatan di src/app/admin/(secure)/analitik/page.tsx.
 *
 * Seluruh RPC dibatasi rentang hari dan diagregasi di basis data — satu
 * perjalanan per panel, bukan satu count(*) per angka. Alasannya sudah
 * ditulis di migrasi 0012 baris 450-457 dan berlaku sama di sini.
 */

export type RingkasanCorong = {
  kunjungan: number
  lihatProperti: number
  pakaiKalkulator: number
  kontak: number
  prospek: number
  pengajuan: number
  /** Jumlah properti yang dibuka (unik per sesi), bukan jumlah orang. */
  tampilan: number
}

export type Corong = {
  kini: RingkasanCorong
  lalu: RingkasanCorong
}

const NOL: RingkasanCorong = {
  kunjungan: 0,
  lihatProperti: 0,
  pakaiKalkulator: 0,
  kontak: 0,
  prospek: 0,
  pengajuan: 0,
  tampilan: 0,
}

export async function getCorong(hari: number): Promise<Corong> {
  const supabase = await createClient()
  const { data } = await supabase.rpc("analytics_funnel", { p_days: hari })
  const r = data?.[0]
  if (!r) return { kini: NOL, lalu: NOL }

  return {
    kini: {
      kunjungan: Number(r.kunjungan ?? 0),
      lihatProperti: Number(r.lihat_properti ?? 0),
      pakaiKalkulator: Number(r.pakai_kalkulator ?? 0),
      kontak: Number(r.kontak ?? 0),
      prospek: Number(r.prospek ?? 0),
      pengajuan: Number(r.pengajuan ?? 0),
      tampilan: Number(r.tampilan ?? 0),
    },
    lalu: {
      kunjungan: Number(r.kunjungan_lalu ?? 0),
      lihatProperti: Number(r.lihat_properti_lalu ?? 0),
      pakaiKalkulator: Number(r.pakai_kalkulator_lalu ?? 0),
      kontak: Number(r.kontak_lalu ?? 0),
      prospek: Number(r.prospek_lalu ?? 0),
      pengajuan: Number(r.pengajuan_lalu ?? 0),
      tampilan: Number(r.tampilan_lalu ?? 0),
    },
  }
}

export type TitikHarian = {
  hari: string
  pengunjung: number
  tampilan: number
  kalkulator: number
  kontak: number
  prospek: number
}

export async function getHarian(hari: number): Promise<TitikHarian[]> {
  const supabase = await createClient()
  const { data } = await supabase.rpc("analytics_harian", { p_days: hari })
  return (data ?? []).map((r) => ({
    hari: String(r.hari),
    pengunjung: Number(r.pengunjung ?? 0),
    tampilan: Number(r.tampilan ?? 0),
    kalkulator: Number(r.kalkulator ?? 0),
    kontak: Number(r.kontak ?? 0),
    prospek: Number(r.prospek ?? 0),
  }))
}

export type BarisProperti = {
  housingId: string
  name: string
  slug: string
  tampilan: number
  kontak: number
  prospek: number
  /** null bila tampilannya nol — "belum bisa dihitung", bukan "0%". */
  konversi: number | null
}

export async function getProperti(hari: number, limit = 10): Promise<BarisProperti[]> {
  const supabase = await createClient()
  const { data } = await supabase.rpc("analytics_properti", { p_days: hari, p_limit: limit })
  return (data ?? []).map((r) => ({
    housingId: String(r.housing_id),
    name: String(r.name),
    slug: String(r.slug),
    tampilan: Number(r.tampilan ?? 0),
    kontak: Number(r.kontak ?? 0),
    prospek: Number(r.prospek ?? 0),
    konversi: r.konversi == null ? null : Number(r.konversi),
  }))
}

export type BarisLokasi = { district: string; tampilan: number; prospek: number }

export async function getLokasi(hari: number): Promise<BarisLokasi[]> {
  const supabase = await createClient()
  const { data } = await supabase.rpc("analytics_lokasi", { p_days: hari })
  return (data ?? []).map((r) => ({
    district: String(r.district),
    tampilan: Number(r.tampilan ?? 0),
    prospek: Number(r.prospek ?? 0),
  }))
}

export type SelJam = { dow: number; jam: number; jumlah: number }

export async function getJam(hari: number): Promise<SelJam[]> {
  const supabase = await createClient()
  const { data } = await supabase.rpc("analytics_jam", { p_days: hari })
  return (data ?? []).map((r) => ({
    dow: Number(r.dow ?? 0),
    jam: Number(r.jam ?? 0),
    jumlah: Number(r.jumlah ?? 0),
  }))
}

export type BarisRujukan = { asal: string; jumlah: number }

export async function getRujukan(hari: number, limit = 8): Promise<BarisRujukan[]> {
  const supabase = await createClient()
  const { data } = await supabase.rpc("analytics_rujukan", { p_days: hari, p_limit: limit })
  return (data ?? []).map((r) => ({ asal: String(r.asal), jumlah: Number(r.jumlah ?? 0) }))
}

export type BarisBand = { band: string | null; jumlah: number }

export async function getBand(hari: number): Promise<BarisBand[]> {
  const supabase = await createClient()
  const { data } = await supabase.rpc("analytics_band", { p_days: hari })
  return (data ?? []).map((r) => ({
    band: r.band == null ? null : String(r.band),
    jumlah: Number(r.jumlah ?? 0),
  }))
}
