import { formatDateID } from "@/lib/format"

/**
 * Deret waktu sebagai KELOMPOK GRAFIK KECIL, satu per ukuran.
 *
 * KENAPA BUKAN SATU GRAFIK BERISI SEMUA GARIS
 * Pengunjung, tampilan, dan prospek berbeda satu-dua orde besaran. Menaruhnya
 * pada satu sumbu membuat garis prospek menempel rata di dasar dan tidak
 * pernah bisa dibaca. Jalan pintas yang biasa ditempuh — sumbu Y kedua di
 * sebelah kanan — adalah kekeliruan grafik yang paling merusak: dua skala yang
 * dipilih sendiri oleh pembuatnya menentukan garis mana yang tampak memotong
 * garis mana, sehingga "korelasi" apa pun bisa dibuat muncul atau hilang hanya
 * dengan menggeser skalanya.
 *
 * Grafik kecil berdampingan memberi setiap deret skalanya sendiri secara
 * jujur, memakai sumbu waktu yang sama. Karena tiap panel hanya berisi SATU
 * deret, tidak ada legenda yang dibutuhkan — judulnya sudah menyebut namanya.
 *
 * Sumbu Y setiap panel dimulai dari nol dan tidak pernah dipotong. Sumbu yang
 * dipotong melipatgandakan riak kecil menjadi lonjakan dramatis.
 */

export type Deret = {
  judul: string
  warna: string
  /** Sejajar dengan `label`; panjangnya harus sama. */
  nilai: number[]
}

const L = 300
const T = 56

function jalur(nilai: number[], maks: number): { garis: string; area: string } {
  const n = nilai.length
  if (n === 0) return { garis: "", area: "" }

  const x = (i: number) => (n === 1 ? L / 2 : (i / (n - 1)) * L)
  const y = (v: number) => T - (v / maks) * (T - 2) - 1

  const titik = nilai.map((v, i) => `${x(i).toFixed(2)},${y(v).toFixed(2)}`)
  const garis = `M ${titik.join(" L ")}`
  const area = `${garis} L ${x(n - 1).toFixed(2)},${T} L ${x(0).toFixed(2)},${T} Z`
  return { garis, area }
}

export default function DeretKecil({
  deret,
  label,
}: {
  deret: Deret[]
  /** Tanggal ISO per titik, dipakai sumbu dan tabel. */
  label: string[]
}) {
  const kosong = deret.every((d) => d.nilai.every((v) => v === 0))

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {deret.map((d) => {
          // Skala per panel — itulah inti kelompok grafik kecil. Maksimum
          // minimal 1 supaya deret yang seluruhnya nol tetap menggambar garis
          // dasar alih-alih membagi dengan nol.
          const maks = Math.max(1, ...d.nilai)
          const { garis, area } = jalur(d.nilai, maks)

          return (
            <div
              key={d.judul}
              className="rounded-2xl border border-border bg-white p-5 shadow-e2"
            >
              <p className="text-coord text-muted-foreground">{d.judul}</p>
              {/*
                PUNCAK HARIAN, bukan total.
                Menjumlahkan deret harian TIDAK menghasilkan angka pada kartu
                KPI di atas: kartu itu menghitung sesi yang berbeda sepanjang
                rentang, sedangkan deret ini menghitung ulang setiap hari, jadi
                orang yang datang tiga hari berturut-turut terhitung tiga kali.
                Keduanya benar untuk pertanyaannya masing-masing — tetapi
                menaruh dua angka berbeda di bawah satu kata yang sama pada satu
                layar hanya melahirkan pertanyaan "yang mana yang benar", dan
                sejak itu tidak ada satu pun angka di halaman ini yang dipercaya.
              */}
              <p className="font-display numeric mt-2 text-2xl font-extrabold tracking-[-0.02em] text-foreground">
                {maks.toLocaleString("id-ID")}
                <span className="ml-1.5 text-sm font-medium text-muted-foreground">
                  puncak harian
                </span>
              </p>

              <svg
                viewBox={`0 0 ${L} ${T}`}
                preserveAspectRatio="none"
                className="mt-3 h-14 w-full"
                role="img"
                aria-label={`Tren ${d.judul}, puncak harian ${maks}. Angka lengkapnya ada pada tabel di bawah.`}
              >
                <title>{`${d.judul} — puncak harian ${maks.toLocaleString("id-ID")}`}</title>
                <path d={area} fill={d.warna} fillOpacity={0.12} />
                <path
                  d={garis}
                  fill="none"
                  stroke={d.warna}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  /* Tanpa ini, preserveAspectRatio="none" ikut merentangkan
                     ketebalan garis dan setiap panel tampil dengan tebal yang
                     berbeda tergantung lebar kolomnya. */
                  vectorEffect="non-scaling-stroke"
                />
              </svg>

              <p className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                <span>{formatDateID(label[0])}</span>
                <span>{formatDateID(label[label.length - 1])}</span>
              </p>
            </div>
          )
        })}
      </div>

      {/*
        Padanan tabel. Bukan pelengkap opsional: grafik ini menyampaikan
        maknanya lewat bentuk dan warna saja, jadi tanpa tabel isinya tidak
        terjangkau pembaca layar maupun siapa pun yang ingin angka pastinya.
        Ditutup secara bawaan supaya tidak menenggelamkan halaman.
      */}
      {!kosong && (
        <details className="rounded-2xl border border-border bg-white shadow-e2">
          <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-foreground">
            Lihat angka harian
          </summary>
          <div className="overflow-x-auto border-t border-border">
            <table className="w-full min-w-[32rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th scope="col" className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                    Tanggal
                  </th>
                  {deret.map((d) => (
                    <th
                      key={d.judul}
                      scope="col"
                      className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground"
                    >
                      {d.judul}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {label.map((iso, i) => (
                  <tr key={iso}>
                    <td className="px-4 py-2.5 text-foreground">{formatDateID(iso)}</td>
                    {deret.map((d) => (
                      <td
                        key={d.judul}
                        className="numeric px-4 py-2.5 text-right font-semibold text-foreground"
                      >
                        {(d.nilai[i] ?? 0).toLocaleString("id-ID")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  )
}
