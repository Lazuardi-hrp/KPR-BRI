import { formatPersen } from "@/lib/format"
import { lajuLanjut } from "@/lib/analytics"

/**
 * Corong konversi.
 *
 * KENAPA BATANG, BUKAN TRAPESIUM
 * Bentuk corong yang menyempit terlihat seperti apa yang digambarkannya, dan
 * justru itu masalahnya: nilainya dikodekan sebagai LUAS, dan orang tidak bisa
 * membandingkan luas dengan andal — selisih dua kali lipat terbaca jauh lebih
 * kecil daripada yang sebenarnya. Batang yang berpangkal pada satu garis dasar
 * yang sama dibaca dengan benar oleh siapa pun, dan itu satu-satunya hal yang
 * diminta dari grafik ini.
 *
 * KENAPA SATU RONA
 * Tahapnya berurutan, bukan sederajat. Lima warna berbeda akan menyiratkan
 * lima kategori setara dan menyembunyikan arah perjalanannya.
 *
 * ANGKA YANG DITONJOLKAN adalah persentase terhadap tahap SEBELUMNYA, bukan
 * terhadap puncak. Persentase terhadap puncak selalu menurun dan karena itu
 * tidak pernah menunjuk satu tahap pun sebagai penyebab; persentase terhadap
 * tahap sebelumnya menunjuk tepat pada tempat orang berhenti.
 *
 * Aksesibilitas mengikuti kebiasaan confidence-meter.tsx dan
 * affordability-meter.tsx: yang bersifat gambar diberi aria-hidden, dan
 * seluruh maknanya diulang sebagai teks biasa di sebelahnya — bukan sebagai
 * salinan sr-only, melainkan sebagai teks yang memang dibaca semua orang.
 */

export type TahapNilai = {
  label: string
  arti: string
  warna: string
  nilai: number
}

export default function Corong({ tahap }: { tahap: TahapNilai[] }) {
  const puncak = tahap[0]?.nilai ?? 0

  if (puncak === 0) {
    return (
      <div className="rounded-2xl border border-border bg-white p-12 text-center shadow-e2">
        <p className="font-semibold text-foreground">Belum ada kunjungan tercatat</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Corong terisi begitu pengunjung pertama membuka situs. Data baru mulai
          dikumpulkan sejak fitur ini dipasang — tidak ada riwayat sebelumnya.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-e2 sm:p-6">
      <ol className="space-y-5">
        {tahap.map((t, i) => {
          const sebelumnya = i === 0 ? null : tahap[i - 1].nilai
          const laju = sebelumnya === null ? null : lajuLanjut(t.nilai, sebelumnya)
          const dariPuncak = (t.nilai / puncak) * 100
          // Batang selalu terlihat meski nilainya sangat kecil: 0 dari 1000
          // dan 3 dari 1000 adalah dua cerita berbeda, dan batang selebar nol
          // piksel menyamakan keduanya.
          const lebar = t.nilai === 0 ? 0 : Math.max(dariPuncak, 1.5)

          return (
            <li key={t.label}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="font-semibold text-foreground">
                  <span className="text-coord mr-2 text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {t.label}
                </p>
                <p className="numeric text-sm text-muted-foreground">
                  <span className="font-display text-lg font-extrabold text-foreground">
                    {t.nilai.toLocaleString("id-ID")}
                  </span>
                  <span className="ml-2">{formatPersen(dariPuncak)} dari puncak</span>
                </p>
              </div>

              <div
                className="mt-2 h-3 w-full overflow-hidden rounded-full bg-secondary"
                aria-hidden
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: `${lebar}%`, backgroundColor: t.warna }}
                />
              </div>

              <p className="mt-1.5 text-sm text-muted-foreground">
                {t.arti}
                {laju !== null && (
                  <>
                    {" · "}
                    <span className="numeric font-semibold text-foreground">
                      {formatPersen(laju)}
                    </span>{" "}
                    lanjut dari tahap sebelumnya
                  </>
                )}
              </p>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
