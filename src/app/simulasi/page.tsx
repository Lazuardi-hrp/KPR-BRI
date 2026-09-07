import { Suspense } from "react"
import Link from "next/link"
import type { Metadata } from "next"
import { ArrowLeft, Loader2 } from "lucide-react"

import KprPlanner from "@/components/kpr-planner"
import { getPublishedHousings } from "@/lib/queries/housings"
import { getKonfigKPR } from "@/lib/queries/kpr"
import { getKontakWhatsApp } from "@/lib/queries/whatsapp"
import { DISCLAIMER } from "@/lib/kpr"

/**
 * Shell RSC untuk perencana KPR — pola yang sama dengan src/app/page.tsx.
 *
 * Seluruh tampilan ada di komponen klien; yang berpindah ke server hanyalah
 * pengambilan datanya. Keduanya memakai createAnonClient (bebas cookie),
 * sehingga revalidate 5 menit benar-benar berlaku.
 *
 * `?perumahan=<slug>` sengaja DIBACA DI KLIEN, bukan lewat prop searchParams.
 * Membaca searchParams di RSC menjadikan rutenya dinamis seluruhnya, dan
 * halaman ini akan menjadi satu-satunya halaman publik yang keluar dari ISR
 * 5 menit yang menjadi strategi performa proyek (PRD §16.1) — untuk sebuah
 * parameter yang hanya menentukan nilai awal sebuah <select>. Daftar
 * perumahan dan parameter skema tetap dipra-render; pemilihan awalnya
 * menyusul saat hidrasi.
 */
export const revalidate = 300

export const metadata: Metadata = {
  title: "Simulasi & Kemampuan Bayar KPR — KPR Bersubsidi BRI",
  description:
    "Perkirakan angsuran bulanan dan anggaran rumah Anda dari penghasilan dan cicilan yang sedang berjalan. Seluruh angka bersifat estimasi, bukan penawaran atau persetujuan kredit BRI.",
}

export default async function SimulasiPage() {
  const [housings, konfig, waPusat] = await Promise.all([
    getPublishedHousings(),
    getKonfigKPR(),
    getKontakWhatsApp(),
  ])

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Kembali ke beranda
        </Link>

        <header className="mt-6 max-w-2xl">
          <p className="text-coord text-brand-orange-ink">04 · SIMULASI</p>
          <h1 className="font-display mt-3 text-[length:var(--fs-display-m)] font-extrabold leading-[1.1] tracking-[-0.025em] text-foreground">
            Perkirakan angsuran dan anggaran rumah Anda
          </h1>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Isi harga rumah, uang muka, jangka waktu, penghasilan, dan cicilan yang sedang
            berjalan. Hasilnya berubah seketika, lengkap dengan perumahan yang harganya
            masuk perkiraan anggaran Anda.
          </p>

          {/* Disclaimer di atas lipatan, bukan hanya di bawah tiap hasil.
              design.md §7.3: wajib terlihat, tidak boleh di balik tooltip. */}
          <p className="mt-4 rounded-2xl border border-warn/30 bg-warn-50 p-4 text-sm leading-relaxed text-foreground">
            {DISCLAIMER} Simulasi ini <strong>bukan</strong> pengajuan dan{" "}
            <strong>bukan</strong> pernyataan bahwa kredit Anda disetujui.
          </p>
        </header>

        <div className="mt-8">
          {/* Suspense diperlukan karena perencana membaca useSearchParams().
              Tanpanya Next menolak mempra-render halaman ini sama sekali. */}
          <Suspense
            fallback={
              <div className="flex min-h-[24rem] items-center justify-center rounded-3xl border border-border bg-secondary">
                <Loader2
                  className="h-6 w-6 animate-spin text-muted-foreground"
                  aria-hidden
                />
                <span className="sr-only">Memuat simulasi…</span>
              </div>
            }
          >
            <KprPlanner
              housings={housings}
              konfig={konfig.skema}
              ditinjauPada={konfig.ditinjauPada}
              waPusat={waPusat}
              turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
            />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
