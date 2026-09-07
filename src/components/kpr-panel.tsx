"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"

import { useJejakKalkulator } from "@/components/jejak-kalkulator"
import { ArrowRight, CheckCircle2, Info, Loader2, Send, Calculator } from "lucide-react"

import Link from "next/link"

import { Button } from "@/components/ui/button"
import LeadFormFields, { type StatusVerifikasi } from "@/components/lead-form-fields"
import WhatsAppCta from "@/components/whatsapp-cta"
import { kirimProspek, type RingkasanProspek } from "@/app/actions/lead"
import {
  hitungKPR,
  skemaBawaan,
  SKEMA,
  DISCLAIMER,
  type KonfigSkema,
  type SkemaKPR,
} from "@/lib/kpr"
import { formatIDR, formatDateID } from "@/lib/format"
import { tautanProperti } from "@/lib/whatsapp"

/**
 * Simulasi KPR dan formulir minat sebagai satu panel.
 *
 * Keduanya sengaja tidak dipisah. Orang yang baru saja melihat "Rp 4.100.000
 * per bulan" sedang berada pada puncak minatnya; menyuruhnya menggulir mencari
 * formulir lain adalah tempat paling mahal untuk kehilangan prospek. Angka
 * simulasi juga ikut terkirim, sehingga petugas menelepon sambil tahu persis
 * skenario yang dilihat calon pembeli.
 *
 * Angka yang dikirim ke server hanyalah PILIHAN (skema, uang muka, tenor).
 * Server menghitung ulang angsurannya dari harga yang tersimpan — lihat
 * src/app/actions/lead.ts.
 */

type Props = {
  housingId: string
  housingName: string
  /** Harga terendah. null berarti kalkulator tidak bisa ditampilkan. */
  priceMin: number | null
  /** Slug perumahan, untuk menautkan ke perencana lengkap di /simulasi. */
  housingSlug?: string
  /** Kontak pemasaran perumahan ini. Tujuan pertama setiap pesan WhatsApp. */
  phone?: string | null
  /**
   * Nomor tim KPR pusat, dipakai HANYA bila perumahan ini belum punya kontak.
   *
   * Bukan pengganti yang setara: petugas pusat tidak memegang stok unit
   * perumahan tertentu. Tetapi pertanyaan yang sampai ke orang yang harus
   * meneruskannya tetap jauh lebih baik daripada tombol yang tidak ada.
   */
  waPusat?: string | null
  /** Parameter skema yang berlaku (app_settings). Default ke cadangan kode. */
  konfig?: KonfigSkema
  /** Kapan bunga terakhir dikonfirmasi ke BRI. */
  ditinjauPada?: string | null
  turnstileSiteKey?: string
}

