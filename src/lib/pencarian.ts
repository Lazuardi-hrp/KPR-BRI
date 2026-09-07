/**
 * Penyaringan perumahan untuk peta.
 *
 * Berkas ini adalah satu-satunya tempat "apa yang lolos filter" diputuskan.
 * Peta, daftar di bilah samping, penghitung hasil, dan chip filter aktif
 * semuanya membaca keluaran fungsi yang sama — kalau tidak, peta akan
 * menggambar pin yang tidak ada di daftar, persis cacat yang ada sebelum
 * berkas ini dibuat (map-view.tsx menyaring daftar tetapi mengirim daftar
 * penuh ke housing-map.tsx).
 *
 * KENAPA DI KLIEN, BUKAN LEWAT RPC
 * Ke-16 baris sudah ada di memori dari getPublishedHousings(), lengkap dengan
 * fotonya — yang tidak dibawa search_housings maupun nearest_housings. Satu
 * perjalanan jaringan setiap kali penggeser digerakkan akan membuat peta
 * terasa patah tanpa menambah satu pun baris yang bisa ditemukan. Alasan yang
 * sama sudah ditulis di budget-matches.tsx dan sengaja diulang di sini.
 *
 * Tidak ada "use client" maupun "server-only": bentuknya mengikuti kpr.ts —
 * matematika murni yang bisa dipanggil dari mana saja dan diuji sendirian.
 */

import {
  bandKemampuan,
  hitungKPR,
  skemaBawaan,
  type BandKemampuan,
  type KonfigSkema,
} from "./kpr"
import { calculateDistance } from "./geolocation-utils"
import type { Housing } from "./housing"

// ── Titik acuan ───────────────────────────────────────────────────────────

/**
 * Dari mana titik acuan berasal.
 *
 * Dibedakan karena ketiganya perlu label dan ikon yang berbeda di peta, dan
 * karena "lokasi saya" adalah satu-satunya yang menuntut izin peramban.
 */
export type SumberTitik = "saya" | "peta" | "alamat"

export type TitikAcuan = {
  lat: number
  lng: number
  /** Yang ditampilkan pada chip dan popup penanda. */
  label: string
  sumber: SumberTitik
}

// ── Bentuk filter ─────────────────────────────────────────────────────────

/**
 * Seluruh keadaan pencarian dalam satu objek.
 *
 * Empat bidang terakhir tidak punya kontrol yang tampil hari ini: seluruh 16
 * perumahan berharga sama, semuanya subsidi, dan kolom kamar/luas masih
 * kosong (docs/DATA-TODO.md §4, §5). Bidangnya tetap ada supaya lapisan
 * penyaring tidak perlu ditulis ulang ketika datanya terisi — lihat
 * hitungFacet().
 */
export type FilterPeta = {
  /** Cocok pada nama atau deskripsi (alamat + kecamatan + kelurahan). */
  q: string
  kecamatan: string[]
  /** Batas bawah unit tersisa. */
  unitMin: number | null

  titik: TitikAcuan | null
  radiusKm: number | null

  penghasilan: number | null
  dpPersen: number | null
  tenor: number | null
  /** Band terburuk yang masih ditampilkan. */
  bandMaks: BandKemampuan | null

  // Belum berkontrol — menunggu data yang bervariasi.
  hargaMin: number | null
  hargaMaks: number | null
  tipe: "subsidi" | "komersial" | null
  kamarMin: number | null
}

export const FILTER_KOSONG: FilterPeta = {
  q: "",
  kecamatan: [],
  unitMin: null,
  titik: null,
  radiusKm: null,
  penghasilan: null,
  dpPersen: null,
  tenor: null,
  bandMaks: null,
  hargaMin: null,
  hargaMaks: null,
  tipe: null,
  kamarMin: null,
}

/**
 * Rentang radius yang masuk akal untuk kota ini.
 *
 * Seluruh 16 perumahan muat dalam kotak sekitar 7 × 7 km. Penggeser sampai 50
 * km — nilai bawaan nearest_housings — akan memilih semuanya pada posisi mana
 * pun dan terbaca sebagai kontrol yang rusak, bukan sebagai filter.
 */
export const RADIUS_MIN_KM = 1
export const RADIUS_MAKS_KM = 15

// ── Facet: kontrol hanya untuk dimensi yang benar-benar bervariasi ─────────

export type FacetTersedia = {
  kecamatan: boolean
  unit: boolean
  harga: boolean
  tipe: boolean
  kamar: boolean
}

