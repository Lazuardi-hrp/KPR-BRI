import type { Database } from "@/lib/database.types"
import type { Housing } from "@/lib/housing"

/**
 * Satu-satunya tempat arti verifikasi ditetapkan.
 *
 * Sebelum berkas ini ada, label dan warna status hidup di tiga tempat —
 * antrean admin, lencana publik, dan layar pemeriksaan — dan ketiganya sudah
 * mulai menyimpang. Kartu bisa menyebut sebuah properti "Terverifikasi"
 * sementara halaman detailnya menyebutnya "Perlu pembaruan", dan tidak ada
 * satu berkas pun yang bisa disalahkan.
 *
 * Aturan yang TIDAK ada di sini, dan memang tidak boleh ada di sini:
 * "terverifikasi hanya bila SELURUH bidang dicentang" adalah milik
 * verify_housing() di migrasi 0013. Menyalinnya ke TypeScript akan membuat dua
 * tempat yang bisa berbeda pendapat tentang hal yang sama.
 */

export type BidangVerifikasi = Database["public"]["Enums"]["verification_field"]
export type StatusVerifikasi = Database["public"]["Enums"]["verification_status"]

/**
 * Urutan tampil bidang — dari identitas properti menuju hal yang paling cepat
 * basi. Ketersediaan unit sengaja terakhir: itu bidang yang paling sering
 * berubah, jadi paling sering menjadi satu-satunya yang bertanda peringatan.
 */
export const URUTAN_BIDANG: BidangVerifikasi[] = [
  "nama",
  "harga",
  "lokasi",
  "pengembang",
  "foto",
  "kontak",
  "ketersediaan_unit",
]

export const LABEL_BIDANG: Record<BidangVerifikasi, string> = {
  nama: "Nama properti",
  harga: "Harga properti",
  lokasi: "Lokasi properti",
  pengembang: "Pengembang",
  foto: "Foto properti",
  kontak: "Informasi kontak",
  ketersediaan_unit: "Ketersediaan unit",
}

/** Nama bidang di housing_field_history → label yang dibaca manusia. */
export const LABEL_RIWAYAT: Record<string, string> = {
  nama: "Nama properti",
  price_min: "Harga minimum",
  price_max: "Harga maksimum",
  address: "Alamat",
  koordinat: "Koordinat",
  developer_id: "Pengembang",
  unit_tersedia: "Unit tersedia",
  kontak_telepon: "Nomor kontak",
  kontak_nama: "Nama kontak",
  kontak_email: "Email kontak",
  foto: "Jumlah foto",
}

export const LABEL_STATUS: Record<StatusVerifikasi, string> = {
  terverifikasi: "Properti Terverifikasi",
  menunggu: "Verifikasi Diproses",
  perlu_pembaruan: "Informasi Perlu Pembaruan",
}

/** Pasangan kelas Tailwind (latar + tinta) untuk permukaan terang. */
export const LENCANA_STATUS: Record<StatusVerifikasi, string> = {
  terverifikasi: "bg-ok-50 text-ok",
  menunggu: "bg-secondary text-muted-foreground",
  perlu_pembaruan: "bg-warn-50 text-warn",
}

/**
 * Varian untuk permukaan ink (#04203f) — kartu koleksi perumahan.
 * bg-ok-50 (#eaf6ee) di atas ink akan menjadi bercak putih menyilaukan, jadi
 * tintnya dibalik menjadi transparansi dari warna statusnya sendiri.
 */
export const LENCANA_STATUS_INK: Record<StatusVerifikasi, string> = {
  terverifikasi: "bg-ok/20 text-white ring-1 ring-inset ring-ok/40",
  menunggu: "bg-white/10 text-mist-400 ring-1 ring-inset ring-white/15",
  perlu_pembaruan: "bg-brand-orange/20 text-white ring-1 ring-inset ring-brand-orange/40",
}

// ── Tahap verifikasi ────────────────────────────────────────────────────────

/**
 * Basis data punya tiga status; siklus hidup yang dijanjikan produk punya
 * lima tahap. Dua tahap sisanya — "segera ditinjau" dan "kedaluwarsa" —
 * DITURUNKAN dari verification_due_at, bukan disimpan.
 *
 * Alasannya: expire_verifications() berjalan tiap malam dan langsung
 * menjatuhkan 'terverifikasi' yang lewat tempo menjadi 'perlu_pembaruan'.
 * Nilai enum "kedaluwarsa" karena itu hanya akan hidup beberapa jam sebelum
 * cron menghapusnya sendiri — kolom yang isinya hampir selalu salah.
 * Yang benar-benar perlu dijawab layar adalah "kapan ini harus dilihat lagi",
 * dan tanggalnya sudah ada.
 */
export type TahapVerifikasi =
  | "aktif"
  | "segera_ditinjau"
  | "kedaluwarsa"
  | "perlu_pembaruan"
  | "menunggu"

/** Ambang "segera ditinjau" — sama dengan yang dipakai verification_metrics(). */
export const HARI_SEGERA_DITINJAU = 7