export default function KprPanel({
  housingId,
  housingName,
  priceMin,
  housingSlug,
  phone,
  waPusat,
  konfig = SKEMA,
  ditinjauPada,
  turnstileSiteKey,
}: Props) {
  const bisaSimulasi = priceMin != null && priceMin > 0
  const nomorKontak = phone || waPusat || null
  const tautan = tautanProperti(housingSlug)

  const [skema, setSkema] = useState<SkemaKPR>(() => skemaBawaan(priceMin))
  const [dpPersen, setDpPersen] = useState(() => konfig[skemaBawaan(priceMin)].dpDefaultPersen)
  const [tenor, setTenor] = useState(() => konfig[skemaBawaan(priceMin)].tenorDefault)

  useJejakKalkulator(housingId, [skema, dpPersen, tenor])

  const [error, setError] = useState("")
  const [terkirim, setTerkirim] = useState<RingkasanProspek | null>(null)
  /** Kiriman ini digabungkan ke prospek yang sudah ada, bukan yang baru. */
  const [digabung, setDigabung] = useState(false)
  const [verifikasi, setVerifikasi] = useState<StatusVerifikasi | null>(null)
  const [token, setToken] = useState("")
  const [pending, start] = useTransition()

  /**
   * Pengunjung memilih melanjutkan percakapan di WhatsApp.
   *
   * Sebuah CENTANG, bukan tombol kirim kedua. Dua tombol berdampingan pada
   * puncak minat memaksa orang memilih kanal sebelum ia memilih untuk
   * menghubungi sama sekali, dan yang paling sering dipilih dalam keadaan itu
   * adalah tidak menekan apa-apa. Centang ini hanya menjawab "lewat mana",
   * bukan "jadi atau tidak".
   *
   * Akibatnya dua: prospeknya tersimpan sebagai lead_kind 'whatsapp' sehingga
   * petugas tahu harus membalas ke sana, dan layar berhasil menaruh tombol
   * WhatsApp sebagai tindakan utama alih-alih catatan kecil.
   */
  const [viaWa, setViaWa] = useState(false)
  /**
   * Pesan yang BARU SAJA dikirim, disalin dari FormData.
   *
   * Dipakai untuk mengisi pesan WhatsApp pembuka. Tanpa ini pengunjung yang
   * baru mengetik pertanyaannya di formulir harus mengetiknya lagi di
   * WhatsApp — tepat keluhan yang membuat orang berhenti di tengah jalan.
   */
  const [pesanTerkirim, setPesanTerkirim] = useState("")

  // Sinyal anti-bot. Dikumpulkan diam-diam; pengguna tidak pernah melihatnya.
  //
  // Stempel waktunya diambil di efek, bukan saat render: yang ingin diukur
  // adalah sejak formulir TERLIHAT oleh manusia, dan itu terjadi setelah
  // hidrasi — bukan saat komponennya kebetulan dirender ulang di server.
  // Selama masih null, lama pengisian dilaporkan sebagai "tidak diketahui"
  // dan bukan nol; nol akan terbaca sebagai kiriman instan, yaitu persis
  // pola bot, dan justru menghukum pengguna yang paling cepat.
  const dimuatPada = useRef<number | null>(null)
  const berinteraksi = useRef(false)

  useEffect(() => {
    dimuatPada.current = Date.now()
  }, [])

  const konf = konfig[skema]
  const hasil = useMemo(
    () =>
      bisaSimulasi
        ? hitungKPR({
            harga: priceMin!,
            skema,
            uangMukaPersen: dpPersen,
            tenorTahun: tenor,
            konfig,
          })
        : null,
    [bisaSimulasi, priceMin, skema, dpPersen, tenor, konfig],
  )

  function gantiSkema(s: SkemaKPR) {
    setSkema(s)
    // Uang muka dan tenor dijepit ulang ke rentang skema baru. Tanpa ini,
    // beralih dari komersial (DP 20%) ke subsidi menyisakan nilai yang sah
    // tetapi bukan yang dimaksud pengguna, dan tenor 30 tahun akan diam-diam
    // dipotong ke 20 oleh server tanpa terlihat di layar.
    const k = konfig[s]
    setDpPersen((d) => Math.min(Math.max(d, k.dpMinPersen), 90))
    setTenor((t) => Math.min(t, k.tenorMax))
  }

  function tandaiInteraksi() {
    berinteraksi.current = true
  }

  // ── Berhasil ────────────────────────────────────────────────────────────
  if (terkirim) {
    return (
      <div className="rounded-2xl border border-ok/25 bg-ok-50 p-6 text-center">
        <CheckCircle2 className="mx-auto h-9 w-9 text-ok" />
        <p className="font-display mt-3 text-lg font-extrabold tracking-[-0.02em] text-foreground">
          {digabung ? "Permintaan Anda sudah tercatat" : "Permintaan terkirim"}
        </p>
        {/*
          Kiriman yang digabungkan tetap ditampilkan sebagai keberhasilan —
          karena memang berhasil. Yang berbeda hanya kejelasannya: pengunjung
          perlu tahu bahwa mengirim lagi tidak menambah antrean, supaya ia
          berhenti mengirim ulang dan tidak menelepon untuk memastikan.
        */}
        <p className="mt-2 text-sm text-foreground">
          {digabung ? (
            <>
              Terima kasih, {terkirim.nama}. Sepertinya Anda sudah pernah mengirim
              permintaan untuk perumahan ini, jadi permintaan tadi kami gabungkan
              ke pengajuan sebelumnya.
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

        <dl className="mt-5 space-y-2 rounded-xl border border-ok/20 bg-white/70 p-4 text-left text-sm">
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
              <dt className="text-muted-foreground">Tenor</dt>
              <dd className="numeric text-right font-semibold text-foreground">
                {terkirim.tenorTahun} tahun
              </dd>
            </div>
          )}
        </dl>

        {/*
          Kelanjutan percakapan, bukan pengiriman kedua.
          Prospeknya sudah tersimpan; tombol ini hanya memindahkan pembicaraan
          ke tempat orang benar-benar membalas. Pesannya sudah memuat seluruh
          ringkasan di atas, jadi tidak ada satu pun yang perlu diketik ulang.
        */}
        {nomorKontak && (
          <div className="mt-5">
            <WhatsAppCta
              phone={nomorKontak}
              niat="lanjutan"
              housingId={housingId}
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
                tautan,
              }}
            />
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Pesan pembukanya sudah berisi ringkasan di atas — Anda tidak perlu
              mengetik ulang apa pun.
            </p>
          </div>
        )}

        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{DISCLAIMER}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Simulasi ──────────────────────────────────────────────────── */}
      {bisaSimulasi && hasil && (
        <section aria-labelledby="judul-simulasi" className="rounded-2xl border border-border bg-secondary p-5">
          <h3
            id="judul-simulasi"
            className="flex items-center gap-2 text-sm font-bold text-foreground"
          >
            <Calculator className="h-4 w-4 text-primary" aria-hidden />
            Simulasi angsuran
          </h3>

          <div
            className="mt-4 flex gap-1.5 rounded-full bg-white p-1"
            role="radiogroup"
            aria-label="Skema KPR"
          >
            {(Object.keys(konfig) as SkemaKPR[]).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={skema === s}
                onClick={() => {
                  gantiSkema(s)
                  tandaiInteraksi()
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

          <div className="mt-5 space-y-5">
            <label className="block">
              <span className="flex items-baseline justify-between text-xs font-semibold text-foreground">
                Uang muka
                <span className="numeric font-bold text-primary">
                  {dpPersen}% · {formatIDR(hasil.uangMuka)}
                </span>
              </span>
              <input
                type="range"
                min={konf.dpMinPersen}
                max={50}
                step={1}
                value={dpPersen}
                onChange={(e) => {
                  setDpPersen(Number(e.target.value))
                  tandaiInteraksi()
                }}
                className="mt-2 w-full accent-[var(--primary)]"
                aria-label="Persentase uang muka"
              />
            </label>

            <label className="block">
              <span className="flex items-baseline justify-between text-xs font-semibold text-foreground">
                Jangka waktu
                <span className="numeric font-bold text-primary">{tenor} tahun</span>
              </span>
              <input
                type="range"
                min={1}
                max={konf.tenorMax}
                step={1}
                value={tenor}
                onChange={(e) => {
                  setTenor(Number(e.target.value))
                  tandaiInteraksi()
                }}
                className="mt-2 w-full accent-[var(--primary)]"
                aria-label="Jangka waktu dalam tahun"
              />
            </label>
          </div>

          <div className="mt-5 rounded-xl bg-white p-4 text-center" aria-live="polite">
            <p className="text-coord text-muted-foreground">Estimasi angsuran per bulan</p>
            <p className="font-display numeric mt-1 text-3xl font-extrabold tracking-[-0.025em] text-primary">
              {formatIDR(hasil.angsuranBulanan)}
            </p>
            <p className="numeric mt-1.5 text-xs text-muted-foreground">
              Bunga {hasil.bungaPersen}% · pinjaman {formatIDR(hasil.pokokPinjaman)}
            </p>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg bg-white p-3">
              <dt className="text-muted-foreground">Penghasilan minimum</dt>
              <dd className="numeric mt-0.5 font-bold text-foreground">
                {formatIDR(hasil.penghasilanMinimum)}
              </dd>
            </div>
            <div className="rounded-lg bg-white p-3">
              <dt className="text-muted-foreground">Total bunga</dt>
              <dd className="numeric mt-0.5 font-bold text-foreground">
                {formatIDR(hasil.totalBunga)}
              </dd>
            </div>
          </dl>

          <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
            <span>
              {konf.catatan} {DISCLAIMER}
              {ditinjauPada && ` Bunga ditinjau ${formatDateID(ditinjauPada)}.`}
            </span>
          </p>

          {/*
            Jalan keluar ke perencana lengkap.
            Sidebar ini sengaja tetap sempit dan tetap menjawab satu pertanyaan
            saja — "berapa angsuran rumah ini". Penghasilan, kemampuan bayar,
            dan perumahan yang sesuai anggaran butuh ruang yang tidak ada di
            kolom selebar ini, dan memaksakannya masuk akan merusak keduanya.
          */}
          <Link
            href={`/simulasi${housingSlug ? `?perumahan=${encodeURIComponent(housingSlug)}` : ""}`}
            className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-primary/25 bg-white px-4 py-3 text-xs font-semibold text-primary transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Hitung kemampuan bayar saya
            <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
          </Link>

          {/*
            Jalan keluar ketiga: bertanya tentang ANGKA yang barusan muncul,
            bukan tentang perumahannya. Niatnya berbeda dari tombol di kolom
            kontak — orang di sini sudah punya skenario dan ingin tahu apakah
            skenario itu masuk akal — dan pesannya membawa skenario itu utuh.
            Sengaja tetap berupa tautan halus: formulir di bawahnya yang
            menjadi tindakan utama panel ini.
          */}
          {nomorKontak && (
            <div className="mt-3 text-center">
              <WhatsAppCta
                phone={nomorKontak}
                niat="kemampuan"
                housingId={housingId}
                varian="halus"
                label="Tanya angsuran ini di WhatsApp"
                konteks={{
                  perumahan: housingName,
                  harga: priceMin,
                  skema,
                  uangMuka: hasil.uangMuka,
                  uangMukaPersen: hasil.uangMukaPersen,
                  tenorTahun: hasil.tenorTahun,
                  angsuran: hasil.angsuranBulanan,
                  tautan,
                }}
              />
            </div>
          )}
        </section>
      )}

      {/* ── Formulir minat ────────────────────────────────────────────── */}
      <form
        onFocusCapture={tandaiInteraksi}
        onPointerDownCapture={tandaiInteraksi}
        action={(fd) => {
          setError("")
          if (dimuatPada.current != null) {
            fd.set("elapsed_ms", String(Date.now() - dimuatPada.current))
          }
          fd.set("interacted", berinteraksi.current ? "1" : "0")
          fd.set("turnstile_token", token)

          // Disalin SEBELUM pengiriman: setelah aksi selesai, formulirnya
          // sudah tidak dirender lagi dan isian pesannya ikut hilang bersama
          // DOM-nya.
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
        className="space-y-4"
      >
        <input type="hidden" name="housing_id" value={housingId} />
        <input type="hidden" name="source_page" value="Detail Perumahan" />
        {/*
          Kanal yang dipilih pengunjung mengalahkan asal formulirnya. Petugas
          yang membuka prospek berjenis 'WhatsApp' tahu harus membalas ke sana
          alih-alih menelepon nomor yang mungkin tidak diangkat.
        */}
        <input
          type="hidden"
          name="lead_kind"
          value={viaWa ? "whatsapp" : bisaSimulasi ? "kalkulator" : "form_minat"}
        />
        {bisaSimulasi && (
          <>
            <input type="hidden" name="skema" value={skema} />
            <input type="hidden" name="dp_persen" value={dpPersen} />
            <input type="hidden" name="tenor_years" value={tenor} />
          </>
        )}

        <LeadFormFields
          error={error}
          verifikasi={verifikasi}
          turnstileSiteKey={turnstileSiteKey}
          onToken={setToken}
          placeholderPesan={`Pertanyaan Anda tentang ${housingName}`}
          waTersedia={Boolean(nomorKontak)}
          viaWa={viaWa}
          onViaWa={(v) => {
            setViaWa(v)
            tandaiInteraksi()
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
              {viaWa ? "Kirim & lanjut ke WhatsApp" : bisaSimulasi ? "Ajukan KPR" : "Kirim minat"}
            </>
          )}
        </Button>
      </form>
    </div>
  )
}