/**
 * Dimensi mana yang layak diberi kontrol.
 *
 * Sebuah filter yang setiap nilainya menghasilkan 16 dari 16 — atau 0 dari 16
 * — bukan filter; ia hanya kontrol mati yang membuat pengunjung mengira
 * pencariannya rusak. Jadi kontrol baru digambar setelah datanya punya
 * setidaknya dua nilai berbeda yang sungguhan.
 *
 * WAJIB dipanggil atas daftar PENUH, bukan hasil saringan. Bila dihitung dari
 * hasil, memilih satu kecamatan akan menyisakan satu nilai — dan kontrol
 * kecamatan lenyap tepat pada saat dipakai.
 *
 * Konsekuensi yang disengaja: begitu petugas mengisi harga atau jumlah kamar
 * lewat /admin, kontrolnya muncul sendiri tanpa satu baris kode pun berubah.
 */
export function hitungFacet(items: Housing[]): FacetTersedia {
  const nilaiUnik = <T,>(pilih: (h: Housing) => T | null | undefined) =>
    new Set(items.map(pilih).filter((v) => v != null && v !== "")).size

  // Skema tidak punya kolom "tipe"; subsidi vs komersial hanya terbaca dari
  // jumlah unitnya. Kontrolnya berarti baru masuk akal bila kedua macam
  // benar-benar ada di daftar.
  const adaSubsidi = items.some((h) => (h.subsidiUnits ?? 0) > 0)
  const adaKomersial = items.some((h) => (h.commercialUnits ?? 0) > 0)

  return {
    kecamatan: nilaiUnik((h) => h.district) >= 2,
    unit: nilaiUnik((h) => h.availableUnits) >= 2,
    // priceMin dan priceMax dilihat sebagai pasangan: dua perumahan berharga
    // 166 juta tetap satu nilai walau rentangnya ditulis berbeda.
    harga: nilaiUnik((h) => (h.priceMin == null ? null : `${h.priceMin}-${h.priceMax}`)) >= 2,
    tipe: adaSubsidi && adaKomersial,
    kamar: nilaiUnik((h) => h.bedrooms) >= 2,
  }
}

/** Kecamatan yang ada beserta jumlah perumahannya, urut abjad. */
export function daftarKecamatan(items: Housing[]): { nilai: string; jumlah: number }[] {
  const hitung = new Map<string, number>()
  for (const h of items) {
    const d = h.district?.trim()
    if (d) hitung.set(d, (hitung.get(d) ?? 0) + 1)
  }
  return [...hitung.entries()]
    .map(([nilai, jumlah]) => ({ nilai, jumlah }))
    .sort((a, b) => a.nilai.localeCompare(b.nilai, "id"))
}

/** Batas bawah/atas unit tersisa pada daftar, untuk menyetel penggeser. */
export function rentangUnit(items: Housing[]): { min: number; maks: number } {
  const nilai = items.map((h) => h.availableUnits).filter((n) => Number.isFinite(n))
  if (!nilai.length) return { min: 0, maks: 0 }
  return { min: Math.min(...nilai), maks: Math.max(...nilai) }
}

// ── Penyaringan ───────────────────────────────────────────────────────────

export type HasilSaring = {
  housing: Housing
  /** Kosong bila belum ada titik acuan. */
  jarakKm: number | null
  /** Kosong bila perumahan belum berharga — angsuran tidak bisa dikarang. */
  angsuran: number | null
  /** Kosong bila penghasilan belum diisi. */
  dsr: number | null
  band: BandKemampuan | null
}

/** Urutan band dari paling longgar; dipakai untuk membandingkan bandMaks. */
const URUTAN_BAND: BandKemampuan[] = ["aman", "wajar", "ketat", "melebihi"]

/**
 * Angsuran satu perumahan pada anggaran yang sedang dipakai.
 *
 * Skema dipilih per perumahan lewat skemaBawaan(harga), bukan sekali untuk
 * seluruh daftar: rumah 166 juta dan rumah 400 juta tidak berbagi bunga, dan
 * memakai satu skema untuk keduanya akan menampilkan angka yang salah pada
 * salah satunya.
 */
function angsuranUntuk(h: Housing, filter: FilterPeta, konfig: KonfigSkema): number | null {
  const harga = h.priceMin
  if (harga == null || harga <= 0) return null

  const skema = skemaBawaan(harga)
  const s = konfig[skema]

  return hitungKPR({
    harga,
    skema,
    // hitungKPR menjepit sendiri kedua nilai ini ke batas skemanya, jadi
    // nilai dari URL yang dikarang tidak bisa menghasilkan angka mustahil.
    uangMukaPersen: filter.dpPersen ?? s.dpDefaultPersen,
    tenorTahun: filter.tenor ?? s.tenorDefault,
    konfig,
  }).angsuranBulanan
}

