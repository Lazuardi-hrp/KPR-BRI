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
