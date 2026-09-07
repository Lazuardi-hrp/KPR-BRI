import Link from "next/link"
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"

import { hitungDelta } from "@/lib/format"

/**
 * Kartu angka dengan pembanding periode sebelumnya.
 *
 * Markupnya sengaja sama persis dengan Kartu di src/app/admin/(secure)/page.tsx
 * — label text-coord, angka font-display numeric text-3xl, kartu rounded-2xl
 * shadow-e2 — supaya /admin/analitik terbaca sebagai halaman dari aplikasi
 * yang sama, bukan sebagai tempelan.
 *
 * Kartu yang lama TIDAK diubah menjadi komponen ini. Ia dipakai tiga halaman
 * dengan bentuk yang sedikit berbeda di masing-masing, dan menyatukannya
 * adalah pekerjaan tersendiri yang tidak ada hubungannya dengan menambah
 * dasbor analitik. Menggabungkannya ke dalam perubahan ini hanya akan membuat
 * tiga halaman lain ikut berisiko demi kerapian yang tidak diminta siapa pun.
 *
 * TENTANG ARAH PERUBAHAN
 * Panah naik diberi warna 'ok' karena setiap ukuran di dasbor ini memang lebih
 * baik ketika naik. Bila kelak ditambahkan ukuran yang sebaliknya — rasio
 * pentalan, waktu tanggap — sediakan properti untuk membalik maknanya alih-alih
 * membiarkan panah hijau memuji angka yang memburuk.
 */
export default function KartuMetrik({
  label,
  nilai,
  catatan,
  lalu,
  href,
}: {
  label: string
  nilai: number
  catatan?: string
  /** Nilai pada periode sebelumnya yang sama panjang. */
  lalu?: number
  href?: string
}) {
  const delta = lalu === undefined ? null : hitungDelta(nilai, lalu)

  const Ikon =
    delta === null || delta.arah === "tetap"
      ? Minus
      : delta.arah === "naik"
        ? ArrowUpRight
        : ArrowDownRight

  const warnaDelta =
    delta === null || delta.arah === "tetap"
      ? "text-muted-foreground"
      : delta.arah === "naik"
        ? "text-ok"
        : "text-danger"

  const isi = (
    <>
      <p className="text-coord text-muted-foreground">{label}</p>
      <p className="font-display numeric mt-2 text-3xl font-extrabold tracking-[-0.02em] text-foreground">
        {nilai.toLocaleString("id-ID")}
      </p>

      {/*
        Delta dan keterangan berbagi SATU baris.
        Mengulang "dibanding periode sebelumnya" pada lima kartu berdampingan
        menghabiskan tiga baris teks kecil per kartu untuk kalimat yang sama,
        lalu membungkusnya dengan tinggi kartu yang tidak rata. Kalimat itu
        dipindahkan sekali ke judul bagian; yang tersisa di sini hanya angkanya.
      */}
      <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-sm">
        {delta && (
          <span className={`flex items-center gap-1 font-semibold ${warnaDelta}`}>
            <Ikon className="h-4 w-4" aria-hidden />
            {/* "baru" berarti periode sebelumnya nol — tidak ada dasar
                pembanding, dan menyebutnya kenaikan persen akan mengarang
                angka besar dari ketiadaan. */}
            <span className="numeric">{delta.teks}</span>
          </span>
        )}
        {catatan && <span className="text-muted-foreground">{catatan}</span>}
      </p>
    </>
  )

  const kelas = "block rounded-2xl border border-border bg-white p-5 shadow-e2"

  return href ? (
    <Link
      href={href}
      className={`${kelas} transition-shadow hover:shadow-e3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
    >
      {isi}
    </Link>
  ) : (
    <div className={kelas}>{isi}</div>
  )
}
