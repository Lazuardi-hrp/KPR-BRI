"use client"

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react"

import { useJejakKalkulator } from "@/components/jejak-kalkulator"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  Home,
  Info,
  Loader2,
  Send,
  Wallet,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import LeadFormFields, { type StatusVerifikasi } from "@/components/lead-form-fields"
import AffordabilityMeter from "@/components/affordability-meter"
import BudgetMatches from "@/components/budget-matches"
import WhatsAppCta from "@/components/whatsapp-cta"
import { kirimProspek, type RingkasanProspek } from "@/app/actions/lead"
import { formatIDR, formatDateID } from "@/lib/format"
import {
  DISCLAIMER,
  LABEL_KEMAMPUAN,
  WARNA_KEMAMPUAN,
  hitungKPR,
  hitungKemampuan,
  skemaBawaan,
  skenario,
  type KonfigSkema,
  type SkemaKPR,
} from "@/lib/kpr"
import { tautanProperti, type KontakWhatsApp } from "@/lib/whatsapp"
import type { Housing } from "@/lib/housing"

/**
 * Perencana KPR — kalkulator angsuran DAN kemampuan bayar.
 *
 * Bedanya dengan KprPanel di halaman detail bukan sekadar ukuran. Panel itu
 * menjawab "berapa angsuran rumah ini"; halaman ini menjawab "rumah seharga
 * berapa yang masuk akal bagi penghasilan saya", lalu menunjukkan yang mana.
 * Urutan itulah alasan halaman ini ada: orang yang belum tahu anggarannya
 * tidak punya cara masuk lewat halaman perumahan mana pun.
 *
 * Seluruh angka di sini ESTIMASI dan setiap permukaan hasil wajib membawa
 * DISCLAIMER — design.md §7.3 memperlakukan angka yang salah di sini sebagai
 * persoalan tanggung jawab hukum, bukan persoalan desain. Tidak ada satu pun
 * kalimat di berkas ini yang boleh terbaca sebagai persetujuan kredit.
 */

type Props = {
  housings: Housing[]
  konfig: KonfigSkema
  /** Kapan bunga terakhir dikonfirmasi ke BRI. null bila belum tercatat. */
  ditinjauPada: string | null
  /**
   * Kontak WhatsApp tim KPR pusat, atau null bila belum diatur.
   *
   * Halaman ini adalah tempat nomor itu paling berarti. Kontak perumahan hanya
   * ada setelah sebuah perumahan dipilih, sedangkan sebagian besar orang yang
   * membuka /simulasi justru belum memilih apa pun — mereka sedang mencari
   * tahu apa yang sanggup mereka beli. Tanpa nomor pusat, pertanyaan pada
   * momen itu tidak punya tujuan sama sekali.
   */
  waPusat?: KontakWhatsApp | null
  turnstileSiteKey?: string
}

/** Batas atas slider harga. Di atas ini pengunjung mengetik angkanya sendiri. */
const HARGA_MAKS_SLIDER = 1_500_000_000