/**
 * Menerapkan seluruh filter sekaligus.
 *
 * Turunan (jarak, angsuran, band) dihitung sekali di sini dan ikut terbawa
 * pada hasilnya, supaya baris daftar dan pratinjau penanda tidak menghitung
 * ulang angka yang sama — dan tidak mungkin menghitungnya berbeda.
 */
export function terapkanFilter(
  items: Housing[],
  filter: FilterPeta,
  konfig: KonfigSkema,
): HasilSaring[] {
  const q = filter.q.trim().toLowerCase()
  const batasBand =
    filter.bandMaks != null ? URUTAN_BAND.indexOf(filter.bandMaks) : -1

  const hasil: HasilSaring[] = []

  for (const h of items) {
    if (q && !`${h.name} ${h.description}`.toLowerCase().includes(q)) continue

    if (filter.kecamatan.length && !filter.kecamatan.includes(h.district ?? "")) continue

    if (filter.unitMin != null && h.availableUnits < filter.unitMin) continue

    if (filter.tipe === "subsidi" && (h.subsidiUnits ?? 0) <= 0) continue
    if (filter.tipe === "komersial" && (h.commercialUnits ?? 0) <= 0) continue

    if (filter.kamarMin != null && (h.bedrooms ?? 0) < filter.kamarMin) continue

    // Perumahan tanpa harga tidak pernah tersaring keluar oleh filter harga:
    // "harga belum tersedia" bukan alasan untuk menyembunyikannya dari peta.
    if (filter.hargaMin != null && h.priceMin != null && h.priceMin < filter.hargaMin) continue
    if (filter.hargaMaks != null && h.priceMin != null && h.priceMin > filter.hargaMaks) continue

    let jarakKm: number | null = null
    if (filter.titik) {
      jarakKm = calculateDistance(filter.titik, { lat: h.lat, lng: h.lng })
      if (filter.radiusKm != null && jarakKm > filter.radiusKm) continue
    }

    const angsuran = angsuranUntuk(h, filter, konfig)

    let dsr: number | null = null
    let band: BandKemampuan | null = null
    if (filter.penghasilan != null && filter.penghasilan > 0 && angsuran != null) {
      dsr = angsuran / filter.penghasilan
      band = bandKemampuan(dsr)
      if (batasBand >= 0 && URUTAN_BAND.indexOf(band) > batasBand) continue
    }

    hasil.push({ housing: h, jarakKm, angsuran, dsr, band })
  }

  // Dengan titik acuan, terdekat lebih dulu — itu satu-satunya urutan yang
  // masuk akal setelah seseorang menyatakan dari mana ia mengukur. Tanpa
  // titik, urutan nama dari getPublishedHousings() dipertahankan apa adanya.
  if (filter.titik) {
    hasil.sort((a, b) => (a.jarakKm ?? Infinity) - (b.jarakKm ?? Infinity))
  }

  return hasil
}

// ── Sandi URL ─────────────────────────────────────────────────────────────
//
// Keadaan pencarian tinggal di URL, bukan di useState semata, supaya hasil
// yang ditemukan seseorang bisa disalin, dibagikan, dan dibuka kembali. Tiga
// parameter anggaran (inc, dp, tenor) sengaja memakai nama yang sama dengan
// /simulasi, sehingga anggaran yang disetel di satu halaman tidak hilang saat
// berpindah ke halaman lain.

const P = {
  q: "q",
  kecamatan: "kec",
  unitMin: "unit",
  titik: "titik",
  koordinat: "dari",
  sumber: "src",
  radius: "r",
  penghasilan: "inc",
  dp: "dp",
  tenor: "tenor",
  band: "band",
  hargaMin: "hmin",
  hargaMaks: "hmaks",
  tipe: "tipe",
  kamarMin: "kamar",
} as const

/** Bilangan dari URL: hanya angka terhingga non-negatif yang diterima. */
function angka(v: string | null, maks = Number.MAX_SAFE_INTEGER): number | null {
  if (v == null || v.trim() === "") return null
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.min(n, maks)
}