export const URUTAN_TAHAP: TahapVerifikasi[] = [
  "aktif",
  "segera_ditinjau",
  "kedaluwarsa",
  "perlu_pembaruan",
  "menunggu",
]

export const LABEL_TAHAP: Record<TahapVerifikasi, string> = {
  aktif: "Aktif",
  segera_ditinjau: "Segera ditinjau",
  kedaluwarsa: "Kedaluwarsa",
  perlu_pembaruan: "Perlu pembaruan",
  menunggu: "Menunggu",
}

export const LENCANA_TAHAP: Record<TahapVerifikasi, string> = {
  aktif: "bg-ok-50 text-ok",
  segera_ditinjau: "bg-brand-sky-50 text-brand-sky-ink",
  kedaluwarsa: "bg-danger-50 text-danger",
  perlu_pembaruan: "bg-warn-50 text-warn",
  menunggu: "bg-secondary text-muted-foreground",
}

export function tahapVerifikasi(
  status: StatusVerifikasi | null | undefined,
  verificationDueAt: string | null | undefined,
  sekarang: number = Date.now(),
): TahapVerifikasi {
  if (status === "perlu_pembaruan") return "perlu_pembaruan"
  if (status !== "terverifikasi") return "menunggu"

  // Terverifikasi tanpa tanggal tinjau ulang tidak seharusnya terjadi —
  // verify_housing() selalu mengisinya. Kalau toh terjadi, perlakukan sebagai
  // aktif alih-alih menuduhnya kedaluwarsa tanpa dasar.
  if (!verificationDueAt) return "aktif"

  const tempo = new Date(verificationDueAt).getTime()
  if (Number.isNaN(tempo)) return "aktif"
  if (tempo < sekarang) return "kedaluwarsa"
  if (tempo - sekarang <= HARI_SEGERA_DITINJAU * 86_400_000) return "segera_ditinjau"
  return "aktif"
}

// ── Skor kepercayaan ────────────────────────────────────────────────────────

export type BandSkor = "sangat_baik" | "baik" | "cukup" | "perlu_perhatian"

export const LABEL_BAND: Record<BandSkor, string> = {
  sangat_baik: "Sangat baik",
  baik: "Baik",
  cukup: "Cukup",
  perlu_perhatian: "Perlu perhatian",
}

/** Warna cincin skor. Memakai token semantik, bukan hijau/kuning/merah ad hoc. */
export const WARNA_BAND: Record<BandSkor, string> = {
  sangat_baik: "var(--ok)",
  baik: "var(--brand)",
  cukup: "var(--warn)",
  perlu_perhatian: "var(--danger)",
}

/**
 * Bahan skor, dalam bentuk yang bisa disusun BAIK dari view model publik
 * (Housing) MAUPUN dari baris antrean admin.
 *
 * Bentuk perantara ini ada supaya kartu di beranda, halaman detail, dan tabel
 * admin memakai satu rumus yang sama. Kalau masing-masing menghitung sendiri
 * dari kolom yang kebetulan tersedia padanya, angka 92 di kartu dan 78 di
 * halaman detail akan menjadi cacat yang mustahil dilacak.
 */
export type SinyalKepercayaan = {
  status: StatusVerifikasi
  verifiedAt: string | null
  verificationDueAt: string | null
  lastDataChangeAt: string | null
  /** Bidang yang dicentang pada verifikasi TERAKHIR — lihat 0013 §10. */
  verifiedFields: string[] | null
  ada: Record<BidangVerifikasi, boolean>
  needsReview: boolean
}

export type HasilSkor = {
  skor: number
  band: BandSkor
  rincian: Array<{ bidang: BidangVerifikasi; ada: boolean; terverifikasi: boolean }>
}

export function sinyalDariHousing(h: Housing): SinyalKepercayaan {
  return {
    status: h.verificationStatus ?? "menunggu",
    verifiedAt: h.verifiedAt ?? null,
    verificationDueAt: h.verificationDueAt ?? null,
    lastDataChangeAt: h.lastDataChangeAt ?? null,
    verifiedFields: h.verifiedFields ?? null,
    needsReview: h.needsReview ?? false,
    ada: {
      nama: Boolean(h.name?.trim()),
      harga: h.priceMin != null,
      lokasi: Boolean(h.description?.trim()) && Number.isFinite(h.lat) && Number.isFinite(h.lng),
      pengembang: Boolean(h.developerName?.trim()),
      foto: (h.images?.length ?? 0) > 0 || Boolean(h.image),
      kontak: Boolean(h.phone?.trim()),
      ketersediaan_unit: (h.totalUnits ?? 0) > 0,
    },
  }
}

/** Baris verification_queue — bentuknya ditetapkan di src/lib/queries/admin.ts. */
type BarisAntrean = {
  name: string
  verification_status: string
  verified_at: string | null
  verification_due_at: string | null
  last_data_change_at: string | null
  verified_fields: string[] | null
  district: string | null
  price_min: number | null
  developer_id: string | null
  punya_kontak: boolean
  jumlah_foto: number
  total_units: number | null
  needs_review: boolean
}

