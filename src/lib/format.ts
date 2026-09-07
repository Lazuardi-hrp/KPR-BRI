/**
 * Pemformatan Rupiah, jarak, dan tanggal — semuanya id-ID.
 *
 * Harga disimpan sebagai numeric di basis data (PRD §7.3: "Pemformatan Rupiah
 * adalah urusan presentasi, bukan penyimpanan"). Berkas ini satu-satunya tempat
 * angka berubah menjadi teks.
 */

/**
 * Intl.NumberFormat('id-ID', { style: 'currency' }) menyisipkan U+00A0 setelah
 * "Rp" pada sebagian build ICU, yang membuat hasilnya berbeda dari string lama
 * "Rp 166.000.000". Spasi biasa ditulis manual agar salinan yang dibekukan
 * design.md tetap tampil persis sama.
 */
export const formatIDR = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`

export function formatPriceRange(min?: number | null, max?: number | null): string {
  if (min == null) return "Harga belum tersedia"
  if (max == null || max === min) return formatIDR(min)
  return `${formatIDR(min)} – ${formatIDR(max)}`
}

export function formatArea(m2?: number | null): string | undefined {
  return m2 == null ? undefined : `${Number(m2).toLocaleString("id-ID")} m²`
}

export function formatDateID(iso: string | null | undefined): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function formatDateTimeID(iso: string | null | undefined): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Waktu relatif: "2 hari lalu", "2 days ago".
 *
 * Satu-satunya pemformat di berkas ini yang menerima locale, karena hanya ini
 * yang tampil di komponen dwibahasa. Sisanya melayani halaman yang memang
 * berbahasa Indonesia saja.
 *
 * Perhatian hidrasi: nilainya diturunkan dari Date.now(), jadi server dan klien
 * bisa berbeda satu satuan bila render melewati pergantian hari. Pemanggil
 * wajib memasang suppressHydrationWarning pada elemen yang memuatnya — lihat
 * <WaktuRelatif> di src/components/relative-time.tsx.
 */
export function formatRelative(
  iso: string | null | undefined,
  locale: "id" | "en" = "id",
): string {
  if (!iso) return "—"
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return "—"

  const detik = Math.round((t - Date.now()) / 1000)
  const abs = Math.abs(detik)
  // numeric:"always" — "auto" menghasilkan "kemarin dulu" untuk 2 hari di
  // id-ID. Itu register percakapan; indikator kepercayaan butuh angka.
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "always" })

  if (abs < 60) return rtf.format(Math.round(detik), "second")
  if (abs < 3600) return rtf.format(Math.round(detik / 60), "minute")
  if (abs < 86400) return rtf.format(Math.round(detik / 3600), "hour")
  if (abs < 2592000) return rtf.format(Math.round(detik / 86400), "day")
  if (abs < 31536000) return rtf.format(Math.round(detik / 2592000), "month")
  return rtf.format(Math.round(detik / 31536000), "year")
}

/** Selisih hari penuh dari sekarang. Negatif = sudah lewat. */
export function selisihHari(iso: string | null | undefined): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return null
  return Math.round((t - Date.now()) / 86_400_000)
}

/**
 * Persentase untuk dibaca manusia, bukan untuk dihitung ulang.
 *
 * null menghasilkan "—", bukan "0%". Perbedaannya bukan kosmetik: 0% berarti
 * "diukur, hasilnya nol", sedangkan null berarti "belum bisa diukur". Sebuah
 * perumahan yang baru terbit kemarin dan belum punya satu pun tampilan
 * termasuk yang kedua, dan menampilkannya sebagai 0% menempatkannya di dasar
 * tabel peringkat seolah ia gagal.
 */
export function formatPersen(n: number | null | undefined, desimal = 0): string {
  if (n == null || !Number.isFinite(n)) return "—"
  return `${n.toLocaleString("id-ID", {
    minimumFractionDigits: desimal,
    maximumFractionDigits: desimal,
  })}%`
}

export type Delta = {
  /** Selisih relatif dalam persen; null bila periode lalu nol. */
  persen: number | null
  arah: "naik" | "turun" | "tetap"
  /** Siap tampil: "+24%", "−8%", "0%", atau "baru". */
  teks: string
}

/**
 * Perbandingan satu angka dengan periode sebelumnya.
 *
 * Pembagi nol TIDAK menjadi Infinity atau 100%. Naik dari 0 ke 5 bukan
 * "kenaikan 500%" — tidak ada dasar untuk membandingkannya sama sekali, dan
 * angka besar yang muncul dari ketiadaan adalah cara tercepat membuat orang
 * berhenti mempercayai seluruh dasbor. Kasus itu dilaporkan sebagai "baru".
 *
 * Tanda minus memakai U+2212 (−), bukan tanda hubung, supaya sejajar dengan
 * angka pada kolom tabular.
 */
export function hitungDelta(sekarang: number, lalu: number): Delta {
  if (lalu === 0) {
    return sekarang === 0
      ? { persen: 0, arah: "tetap", teks: "0%" }
      : { persen: null, arah: "naik", teks: "baru" }
  }
  const persen = ((sekarang - lalu) / lalu) * 100
  const bulat = Math.round(persen)
  if (bulat === 0) return { persen: 0, arah: "tetap", teks: "0%" }
  return {
    persen,
    arah: bulat > 0 ? "naik" : "turun",
    teks: `${bulat > 0 ? "+" : "−"}${Math.abs(bulat).toLocaleString("id-ID")}%`,
  }
}