export function bacaFilter(p: URLSearchParams): FilterPeta {
  const lintang = p.get(P.koordinat)?.split(",").map(Number)
  const sumberMentah = p.get(P.sumber)
  const bandMentah = p.get(P.band)

  // Koordinat divalidasi ke kotak Indonesia — batas yang sama dengan
  // housings_lat_ck / housings_lng_ck di basis data dan schemas/housing.ts.
  const titikSah =
    lintang?.length === 2 &&
    Number.isFinite(lintang[0]) &&
    Number.isFinite(lintang[1]) &&
    lintang[0] >= -11 &&
    lintang[0] <= 6 &&
    lintang[1] >= 95 &&
    lintang[1] <= 141

  return {
    q: p.get(P.q) ?? "",
    // Nilai kosong disaring: "kec=" menghasilkan [""] yang tidak akan cocok
    // dengan kecamatan mana pun dan mengosongkan peta tanpa sebab terlihat.
    kecamatan: (p.get(P.kecamatan) ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    unitMin: angka(p.get(P.unitMin), 100_000),
    titik: titikSah
      ? {
          lat: lintang[0],
          lng: lintang[1],
          label: p.get(P.titik)?.slice(0, 120) || "Titik pilihan",
          sumber:
            sumberMentah === "saya" || sumberMentah === "peta" || sumberMentah === "alamat"
              ? sumberMentah
              : "peta",
        }
      : null,
    radiusKm: angka(p.get(P.radius), RADIUS_MAKS_KM),
    penghasilan: angka(p.get(P.penghasilan), 1_000_000_000),
    dpPersen: angka(p.get(P.dp), 90),
    tenor: angka(p.get(P.tenor), 40),
    bandMaks: URUTAN_BAND.includes(bandMentah as BandKemampuan)
      ? (bandMentah as BandKemampuan)
      : null,
    hargaMin: angka(p.get(P.hargaMin), 1_000_000_000_000),
    hargaMaks: angka(p.get(P.hargaMaks), 1_000_000_000_000),
    tipe: p.get(P.tipe) === "subsidi" || p.get(P.tipe) === "komersial"
      ? (p.get(P.tipe) as "subsidi" | "komersial")
      : null,
    kamarMin: angka(p.get(P.kamarMin), 20),
  }
}

/**
 * Hanya nilai yang benar-benar disetel yang ditulis, sehingga peta tanpa
 * filter tetap beralamat `/map` bersih — bukan `/map?q=&kec=&unit=…` yang
 * terlihat seperti galat saat disalin ke percakapan.
 */
export function tulisFilter(f: FilterPeta): URLSearchParams {
  const p = new URLSearchParams()
  const set = (k: string, v: string | number | null | undefined) => {
    if (v == null || v === "") return
    p.set(k, String(v))
  }

  set(P.q, f.q.trim())
  if (f.kecamatan.length) set(P.kecamatan, f.kecamatan.join(","))
  set(P.unitMin, f.unitMin)
  if (f.titik) {
    // Empat desimal ≈ 11 meter. Cukup untuk mengukur jarak ke perumahan, dan
    // menahan URL dari 15 angka di belakang koma yang tak berarti apa-apa.
    set(P.koordinat, `${f.titik.lat.toFixed(4)},${f.titik.lng.toFixed(4)}`)
    set(P.titik, f.titik.label)
    set(P.sumber, f.titik.sumber)
  }
  set(P.radius, f.radiusKm)
  set(P.penghasilan, f.penghasilan)
  set(P.dp, f.dpPersen)
  set(P.tenor, f.tenor)
  set(P.band, f.bandMaks)
  set(P.hargaMin, f.hargaMin)
  set(P.hargaMaks, f.hargaMaks)
  set(P.tipe, f.tipe)
  set(P.kamarMin, f.kamarMin)

  return p
}

/**
 * Berapa filter yang sedang menyala — untuk lencana "Filter (n)".
 *
 * Anggaran dihitung sebagai SATU filter meski terdiri dari tiga masukan:
 * bagi pengunjung itu satu keputusan ("saya mampu segini"), dan melaporkan
 * "3" untuk satu penghasilan yang diketik hanya membingungkan. Titik acuan
 * dan radius dihitung terpisah karena keduanya memang bisa berdiri sendiri —
 * titik tanpa radius tetap mengurutkan hasil menurut jarak.
 */
export function jumlahAktif(f: FilterPeta): number {
  let n = 0
  if (f.q.trim()) n++
  if (f.kecamatan.length) n++
  if (f.unitMin != null) n++
  if (f.titik) n++
  if (f.radiusKm != null) n++
  if (f.penghasilan != null && f.penghasilan > 0) n++
  if (f.bandMaks != null) n++
  if (f.hargaMin != null || f.hargaMaks != null) n++
  if (f.tipe != null) n++
  if (f.kamarMin != null) n++
  return n
}