export function sinyalDariAntrean(r: BarisAntrean): SinyalKepercayaan {
  return {
    status: (r.verification_status as StatusVerifikasi) ?? "menunggu",
    verifiedAt: r.verified_at,
    verificationDueAt: r.verification_due_at,
    lastDataChangeAt: r.last_data_change_at,
    verifiedFields: r.verified_fields,
    needsReview: r.needs_review,
    ada: {
      nama: Boolean(r.name?.trim()),
      harga: r.price_min != null,
      lokasi: Boolean(r.district?.trim()),
      pengembang: Boolean(r.developer_id),
      foto: r.jumlah_foto > 0,
      kontak: r.punya_kontak,
      ketersediaan_unit: (r.total_units ?? 0) > 0,
    },
  }
}

const HARI = 86_400_000

/**
 * Skor kepercayaan 0–100.
 *
 * Ini BUKAN penilaian mutu properti, harga, atau pengembangnya. Yang diukur
 * hanya dua hal: seberapa lengkap informasinya, dan seberapa baru
 * pemeriksaannya. Sebuah rumah bagus dengan data yang belum pernah dicek
 * memang pantas mendapat angka rendah — itu bukan penghinaan terhadap
 * rumahnya, melainkan pernyataan jujur tentang apa yang kami ketahui.
 *
 *   Kelengkapan   40  — 40/7 per bidang yang ada isinya sama sekali
 *   Cakupan       40  — 40/7 per bidang yang dicentang pemeriksaan terakhir
 *   Kesegaran     20  — meluruh dari usia verifikasi terakhir
 *
 * Dua batas atas yang tidak bisa ditembus:
 *   - status 'menunggu' → maksimal 50. Data yang belum pernah dilihat siapa
 *     pun tidak boleh terbaca meyakinkan, sekalipun seluruh kolomnya terisi.
 *   - needs_review → maksimal 65. Penanda itu artinya seseorang sudah
 *     menyatakan datanya diragukan.
 */
export function skorKepercayaan(s: SinyalKepercayaan): HasilSkor {
  const n = URUTAN_BIDANG.length
  const dicek = new Set(s.verifiedFields ?? [])

  const rincian = URUTAN_BIDANG.map((bidang) => ({
    bidang,
    ada: s.ada[bidang] ?? false,
    terverifikasi: dicek.has(bidang),
  }))

  const kelengkapan = (rincian.filter((r) => r.ada).length / n) * 40
  // Bidang hanya dihitung terverifikasi bila datanya memang ada. Mencentang
  // "pengembang" pada properti tanpa pengembang bukan pemeriksaan apa pun.
  const cakupan = (rincian.filter((r) => r.terverifikasi && r.ada).length / n) * 40

  let kesegaran = 0
  if (s.verifiedAt) {
    const usia = Date.now() - new Date(s.verifiedAt).getTime()
    const berubahSetelahnya =
      s.lastDataChangeAt != null &&
      new Date(s.lastDataChangeAt).getTime() > new Date(s.verifiedAt).getTime()

    // Data berubah setelah diperiksa: pemeriksaannya basi menurut definisi,
    // berapa pun umurnya. Ini cerminan trigger housings_track_changes.
    if (!berubahSetelahnya) {
      if (usia <= 7 * HARI) kesegaran = 20
      else if (usia <= 30 * HARI) kesegaran = 16
      else if (usia <= 60 * HARI) kesegaran = 10
      else if (usia <= 90 * HARI) kesegaran = 5
    }
  }

  let skor = Math.round(kelengkapan + cakupan + kesegaran)
  if (s.status === "menunggu") skor = Math.min(skor, 50)
  if (s.needsReview) skor = Math.min(skor, 65)
  skor = Math.max(0, Math.min(100, skor))

  return { skor, band: bandSkor(skor), rincian }
}

export function bandSkor(skor: number): BandSkor {
  if (skor >= 85) return "sangat_baik"
  if (skor >= 70) return "baik"
  if (skor >= 50) return "cukup"
  return "perlu_perhatian"
}

// ── Kesegaran informasi ─────────────────────────────────────────────────────

/** Di atas ini, halaman publik memperingatkan alih-alih meyakinkan. Spec §4. */
export const HARI_DIANGGAP_BASI = 45

export function verifikasiBasi(
  verifiedAt: string | null | undefined,
  lastDataChangeAt: string | null | undefined,
  sekarang: number = Date.now(),
): boolean {
  if (!verifiedAt) return false // belum pernah diverifikasi ≠ basi; itu status lain
  const dicek = new Date(verifiedAt).getTime()
  if (lastDataChangeAt && new Date(lastDataChangeAt).getTime() > dicek) return true
  return sekarang - dicek > HARI_DIANGGAP_BASI * HARI
}

/** Bentuk kolom field_checks dari v_housing_public. */
export type PemeriksaanBidangPublik = { field: string; last_checked_at: string | null }

export function petaPemeriksaan(
  fieldChecks: PemeriksaanBidangPublik[] | null | undefined,
): Map<string, string | null> {
  return new Map((fieldChecks ?? []).map((c) => [c.field, c.last_checked_at]))
}
