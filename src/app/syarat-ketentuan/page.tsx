import Link from "next/link"
import type { Metadata } from "next"
import { ArrowLeft, AlertTriangle } from "lucide-react"

export const metadata: Metadata = {
  title: "Syarat & Ketentuan — KPR Bersubsidi BRI Pematang Siantar",
  description:
    "Ketentuan penggunaan platform pencarian perumahan bersubsidi BRI Pematang Siantar.",
}

export default function SyaratKetentuan() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke halaman utama
        </Link>

        <h1 className="font-display mt-6 text-[length:var(--fs-display-m)] font-extrabold leading-[1.1] tracking-[-0.025em] text-foreground">
          Syarat &amp; Ketentuan
        </h1>

        <div
          role="note"
          className="mt-8 flex items-start gap-3 rounded-2xl border border-warn/30 bg-warn-50 p-4"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warn" />
          <p className="text-sm text-foreground">
            <strong>Naskah ini belum ditinjau tim hukum BRI</strong> dan belum berstatus dokumen
            resmi.
          </p>
        </div>

        <div className="mt-10 space-y-8 text-foreground">
          <section>
            <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">
              1. Sifat platform
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Platform ini adalah sarana informasi dan pencarian perumahan bersubsidi di Kota
              Pematangsiantar. Mengirim formulir minat{" "}
              <strong className="text-foreground">bukan</strong> pengajuan Kredit Pemilikan Rumah
              dan tidak menimbulkan ikatan apa pun. Pengajuan KPR yang sebenarnya dilakukan
              melalui kantor cabang BRI beserta seluruh persyaratannya.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">
              2. Keakuratan informasi
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Data harga, jumlah unit, dan spesifikasi berasal dari pengembang perumahan dan
              dapat berubah sewaktu-waktu. Sebagian data pada platform ini masih dalam proses
              verifikasi. Selalu konfirmasikan ketersediaan dan harga terakhir kepada petugas
              sebelum mengambil keputusan.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">
              3. Tidak ada persetujuan kredit otomatis
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Persetujuan KPR bersubsidi tunduk pada penilaian kelayakan, ketersediaan kuota
              subsidi pemerintah, dan ketentuan yang berlaku. Tidak ada bagian dari platform ini
              yang dapat ditafsirkan sebagai janji atau persetujuan pembiayaan.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">
              4. Penggunaan yang wajar
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Formulir minat dibatasi tiga pengiriman per jam dari satu jaringan. Upaya
              pengiriman massal, otomatisasi, atau penyalahgunaan lain dapat diblokir tanpa
              pemberitahuan.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">
              5. Data pribadi
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Penanganan data pribadi dijelaskan pada{" "}
              <Link href="/kebijakan-privasi" className="text-primary underline">
                Kebijakan Privasi
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
