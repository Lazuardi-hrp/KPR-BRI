import Link from "next/link"
import type { Metadata } from "next"
import { ArrowLeft, AlertTriangle } from "lucide-react"

export const metadata: Metadata = {
  title: "Kebijakan Privasi — KPR Bersubsidi BRI Pematang Siantar",
  description:
    "Bagaimana data pribadi calon pembeli dikumpulkan, dipakai, disimpan, dan dihapus pada platform KPR bersubsidi BRI Pematang Siantar.",
}

export default function KebijakanPrivasi() {
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
          Kebijakan Privasi
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Versi v1 · berlaku sejak platform ini terbit</p>

        <div
          role="note"
          className="mt-8 flex items-start gap-3 rounded-2xl border border-warn/30 bg-warn-50 p-4"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warn" />
          <p className="text-sm text-foreground">
            <strong>Naskah ini belum ditinjau tim hukum BRI.</strong> Isinya menjelaskan apa yang
            benar-benar dilakukan sistem, tetapi belum berstatus dokumen hukum resmi. Formulir
            minat tidak boleh dibuka ke publik sebelum naskah ini disetujui bagian hukum dan
            kepatuhan.
          </p>
        </div>

        <div className="mt-10 space-y-8 text-foreground">
          <section>
            <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">
              1. Data yang kami kumpulkan
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Ketika Anda mengisi formulir minat pada salah satu perumahan, kami menyimpan{" "}
              <strong className="text-foreground">nama</strong>,{" "}
              <strong className="text-foreground">nomor telepon</strong>,{" "}
              <strong className="text-foreground">email</strong> (opsional), dan{" "}
              <strong className="text-foreground">pesan</strong> yang Anda tulis.
            </p>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Kami <strong className="text-foreground">tidak</strong> meminta dan tidak menyimpan
              NIK, nomor KTP, tanggal lahir, data penghasilan, maupun data keuangan apa pun.
              Platform ini menangkap minat, bukan pengajuan kredit.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">
              2. Alamat IP
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Alamat IP Anda tidak disimpan. Yang disimpan hanya sidik ringkas satu arah
              (SHA-256 dengan garam rahasia) yang tidak dapat dikembalikan menjadi alamat asli.
              Sidik itu dipakai untuk satu hal saja: membatasi pengiriman formulir menjadi
              maksimal tiga kali per jam agar tidak disalahgunakan robot.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">
              3. Pengukuran penggunaan situs
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Kami menghitung berapa banyak orang membuka situs ini, perumahan mana yang paling
              sering dilihat, dan seberapa sering kalkulator KPR dipakai. Yang dicatat hanyalah{" "}
              <strong className="text-foreground">peristiwanya</strong> — jenis tindakan, perumahan
              yang bersangkutan, dan waktunya — tanpa nama, nomor telepon, email, atau alamat IP.
            </p>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Untuk membedakan satu kunjungan dari kunjungan lain, peramban Anda membuat{" "}
              <strong className="text-foreground">angka acak</strong> yang disimpan sementara dan
              terhapus begitu tab ditutup. Angka itu bukan turunan dari data apa pun tentang diri
              Anda, tidak dipakai lintas kunjungan, dan tidak pernah dibagikan ke pihak lain. Kami{" "}
              <strong className="text-foreground">tidak memakai cookie pelacak</strong> dan tidak
              mengikuti Anda ke situs lain.
            </p>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Bila Anda tiba dari situs lain, kami menyimpan{" "}
              <strong className="text-foreground">nama situs asalnya saja</strong> (misalnya
              google.com) — bukan alamat halaman lengkapnya, karena alamat lengkap kadang memuat
              informasi yang bukan urusan kami. Seluruh catatan ini terhapus otomatis setelah{" "}
              <strong className="text-foreground">180 hari</strong>.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">
              4. Tujuan penggunaan
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Data Anda dipakai semata-mata agar petugas BRI atau pengembang perumahan yang Anda
              pilih dapat menghubungi Anda mengenai KPR bersubsidi untuk perumahan tersebut.
              Data tidak dijual, tidak dipertukarkan, dan tidak dibagikan kepada pihak lain di
              luar keperluan itu.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">
              5. Siapa yang dapat melihat
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Hanya petugas yang memiliki akun pada dashboard. Pengunjung situs tidak memiliki
              hak baca sama sekali atas data prospek — pembatasan ini ditegakkan pada lapisan
              basis data, bukan sekadar pada tampilan. Pengembang perumahan hanya dapat melihat
              prospek untuk perumahan miliknya sendiri.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">
              6. Berapa lama disimpan
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Data prospek disimpan paling lama <strong className="text-foreground">365 hari</strong>.
              Setelah tenggat itu lewat dan tindak lanjutnya sudah selesai atau dibatalkan, data
              dihapus otomatis oleh sistem setiap hari. Anda juga dapat meminta penghapusan lebih
              cepat kapan saja.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">
              7. Hak Anda
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Sesuai Undang-Undang No. 27 Tahun 2022 tentang Pelindungan Data Pribadi, Anda
              berhak meminta akses, perbaikan, maupun penghapusan data pribadi Anda, dan berhak
              menarik persetujuan yang telah diberikan. Persetujuan Anda dicatat lengkap dengan
              waktu dan versi teksnya, sehingga selalu dapat ditelusuri apa persisnya yang Anda
              setujui.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">
              8. Menghubungi kami
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Permintaan terkait data pribadi dapat disampaikan melalui kontak resmi BRI Kantor
              Cabang Pematangsiantar yang tercantum pada halaman utama.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
