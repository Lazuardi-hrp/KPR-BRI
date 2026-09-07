import { NAMA_HARI } from "@/lib/analytics"
import type { SelJam } from "@/lib/queries/analytics"

/**
 * Peta kalor hari × jam (WIB).
 *
 * Bukan rasa ingin tahu: SLA kontak pertama empat jam (docs/RUNBOOK.md §6b)
 * hanya bisa dipenuhi bila ada petugas yang berjaga pada jam prospeknya
 * benar-benar masuk. Grafik ini menjawab pertanyaan penjadwalan itu, dan
 * karena itu ringkasannya ditulis sebagai kalimat di bawah — kesimpulan yang
 * bisa ditindaklanjuti tanpa harus membaca 168 kotak satu per satu.
 *
 * TANGGA ORDINAL, bukan pelangi. Warna pelangi pada skala besaran memaksa
 * pembacanya menghafal urutan rona sebelum bisa membandingkan dua kotak;
 * satu rona dari terang ke gelap dibaca langsung, dan tetap terbaca oleh
 * pembaca dengan defisiensi penglihatan warna.
 *
 * Nol dibiarkan sebagai permukaan netral, bukan langkah paling terang: "tidak
 * ada apa-apa" dan "ada sedikit" adalah perbedaan yang paling sering ingin
 * dilihat pada grafik seperti ini.
 */

const LANGKAH = ["var(--viz-1)", "var(--viz-2)", "var(--viz-3)", "var(--viz-4)", "var(--viz-5)"]

function warnaSel(nilai: number, maks: number): string | undefined {
  if (nilai === 0) return undefined
  const rasio = nilai / maks
  const i = Math.min(LANGKAH.length - 1, Math.floor(rasio * LANGKAH.length - 1e-9))
  return LANGKAH[Math.max(0, i)]
}

export default function Kalor({ sel }: { sel: SelJam[] }) {
  const grid = new Map<string, number>()
  for (const s of sel) grid.set(`${s.dow}:${s.jam}`, s.jumlah)

  const maks = Math.max(0, ...sel.map((s) => s.jumlah))

  if (maks === 0) {
    return (
      <p className="rounded-2xl border border-border bg-white p-8 text-center text-sm text-muted-foreground shadow-e2">
        Belum ada aktivitas tercatat pada rentang ini.
      </p>
    )
  }

  const tersibuk = sel.reduce((a, b) => (b.jumlah > a.jumlah ? b : a))

  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-e2 sm:p-6">
      <div className="overflow-x-auto">
        <div className="min-w-[40rem]">
          {/* Label jam setiap 3 jam; 24 label berdempetan menjadi bubur. */}
          <div className="mb-1 flex pl-10">
            {Array.from({ length: 24 }, (_, j) => (
              <div key={j} className="flex-1 text-center text-[10px] text-muted-foreground">
                {j % 3 === 0 ? j : ""}
              </div>
            ))}
          </div>

          {NAMA_HARI.map((nama, dow) => (
            <div key={nama} className="flex items-center">
              <div className="w-10 shrink-0 text-[11px] font-semibold text-muted-foreground">
                {nama}
              </div>
              {Array.from({ length: 24 }, (_, jam) => {
                const n = grid.get(`${dow}:${jam}`) ?? 0
                return (
                  <div key={jam} className="flex-1 p-[1px]">
                    <div
                      className="h-5 rounded-[3px] bg-secondary"
                      style={{ backgroundColor: warnaSel(n, maks) }}
                      /* <title> bawaan SVG tidak berlaku di HTML; atribut
                         title memberi tooltip peramban tanpa satu baris pun
                         JavaScript, sehingga halaman ini tetap sepenuhnya
                         komponen server. */
                      title={`${nama} pukul ${String(jam).padStart(2, "0")}.00 — ${n} peristiwa`}
                    />
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Paling ramai:{" "}
          <span className="font-semibold text-foreground">
            {NAMA_HARI[tersibuk.dow]} pukul {String(tersibuk.jam).padStart(2, "0")}.00
          </span>{" "}
          <span className="numeric">({tersibuk.jumlah.toLocaleString("id-ID")} peristiwa)</span>
        </p>

        <div className="flex items-center gap-1.5" aria-hidden>
          <span className="text-[11px] text-muted-foreground">Sedikit</span>
          <span className="h-3 w-4 rounded-[3px] bg-secondary" />
          {LANGKAH.map((w) => (
            <span key={w} className="h-3 w-4 rounded-[3px]" style={{ backgroundColor: w }} />
          ))}
          <span className="text-[11px] text-muted-foreground">Banyak</span>
        </div>
      </div>

      <p className="sr-only">
        Sebaran aktivitas per hari dan jam dalam Waktu Indonesia Barat. Jam
        tersibuk adalah {NAMA_HARI[tersibuk.dow]} pukul {tersibuk.jam}.00 dengan{" "}
        {tersibuk.jumlah} peristiwa, dari total {sel.length} kombinasi hari dan jam
        yang tercatat.
      </p>
    </div>
  )
}
