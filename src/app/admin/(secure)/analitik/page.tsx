import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowUpRight, Info } from "lucide-react"

import { getSesiStaf } from "@/lib/auth"
import {
  getBand,
  getCorong,
  getHarian,
  getJam,
  getLokasi,
  getProperti,
  getRujukan,
} from "@/lib/queries/analytics"
import {
  LABEL_BAND,
  LABEL_BAND_KOSONG,
  RENTANG,
  TAHAP_CORONG,
  bacaRentang,
} from "@/lib/analytics"
import { formatPersen } from "@/lib/format"
import { WARNA_KEMAMPUAN } from "@/lib/kpr"
import KartuMetrik from "@/components/admin/kartu-metrik"
import Corong from "@/components/admin/viz/corong"
import DeretKecil from "@/components/admin/viz/garis"
import Batang from "@/components/admin/viz/batang"
import Kalor from "@/components/admin/viz/kalor"

export const dynamic = "force-dynamic"

/**
 * Dasbor analitik kanal digital.
 *
 * BEDANYA DENGAN /admin
 * Ringkasan menjawab "apa yang harus saya kerjakan hari ini" — prospek yang
 * menunggu, data yang perlu ditinjau, keamanan. Halaman ini menjawab
 * pertanyaan yang sama sekali lain: "bagaimana kinerja kanal ini, dan di mana
 * ia bocor". Keduanya sengaja dipisah; menggabungkannya akan membuat daftar
 * pekerjaan hari ini tertimbun grafik tren yang tidak menuntut tindakan apa
 * pun pada hari mana pun tertentu.
 *
 * HANYA ADMIN
 * Bukan pilihan produk melainkan konsekuensi RLS: kebijakan
 * `events_read_staff` pada housing_events berbunyi `using (public.is_admin())`,
 * sehingga seorang 'pengembang' menerima nol baris — bukan galat. Dasbor
 * penuh nol yang terlihat seperti dasbor yang sah jauh lebih menyesatkan
 * daripada pintu yang tidak terbuka. Pola pengalihannya sama dengan
 * /admin/keamanan.
 *
 * TIDAK ADA RIWAYAT SEBELUM HARI PEMASANGAN. housing_events praktis kosong
 * sampai instrumentasi ini terpasang, dan pg_cron memangkasnya di 180 hari
 * (RUNBOOK §6). Rentang terpanjang yang ditawarkan 90 hari — menawarkan
 * setahun hanya akan menjanjikan sesuatu yang basisnya tidak simpan.
 */

type Params = Promise<{ rentang?: string }>

function JudulBagian({
  nomor,
  pertanyaan,
  href,
  tautanLabel,
}: {
  nomor: string
  pertanyaan: string
  href?: string
  tautanLabel?: string
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="font-display text-xl font-extrabold tracking-[-0.02em] text-foreground">
        <span className="text-coord mr-2 text-muted-foreground">{nomor}</span>
        {pertanyaan}
      </h2>
      {href && tautanLabel && (
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:gap-2.5"
        >
          {tautanLabel} <ArrowUpRight className="h-4 w-4" aria-hidden />
        </Link>
      )}
    </div>
  )
}

