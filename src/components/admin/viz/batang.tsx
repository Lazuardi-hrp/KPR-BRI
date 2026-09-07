/**
 * Batang mendatar untuk perbandingan besaran.
 *
 * MENDATAR, bukan tegak: nama kecamatan ("Siantar Martoba") tidak muat di
 * bawah batang tegak tanpa dimiringkan, dan label miring memaksa orang
 * memiringkan kepala untuk membaca hal paling dasar pada grafiknya.
 *
 * SATU RONA dengan panjang sebagai penyandi. Warna berbeda per baris akan
 * menyiratkan kategori yang berbeda jenis, padahal semuanya hal yang sama
 * dengan jumlah yang berbeda.
 *
 * Angkanya ditulis sebagai teks di setiap baris, bukan hanya disandikan oleh
 * panjang batang. Itu yang membuat komponen ini tetap terbaca ketika warnanya
 * tidak sampai — dan yang memenuhi syarat label langsung untuk slot palet
 * berkontras rendah.
 */

export type BarisBatang = {
  label: string
  nilai: number
  /** Keterangan kanan, mis. jumlah prospek. */
  catatan?: string
  href?: string
}

export default function Batang({
  baris,
  warna = "var(--viz-3)",
  satuan,
}: {
  baris: BarisBatang[]
  warna?: string
  satuan: string
}) {
  const maks = Math.max(1, ...baris.map((b) => b.nilai))

  if (baris.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-white p-8 text-center text-sm text-muted-foreground shadow-e2">
        Belum ada data pada rentang ini.
      </p>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-e2 sm:p-6">
      <ul className="space-y-4">
        {baris.map((b) => (
          <li key={b.label}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4">
              <p className="font-medium text-foreground">{b.label}</p>
              <p className="numeric text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {b.nilai.toLocaleString("id-ID")}
                </span>{" "}
                {satuan}
                {b.catatan && <span className="ml-2">· {b.catatan}</span>}
              </p>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-secondary" aria-hidden>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${b.nilai === 0 ? 0 : Math.max((b.nilai / maks) * 100, 1.5)}%`,
                  backgroundColor: warna,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
