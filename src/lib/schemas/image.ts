import { z } from "zod"

/**
 * Aturan foto perumahan — SATU sumber untuk browser dan server.
 *
 * Berkas ini sengaja tidak mengimpor apa pun dari sisi server (tidak sharp,
 * tidak supabase) supaya image-manager.tsx boleh memakainya di browser. Yang
 * divalidasi di browser adalah demi pesan yang cepat dan jelas; yang
 * MENENTUKAN adalah pemeriksaan ulang di route handler, karena semua yang
 * datang dari browser bisa dipalsukan.
 *
 * Empat batas, masing-masing dengan alasannya:
 *
 *   MIME     — Cermin storage.buckets.allowed_mime_types (migrasi 0005).
 *              Berbeda sedikit saja dan unggahan lolos aplikasi lalu ditolak
 *              Storage dengan galat yang tidak bisa dibaca siapa pun.
 *   MAKS_BYTE— Batas berkas MASUK, bukan hasil. Hasilnya selalu WebP yang
 *              diciutkan server dan tidak pernah mendekati batas 5 MB bucket.
 *              20 MB memuat foto RAW-to-JPEG kamera ponsel masa kini.
 *   MIN_SISI — Foto di bawah 800×600 tampil buram pada kartu beranda yang
 *              lebarnya sudah 1200px di layar retina. Menolaknya di depan
 *              lebih baik daripada memasangnya lalu heran kenapa jelek.
 *   MAKS_SISI— Titik hasil akhir. 1600px cukup untuk semua tempat foto ini
 *              muncul (kartu, galeri detail, popup peta) dengan margin retina.
 */

/** Tipe MIME yang diterima, sama persis dengan bucket 'perumahan'. */
export const MIME_DITERIMA = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const

/** Dipakai pada atribut accept <input type="file">. */
export const ACCEPT_FOTO = MIME_DITERIMA.join(",")

/** Batas berkas mentah sebelum diciutkan. */
export const MAKS_BYTE_MASUKAN = 20 * 1024 * 1024

/**
 * Batas muatan yang benar-benar dikirim ke server.
 *
 * Bukan angka gaya-gayaan: fungsi serverless di Vercel menolak badan
 * permintaan di atas 4,5 MB, dan penolakannya terjadi di lapisan platform —
 * route handler tidak pernah dipanggil dan tidak ada pesan yang bisa
 * ditampilkan. Karena itu browser MENCIUTKAN dulu apa pun yang mendekati
 * batas ini sebelum mengirim (lihat siapkanUnggahan di image-manager.tsx).
 */
export const MAKS_BYTE_KIRIM = 4 * 1024 * 1024

export const MIN_LEBAR = 800
export const MIN_TINGGI = 600

/** Sisi terpanjang hasil akhir, dalam piksel. */
export const MAKS_SISI = 1600

/** Kualitas encoder WebP di server. 78 adalah titik terakhir sebelum artefak terlihat pada dinding dan langit. */
export const KUALITAS_WEBP = 78

/** Batas jumlah foto per perumahan. Ditegakkan juga oleh trigger housing_images_cap. */
export const MAKS_FOTO = 12

export const MAKS_ALT = 160

/**
 * Alt text.
 *
 * Boleh kosong — kolomnya `not null default ''` dan galeri publik jatuh ke
 * nama perumahan bila kosong. Yang dilarang adalah teks yang panjangnya
 * melampaui batas kolom, bukan teks yang tidak ada.
 */
export const AltSchema = z
  .string()
  .trim()
  .max(MAKS_ALT, `Teks alternatif maksimal ${MAKS_ALT} karakter`)

/** Bidang formulir multipart yang diterima route handler unggahan. */
export const UploadFieldsSchema = z.object({
  alt: AltSchema.default(""),
  /** Diisi bila unggahan ini MENGGANTI foto yang sudah ada, bukan menambah. */
  gantiId: z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z.string().uuid("Foto yang diganti tidak dikenali").optional(),
  ),
})

/** Satu foto sebagaimana dikirim balik ke browser setelah unggahan berhasil. */
export type FotoPerumahan = {
  id: string
  storage_path: string
  alt: string
  width: number | null
  height: number | null
  bytes: number | null
  sort_order: number
  is_cover: boolean
  blur_data_url: string | null
}

/**
 * Pemeriksaan yang bisa dilakukan tanpa membaca isi berkas.
 *
 * Dipanggil browser sebelum antre unggah, dan server sebelum memanggil sharp.
 * Mengembalikan pesan siap tampil, atau null bila lolos.
 */
export function periksaBerkas(file: { type: string; size: number; name: string }): string | null {
  if (!(MIME_DITERIMA as readonly string[]).includes(file.type)) {
    return `${file.name}: format tidak didukung. Pakai JPG, PNG, WebP, atau AVIF.`
  }
  if (file.size > MAKS_BYTE_MASUKAN) {
    return `${file.name}: ukuran ${(file.size / 1024 / 1024).toFixed(1)} MB melebihi batas 20 MB.`
  }
  if (file.size === 0) {
    return `${file.name}: berkas kosong.`
  }
  return null
}