export default function KprPlanner({
  housings,
  konfig,
  ditinjauPada,
  waPusat,
  turnstileSiteKey,
}: Props) {
  // ?perumahan=<slug> dibaca di sini, bukan di RSC-nya: lihat catatan di
  // src/app/simulasi/page.tsx. Slug yang tidak dikenali diabaikan begitu saja
  // — tautan basi dari luar sebaiknya mendarat pada kalkulator kosong alih-alih
  // halaman galat, karena halaman ini tetap berguna tanpa perumahan mana pun.
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const slug = searchParams.get("perumahan")
  const awal = useMemo(
    () => (slug ? (housings.find((h) => h.slug === slug) ?? null) : null),
    [slug, housings],
  )

  const hargaAwal = awal?.priceMin ?? 200_000_000
  const skemaAwal = skemaBawaan(hargaAwal)

  const [perumahan, setPerumahan] = useState<Housing | null>(awal ?? null)
  const [skema, setSkema] = useState<SkemaKPR>(skemaAwal)
  const [harga, setHarga] = useState(hargaAwal)
  // Tiga masukan berikut ikut dibaca dari URL dengan nama yang SAMA seperti di
  // /map (inc, dp, tenor). Itulah yang membuat anggaran bertahan saat orang
  // berpindah antara mencari di peta dan menghitung di sini — tanpa nama yang
  // sama, setiap perpindahan mengembalikannya ke nilai bawaan dan angka yang
  // baru saja disetel hilang tanpa jejak.
  const [dpPersen, setDpPersen] = useState(
    () => dariUrl(searchParams.get("dp"), 90) ?? konfig[skemaAwal].dpDefaultPersen,
  )
  const [tenor, setTenor] = useState(
    () => dariUrl(searchParams.get("tenor"), 40) ?? konfig[skemaAwal].tenorDefault,
  )
  const [penghasilan, setPenghasilan] = useState(
    () => dariUrl(searchParams.get("inc"), 1_000_000_000) ?? 0,
  )
  const [komitmen, setKomitmen] = useState(0)

  // Ditulis balik dengan penundaan, dan `perumahan` dipertahankan apa adanya:
  // menimpa seluruh query string akan menjatuhkan tautan dalam yang membawa
  // pengunjung ke sini.
  useEffect(() => {
    const jeda = setTimeout(() => {
      const p = new URLSearchParams(searchParams.toString())
      if (penghasilan > 0) p.set("inc", String(penghasilan))
      else p.delete("inc")
      p.set("dp", String(dpPersen))
      p.set("tenor", String(tenor))

      const qs = p.toString()
      if (qs !== searchParams.toString()) {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
      }
    }, 400)
    return () => clearTimeout(jeda)
  }, [penghasilan, dpPersen, tenor, searchParams, router, pathname])

  useJejakKalkulator(perumahan?.id ?? null, [
    skema,
    harga,
    dpPersen,
    tenor,
    penghasilan,
    komitmen,
  ])

  const [error, setError] = useState("")
  const [terkirim, setTerkirim] = useState<RingkasanProspek | null>(null)
  const [digabung, setDigabung] = useState(false)
  const [verifikasi, setVerifikasi] = useState<StatusVerifikasi | null>(null)
  const [token, setToken] = useState("")
  const [pending, start] = useTransition()

  // Kanal lanjutan dan pesan yang baru dikirim. Alasan keduanya ada
  // dijelaskan di kpr-panel.tsx, yang memakai pola yang sama persis.
  const [viaWa, setViaWa] = useState(false)
  const [pesanTerkirim, setPesanTerkirim] = useState("")

  /**
   * Nomor tujuan: kontak perumahan bila sudah dipilih, nomor pusat bila belum.
   *
   * Urutannya bukan selera. Kontak pemasaran perumahan memegang stok unitnya
   * dan bisa menjawab "masih ada tipe 36 di blok C" — jawaban yang tidak
   * dimiliki siapa pun di pusat. Pusat hanya mengambil alih ketika pertanyaan
   * memang belum menyangkut satu perumahan.
   */
  const nomorKontak = perumahan?.phone || waPusat?.nomor || null

  // Sinyal anti-bot, sama persis dengan KprPanel. Stempel waktunya diambil di
  // efek karena yang ingin diukur adalah sejak formulir TERLIHAT manusia, dan
  // itu terjadi setelah hidrasi. Nol akan terbaca sebagai kiriman instan —
  // pola bot — dan justru menghukum pengguna yang paling cepat.
  const dimuatPada = useRef<number | null>(null)
  const berinteraksi = useRef(false)

  useEffect(() => {
    dimuatPada.current = Date.now()
  }, [])

  const konf = konfig[skema]

  const hasil = useMemo(
    () => hitungKPR({ harga, skema, uangMukaPersen: dpPersen, tenorTahun: tenor, konfig }),
    [harga, skema, dpPersen, tenor, konfig],
  )

  const kemampuan = useMemo(
    () =>
      hitungKemampuan({
        penghasilan,
        komitmen,
        skema,
        tenorTahun: tenor,
        uangMukaPersen: dpPersen,
        angsuran: hasil.angsuranBulanan,
        konfig,
      }),
    [penghasilan, komitmen, skema, tenor, dpPersen, hasil.angsuranBulanan, konfig],
  )

  const skenarios = useMemo(
    () =>
      skenario({
        harga,
        skema,
        uangMukaPersen: dpPersen,
        tenorTahun: tenor,
        konfig,
        penghasilan,
        komitmen,
      }),
    [harga, skema, dpPersen, tenor, konfig, penghasilan, komitmen],
  )

  const adaPenghasilan = penghasilan > 0

  function gantiSkema(s: SkemaKPR) {
    setSkema(s)
    // Uang muka dan tenor dijepit ulang ke rentang skema baru. Tanpa ini,
    // beralih dari komersial (DP 20%) ke subsidi menyisakan nilai yang sah
    // tetapi bukan yang dimaksud pengguna, dan tenor 30 tahun akan diam-diam
    // dipotong oleh server tanpa terlihat di layar.
    const k = konfig[s]
    setDpPersen((d) => Math.min(Math.max(d, k.dpMinPersen), 90))
    setTenor((t) => Math.min(t, k.tenorMax))
  }

  function pilihPerumahan(h: Housing | null) {
    setPerumahan(h)
    if (h?.priceMin) {
      setHarga(h.priceMin)
      gantiSkema(skemaBawaan(h.priceMin))
    }
    tandai()
  }

  function tandai() {
    berinteraksi.current = true
  }

  // ── Berhasil ────────────────────────────────────────────────────────────
  if (terkirim) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-ok/25 bg-ok-50 p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-ok" aria-hidden />
        <p className="font-display mt-3 text-xl font-extrabold tracking-[-0.02em] text-foreground">
          {digabung ? "Permintaan Anda sudah tercatat" : "Permintaan terkirim"}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-foreground">
          {digabung ? (
            <>
              Terima kasih, {terkirim.nama}. Sepertinya Anda sudah pernah mengirim
              permintaan serupa, jadi permintaan tadi kami gabungkan ke pengajuan
              sebelumnya.
              <br />
              Anda tidak perlu mengirim ulang — petugas kami akan segera menghubungi Anda.
            </>
          ) : (
            <>
              Terima kasih, {terkirim.nama}. Permintaan Anda sudah kami terima.
              <br />
              Petugas kami akan segera menghubungi Anda.
            </>
          )}
        </p>

        <dl className="mt-5 space-y-2 rounded-2xl border border-ok/20 bg-white/70 p-4 text-left text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Perumahan</dt>
            <dd className="text-right font-semibold text-foreground">
              {terkirim.perumahan ?? "Belum dipilih"}
            </dd>
          </div>
          {terkirim.angsuran != null && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Estimasi angsuran</dt>
              <dd className="numeric text-right font-semibold text-foreground">
                {formatIDR(terkirim.angsuran)}
                <span className="font-normal text-muted-foreground"> / bulan</span>
              </dd>
            </div>
          )}
          {terkirim.tenorTahun != null && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Jangka waktu</dt>
              <dd className="numeric text-right font-semibold text-foreground">
                {terkirim.tenorTahun} tahun
              </dd>
            </div>
          )}
        </dl>

        {/* Kelanjutan percakapan — bukan pengiriman kedua. Lihat catatan yang
            sama di kpr-panel.tsx. */}
        {nomorKontak && (
          <div className="mt-5">
            <WhatsAppCta
              phone={nomorKontak}
              niat="lanjutan"
              housingId={perumahan?.id ?? null}
              varian={viaWa ? "utama" : "garis"}
              className="w-full"
              konteks={{
                nama: terkirim.nama,
                perumahan: terkirim.perumahan,
                harga: terkirim.harga,
                skema: terkirim.skema,
                uangMuka: terkirim.uangMuka,
                uangMukaPersen: terkirim.uangMukaPersen,
                tenorTahun: terkirim.tenorTahun,
                angsuran: terkirim.angsuran,
                pesan: pesanTerkirim,
                tautan: tautanProperti(perumahan?.slug),
              }}
            />
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Pesan pembukanya sudah berisi ringkasan di atas — Anda tidak perlu
              mengetik ulang apa pun.
            </p>
          </div>
        )}

        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{DISCLAIMER}</p>

        <Button asChild variant="outline" className="mt-5">
          <Link href="/map">Lihat perumahan di peta</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
      {/* ── Kolom kiri: masukan ──────────────────────────────────────── */}
      <section
        aria-labelledby="judul-masukan"
        className="rounded-3xl border border-border bg-white p-5 shadow-e2 sm:p-6 lg:sticky lg:top-6"
      >
        <h2
          id="judul-masukan"
          className="flex items-center gap-2 font-display text-lg font-extrabold tracking-[-0.02em] text-foreground"
        >
          <Calculator className="h-5 w-5 text-primary" aria-hidden />
          Data Anda
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Isi seadanya. Hasilnya berubah begitu Anda menggeser atau mengetik.
        </p>

        {/* Perumahan yang sedang dihitung */}
        <div className="mt-5">
          <label
            htmlFor="pilih-perumahan"
            className="mb-2 block text-xs font-semibold text-foreground"
          >
            Perumahan <span className="font-normal text-muted-foreground">(opsional)</span>
          </label>
          <select
            id="pilih-perumahan"
            value={perumahan?.id ?? ""}
            onChange={(e) =>
              pilihPerumahan(housings.find((h) => h.id === e.target.value) ?? null)
            }
            className="h-11 w-full rounded-2xl border border-input bg-white px-4 text-sm text-foreground focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <option value="">Belum memilih — hitung anggaran dulu</option>
            {housings
              .filter((h) => h.priceMin != null && h.priceMin > 0)
              .map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} — {formatIDR(h.priceMin!)}
                </option>
              ))}
          </select>
          {perumahan && (
            <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
              <Home className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
              <span>
                Harga di bawah terisi otomatis dari harga terendah {perumahan.name}. Anda
                tetap bisa mengubahnya.
              </span>
            </p>
          )}
        </div>

        {/* Skema */}
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold text-foreground">Jenis KPR</p>
          <div
            className="flex gap-1.5 rounded-full bg-secondary p-1"
            role="radiogroup"
            aria-label="Jenis KPR"
          >
            {(Object.keys(konfig) as SkemaKPR[]).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={skema === s}
                onClick={() => {
                  gantiSkema(s)
                  tandai()
                }}
                className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  skema === s
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s === "subsidi" ? "Subsidi" : "Komersial"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-6">
          <Geser
            label="Harga rumah"
            nilai={harga}
            set={(n) => {
              setHarga(n)
              tandai()
            }}
            min={0}
            max={HARGA_MAKS_SLIDER}
            step={5_000_000}
            rupiah
          />

          <Geser
            label="Uang muka"
            nilai={dpPersen}
            set={(n) => {
              setDpPersen(n)
              tandai()
            }}
            min={konf.dpMinPersen}
            max={50}
            step={1}
            satuan="%"
            bantuan={formatIDR(hasil.uangMuka)}
          />

          <Geser
            label="Jangka waktu"
            nilai={tenor}
            set={(n) => {
              setTenor(n)
              tandai()
            }}
            min={1}
            max={konf.tenorMax}
            step={1}
            satuan=" tahun"
          />
        </div>

        {/* Kemampuan bayar */}
        <div className="mt-6 rounded-2xl bg-secondary p-4">
          <p className="flex items-center gap-2 text-xs font-bold text-foreground">
            <Wallet className="h-4 w-4 text-primary" aria-hidden />
            Kemampuan bayar
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Diisi untuk mengetahui perkiraan anggaran Anda. Boleh dikosongkan — angsuran di
            samping tetap terhitung.
          </p>

          <div className="mt-3 space-y-3">
            <Uang
              label="Penghasilan per bulan"
              nilai={penghasilan}
              set={(n) => {
                setPenghasilan(n)
                tandai()
              }}
              placeholder="Contoh: 5.000.000"
            />
            <Uang
              label="Cicilan lain per bulan"
              bantuan="Motor, KTA, kartu kredit"
              nilai={komitmen}
              set={(n) => {
                setKomitmen(n)
                tandai()
              }}
              placeholder="Kosongkan bila tidak ada"
            />
          </div>
        </div>
      </section>

      {/* ── Kolom kanan: hasil ───────────────────────────────────────── */}
      <div className="space-y-6">
        {/* Angsuran */}
        <section
          aria-labelledby="judul-hasil"
          className="rounded-3xl border border-border bg-white p-5 shadow-e2 sm:p-6"
        >
          <h2 id="judul-hasil" className="sr-only">
            Hasil simulasi
          </h2>

          <div className="rounded-2xl bg-secondary p-5 text-center" aria-live="polite">
            <p className="text-coord text-muted-foreground">Estimasi angsuran per bulan</p>
            <p className="font-display numeric mt-1 text-[length:var(--fs-display-s)] font-extrabold tracking-[-0.03em] text-primary sm:text-4xl">
              {formatIDR(hasil.angsuranBulanan)}
            </p>
            <p className="numeric mt-1.5 text-xs text-muted-foreground">
              Bunga {hasil.bungaPersen}% · {hasil.tenorTahun} tahun
            </p>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <Kotak label="Jumlah pinjaman" nilai={formatIDR(hasil.pokokPinjaman)} />
            <Kotak label="Uang muka" nilai={formatIDR(hasil.uangMuka)} />
            <Kotak label="Total bunga" nilai={formatIDR(hasil.totalBunga)} />
            <Kotak label="Total pembayaran" nilai={formatIDR(hasil.totalPembayaran)} />
          </dl>

          <Catatan catatan={konf.catatan} ditinjauPada={ditinjauPada} />
        </section>

        {/* Kemampuan bayar */}
        <section
          aria-labelledby="judul-kemampuan"
          className="rounded-3xl border border-border bg-white p-5 shadow-e2 sm:p-6"
        >
          <h2
            id="judul-kemampuan"
            className="font-display text-lg font-extrabold tracking-[-0.02em] text-foreground"
          >
            Kemampuan bayar Anda
          </h2>

          {adaPenghasilan ? (
            <div className="mt-4 space-y-4" aria-live="polite">
              <AffordabilityMeter dsr={kemampuan.dsr} band={kemampuan.band} />

              <dl className="grid gap-3 sm:grid-cols-2">
                <Kotak
                  label="Sisa untuk mengangsur"
                  nilai={formatIDR(kemampuan.kapasitasAngsuran)}
                  keterangan="Setelah cicilan lain, pada batas 30% penghasilan"
                />
                <Kotak
                  label="Perkiraan anggaran rumah"
                  nilai={formatIDR(kemampuan.hargaMaksimum)}
                  keterangan={`Pada ${kemampuan.tenorTahun} tahun dan uang muka ${kemampuan.uangMukaPersen}%`}
                  tekan
                />
              </dl>

              <p className="rounded-xl bg-secondary p-3 text-xs leading-relaxed text-muted-foreground">
                Perkiraan anggaran adalah harga tertinggi yang masih masuk batas 30%
                penghasilan pada asumsi di samping. Ini <strong>bukan</strong> plafon kredit
                dan bukan pernyataan bahwa pengajuan Anda akan disetujui. {DISCLAIMER}
              </p>

              {/*
                Titik masuk WhatsApp yang niatnya paling jelas di seluruh situs:
                orang di sini sudah tahu angkanya dan sedang bertanya apakah
                angka itu wajar. Pesannya karena itu membawa penghasilan dan
                perkiraan anggaran — tanpa keduanya percakapannya dimulai dengan
                petugas menanyakan hal yang baru saja diketik.

                Kalimat di bawah tombol WAJIB tetap ada. Pengunjung berhak tahu
                bahwa penghasilannya ikut tersusun ke dalam pesan SEBELUM ia
                menekan tombolnya — ia memang masih melihat dan menyetujui
                seluruh isinya di WhatsApp, tetapi mengetahuinya di sini adalah
                bedanya antara memilih dan mendapati.
              */}
              {nomorKontak && (
                <div className="rounded-xl border border-ok/25 bg-ok-50 p-4">
                  <WhatsAppCta
                    phone={nomorKontak}
                    niat="kemampuan"
                    housingId={perumahan?.id ?? null}
                    varian="utama"
                    className="w-full"
                    label="Diskusikan angka ini di WhatsApp"
                    konteks={{
                      perumahan: perumahan?.name,
                      harga: perumahan?.priceMin ?? harga,
                      skema,
                      uangMuka: hasil.uangMuka,
                      uangMukaPersen: hasil.uangMukaPersen,
                      tenorTahun: hasil.tenorTahun,
                      angsuran: hasil.angsuranBulanan,
                      penghasilan,
                      anggaranMaks: kemampuan.hargaMaksimum,
                      tautan: tautanProperti(perumahan?.slug),
                    }}
                  />
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Pesan pembukanya sudah memuat penghasilan, angsuran, dan perkiraan
                    anggaran di atas. Anda masih dapat memeriksa dan mengubahnya di
                    WhatsApp sebelum mengirim.
                    {!perumahan && waPusat ? ` Ditujukan ke ${waPusat.label}.` : ""}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-3 rounded-xl border border-dashed border-border bg-secondary p-4 text-sm leading-relaxed text-muted-foreground">
              Isi penghasilan bulanan Anda di sebelah untuk melihat porsi angsuran terhadap
              penghasilan dan perkiraan anggaran rumah Anda.
            </p>
          )}
        </section>

        {/* Skenario */}
        <section
          aria-labelledby="judul-skenario"
          className="rounded-3xl border border-border bg-white p-5 shadow-e2 sm:p-6"
        >
          <h2
            id="judul-skenario"
            className="font-display text-lg font-extrabold tracking-[-0.02em] text-foreground"
          >
            Pilihan jangka waktu
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Harga dan uang muka yang sama, jangka waktu berbeda.
          </p>

          <ul className="mt-4 space-y-2">
            {skenarios.map((s) => {
              const terpilih = s.hasil.tenorTahun === tenor
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setTenor(s.hasil.tenorTahun)
                      tandai()
                    }}
                    aria-current={terpilih}
                    className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      terpilih
                        ? "border-primary/40 bg-accent"
                        : "border-border bg-white hover:border-primary/30 hover:bg-secondary"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="numeric text-sm font-bold text-foreground">{s.judul}</p>
                      {s.band && (
                        <p
                          className="mt-0.5 text-[11px] font-semibold"
                          style={{ color: WARNA_KEMAMPUAN[s.band] }}
                        >
                          {LABEL_KEMAMPUAN[s.band]}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="numeric text-sm font-bold text-primary">
                        {formatIDR(s.hasil.angsuranBulanan)}
                      </p>
                      <p className="numeric text-[11px] text-muted-foreground">
                        {s.selisihAngsuran === 0
                          ? "pilihan sekarang"
                          : `${s.selisihAngsuran < 0 ? "−" : "+"}${formatIDR(
                              Math.abs(s.selisihAngsuran),
                            )}`}
                      </p>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>

          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            Jangka waktu yang lebih panjang menurunkan angsuran bulanan tetapi menambah
            total bunga. {DISCLAIMER}
          </p>
        </section>

        {/* Perumahan yang sesuai anggaran */}
        {adaPenghasilan && (
          <section
            aria-labelledby="judul-cocok"
            className="rounded-3xl border border-border bg-white p-5 shadow-e2 sm:p-6"
          >
            <h2
              id="judul-cocok"
              className="font-display text-lg font-extrabold tracking-[-0.02em] text-foreground"
            >
              Perumahan sesuai anggaran Anda
            </h2>
            <div className="mt-3">
              <BudgetMatches
                items={housings}
                hargaMaksimum={kemampuan.hargaMaksimum}
                kecualikanId={perumahan?.id}
              />
            </div>
          </section>
        )}

        {/* Formulir */}
        <section
          aria-labelledby="judul-formulir"
          className="rounded-3xl border border-border bg-white p-5 shadow-e2 sm:p-6"
        >
          <h2
            id="judul-formulir"
            className="font-display text-lg font-extrabold tracking-[-0.02em] text-foreground"
          >
            Bicara dengan petugas KPR
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Tinggalkan nomor Anda — petugas akan menghubungi dan menjelaskan langkahnya.
            Angka simulasi di atas ikut terkirim sehingga Anda tidak perlu mengulanginya.
          </p>

          <form
            onFocusCapture={tandai}
            onPointerDownCapture={tandai}
            action={(fd) => {
              setError("")
              if (dimuatPada.current != null) {
                fd.set("elapsed_ms", String(Date.now() - dimuatPada.current))
              }
              fd.set("interacted", berinteraksi.current ? "1" : "0")
              fd.set("turnstile_token", token)

              // Disalin sebelum pengiriman: setelah aksinya selesai formulir
              // ini sudah tidak dirender lagi. Lihat kpr-panel.tsx.
              const pesan = fd.get("message")
              setPesanTerkirim(typeof pesan === "string" ? pesan : "")

              start(async () => {
                const h = await kirimProspek(fd)
                if (h.ok) {
                  setDigabung(h.duplikat)
                  setTerkirim(h.ringkasan)
                  return
                }
                if (h.butuhVerifikasi) {
                  setVerifikasi({ turnstileTersedia: h.turnstileTersedia })
                  setToken("")
                  return
                }
                setError(h.error)
              })
            }}
            className="mt-5 space-y-4"
          >
            {/*
              Yang dikirim hanyalah PILIHAN, tidak pernah angka hasilnya:
              server menghitung ulang angsuran dari harga yang tersimpan dan
              menyusun ulang band kemampuannya sendiri. Lihat actions/lead.ts.
            */}
            {perumahan && <input type="hidden" name="housing_id" value={perumahan.id} />}
            <input type="hidden" name="source_page" value="Simulasi KPR" />
            {/* Kanal yang dipilih mengalahkan asal formulirnya — lihat
                kpr-panel.tsx. */}
            <input type="hidden" name="lead_kind" value={viaWa ? "whatsapp" : "kalkulator"} />
            <input type="hidden" name="skema" value={skema} />
            <input type="hidden" name="dp_persen" value={dpPersen} />
            <input type="hidden" name="tenor_years" value={tenor} />
            {penghasilan > 0 && (
              <input type="hidden" name="monthly_income" value={penghasilan} />
            )}
            {komitmen > 0 && (
              <input type="hidden" name="monthly_commitments" value={komitmen} />
            )}

            <LeadFormFields
              error={error}
              verifikasi={verifikasi}
              turnstileSiteKey={turnstileSiteKey}
              onToken={setToken}
              placeholderPesan={
                perumahan
                  ? `Pertanyaan Anda tentang ${perumahan.name}`
                  : "Pertanyaan Anda tentang KPR"
              }
              waTersedia={Boolean(nomorKontak)}
              viaWa={viaWa}
              onViaWa={(v) => {
                setViaWa(v)
                tandai()
              }}
            />

            <Button type="submit" size="lg" className="w-full" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Mengirim…
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" aria-hidden />
                  {viaWa ? "Kirim & lanjut ke WhatsApp" : "Minta dihubungi petugas"}
                </>
              )}
            </Button>
          </form>

          {/*
            Jalan langsung, untuk orang yang tidak ingin mengisi formulir sama
            sekali. Dulu tombol ini hanya muncul bila sebuah perumahan sudah
            dipilih — padahal justru pengunjung yang BELUM memilih yang paling
            sering buntu di sini: ia baru tahu anggarannya dan tidak tahu harus
            bertanya ke mana. Nomor pusat yang mengisi celah itu; bila ia belum
            diatur pun, perilaku lamanya persis kembali.

            Niatnya 'bantuan', bukan 'kemampuan': pesannya sengaja TIDAK
            membawa penghasilan. Yang menekan tombol di sini belum tentu sedang
            membicarakan angkanya — tombol yang memang untuk itu ada di kartu
            kemampuan bayar, lengkap dengan kalimat yang mengatakannya.
          */}
          {nomorKontak && (
            <div className="mt-3">
              <WhatsAppCta
                phone={nomorKontak}
                niat="bantuan"
                housingId={perumahan?.id ?? null}
                className="w-full"
                label={
                  perumahan ? `Tanya langsung soal ${perumahan.name}` : "Tanya petugas di WhatsApp"
                }
                konteks={{
                  perumahan: perumahan?.name,
                  harga: perumahan?.priceMin,
                  tautan: tautanProperti(perumahan?.slug),
                }}
              />
              {!perumahan && waPusat?.jam && (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  {waPusat.label} · {waPusat.jam}
                </p>
              )}
            </div>
          )}

          <p className="mt-4 text-center text-xs text-muted-foreground">
            <Link href="/kebijakan-privasi" className="underline hover:text-foreground">
              Kebijakan Privasi
            </Link>
            {" · "}
            <Link href="/syarat-ketentuan" className="underline hover:text-foreground">
              Syarat &amp; Ketentuan
            </Link>
          </p>
        </section>

        {perumahan?.slug && (
          <Button asChild variant="outline" className="w-full">
            <Link href={`/perumahan/${perumahan.slug}`}>
              Lihat detail {perumahan.name}
              <ArrowRight />
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}

// ── Bagian kecil ──────────────────────────────────────────────────────────

/**
 * Slider berpasangan dengan kotak angka.
 *
 * design.md §7.3 mensyaratkan keduanya: slider untuk menjelajah, kotak angka
 * untuk orang yang sudah tahu angkanya — dan untuk siapa pun yang memakai
 * papan ketik saja, yang pada slider hanya bisa menambah satu langkah setiap
 * kali. aria-valuetext wajib karena tanpanya pembaca layar mengumumkan
 * "200000000", bukan "Rp 200.000.000".
 */
function Geser({
  label,
  nilai,
  set,
  min,
  max,
  step,
  satuan = "",
  rupiah = false,
  bantuan,
}: {
  label: string
  nilai: number
  set: (n: number) => void
  min: number
  max: number
  step: number
  satuan?: string
  rupiah?: boolean
  bantuan?: string
}) {
  const id = useId()
  const teks = rupiah ? formatIDR(nilai) : `${nilai}${satuan}`

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={`${id}-angka`} className="text-xs font-semibold text-foreground">
          {label}
        </label>
        {bantuan && <span className="numeric text-xs text-muted-foreground">{bantuan}</span>}
      </div>

      <div className="mt-2 flex items-center gap-3">
        <input
          id={`${id}-geser`}
          type="range"
          min={min}
          max={max}
          step={step}
          value={Math.min(Math.max(nilai, min), max)}
          onChange={(e) => set(Number(e.target.value))}
          aria-label={label}
          aria-valuetext={teks}
          // h-6 bukan tinggi bawaan 16px: WCAG 2.5.8 (AA) meminta sasaran
          // sentuh minimal 24×24px, dan slider adalah kontrol utama halaman
          // ini di ponsel. touch-manipulation mematikan jeda dobel-ketuk,
          // yang pada slider terasa seperti geseran yang tidak tertangkap.
          className="h-6 min-w-0 flex-1 cursor-pointer touch-manipulation accent-[var(--primary)]"
        />

        {rupiah ? (
          <div className="relative w-40 shrink-0">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              Rp
            </span>
            <Input
              id={`${id}-angka`}
              inputMode="numeric"
              value={nilai ? nilai.toLocaleString("id-ID") : ""}
              onChange={(e) => set(bacaAngka(e.target.value))}
              className="numeric h-10 pl-8 pr-2 text-right text-sm"
              placeholder="0"
            />
          </div>
        ) : (
          <Input
            id={`${id}-angka`}
            inputMode="numeric"
            value={String(nilai)}
            onChange={(e) => {
              const n = bacaAngka(e.target.value)
              set(Math.min(Math.max(n, min), max))
            }}
            className="numeric h-10 w-20 shrink-0 px-2 text-right text-sm"
          />
        )}
      </div>
    </div>
  )
}

/** Kotak rupiah dengan pemisah ribuan, untuk nilai tanpa slider. */
function Uang({
  label,
  nilai,
  set,
  placeholder,
  bantuan,
}: {
  label: string
  nilai: number
  set: (n: number) => void
  placeholder?: string
  bantuan?: string
}) {
  const id = useId()

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-foreground">
        {label}
        {bantuan && (
          <span className="ml-1 font-normal text-muted-foreground">({bantuan})</span>
        )}
      </label>
      <div className="relative mt-1.5">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          Rp
        </span>
        <Input
          id={id}
          inputMode="numeric"
          value={nilai ? nilai.toLocaleString("id-ID") : ""}
          onChange={(e) => set(bacaAngka(e.target.value))}
          placeholder={placeholder}
          className="numeric pl-10 text-right"
        />
      </div>
    </div>
  )
}

function Kotak({
  label,
  nilai,
  keterangan,
  tekan = false,
}: {
  label: string
  nilai: string
  keterangan?: string
  tekan?: boolean
}) {
  return (
    <div className={`rounded-xl p-3 ${tekan ? "bg-accent" : "bg-secondary"}`}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={`numeric mt-0.5 font-bold ${tekan ? "text-primary" : "text-foreground"}`}
      >
        {nilai}
      </dd>
      {keterangan && (
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{keterangan}</p>
      )}
    </div>
  )
}

function Catatan({
  catatan,
  ditinjauPada,
}: {
  catatan: string
  ditinjauPada: string | null
}) {
  return (
    <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
      <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
      <span>
        {catatan} {DISCLAIMER}
        {ditinjauPada && ` Bunga ditinjau ${formatDateID(ditinjauPada)}.`}
      </span>
    </p>
  )
}

/**
 * Angka dari isian yang boleh mengandung pemisah ribuan.
 *
 * Semua yang bukan digit dibuang, termasuk titik pemisah id-ID. Itu artinya
 * pecahan tidak didukung — memang tidak diperlukan: rupiah pada harga rumah
 * dan penghasilan bulanan tidak pernah ditulis sampai sen.
 */
function bacaAngka(v: string): number {
  const digit = v.replace(/\D/g, "")
  if (!digit) return 0
  const n = Number(digit)
  return Number.isFinite(n) ? n : 0
}

/**
 * Angka dari parameter URL, atau null bila tidak ada / tidak masuk akal.
 *
 * Berbeda dari bacaAngka di atas: yang itu membaca ketikan manusia dan selalu
 * menghasilkan angka; yang ini membaca nilai yang bisa dikarang siapa saja dan
 * harus bisa berkata "tidak ada", supaya pemanggilnya jatuh ke nilai bawaan
 * skema alih-alih ke nol. Batas atasnya menyamai batas di src/lib/pencarian.ts
 * sehingga URL yang sama berarti hal yang sama di /map dan di sini.
 */
function dariUrl(v: string | null, maks: number): number | null {
  if (v == null || v.trim() === "") return null
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.min(n, maks)
}