export default async function DasborAnalitik({ searchParams }: { searchParams: Params }) {
  const sesi = await getSesiStaf()
  if (sesi?.role !== "admin") redirect("/admin")

  const sp = await searchParams
  const hari = bacaRentang(sp.rentang)

  const [corong, harian, properti, lokasi, jam, rujukan, band] = await Promise.all([
    getCorong(hari),
    getHarian(hari),
    getProperti(hari, 8),
    getLokasi(hari),
    getJam(hari),
    getRujukan(hari, 6),
    getBand(hari),
  ])

  const { kini, lalu } = corong
  const tahap = TAHAP_CORONG.map((t) => ({
    label: t.label,
    arti: t.arti,
    warna: t.warna,
    nilai: kini[t.kunci] as number,
  }))

  const cip =
    "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

  const totalBand = band.reduce((n, b) => n + b.jumlah, 0)
  /** Pembagi batang dalam tabel properti. Dihitung sekali, bukan per baris. */
  const maksTampilan = Math.max(1, ...properti.map((x) => x.tampilan))
  const adaData = kini.kunjungan > 0 || kini.prospek > 0

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-[-0.025em] text-foreground">
            Analitik
          </h1>
          <p className="mt-1 text-muted-foreground">
            Perjalanan pengunjung dari menemukan perumahan sampai menjadi prospek KPR.
          </p>
        </div>

        <nav aria-label="Rentang waktu" className="flex gap-1.5">
          {RENTANG.map((r) => (
            <Link
              key={r}
              href={r === 30 ? "/admin/analitik" : `/admin/analitik?rentang=${r}`}
              aria-current={r === hari ? "page" : undefined}
              className={`${cip} ${
                r === hari
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {r} hari
            </Link>
          ))}
        </nav>
      </div>

      {!adaData && (
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-accent p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="font-semibold text-foreground">Belum ada data pada rentang ini</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Pengukuran kunjungan baru dimulai sejak fitur ini dipasang — tidak ada
              riwayat sebelumnya yang bisa ditarik mundur. Angkanya akan terisi
              sendiri seiring pengunjung datang.
            </p>
          </div>
        </div>
      )}

      {/* ─── 1. Seberapa besar kanalnya? ────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-xl font-extrabold tracking-[-0.02em] text-foreground">
            <span className="text-coord mr-2 text-muted-foreground">01</span>
            Seberapa besar kanalnya?
          </h2>
          <p className="text-sm text-muted-foreground">
            Perubahan dihitung terhadap {hari} hari sebelumnya
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <KartuMetrik
            label="Pengunjung"
            nilai={kini.kunjungan}
            lalu={lalu.kunjungan}
            catatan="sesi peramban"
          />
          <KartuMetrik
            label="Tampilan properti"
            nilai={kini.tampilan}
            lalu={lalu.tampilan}
            catatan="unik per sesi"
          />
          <KartuMetrik
            label="Pakai kalkulator"
            nilai={kini.pakaiKalkulator}
            lalu={lalu.pakaiKalkulator}
            catatan="sesi yang menghitung"
          />
          <KartuMetrik
            label="Kontak WhatsApp"
            nilai={kini.kontak}
            lalu={lalu.kontak}
            catatan="sesi yang menghubungi"
          />
          <KartuMetrik
            label="Prospek masuk"
            nilai={kini.prospek}
            lalu={lalu.prospek}
            catatan="formulir tersimpan"
            href="/admin/prospek"
          />
        </div>
      </section>

      {/* ─── 2. Di mana orang berhenti? ─────────────────────────────── */}
      <section className="space-y-4">
        <JudulBagian
          nomor="02"
          pertanyaan="Di mana orang berhenti?"
          href="/admin/prospek"
          tautanLabel="Buka kotak masuk"
        />

        <Corong tahap={tahap} />

        <p className="flex items-start gap-2.5 rounded-2xl border border-border bg-secondary p-4 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            Corong berhenti di prospek karena di situlah perjalanan di situs
            berakhir. Dari{" "}
            <span className="numeric font-semibold text-foreground">{kini.prospek}</span>{" "}
            prospek pada rentang ini,{" "}
            <span className="numeric font-semibold text-foreground">{kini.pengajuan}</span>{" "}
            sudah masuk tahap pengajuan — itu digerakkan petugas dari halaman Prospek,
            bukan oleh pengunjung.
          </span>
        </p>
      </section>

      {/* ─── 3. Ke mana arahnya? ────────────────────────────────────── */}
      <section className="space-y-4">
        <JudulBagian nomor="03" pertanyaan="Ke mana arahnya?" />

        <DeretKecil
          label={harian.map((h) => h.hari)}
          deret={[
            {
              judul: "Pengunjung",
              warna: "var(--chart-1)",
              nilai: harian.map((h) => h.pengunjung),
            },
            {
              judul: "Tampilan properti",
              warna: "var(--chart-2)",
              nilai: harian.map((h) => h.tampilan),
            },
            {
              judul: "Prospek masuk",
              warna: "var(--chart-3)",
              nilai: harian.map((h) => h.prospek),
            },
          ]}
        />
      </section>

      {/* ─── 4. Perumahan mana yang bekerja? ────────────────────────── */}
      <section className="space-y-4">
        <JudulBagian
          nomor="04"
          pertanyaan="Perumahan mana yang bekerja?"
          href="/admin/perumahan"
          tautanLabel="Buka katalog"
        />

        {properti.length === 0 ? (
          <p className="rounded-2xl border border-border bg-white p-8 text-center text-sm text-muted-foreground shadow-e2">
            Belum ada perumahan yang dibuka pengunjung pada rentang ini.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-e2">
            <table className="w-full min-w-[46rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th scope="col" className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                    Perumahan
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                    Tampilan
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground"
                  >
                    Kontak
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground"
                  >
                    Prospek
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground"
                  >
                    Konversi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {properti.map((p) => {
                  return (
                    <tr key={p.housingId} className="transition-colors hover:bg-secondary/60">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/perumahan/${p.housingId}`}
                          className="font-semibold text-foreground hover:text-primary"
                        >
                          {p.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="numeric w-10 shrink-0 font-semibold text-foreground">
                            {p.tampilan.toLocaleString("id-ID")}
                          </span>
                          <span
                            className="h-2 min-w-[2px] rounded-full"
                            style={{
                              width: `${(p.tampilan / maksTampilan) * 100}%`,
                              maxWidth: "8rem",
                              backgroundColor: "var(--viz-3)",
                            }}
                            aria-hidden
                          />
                        </div>
                      </td>
                      <td className="numeric px-4 py-3 text-right text-foreground">{p.kontak}</td>
                      <td className="numeric px-4 py-3 text-right text-foreground">{p.prospek}</td>
                      <td
                        className="numeric px-4 py-3 text-right font-semibold text-foreground"
                        /* null berarti belum ada tampilan sama sekali — tidak
                           bisa dihitung, bukan nol persen. */
                        title={p.konversi == null ? "Belum ada tampilan untuk dihitung" : undefined}
                      >
                        {formatPersen(p.konversi, 1)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ─── 5. Lokasi mana yang diminati? ──────────────────────────── */}
      <section className="space-y-4">
        <JudulBagian nomor="05" pertanyaan="Lokasi mana yang diminati?" />
        <Batang
          satuan="tampilan"
          baris={lokasi.map((l) => ({
            label: l.district,
            nilai: l.tampilan,
            catatan: `${l.prospek.toLocaleString("id-ID")} prospek`,
          }))}
        />
      </section>

      {/* ─── 6. Siapa yang datang, dan kapan? ───────────────────────── */}
      <section className="space-y-4">
        <JudulBagian nomor="06" pertanyaan="Siapa yang datang, dan kapan?" />

        <Kalor sel={jam} />

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-white p-5 shadow-e2">
            <h3 className="font-semibold text-foreground">Datang dari</h3>
            {rujukan.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Belum ada rujukan dari luar. Kunjungan langsung dan tautan dari dalam
                situs sendiri memang tidak dicatat — keduanya tidak bisa dibedakan,
                dan menamainya &ldquo;langsung&rdquo; hanya akan menebak.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {rujukan.map((r) => (
                  <li key={r.asal} className="flex items-center justify-between gap-4 py-2.5">
                    <span className="truncate text-sm text-foreground">
                      {r.asal.replace(/^https?:\/\//, "")}
                    </span>
                    <span className="numeric shrink-0 text-sm font-semibold text-foreground">
                      {r.jumlah.toLocaleString("id-ID")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-white p-5 shadow-e2">
            <h3 className="font-semibold text-foreground">Kemampuan bayar prospek</h3>
            {totalBand === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Belum ada prospek pada rentang ini.
              </p>
            ) : (
              <>
                <ul className="mt-3 space-y-3">
                  {band
                    .slice()
                    .sort((a, b) => b.jumlah - a.jumlah)
                    .map((b) => (
                      <li key={b.band ?? "kosong"}>
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-sm text-foreground">
                            {b.band ? (LABEL_BAND[b.band] ?? b.band) : LABEL_BAND_KOSONG}
                          </span>
                          <span className="numeric text-sm font-semibold text-foreground">
                            {b.jumlah} · {formatPersen((b.jumlah / totalBand) * 100)}
                          </span>
                        </div>
                        <div
                          className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-secondary"
                          aria-hidden
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(b.jumlah / totalBand) * 100}%`,
                              backgroundColor: b.band
                                ? (WARNA_KEMAMPUAN[b.band as keyof typeof WARNA_KEMAMPUAN] ??
                                  "var(--muted-foreground)")
                                : "var(--muted-foreground)",
                            }}
                          />
                        </div>
                      </li>
                    ))}
                </ul>
                <p className="mt-4 text-sm text-muted-foreground">
                  Angka penghasilan dilaporkan sendiri calon pembeli dan tidak
                  diverifikasi. Ini bukan analisa kredit dan tidak boleh menjadi dasar
                  keputusan kelayakan — hanya konteks percakapan.
                </p>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
